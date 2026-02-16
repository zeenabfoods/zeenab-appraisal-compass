import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    // Get active attendance rule
    const { data: rules, error: rulesError } = await supabaseClient
      .from('attendance_rules')
      .select('work_end_time, early_closure_charge_amount, auto_clockout_deadline, consecutive_auto_clockout_charge')
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
    const autoClockoutDeadline = rules.auto_clockout_deadline || '19:00';
    const consecutiveCharge = rules.consecutive_auto_clockout_charge || 0;
    
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:00`;
    
    console.log(`Current time: ${currentTime}, Closing time: ${closingTime}, Auto-clockout deadline: ${autoClockoutDeadline}`);

    // Normalize deadline to HH:MM:00 format
    const [deadlineHour, deadlineMin] = autoClockoutDeadline.split(':').map(Number);
    const deadlineTimeStr = `${deadlineHour.toString().padStart(2, '0')}:${deadlineMin.toString().padStart(2, '0')}:00`;

    // Find all day-shift employees still clocked in (exclude night shift and overtime)
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
      .or('is_night_shift.is.null,is_night_shift.eq.false')
      .or('overtime_approved.is.null,overtime_approved.eq.false');

    // Find all night-shift employees still clocked in
    const { data: nightShiftSessions, error: nightError } = await supabaseClient
      .from('attendance_logs')
      .select(`
        id,
        employee_id,
        clock_in_time,
        employee:profiles!attendance_logs_employee_id_fkey(
          id,
          first_name,
          last_name,
          email
        )
      `)
      .is('clock_out_time', null)
      .eq('is_night_shift', true)
      .eq('early_closure', false);

    if (nightError) {
      console.error('Failed to fetch night shift sessions:', nightError);
    }

    if (sessionsError) {
      console.error('Failed to fetch active sessions:', sessionsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch active sessions' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log(`Found ${activeSessions?.length || 0} active day-shift sessions`);

    let notificationsSent = 0;
    let autoClockouts = 0;

    // At closing time: Send reminder notifications
    if (currentTime === `${closingTime.substring(0, 5)}:00` && activeSessions && activeSessions.length > 0) {
      for (const session of activeSessions) {
        const employee = Array.isArray(session.employee) ? session.employee[0] : session.employee;
        if (employee) {
          const { error: notifError } = await supabaseClient
            .from('notifications')
            .insert({
              user_id: session.employee_id,
              type: 'clock_out_reminder',
              title: '⏰ Closing Time - Clock Out Now',
              message: `It's ${closingTime} (closing time). Please clock out before ${autoClockoutDeadline} to avoid being auto-clocked out.`,
            });

          if (!notifError) {
            notificationsSent++;
            console.log(`Reminder sent to: ${employee.first_name} ${employee.last_name}`);
          }
        }
      }
    }

    // At auto-clockout deadline (e.g. 7 PM): Auto clock-out remaining staff
    if (currentTime === deadlineTimeStr && activeSessions && activeSessions.length > 0) {
      const today = new Date().toISOString().split('T')[0];
      const closingDateTime = `${today}T${closingTime}`;

      for (const session of activeSessions) {
        const clockInTime = new Date(session.clock_in_time);
        const closeTime = new Date(closingDateTime);
        const diffMs = closeTime.getTime() - clockInTime.getTime();
        const totalHours = Math.max(0, diffMs / (1000 * 60 * 60));

        // Auto clock-out at closing time (recorded as work_end_time, not deadline)
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

          // Check for consecutive auto-clockouts to determine charge
          const { data: recentLogs } = await supabaseClient
            .from('attendance_logs')
            .select('auto_clocked_out')
            .eq('employee_id', session.employee_id)
            .eq('auto_clocked_out', true)
            .neq('id', session.id)
            .order('clock_in_time', { ascending: false })
            .limit(1);

          const previousWasAutoClocked = recentLogs && recentLogs.length > 0;

          if (previousWasAutoClocked && consecutiveCharge > 0) {
            // 2nd consecutive auto-clockout → apply charge
            await supabaseClient
              .from('attendance_charges')
              .insert({
                employee_id: session.employee_id,
                attendance_log_id: session.id,
                charge_type: 'consecutive_auto_clockout',
                charge_amount: consecutiveCharge,
                charge_date: today,
                status: 'pending',
              });

            const employee = Array.isArray(session.employee) ? session.employee[0] : session.employee;
            if (employee) {
              await supabaseClient
                .from('notifications')
                .insert({
                  user_id: session.employee_id,
                  type: 'auto_clock_out',
                  title: '🔴 Auto Clocked Out - Consecutive Charge Applied',
                  message: `You were automatically clocked out at ${autoClockoutDeadline} for the 2nd consecutive time. A charge of ₦${consecutiveCharge} has been applied.`,
                });
              console.log(`Consecutive charge applied to: ${employee.first_name} ${employee.last_name}`);
            }
          } else {
            // First auto-clockout → warning only, no charge
            const employee = Array.isArray(session.employee) ? session.employee[0] : session.employee;
            if (employee) {
              await supabaseClient
                .from('notifications')
                .insert({
                  user_id: session.employee_id,
                  type: 'auto_clock_out',
                  title: '⚠️ Auto Clocked Out',
                  message: `You were automatically clocked out at ${autoClockoutDeadline} because you didn't clock out manually. A charge will apply if this happens again consecutively.`,
                });
              console.log(`Auto clocked-out (warning): ${employee.first_name} ${employee.last_name}`);
            }
          }
        } else {
          console.error(`Failed to clock-out employee ${session.employee_id}:`, updateError);
        }
      }
    }

    // At 7 AM: Auto clock-out all night shift staff to prevent overlap with day shift
    let nightShiftClockouts = 0;
    const nightShiftEndTime = rules.night_shift_end_time || '07:00:00';
    const [nsEndHour, nsEndMin] = nightShiftEndTime.split(':').map(Number);
    const nsEndTimeStr = `${nsEndHour.toString().padStart(2, '0')}:${nsEndMin.toString().padStart(2, '0')}:00`;

    if (currentTime === nsEndTimeStr && nightShiftSessions && nightShiftSessions.length > 0) {
      const today = new Date().toISOString().split('T')[0];
      const nightEndDateTime = `${today}T${nightShiftEndTime}`;

      for (const session of nightShiftSessions) {
        const clockInTime = new Date(session.clock_in_time);
        const endTime = new Date(nightEndDateTime);
        const diffMs = endTime.getTime() - clockInTime.getTime();
        const totalHours = Math.max(0, diffMs / (1000 * 60 * 60));

        const { error: updateError } = await supabaseClient
          .from('attendance_logs')
          .update({
            clock_out_time: nightEndDateTime,
            total_hours: Number(totalHours.toFixed(2)),
            auto_clocked_out: true,
          })
          .eq('id', session.id);

        if (!updateError) {
          nightShiftClockouts++;
          const employee = Array.isArray(session.employee) ? session.employee[0] : session.employee;
          if (employee) {
            await supabaseClient
              .from('notifications')
              .insert({
                user_id: session.employee_id,
                type: 'auto_clock_out',
                title: '🌅 Night Shift Ended - Auto Clocked Out',
                message: `Your night shift has ended at ${nightShiftEndTime.substring(0, 5)}. You have been automatically clocked out.`,
              });
            console.log(`Night shift auto clocked-out: ${employee.first_name} ${employee.last_name}`);
          }
        } else {
          console.error(`Failed to clock-out night shift employee ${session.employee_id}:`, updateError);
        }
      }
    }

    const response = {
      success: true,
      timestamp: now.toISOString(),
      currentTime,
      closingTime,
      autoClockoutDeadline,
      notificationsSent,
      autoClockouts,
      nightShiftClockouts,
      activeSessions: activeSessions?.length || 0,
      nightShiftSessions: nightShiftSessions?.length || 0,
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
