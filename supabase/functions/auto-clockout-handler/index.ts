import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AttendanceRule {
  work_end_time: string;
  early_closure_charge_amount: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    console.log('Auto-clockout handler started at:', new Date().toISOString());

    // Get active attendance rule to find closing time
    const { data: rules, error: rulesError } = await supabaseClient
      .from('attendance_rules')
      .select('work_end_time, early_closure_charge_amount')
      .eq('is_active', true)
      .limit(1)
      .single();

    if (rulesError || !rules) {
      console.error('Failed to fetch attendance rules:', rulesError);
      return new Response(
        JSON.stringify({ error: 'No active attendance rules found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const closingTime = rules.work_end_time || '17:00:00';
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:00`;
    
    console.log(`Current time: ${currentTime}, Closing time: ${closingTime}`);

    // Calculate 1 minute after closing time
    const [closeHour, closeMin] = closingTime.split(':').map(Number);
    const autoClockoutTime = `${closeHour.toString().padStart(2, '0')}:${(closeMin + 1).toString().padStart(2, '0')}:00`;

    // Find all employees still clocked in (office only, and NOT doing overtime)
    const { data: activeSessions, error: sessionsError } = await supabaseClient
      .from('attendance_logs')
      .select(`
        id,
        employee_id,
        clock_in_time,
        location_type,
        overtime_approved,
        employee:profiles!attendance_logs_employee_id_fkey(
          id,
          first_name,
          last_name,
          email
        )
      `)
      .is('clock_out_time', null)
      .eq('location_type', 'office')
      .eq('early_closure', false)
      .or('overtime_approved.is.null,overtime_approved.eq.false');

    if (sessionsError) {
      console.error('Failed to fetch active sessions:', sessionsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch active sessions' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log(`Found ${activeSessions?.length || 0} active sessions`);

    let notificationsSent = 0;
    let autoClockouts = 0;

    // At closing time: Send notifications
    if (currentTime === closingTime && activeSessions && activeSessions.length > 0) {
      for (const session of activeSessions) {
        const employee = Array.isArray(session.employee) ? session.employee[0] : session.employee;
        
        if (employee) {
          const { error: notifError } = await supabaseClient
            .from('notifications')
            .insert({
              user_id: session.employee_id,
              type: 'clock_out_reminder',
              title: '⏰ Closing Time - Clock Out Now',
              message: `It's ${closingTime} (closing time). Please clock out within 1 minute to avoid early closure charges.`,
            });

          if (!notifError) {
            notificationsSent++;
            console.log(`Notification sent to employee: ${employee.first_name} ${employee.last_name}`);
          } else {
            console.error(`Failed to send notification to ${employee.email}:`, notifError);
          }
        }
      }
    }

    // 1 minute after closing time: Auto clock-out
    if (currentTime === autoClockoutTime && activeSessions && activeSessions.length > 0) {
      const today = new Date().toISOString().split('T')[0];
      const closingDateTime = `${today}T${closingTime}`;

      for (const session of activeSessions) {
        const clockInTime = new Date(session.clock_in_time);
        const closeTime = new Date(closingDateTime);
        const diffMs = closeTime.getTime() - clockInTime.getTime();
        const totalHours = Math.max(0, diffMs / (1000 * 60 * 60));

        // Auto clock-out at closing time (not current time)
        const { error: updateError } = await supabaseClient
          .from('attendance_logs')
          .update({
            clock_out_time: closingDateTime,
            total_hours: Number(totalHours.toFixed(2)),
            early_closure: true,
            auto_clocked_out: true,
          })
          .eq('id', session.id);

        if (!updateError) {
          autoClockouts++;
          
          // Create early closure charge
          const { error: chargeError } = await supabaseClient
            .from('attendance_charges')
            .insert({
              employee_id: session.employee_id,
              attendance_log_id: session.id,
              charge_type: 'early_closure',
              charge_amount: rules.early_closure_charge_amount || 750,
              charge_date: today,
              status: 'pending',
            });

          if (chargeError) {
            console.error(`Failed to create charge for employee ${session.employee_id}:`, chargeError);
          }

          // Send notification about auto clock-out
          const employee = Array.isArray(session.employee) ? session.employee[0] : session.employee;
          if (employee) {
            await supabaseClient
              .from('notifications')
              .insert({
                user_id: session.employee_id,
                type: 'auto_clock_out',
                title: '🔴 Auto Clocked Out - Early Closure',
                message: `You were automatically clocked out at ${closingTime} for early closure. A charge of ₦${rules.early_closure_charge_amount || 750} has been applied.`,
              });

            console.log(`Auto clocked-out employee: ${employee.first_name} ${employee.last_name}`);
          }
        } else {
          console.error(`Failed to clock-out employee ${session.employee_id}:`, updateError);
        }
      }
    }

    const response = {
      success: true,
      timestamp: now.toISOString(),
      currentTime,
      closingTime,
      notificationsSent,
      autoClockouts,
      activeSessions: activeSessions?.length || 0,
    };

    console.log('Handler completed:', response);

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Error in auto-clockout handler:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
