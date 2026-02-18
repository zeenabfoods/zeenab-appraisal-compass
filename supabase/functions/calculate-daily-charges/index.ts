import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper to check if a date is a weekend (Saturday = 6, Sunday = 0)
function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

/**
 * SHIFT DETECTION — Option B + C Hybrid
 *
 * Step 1 (Option B): Check the shift_assignments table for an explicit HR assignment
 *   covering the target date for this employee.
 *
 * Step 2 (Option C fallback): If no explicit assignment, look at the last 7 days of
 *   attendance_logs. If ≥60% of clock-ins are marked is_night_shift=true, classify
 *   the employee as a night-shift worker for that date. Otherwise, day shift.
 *
 * Returns: 'day' | 'night' | 'rotating'
 */
async function detectEmployeeShift(
  supabaseClient: any,
  employeeId: string,
  dateStr: string
): Promise<'day' | 'night' | 'rotating'> {
  // ── Option B: Explicit shift assignment ──────────────────────────────────
  const { data: assignment } = await supabaseClient
    .from('shift_assignments')
    .select('shift_type')
    .eq('employee_id', employeeId)
    .eq('is_active', true)
    .lte('start_date', dateStr)
    .gte('end_date', dateStr)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (assignment) {
    console.log(`[ShiftDetect] Employee ${employeeId}: explicit assignment → ${assignment.shift_type}`);
    return assignment.shift_type as 'day' | 'night' | 'rotating';
  }

  // ── Option C: Pattern detection from last 7 days ─────────────────────────
  const lookback = new Date(dateStr);
  lookback.setDate(lookback.getDate() - 7);
  const lookbackStr = lookback.toISOString().split('T')[0];

  const { data: recentLogs } = await supabaseClient
    .from('attendance_logs')
    .select('is_night_shift')
    .eq('employee_id', employeeId)
    .gte('clock_in_time', `${lookbackStr}T00:00:00`)
    .lt('clock_in_time', `${dateStr}T00:00:00`);

  if (!recentLogs || recentLogs.length === 0) {
    // No history — assume day shift (safer default, won't penalise)
    console.log(`[ShiftDetect] Employee ${employeeId}: no history → defaulting to day`);
    return 'day';
  }

  const nightCount = recentLogs.filter((l: any) => l.is_night_shift === true).length;
  const ratio = nightCount / recentLogs.length;

  if (ratio >= 0.6) {
    console.log(`[ShiftDetect] Employee ${employeeId}: pattern detected night (${nightCount}/${recentLogs.length} logs)`);
    return 'night';
  }

  console.log(`[ShiftDetect] Employee ${employeeId}: pattern detected day (${recentLogs.length - nightCount}/${recentLogs.length} logs)`);
  return 'day';
}

