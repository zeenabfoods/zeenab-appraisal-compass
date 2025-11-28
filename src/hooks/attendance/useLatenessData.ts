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

      let query = supabase
        .from('attendance_logs')
        .select(`
          id,
          employee_id,
          clock_in_time,
          clock_out_time,
          is_late,
          late_by_minutes,
          employee:profiles!attendance_logs_employee_id_fkey(
            first_name,
            last_name,
            department_id,
            department:departments(name)
          ),
          branch:attendance_branches!attendance_logs_branch_id_fkey(
            name
          )
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

      const { data, error } = await query;

      if (error) throw error;

      // Process and filter data
      let processedRecords: LatenessRecord[] = (data || []).map((log: any) => {
        const employee = log.employee || {};
        const department = employee.department || {};
        const branch = log.branch || {};
        
        let status: 'on-time' | 'late' | 'absent' | 'early-closure' = 'on-time';
        
        if (!log.clock_in_time) {
          status = 'absent';
        } else if (log.is_late) {
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
          employee_name: `${employee.first_name || ''} ${employee.last_name || ''}`.trim(),
          department_name: department.name || 'No Department',
          branch_name: branch.name || 'No Branch',
          clock_in_time: log.clock_in_time,
          clock_out_time: log.clock_out_time,
          is_late: log.is_late || false,
          late_by_minutes: log.late_by_minutes || 0,
          status,
        };
      });

      // Filter by department
      if (departmentFilter !== 'all') {
        processedRecords = processedRecords.filter(
          (record) => record.department_name === departmentFilter
        );
      }

      setRecords(processedRecords);

      // Calculate statistics
      const totalRecords = processedRecords.length;
      const onTimeCount = processedRecords.filter((r) => r.status === 'on-time').length;
      const lateCount = processedRecords.filter((r) => r.status === 'late').length;
      const absentCount = processedRecords.filter((r) => r.status === 'absent').length;
      const earlyClosureCount = processedRecords.filter((r) => r.status === 'early-closure').length;
      
      const totalLateMinutes = processedRecords
        .filter((r) => r.status === 'late')
        .reduce((sum, r) => sum + r.late_by_minutes, 0);
      const averageLateMinutes = lateCount > 0 ? totalLateMinutes / lateCount : 0;

      setStats({
        totalRecords,
        onTimeCount,
        lateCount,
        absentCount,
        earlyClosureCount,
        averageLateMinutes,
      });
    } catch (error) {
      console.error('Error fetching lateness data:', error);
      toast.error('Failed to load lateness data');
    } finally {
      setLoading(false);
    }
  }, [dateFilter, selectedDate, employeeFilter, departmentFilter, branchFilter]);

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
    refetch: fetchLatenessData,
  };
}
