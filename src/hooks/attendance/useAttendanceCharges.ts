import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { toast } from 'sonner';

type AttendanceCharge = Tables<'attendance_charges'>;

interface ChargeWithEmployee extends AttendanceCharge {
  employee?: {
    first_name: string;
    last_name: string;
    department: string;
    email: string;
  };
}

export function useAttendanceCharges() {
  const [charges, setCharges] = useState<ChargeWithEmployee[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCharges = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('attendance_charges')
        .select(`
          *,
          employee:profiles!attendance_charges_employee_id_fkey(
            first_name,
            last_name,
            department,
            email
          )
        `)
        .order('charge_date', { ascending: false })
        .limit(100);

      if (error) throw error;
      setCharges(data || []);
    } catch (error) {
      console.error('Error fetching charges:', error);
      toast.error('Failed to load attendance charges');
    } finally {
      setLoading(false);
    }
  }, []);

  const updateChargeStatus = async (
    id: string,
    updates: {
      status?: string;
      waived_by?: string;
      waiver_reason?: string;
      dispute_resolution?: string;
    }
  ) => {
    try {
      const { error } = await supabase
        .from('attendance_charges')
        .update({
          ...updates,
          ...(updates.waiver_reason && { waived_at: new Date().toISOString() }),
          ...(updates.dispute_resolution && { disputed_at: new Date().toISOString() }),
        })
        .eq('id', id);

      if (error) throw error;
      toast.success('Charge updated successfully');
      await fetchCharges();
    } catch (error) {
      console.error('Error updating charge:', error);
      toast.error('Failed to update charge');
      throw error;
    }
  };

  const getMonthlyReport = useCallback(async (month: string, year: number) => {
    try {
      const startDate = `${year}-${month.padStart(2, '0')}-01`;
      const endDate = `${year}-${month.padStart(2, '0')}-31`;

      const { data, error } = await supabase
        .from('attendance_charges')
        .select(`
          *,
          employee:profiles!attendance_charges_employee_id_fkey(
            first_name,
            last_name,
            department,
            email
          )
        `)
        .gte('charge_date', startDate)
        .lte('charge_date', endDate)
        .eq('status', 'pending')
        .order('employee_id');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching monthly report:', error);
      toast.error('Failed to generate monthly report');
      return [];
    }
  }, []);

  useEffect(() => {
    fetchCharges();
  }, [fetchCharges]);

  return {
    charges,
    loading,
    updateChargeStatus,
    getMonthlyReport,
    refetch: fetchCharges,
  };
}