async function calculateEscalationMultiplier(
  supabaseClient: any,
  employeeId: string,
  violationType: string,
  currentDate: Date
): Promise<number> {
  try {
    // Fetch active escalation rules from DB
    const { data: escalationRules } = await supabaseClient
      .from('escalation_rules')
      .select('*')
      .eq('violation_type', violationType)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    if (!escalationRules) return 1.0;

    const lookbackDate = new Date(currentDate);
    lookbackDate.setDate(lookbackDate.getDate() - (escalationRules.lookback_period_days || 30));
    const lookbackDateStr = lookbackDate.toISOString().split('T')[0];

    const { data: previousCharges } = await supabaseClient
      .from('attendance_charges')
      .select('id')
      .eq('employee_id', employeeId)
      .eq('charge_type', violationType)
      .gte('charge_date', lookbackDateStr);

    const occurrenceCount = (previousCharges?.length || 0) + 1;
    const tiers: { occurrence_count: number; multiplier: number }[] =
      escalationRules.escalation_tiers || [];

    const sortedTiers = [...tiers].sort((a, b) => b.occurrence_count - a.occurrence_count);
    for (const tier of sortedTiers) {
      if (occurrenceCount >= tier.occurrence_count) return tier.multiplier;
    }

    return 1.0;
  } catch (error) {
    console.error('Error calculating escalation multiplier:', error);
    return 1.0;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { targetDate } = await req.json().catch(() => ({}));

    const calculationDate = targetDate
      ? new Date(targetDate)
      : new Date(Date.now() - 24 * 60 * 60 * 1000);

    const dateStr = calculationDate.toISOString().split('T')[0];
    console.log(`Calculating charges for date: ${dateStr}`);

    // WEEKEND CHECK
    if (isWeekend(calculationDate)) {
      console.log(`Skipping charge calculation for weekend: ${dateStr}`);
      return new Response(
        JSON.stringify({
          success: true,
          date: dateStr,
          chargesCreated: 0,
          skipped: true,
          reason: 'Weekend — no charges applied on Saturdays and Sundays',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // DUPLICATE CHECK
    const { data: existingCharges } = await supabaseClient
      .from('attendance_charges')
      .select('id')
      .eq('charge_date', dateStr)
      .limit(1);

    if (existingCharges && existingCharges.length > 0) {
      return new Response(
        JSON.stringify({
          success: true,
          date: dateStr,
          chargesCreated: 0,
          skipped: true,
          reason: `Charges already exist for ${dateStr}. Delete existing charges first to recalculate.`,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET ACTIVE RULES
    const { data: rules, error: rulesError } = await supabaseClient
      .from('attendance_rules')
      .select('*')
      .eq('is_active', true)
      .limit(1)
      .single();

    if (rulesError || !rules) {
      return new Response(
        JSON.stringify({ error: 'No active attendance rules configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // GET ALL ACTIVE EMPLOYEES
    const { data: employees, error: employeesError } = await supabaseClient
      .from('profiles')
      .select('id, first_name, last_name')
      .eq('is_active', true);

    if (employeesError) throw employeesError;

    const chargesCreated: any[] = [];
    const skippedDueToShift: string[] = [];
    const errors: string[] = [];

    for (const employee of employees || []) {
      try {
        // ── SHIFT DETECTION (B+C) ──────────────────────────────────────────
        const employeeShift = await detectEmployeeShift(supabaseClient, employee.id, dateStr);

        // Determine the expected shift for this date.
        // Since the charge engine runs for "yesterday" (a workday), the target
        // date is always a weekday. Night-shift workers clock in at night so
        // their absence check must look at NIGHT-shift logs, not day-shift logs.
        const isNightShiftEmployee = employeeShift === 'night';
        const isRotatingEmployee = employeeShift === 'rotating';

        // ── FETCH ATTENDANCE LOGS ─────────────────────────────────────────
        // For night-shift workers we look for logs where is_night_shift = true
        // For day-shift workers we exclude night-shift logs
        let logsQuery = supabaseClient
          .from('attendance_logs')
          .select('*')
          .eq('employee_id', employee.id)
          .gte('clock_in_time', `${dateStr}T00:00:00`)
          .lte('clock_in_time', `${dateStr}T23:59:59`)
          .order('clock_in_time', { ascending: false });

        const { data: allLogs } = await logsQuery;

        // Split logs by shift type
        const nightLogs = (allLogs || []).filter((l: any) => l.is_night_shift === true);
        const dayLogs = (allLogs || []).filter((l: any) => l.is_night_shift !== true);

        // ── CHARGE LOGIC BY SHIFT TYPE ────────────────────────────────────

        if (isNightShiftEmployee) {
          // Night-shift worker: only charge based on NIGHT logs
          // Skip entirely if there's a night log → they came in
          if (nightLogs.length === 0 && dayLogs.length === 0) {
            // Night-shift worker was completely absent — charge absence
            const multiplier = await calculateEscalationMultiplier(
              supabaseClient, employee.id, 'absence', calculationDate
            );
            const chargeAmount = (rules.absence_charge_amount || 0) * multiplier;
            if (chargeAmount > 0) {
              const { data: charge } = await supabaseClient
                .from('attendance_charges')
                .insert({
                  employee_id: employee.id,
                  charge_type: 'absence',
                  charge_amount: chargeAmount,
                  charge_date: dateStr,
                  escalation_multiplier: multiplier,
                  is_escalated: multiplier > 1,
                  status: 'pending',
                })
                .select()
                .single();
              if (charge) chargesCreated.push(charge);
              await supabaseClient.from('notifications').insert({
                user_id: employee.id,
                type: 'attendance_charge',
                title: 'Absence Charge Applied (Night Shift)',
                message: `An absence charge of ₦${chargeAmount.toFixed(2)} has been applied for ${dateStr}${multiplier > 1 ? ` (${multiplier}x escalation)` : ''}. You were not clocked in for your night shift.`,
              });
            }
          } else if (nightLogs.length > 0) {
            // Night-shift worker came in — check lateness against 8 PM start
            const log = nightLogs[0];
            if (log.is_late && log.late_by_minutes && log.late_by_minutes > (rules.grace_period_minutes || 0)) {
              const multiplier = await calculateEscalationMultiplier(
                supabaseClient, employee.id, 'late_arrival', calculationDate
              );
              const chargeAmount = (rules.late_charge_amount || 0) * multiplier;
              if (chargeAmount > 0) {
                const { data: charge } = await supabaseClient
                  .from('attendance_charges')
                  .insert({
                    employee_id: employee.id,
                    attendance_log_id: log.id,
                    charge_type: 'late_arrival',
                    charge_amount: chargeAmount,
                    charge_date: dateStr,
                    escalation_multiplier: multiplier,
                    is_escalated: multiplier > 1,
                    status: 'pending',
                  })
                  .select()
                  .single();
                if (charge) chargesCreated.push(charge);
                await supabaseClient.from('notifications').insert({
                  user_id: employee.id,
                  type: 'attendance_charge',
                  title: 'Late Arrival Charge Applied (Night Shift)',
                  message: `A late arrival charge of ₦${chargeAmount.toFixed(2)} has been applied for ${dateStr} (${log.late_by_minutes} minutes late to night shift)${multiplier > 1 ? ` with ${multiplier}x escalation` : ''}.`,
                });
              }
            }
          } else {
            // Has day logs but is a night-shift employee — SKIP day-shift charges
            skippedDueToShift.push(`${employee.id} (night-shift worker, found day-shift log — no charge)`);
            console.log(`[ShiftExclusion] Skipping day-shift charges for night worker ${employee.id} on ${dateStr}`);
          }

        } else if (isRotatingEmployee) {
          // Rotating shift: charge based on whichever log type exists, or absence
          const logs = allLogs || [];
          if (logs.length === 0) {
            // No log at all — charge absence
            const multiplier = await calculateEscalationMultiplier(
              supabaseClient, employee.id, 'absence', calculationDate
            );
            const chargeAmount = (rules.absence_charge_amount || 0) * multiplier;
            if (chargeAmount > 0) {
              const { data: charge } = await supabaseClient
                .from('attendance_charges')
                .insert({
                  employee_id: employee.id,
                  charge_type: 'absence',
                  charge_amount: chargeAmount,
                  charge_date: dateStr,
                  escalation_multiplier: multiplier,
                  is_escalated: multiplier > 1,
                  status: 'pending',
                })
                .select()
                .single();
              if (charge) chargesCreated.push(charge);
              await supabaseClient.from('notifications').insert({
                user_id: employee.id,
                type: 'attendance_charge',
                title: 'Absence Charge Applied (Rotating Shift)',
                message: `An absence charge of ₦${chargeAmount.toFixed(2)} has been applied for ${dateStr}${multiplier > 1 ? ` (${multiplier}x escalation)` : ''}. No attendance record found.`,
              });
            }
          }
          // For rotating workers who DID clock in, we don't penalise shift mismatch

        } else {
          // ── DAY-SHIFT WORKER (default) ───────────────────────────────────
          // If they only have night-shift logs, SKIP day-shift charges
          if (allLogs && allLogs.length > 0 && nightLogs.length === allLogs.length) {
            skippedDueToShift.push(`${employee.id} (day-shift worker with only night logs — possible shift change)`);
            console.log(`[ShiftExclusion] Day-shift worker ${employee.id} only has night logs on ${dateStr} — skipping charges`);
            continue;
          }

          if (!dayLogs || dayLogs.length === 0) {
            // Day-shift absence
            const multiplier = await calculateEscalationMultiplier(
              supabaseClient, employee.id, 'absence', calculationDate
            );
            const chargeAmount = (rules.absence_charge_amount || 0) * multiplier;
            if (chargeAmount > 0) {
              const { data: charge } = await supabaseClient
                .from('attendance_charges')
                .insert({
                  employee_id: employee.id,
                  charge_type: 'absence',
                  charge_amount: chargeAmount,
                  charge_date: dateStr,
                  escalation_multiplier: multiplier,
                  is_escalated: multiplier > 1,
                  status: 'pending',
                })
                .select()
                .single();
              if (charge) chargesCreated.push(charge);
              await supabaseClient.from('notifications').insert({
                user_id: employee.id,
                type: 'attendance_charge',
                title: 'Absence Charge Applied',
                message: `An absence charge of ₦${chargeAmount.toFixed(2)} has been applied for ${dateStr}${multiplier > 1 ? ` (${multiplier}x escalation)` : ''}. You were not clocked in on this day.`,
              });
            }
          } else {
            // Day-shift late arrival check
            const log = dayLogs[0];
            if (log.is_late && log.late_by_minutes && log.late_by_minutes > (rules.grace_period_minutes || 0)) {
              const multiplier = await calculateEscalationMultiplier(
                supabaseClient, employee.id, 'late_arrival', calculationDate
              );
              const chargeAmount = (rules.late_charge_amount || 0) * multiplier;
              if (chargeAmount > 0) {
                const { data: charge } = await supabaseClient
                  .from('attendance_charges')
                  .insert({
                    employee_id: employee.id,
                    attendance_log_id: log.id,
                    charge_type: 'late_arrival',
                    charge_amount: chargeAmount,
                    charge_date: dateStr,
                    escalation_multiplier: multiplier,
                    is_escalated: multiplier > 1,
                    status: 'pending',
                  })
                  .select()
                  .single();
                if (charge) chargesCreated.push(charge);
                await supabaseClient.from('notifications').insert({
                  user_id: employee.id,
                  type: 'attendance_charge',
                  title: 'Late Arrival Charge Applied',
                  message: `A late arrival charge of ₦${chargeAmount.toFixed(2)} has been applied for ${dateStr} (${log.late_by_minutes} minutes late)${multiplier > 1 ? ` with ${multiplier}x escalation` : ''}.`,
                });
              }
            }

            // Early closure / no clock-out
            if (!log.clock_out_time || log.auto_clocked_out || log.early_closure) {
              const earlyClosureAmount = rules.early_closure_charge_amount || 0;
              if (earlyClosureAmount > 0) {
                const { data: existingEarlyCharge } = await supabaseClient
                  .from('attendance_charges')
                  .select('id')
                  .eq('employee_id', employee.id)
                  .eq('attendance_log_id', log.id)
                  .eq('charge_type', 'early_departure')
                  .limit(1);

                if (!existingEarlyCharge || existingEarlyCharge.length === 0) {
                  const { data: charge } = await supabaseClient
                    .from('attendance_charges')
                    .insert({
                      employee_id: employee.id,
                      attendance_log_id: log.id,
                      charge_type: 'early_departure',
                      charge_amount: earlyClosureAmount,
                      charge_date: dateStr,
                      escalation_multiplier: 1,
                      is_escalated: false,
                      status: 'pending',
                    })
                    .select()
                    .single();
                  if (charge) chargesCreated.push(charge);

                  const reason = !log.clock_out_time
                    ? 'You did not clock out'
                    : log.auto_clocked_out
                    ? 'You were auto-clocked out'
                    : 'Early closure detected';

                  await supabaseClient.from('notifications').insert({
                    user_id: employee.id,
                    type: 'attendance_charge',
                    title: 'Early Closure Charge Applied',
                    message: `An early closure charge of ₦${earlyClosureAmount.toFixed(2)} has been applied for ${dateStr}. ${reason}.`,
                  });
                }
              }
            }
          }
        }
      } catch (error: any) {
        console.error(`Error processing employee ${employee.id}:`, error);
        errors.push(`Employee ${employee.id}: ${error.message}`);
      }
    }

    console.log(
      `Charges complete for ${dateStr}. Created: ${chargesCreated.length}, ` +
      `Shift-excluded: ${skippedDueToShift.length}, Errors: ${errors.length}`
    );

    return new Response(
      JSON.stringify({
        success: true,
        date: dateStr,
        chargesCreated: chargesCreated.length,
        shiftExclusions: skippedDueToShift.length,
        charges: chargesCreated,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error calculating charges:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
