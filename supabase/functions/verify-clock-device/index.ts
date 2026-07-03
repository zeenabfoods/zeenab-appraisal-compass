import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function getClientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  return req.headers.get('cf-connecting-ip')
    || req.headers.get('x-real-ip')
    || 'unknown'
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )
    const token = authHeader.replace('Bearer ', '')
    const { data: claims, error: claimsError } = await userClient.auth.getClaims(token)
    if (claimsError || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const userId: string = claims.claims.sub

    const body = await req.json().catch(() => ({}))
    const fingerprintHash: string | undefined = body?.fingerprint_hash
    const deviceLabel: string = (body?.device_label ?? '').toString().slice(0, 300)
    const action: string = body?.action === 'clock_out' ? 'clock_out' : 'clock_in'

    if (!fingerprintHash || typeof fingerprintHash !== 'string' || fingerprintHash.length < 16) {
      return new Response(JSON.stringify({ error: 'Invalid fingerprint' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const ip = getClientIp(req)
    const userAgent = req.headers.get('user-agent') || 'unknown'

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: existing } = await admin
      .from('employee_trusted_devices')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    // No trusted device yet OR previously reset (is_active=false) → register this device
    if (!existing || !existing.is_active) {
      if (existing) {
        await admin
          .from('employee_trusted_devices')
          .update({
            device_fingerprint_hash: fingerprintHash,
            device_label: deviceLabel || userAgent.slice(0, 300),
            registered_ip: ip,
            registered_at: new Date().toISOString(),
            last_seen_at: new Date().toISOString(),
            last_seen_ip: ip,
            is_active: true,
          })
          .eq('user_id', userId)
      } else {
        await admin.from('employee_trusted_devices').insert({
          user_id: userId,
          device_fingerprint_hash: fingerprintHash,
          device_label: deviceLabel || userAgent.slice(0, 300),
          registered_ip: ip,
          last_seen_ip: ip,
        })
      }
      return new Response(JSON.stringify({ allowed: true, registered: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Match → update last seen
    if (existing.device_fingerprint_hash === fingerprintHash) {
      await admin
        .from('employee_trusted_devices')
        .update({ last_seen_at: new Date().toISOString(), last_seen_ip: ip })
        .eq('user_id', userId)
      return new Response(JSON.stringify({ allowed: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Mismatch → log violation + notify HR
    await admin.from('device_violation_logs').insert({
      user_id: userId,
      attempted_fingerprint_hash: fingerprintHash,
      attempted_ip: ip,
      user_agent: userAgent,
      action_blocked: action,
    })

    const { data: profile } = await admin
      .from('profiles')
      .select('first_name,last_name')
      .eq('id', userId)
      .maybeSingle()
    const employeeName = profile ? `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() : 'An employee'

    const { data: hrUsers } = await admin
      .from('profiles')
      .select('id')
      .in('role', ['hr', 'admin'])
      .eq('is_active', true)

    if (hrUsers?.length) {
      const notifications = hrUsers.map((u) => ({
        user_id: u.id,
        type: 'device_violation',
        title: 'Multiple Device Violation',
        message: `${employeeName} attempted to clock in from an unregistered device (IP: ${ip}).`,
        related_employee_id: userId,
      }))
      await admin.from('notifications').insert(notifications)
    }

    return new Response(
      JSON.stringify({
        allowed: false,
        reason: 'device_mismatch',
        message: 'This account is registered to a different device. Contact HR if you have a new phone.',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('verify-clock-device error', err)
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})