import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EscalationRule {
  id: string;
  rule_name: string;
  violation_type: 'late_arrival' | 'absence' | 'early_departure' | 'break_violation';
  lookback_period_days: number;
  escalation_tiers: {
    occurrence_count: number;
    multiplier: number;
  }[];
  reset_after_days: number;
  is_active: boolean;
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
    
    // Use provided date or yesterday
    const calculationDate = targetDate 
      ? new Date(targetDate) 
      : new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const dateStr = calculationDate.toISOString().split('T')[0];

    console.log(`Calculating charges for date: ${dateStr}`);

    // Get active attendance rules
    const { data: rules, error: rulesError } = await supabaseClient
      .from('attendance_rules')
      .select('*')
      .eq('is_active', true)
      .limit(1)
      .single();

    if (rulesError || !rules) {
      console.error('No active attendance rules found:', rulesError);
      return new Response(
        JSON.stringify({ error: 'No active attendance rules configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Get escalation rules from localStorage (stored as metadata in a settings table)
    // For now, we'll use default escalation rules
    const escalationRules: EscalationRule[] = [];

    // Get all employees
    const { data: employees, error: employeesError } = await supabaseClient
      .from('profiles')
      .select('id')
      .eq('is_active', true);

    if (employeesError) throw employeesError;

    const chargesCreated: any[] = [];
    const errors: string[] = [];

    // Process each employee
    for (const employee of employees || []) {
      try {
        // Get attendance log for this employee on the target date
        const { data: logs, error: logsError } = await supabaseClient
          .from('attendance_logs')
          .select('*')
          .eq('employee_id', employee.id)
          .gte('clock_in_time', `${dateStr}T00:00:00`)
          .lte('clock_in_time', `${dateStr}T23:59:59`)
          .order('clock_in_time', { ascending: false });

        if (logsError) throw logsError;

        // Check for absence (no clock-in)
        if (!logs || logs.length === 0) {
          // Calculate escalation for absences
          const multiplier = await calculateEscalationMultiplier(
            supabaseClient,
            employee.id,
            'absence',
            escalationRules,
            calculationDate
          );

          const chargeAmount = (rules.absence_charge_amount || 0) * multiplier;

          const { data: charge, error: chargeError } = await supabaseClient
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

          if (chargeError) throw chargeError;
          chargesCreated.push(charge);

          // Send notification
          await supabaseClient.from('notifications').insert({
            user_id: employee.id,
            type: 'attendance_charge',
            title: 'Absence Charge Applied',
            message: `An absence charge of ₦${chargeAmount.toFixed(2)} has been applied for ${dateStr}${multiplier > 1 ? ` (${multiplier}x escalation)` : ''}.`,
          });
        } else {
          // Check for late arrival
          const log = logs[0];
          
          if (log.is_late && log.late_by_minutes && log.late_by_minutes > (rules.grace_period_minutes || 0)) {
            // Calculate escalation for late arrivals
            const multiplier = await calculateEscalationMultiplier(
              supabaseClient,
              employee.id,
              'late_arrival',
              escalationRules,
              calculationDate
            );

            const chargeAmount = (rules.late_charge_amount || 0) * multiplier;

            const { data: charge, error: chargeError } = await supabaseClient
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

            if (chargeError) throw chargeError;
            chargesCreated.push(charge);

            // Send notification
            await supabaseClient.from('notifications').insert({
              user_id: employee.id,
              type: 'attendance_charge',
              title: 'Late Arrival Charge Applied',
              message: `A late arrival charge of ₦${chargeAmount.toFixed(2)} has been applied for ${dateStr} (${log.late_by_minutes} minutes late)${multiplier > 1 ? ` with ${multiplier}x escalation` : ''}.`,
            });
          }
        }
      } catch (error) {
        console.error(`Error processing employee ${employee.id}:`, error);
        errors.push(`Employee ${employee.id}: ${error.message}`);
      }
    }

    console.log(`Charges calculation complete. Created: ${chargesCreated.length}, Errors: ${errors.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        date: dateStr,
        chargesCreated: chargesCreated.length,
        charges: chargesCreated,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error calculating charges:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

async function calculateEscalationMultiplier(
  supabaseClient: any,
  employeeId: string,
  violationType: string,
  escalationRules: EscalationRule[],
  currentDate: Date
): Promise<number> {
  try {
    // Find active rule for this violation type
    const activeRule = escalationRules.find(
      (rule) => rule.violation_type === violationType && rule.is_active
    );

    if (!activeRule) return 1.0;

    // Calculate lookback date
    const lookbackDate = new Date(currentDate);
    lookbackDate.setDate(lookbackDate.getDate() - activeRule.lookback_period_days);
    const lookbackDateStr = lookbackDate.toISOString().split('T')[0];

    // Count previous violations in the lookback period
    const { data: previousCharges, error } = await supabaseClient
      .from('attendance_charges')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('charge_type', violationType)
      .gte('charge_date', lookbackDateStr)
      .order('charge_date', { ascending: false });

    if (error) throw error;

    const occurrenceCount = (previousCharges?.length || 0) + 1; // +1 for current violation

    // Find appropriate tier
    const sortedTiers = [...activeRule.escalation_tiers].sort(
      (a, b) => b.occurrence_count - a.occurrence_count
    );

    for (const tier of sortedTiers) {
      if (occurrenceCount >= tier.occurrence_count) {
        return tier.multiplier;
      }
    }

    return 1.0;
  } catch (error) {
    console.error('Error calculating escalation multiplier:', error);
    return 1.0;
  }
}
