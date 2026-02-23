import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { startOfMonth, endOfMonth } from 'date-fns';

const PAGE_SIZE = 100;

export interface AttendanceLogFilters {
  branchId?: string;
  departmentFilter?: string;
  employeeFilter?: string;
  monthFilter?: string;
  startDate?: string;
  endDate?: string;
  locationFilter?: string;
  shiftFilter?: string;
  searchQuery?: string;
}

export function useAllAttendanceLogs(filters: AttendanceLogFilters = {}) {
  const [allLogs, setAllLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // Serialize filters for dependency tracking
  const filterKey = JSON.stringify(filters);

  const fetchAllLogs = useCallback(async (page: number = 1) => {
    try {
      setLoading(true);
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
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
            id,
            name,
            address
          )
        `, { count: 'exact' });

      // Server-side filters
      if (filters.employeeFilter && filters.employeeFilter !== 'all') {
        query = query.eq('employee_id', filters.employeeFilter);
      }
      if (filters.branchId && filters.branchId !== 'all') {
        query = query.eq('branch_id', filters.branchId);
      }
      if (filters.locationFilter && filters.locationFilter !== 'all') {
        query = query.eq('location_type', filters.locationFilter);
      }
      if (filters.shiftFilter === 'night') {
        query = query.eq('is_night_shift', true);
      } else if (filters.shiftFilter === 'day') {
        query = query.eq('is_night_shift', false);
      }

      // Date filters
      if (filters.startDate) {
        query = query.gte('clock_in_time', `${filters.startDate}T00:00:00`);
      }
      if (filters.endDate) {
        query = query.lte('clock_in_time', `${filters.endDate}T23:59:59`);
      }
      if (filters.monthFilter && filters.monthFilter !== 'all') {
        const selectedMonth = new Date(filters.monthFilter + '-01');
        const monthStart = startOfMonth(selectedMonth);
        const monthEnd = endOfMonth(selectedMonth);
        query = query.gte('clock_in_time', monthStart.toISOString());
        query = query.lte('clock_in_time', monthEnd.toISOString());
      }

      query = query.order('clock_in_time', { ascending: false }).range(from, to);

      const { data, count, error } = await query;

      if (error) throw error;
      
      let filtered = data || [];

      // Client-side filters for joined fields (department, search)
      if (filters.departmentFilter && filters.departmentFilter !== 'all') {
        filtered = filtered.filter((log: any) => log.employee?.department === filters.departmentFilter);
      }
      if (filters.searchQuery) {
        const q = filters.searchQuery.toLowerCase();
        filtered = filtered.filter((log: any) => {
          const name = `${log.employee?.first_name} ${log.employee?.last_name}`.toLowerCase();
          const email = log.employee?.email?.toLowerCase() || '';
          const dept = log.employee?.department?.toLowerCase() || '';
          return name.includes(q) || email.includes(q) || dept.includes(q);
        });
      }

      setAllLogs(filtered);
      setHasMore((data?.length || 0) === PAGE_SIZE);
      setCurrentPage(page);
      if (count !== null) setTotalCount(count);
    } catch (error) {
      console.error('Error fetching all attendance logs:', error);
      toast.error('Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey]);

  useEffect(() => {
    fetchAllLogs(1);
  }, [fetchAllLogs]);

  const deleteLog = useCallback(async (logId: string) => {
    try {
      const { error } = await supabase
        .from('attendance_logs')
        .delete()
        .eq('id', logId);

      if (error) throw error;
      
      toast.success('Attendance record deleted');
      await fetchAllLogs(currentPage);
    } catch (error) {
      console.error('Error deleting attendance log:', error);
      toast.error('Failed to delete record');
    }
  }, [fetchAllLogs, currentPage]);

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
