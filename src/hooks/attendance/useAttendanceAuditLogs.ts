import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const PAGE_SIZE = 50;

interface AuditLog {
  id: string;
  action_type: string;
  action_category: string;
  performed_by: string;
  target_employee_id: string | null;
  target_record_id: string | null;
  target_table: string | null;
  old_values: object | null;
  new_values: object | null;
  reason: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  performer?: {
    first_name: string;
    last_name: string;
    email: string;
  };
  target_employee?: {
    first_name: string;
    last_name: string;
  };
}

interface AuditFilters {
  actionType?: string;
  actionCategory?: string;
  performedBy?: string;
  targetEmployee?: string;
  dateFrom?: string;
  dateTo?: string;
}

export function useAttendanceAuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [filters, setFilters] = useState<AuditFilters>({});

  const fetchLogs = useCallback(async (page: number = 1, currentFilters: AuditFilters = {}) => {
    try {
      setLoading(true);
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from('attendance_audit_logs')
        .select(`
          *,
          performer:profiles!attendance_audit_logs_performed_by_fkey(
            first_name,
            last_name,
            email
          ),
          target_employee:profiles!attendance_audit_logs_target_employee_id_fkey(
            first_name,
            last_name
          )
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

      // Apply filters
      if (currentFilters.actionType) {
        query = query.eq('action_type', currentFilters.actionType);
      }
      if (currentFilters.actionCategory) {
        query = query.eq('action_category', currentFilters.actionCategory);
      }
      if (currentFilters.performedBy) {
        query = query.eq('performed_by', currentFilters.performedBy);
      }
      if (currentFilters.targetEmployee) {
        query = query.eq('target_employee_id', currentFilters.targetEmployee);
      }
      if (currentFilters.dateFrom) {
        query = query.gte('created_at', currentFilters.dateFrom);
      }
      if (currentFilters.dateTo) {
        query = query.lte('created_at', currentFilters.dateTo + 'T23:59:59');
      }

      const { data, error, count } = await query;

      if (error) throw error;

      setLogs((data as unknown as AuditLog[]) || []);
      setTotalCount(count || 0);
      setCurrentPage(page);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      toast.error('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }, []);

  const applyFilters = useCallback((newFilters: AuditFilters) => {
    setFilters(newFilters);
    fetchLogs(1, newFilters);
  }, [fetchLogs]);

  const clearFilters = useCallback(() => {
    setFilters({});
    fetchLogs(1, {});
  }, [fetchLogs]);

  const goToPage = useCallback((page: number) => {
    fetchLogs(page, filters);
  }, [fetchLogs, filters]);

  useEffect(() => {
    fetchLogs(1, filters);
  }, []);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return {
    logs,
    loading,
    currentPage,
    totalPages,
    totalCount,
    filters,
    applyFilters,
    clearFilters,
    goToPage,
    refetch: () => fetchLogs(currentPage, filters),
    pageSize: PAGE_SIZE
  };
}
