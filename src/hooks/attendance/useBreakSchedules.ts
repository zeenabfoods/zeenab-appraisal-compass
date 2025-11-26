import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BreakSchedule {
  id: string;
  break_type: string;
  break_name: string;
  scheduled_start_time: string;
  scheduled_end_time: string;
  duration_minutes: number;
  is_mandatory: boolean;
  applies_to_departments: string[] | null;
  notification_minutes_before: number;
  is_active: boolean;
}

export function useBreakSchedules() {
  const [schedules, setSchedules] = useState<BreakSchedule[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSchedules = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('attendance_break_schedules')
        .select('*')
        .eq('is_active', true)
        .order('scheduled_start_time', { ascending: true });

      if (error) throw error;
      setSchedules(data || []);
    } catch (error) {
      console.error('Error fetching break schedules:', error);
      toast.error('Failed to load break schedules');
    } finally {
      setLoading(false);
    }
  }, []);

  const createSchedule = async (schedule: Omit<BreakSchedule, 'id'>) => {
    try {
      const { error } = await supabase
        .from('attendance_break_schedules')
        .insert(schedule);

      if (error) throw error;
      toast.success('Break schedule created');
      await fetchSchedules();
    } catch (error) {
      console.error('Error creating schedule:', error);
      toast.error('Failed to create schedule');
      throw error;
    }
  };

  const updateSchedule = async (id: string, updates: Partial<BreakSchedule>) => {
    try {
      const { error } = await supabase
        .from('attendance_break_schedules')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      toast.success('Break schedule updated');
      await fetchSchedules();
    } catch (error) {
      console.error('Error updating schedule:', error);
      toast.error('Failed to update schedule');
      throw error;
    }
  };

  const deleteSchedule = async (id: string) => {
    try {
      const { error } = await supabase
        .from('attendance_break_schedules')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
      toast.success('Break schedule deleted');
      await fetchSchedules();
    } catch (error) {
      console.error('Error deleting schedule:', error);
      toast.error('Failed to delete schedule');
      throw error;
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  return {
    schedules,
    loading,
    createSchedule,
    updateSchedule,
    deleteSchedule,
    refetch: fetchSchedules,
  };
}
