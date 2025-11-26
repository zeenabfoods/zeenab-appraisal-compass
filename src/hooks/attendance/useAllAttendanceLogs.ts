import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useAllAttendanceLogs() {
  const [allLogs, setAllLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAllLogs = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('attendance_logs')
        .select(`
          *,
          employee:profiles!attendance_logs_employee_id_fkey(
            id,
            first_name,
            last_name,
            department,
            position,
            email
          ),
          branch:attendance_branches!attendance_logs_branch_id_fkey(
            name,
            address
          )
        `)
        .order('clock_in_time', { ascending: false })
        .limit(200);

      if (error) throw error;
      setAllLogs(data || []);
    } catch (error) {
      console.error('Error fetching all attendance logs:', error);
      toast.error('Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllLogs();
  }, [fetchAllLogs]);

  return {
    allLogs,
    loading,
    refetch: fetchAllLogs,
  };
}
