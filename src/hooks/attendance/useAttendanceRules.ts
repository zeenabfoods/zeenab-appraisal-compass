import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tables, TablesInsert } from '@/integrations/supabase/types';
import { toast } from 'sonner';

type AttendanceRule = Tables<'attendance_rules'>;
type AttendanceRuleInsert = TablesInsert<'attendance_rules'>;

export function useAttendanceRules() {
  const [rules, setRules] = useState<AttendanceRule[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRules = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('attendance_rules')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRules(data || []);
    } catch (error) {
      console.error('Error fetching attendance rules:', error);
      toast.error('Failed to load attendance rules');
    } finally {
      setLoading(false);
    }
  }, []);

  const createRule = async (rule: AttendanceRuleInsert) => {
    try {
      const { data, error } = await supabase
        .from('attendance_rules')
        .insert(rule)
        .select()
        .single();

      if (error) throw error;
      toast.success('Attendance rule created successfully');
      await fetchRules();
      return data;
    } catch (error) {
      console.error('Error creating rule:', error);
      toast.error('Failed to create attendance rule');
      throw error;
    }
  };

  const updateRule = async (id: string, updates: Partial<AttendanceRuleInsert>) => {
    try {
      const { error } = await supabase
        .from('attendance_rules')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
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
      const { error } = await supabase
        .from('attendance_rules')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
      toast.success('Rule deactivated successfully');
      await fetchRules();
    } catch (error) {
      console.error('Error deleting rule:', error);
      toast.error('Failed to deactivate rule');
      throw error;
    }
  };

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  return {
    rules,
    loading,
    createRule,
    updateRule,
    deleteRule,
    refetch: fetchRules,
  };
}
