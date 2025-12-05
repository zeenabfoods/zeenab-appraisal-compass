import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, format } from 'date-fns';

export type LatenessRecord = {
  id: string;
  employee_id: string;
  employee_name: string;
  department_name: string;
  branch_name: string;
  clock_in_time: string;
  is_late: boolean;
  late_by_minutes: number;
  clock_out_time: string | null;
  status: 'on-time' | 'late' | 'absent' | 'early-closure';
};

export type LatenessStats = {
  totalRecords: number;
  onTimeCount: number;
  lateCount: number;
  absentCount: number;
  earlyClosureCount: number;
  averageLateMinutes: number;
};

export function useLatenessData() {
  const [records, setRecords] = useState<LatenessRecord[]>([]);
  const [stats, setStats] = useState<LatenessStats>({
    totalRecords: 0,
    onTimeCount: 0,
    lateCount: 0,
    absentCount: 0,
    earlyClosureCount: 0,
    averageLateMinutes: 0,
  });
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<'day' | 'week' | 'month' | 'all'>('week');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [employeeFilter, setEmployeeFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'late' | 'on-time' | 'early-closure' | 'absent'>('all');

  const fetchLatenessData = useCallback(async () => {
    try {
      setLoading(true);
      
      let startDate: string | null = null;
      let endDate: string | null = null;

      if (dateFilter === 'day') {
        startDate = format(selectedDate, 'yyyy-MM-dd');
        endDate = startDate;
      } else if (dateFilter === 'week') {
        startDate = format(startOfWeek(selectedDate), 'yyyy-MM-dd');
        endDate = format(endOfWeek(selectedDate), 'yyyy-MM-dd');
      } else if (dateFilter === 'month') {
        startDate = format(startOfMonth(selectedDate), 'yyyy-MM-dd');
        endDate = format(endOfMonth(selectedDate), 'yyyy-MM-dd');
      }

      // Fetch attendance rules for lateness calculation
      const { data: rulesData } = await supabase
        .from('attendance_rules')
        .select('work_start_time, late_threshold_minutes, grace_period_minutes')
        .eq('is_active', true)
        .limit(1)
        .single();

      const workStartTime = rulesData?.work_start_time || '08:00:00';
      const lateThreshold = rulesData?.late_threshold_minutes || 15;
      const gracePeriod = rulesData?.grace_period_minutes || 0;

      // First get attendance logs with employee and branch info
      let query = supabase
        .from('attendance_logs')
        .select(`
          id,
          employee_id,
          clock_in_time,
          clock_out_time,
          is_late,
          late_by_minutes,
          branch_id
        `)
        .order('clock_in_time', { ascending: false });

      if (startDate && endDate) {
        query = query
          .gte('clock_in_time', `${startDate}T00:00:00`)
          .lte('clock_in_time', `${endDate}T23:59:59`);
      }

      if (employeeFilter !== 'all') {
        query = query.eq('employee_id', employeeFilter);
      }

      if (branchFilter !== 'all') {
        query = query.eq('branch_id', branchFilter);
      }

      const { data: logsData, error: logsError } = await query;

      if (logsError) throw logsError;

      // Get ALL active employees to calculate absences
      let allEmployeesQuery = supabase
        .from('profiles')
        .select('id, first_name, last_name, department_id')
        .eq('is_active', true);

      const { data: allEmployeesData } = await allEmployeesQuery;

      // Get employee details for those who clocked in
      const employeeIds = [...new Set(logsData?.map(log => log.employee_id) || [])];
      
      // Get department details
      const deptIds = [...new Set(allEmployeesData?.map(emp => emp.department_id).filter(Boolean) || [])];
      const { data: departmentsData } = await supabase
        .from('departments')
        .select('id, name')
        .in('id', deptIds.length > 0 ? deptIds : ['00000000-0000-0000-0000-000000000000']);

      // Get branch details
      const branchIds = [...new Set(logsData?.map(log => log.branch_id).filter(Boolean) || [])];
      const { data: branchesData } = await supabase
        .from('attendance_branches')
        .select('id, name')
        .in('id', branchIds.length > 0 ? branchIds : ['00000000-0000-0000-0000-000000000000']);

      // Create lookup maps
      const employeeMap = new Map(allEmployeesData?.map(emp => [emp.id, emp]) || []);
      const deptMap = new Map(departmentsData?.map(dept => [dept.id, dept]) || []);
      const branchMap = new Map(branchesData?.map(branch => [branch.id, branch]) || []);

      // Helper function to calculate lateness
      // Only grace period is used - anyone clocking in after work_start_time + grace_period is LATE
      const calculateLateness = (clockInTime: string) => {
        const clockIn = new Date(clockInTime);
        const [workHour, workMin] = workStartTime.split(':').map(Number);
        
        // Create work start time for the same day as clock-in
        const workStart = new Date(clockIn);
        workStart.setHours(workHour, workMin, 0, 0);
        
        // Late deadline = work start + grace period ONLY
        // e.g., work starts 8:00 + 5 min grace = 8:05 deadline, 8:06 is late
        const lateDeadline = new Date(workStart.getTime() + gracePeriod * 60 * 1000);
        
        if (clockIn > lateDeadline) {
          const lateMinutes = Math.round((clockIn.getTime() - workStart.getTime()) / (60 * 1000));
          return { isLate: true, lateByMinutes: lateMinutes };
        }
        return { isLate: false, lateByMinutes: 0 };
      };

      // Process attendance logs
      let processedRecords: LatenessRecord[] = (logsData || []).map((log: any) => {
        const employee = employeeMap.get(log.employee_id);
        const department = employee?.department_id ? deptMap.get(employee.department_id) : null;
        const branch = log.branch_id ? branchMap.get(log.branch_id) : null;
        
        // Recalculate lateness based on clock_in_time
        const { isLate, lateByMinutes } = log.clock_in_time 
          ? calculateLateness(log.clock_in_time)
          : { isLate: false, lateByMinutes: 0 };
        
        let status: 'on-time' | 'late' | 'absent' | 'early-closure' = 'on-time';
        
        if (!log.clock_in_time) {
          status = 'absent';
        } else if (isLate) {
          status = 'late';
        } else if (log.clock_out_time) {
          const clockOut = new Date(log.clock_out_time);
          const clockIn = new Date(log.clock_in_time);
          const hoursWorked = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60);
          if (hoursWorked < 7) {
            status = 'early-closure';
          }
        }

        return {
          id: log.id,
          employee_id: log.employee_id,
          employee_name: `${employee?.first_name || ''} ${employee?.last_name || ''}`.trim() || 'Unknown',
          department_name: department?.name || 'No Department',
          branch_name: branch?.name || 'No Branch',
          clock_in_time: log.clock_in_time,
          clock_out_time: log.clock_out_time,
          is_late: isLate,
          late_by_minutes: lateByMinutes,
          status,
        };
      });

      // Calculate absent employees (those who didn't clock in during the period)
      // For day filter: employees who didn't clock in on that specific day
      // For week/month/all: employees who didn't clock in at all during the period
      const clockedInEmployeeIds = new Set(employeeIds);
      const totalActiveEmployees = allEmployeesData?.length || 0;
      const absentEmployees = (allEmployeesData || []).filter(emp => !clockedInEmployeeIds.has(emp.id));
      
      // Only create absent records (for display) if filtering by day or if status filter is 'absent'
      // This prevents inflating total record count for week/month views
      let absentRecords: LatenessRecord[] = [];
      
      if (dateFilter === 'day' || statusFilter === 'absent') {
        absentRecords = absentEmployees.map(emp => {
          const department = emp.department_id ? deptMap.get(emp.department_id) : null;
          return {
            id: `absent-${emp.id}-${format(selectedDate, 'yyyy-MM-dd')}`,
            employee_id: emp.id,
            employee_name: `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || 'Unknown',
            department_name: department?.name || 'No Department',
            branch_name: 'N/A',
            clock_in_time: '',
            clock_out_time: null,
            is_late: false,
            late_by_minutes: 0,
            status: 'absent' as const,
          };
        });
      }

      // Combine attendance records with absent records
      processedRecords = [...processedRecords, ...absentRecords];

      // Filter by department
      if (departmentFilter !== 'all') {
        processedRecords = processedRecords.filter(
          (record) => record.department_name === departmentFilter
        );
      }

      // Filter by status
      if (statusFilter !== 'all') {
        processedRecords = processedRecords.filter(
          (record) => record.status === statusFilter
        );
      }

      setRecords(processedRecords);

      // Calculate statistics - use unique employee counts for accuracy
      // Total records = attendance logs count (not including absent records unless viewing day/absent filter)
      const attendanceLogsCount = logsData?.length || 0;
      const uniqueClockedInCount = clockedInEmployeeIds.size;
      const totalAbsentCount = absentEmployees.length;
      
      // For stats display, use the original attendance log counts
      const onTimeCount = processedRecords.filter((r) => r.status === 'on-time').length;
      const lateCount = processedRecords.filter((r) => r.status === 'late').length;
      const earlyClosureCount = processedRecords.filter((r) => r.status === 'early-closure').length;
      
      // Total records depends on view mode:
      // - Day view: total employees (clocked in + absent)
      // - Week/Month view: total attendance logs only (absent shown as stat, not records)
      const totalRecords = dateFilter === 'day' || statusFilter === 'absent' 
        ? processedRecords.length 
        : attendanceLogsCount;
      
      const totalLateMinutes = processedRecords
        .filter((r) => r.status === 'late')
        .reduce((sum, r) => sum + r.late_by_minutes, 0);
      const averageLateMinutes = lateCount > 0 ? totalLateMinutes / lateCount : 0;

      setStats({
        totalRecords,
        onTimeCount,
        lateCount,
        absentCount: totalAbsentCount,
        earlyClosureCount,
        averageLateMinutes,
      });
    } catch (error) {
      console.error('Error fetching lateness data:', error);
      toast.error('Failed to load lateness data');
    } finally {
      setLoading(false);
    }
  }, [dateFilter, selectedDate, employeeFilter, departmentFilter, branchFilter, statusFilter]);

  useEffect(() => {
    fetchLatenessData();
  }, [fetchLatenessData]);

  return {
    records,
    stats,
    loading,
    dateFilter,
    setDateFilter,
    selectedDate,
    setSelectedDate,
    employeeFilter,
    setEmployeeFilter,
    departmentFilter,
    setDepartmentFilter,
    branchFilter,
    setBranchFilter,
    statusFilter,
    setStatusFilter,
    refetch: fetchLatenessData,
  };
}
