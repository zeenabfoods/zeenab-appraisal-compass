import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface EscalationRule {
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
  created_at: string;
  updated_at: string;
}

export function useEscalationRules() {
  const [rules, setRules] = useState<EscalationRule[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRules = useCallback(async () => {
    try {
      setLoading(true);
      // For now, we'll store escalation rules in localStorage until we create a table
      const storedRules = localStorage.getItem('escalation_rules');
      if (storedRules) {
        setRules(JSON.parse(storedRules));
      }
    } catch (error) {
      console.error('Error fetching escalation rules:', error);
      toast.error('Failed to load escalation rules');
    } finally {
      setLoading(false);
    }
  }, []);

  const createRule = async (rule: Omit<EscalationRule, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const newRule: EscalationRule = {
        ...rule,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const storedRules = localStorage.getItem('escalation_rules');
      const existingRules = storedRules ? JSON.parse(storedRules) : [];
      const updatedRules = [...existingRules, newRule];
      localStorage.setItem('escalation_rules', JSON.stringify(updatedRules));

      toast.success('Escalation rule created successfully');
      await fetchRules();
      return newRule;
    } catch (error) {
      console.error('Error creating rule:', error);
      toast.error('Failed to create escalation rule');
      throw error;
    }
  };

  const updateRule = async (id: string, updates: Partial<EscalationRule>) => {
    try {
      const storedRules = localStorage.getItem('escalation_rules');
      const existingRules: EscalationRule[] = storedRules ? JSON.parse(storedRules) : [];
      const updatedRules = existingRules.map((rule) =>
        rule.id === id ? { ...rule, ...updates, updated_at: new Date().toISOString() } : rule
      );
      localStorage.setItem('escalation_rules', JSON.stringify(updatedRules));

      toast.success('Rule updated successfully');
      await fetchRules();
    } catch (error) {
      console.error('Error updating rule:', error);
      toast.error('Failed to update rule');
      throw error;
    }
  };

  const deleteRule = async (id: string) => {
    try {
      const storedRules = localStorage.getItem('escalation_rules');
      const existingRules: EscalationRule[] = storedRules ? JSON.parse(storedRules) : [];
      const updatedRules = existingRules.filter((rule) => rule.id !== id);
      localStorage.setItem('escalation_rules', JSON.stringify(updatedRules));

      toast.success('Rule deleted successfully');
      await fetchRules();
    } catch (error) {
      console.error('Error deleting rule:', error);
      toast.error('Failed to delete rule');
      throw error;
    }
  };

  const calculateEscalationMultiplier = useCallback(
    async (employeeId: string, violationType: string): Promise<number> => {
      try {
        // Find active rule for this violation type
        const activeRule = rules.find(
          (rule) => rule.violation_type === violationType && rule.is_active
        );

        if (!activeRule) return 1.0;

        // Calculate date range for lookback period
        const lookbackDate = new Date();
        lookbackDate.setDate(lookbackDate.getDate() - activeRule.lookback_period_days);

        // Count previous violations in the lookback period
        const { data: previousCharges, error } = await supabase
          .from('attendance_charges')
          .select('*')
          .eq('employee_id', employeeId)
          .eq('charge_type', violationType)
          .gte('charge_date', lookbackDate.toISOString().split('T')[0])
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
    },
    [rules]
  );

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  return {
    rules,
    loading,
    createRule,
    updateRule,
    deleteRule,
    calculateEscalationMultiplier,
    refetch: fetchRules,
  };
}
