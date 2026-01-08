import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const PAGE_SIZE = 50;

export function useAllAttendanceLogs() {
  const [allLogs, setAllLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const fetchTotalCount = useCallback(async () => {
    const { count, error } = await supabase
      .from('attendance_logs')
      .select('*', { count: 'exact', head: true });
    
    if (!error && count !== null) {
      setTotalCount(count);
    }
  }, []);

  const fetchAllLogs = useCallback(async (page: number = 1) => {
    try {
      setLoading(true);
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

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
        .range(from, to);

      if (error) throw error;
      
      setAllLogs(data || []);
      setHasMore((data?.length || 0) === PAGE_SIZE);
      setCurrentPage(page);
    } catch (error) {
      console.error('Error fetching all attendance logs:', error);
      toast.error('Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllLogs(1);
    fetchTotalCount();
  }, [fetchAllLogs, fetchTotalCount]);

  const deleteLog = useCallback(async (logId: string) => {
    try {
      const { error } = await supabase
        .from('attendance_logs')
        .delete()
        .eq('id', logId);

      if (error) throw error;
      
      toast.success('Attendance record deleted');
      await fetchAllLogs(currentPage);
      await fetchTotalCount();
    } catch (error) {
      console.error('Error deleting attendance log:', error);
      toast.error('Failed to delete record');
    }
  }, [fetchAllLogs, fetchTotalCount, currentPage]);

  const goToPage = useCallback((page: number) => {
    fetchAllLogs(page);
  }, [fetchAllLogs]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return {
    allLogs,
    loading,
    refetch: () => fetchAllLogs(currentPage),
    deleteLog,
    currentPage,
    totalPages,
    totalCount,
    hasMore,
    goToPage,
    pageSize: PAGE_SIZE,
  };
}
