import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { startOfMonth, endOfMonth } from 'date-fns';

const PAGE_SIZE = 100;

export interface AttendanceLogFilters {
  branchId?: string;
  departmentFilter?: string;
  employeeFilter?: string;
  employeeIds?: string[];
  monthFilter?: string;
  startDate?: string;
  endDate?: string;
  locationFilter?: string;
  shiftFilter?: string;
  searchQuery?: string;
}

const buildNoAttendanceRow = (profile: any) => ({
  id: `no-attendance-${profile.id}`,
  employee_id: profile.id,
  employee: {
    id: profile.id,
    first_name: profile.first_name,
    last_name: profile.last_name,
    department: profile.department,
    position: profile.position,
    email: profile.email,
  },
  branch: null,
  clock_in_time: null,
  clock_out_time: null,
  total_hours: null,
  location_type: null,
  within_geofence_at_clock_in: null,
  geofence_distance_at_clock_in: null,
  field_work_location: null,
  field_work_reason: null,
  clock_in_latitude: null,
  clock_in_longitude: null,
  isPlaceholder: true,
});

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

      // Resolve search query to employee IDs server-side so search works across ALL records,
      // not just the current page. Matches first/last name, email, or department.
      let searchEmployeeIds: string[] | null = null;
      let searchedProfiles: any[] = [];
      if (filters.searchQuery && filters.searchQuery.trim()) {
        const q = filters.searchQuery.trim();
        const { data: matches, error: searchErr } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, department, position, email')
          .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,email.ilike.%${q}%,department.ilike.%${q}%`)
          .limit(1000);
        if (searchErr) throw searchErr;
        searchedProfiles = matches || [];
        searchEmployeeIds = searchedProfiles.map((m: any) => m.id);
        if (searchEmployeeIds.length === 0) {
          setAllLogs([]);
          setTotalCount(0);
          setHasMore(false);
          setCurrentPage(page);
          setLoading(false);
          return;
        }
      }

      if ((!filters.searchQuery || !filters.searchQuery.trim()) && filters.employeeFilter && filters.employeeFilter !== 'all') {
        const { data: employeeProfile, error: employeeErr } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, department, position, email')
          .eq('id', filters.employeeFilter)
          .maybeSingle();
        if (employeeErr) throw employeeErr;
        searchedProfiles = employeeProfile ? [employeeProfile] : [];
      }

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
      if (filters.employeeIds && filters.employeeIds.length > 0) {
        query = query.in('employee_id', filters.employeeIds);
      }
      if (searchEmployeeIds) {
        query = query.in('employee_id', searchEmployeeIds);
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

      const canShowNoAttendanceRows =
        page === 1 &&
        searchedProfiles.length > 0 &&
        (!filters.branchId || filters.branchId === 'all') &&
        (!filters.locationFilter || filters.locationFilter === 'all') &&
        (!filters.shiftFilter || filters.shiftFilter === 'all');

      if (canShowNoAttendanceRows) {
        const returnedEmployeeIds = new Set(filtered.map((log: any) => log.employee_id));
        const noAttendanceRows = searchedProfiles
          .filter((profile: any) => !returnedEmployeeIds.has(profile.id))
          .filter((profile: any) => !filters.departmentFilter || filters.departmentFilter === 'all' || profile.department === filters.departmentFilter)
          .map(buildNoAttendanceRow);

        filtered = [...filtered, ...noAttendanceRows];
        if (count !== null) setTotalCount(count + noAttendanceRows.length);
      } else if (count !== null) {
        setTotalCount(count);
      }

      setAllLogs(filtered);
      setHasMore((data?.length || 0) === PAGE_SIZE);
      setCurrentPage(page);
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
