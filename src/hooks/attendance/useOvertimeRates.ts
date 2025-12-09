import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface OvertimeRate {
  id: string;
  position_name: string;
  day_type: 'weekday' | 'saturday' | 'sunday';
  rate_amount: number;
  created_at: string;
  updated_at: string;
}

export function useOvertimeRates() {
  const [rates, setRates] = useState<OvertimeRate[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRates = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('overtime_rates')
        .select('*')
        .order('position_name', { ascending: true })
        .order('day_type', { ascending: true });

      if (error) throw error;
      setRates((data || []) as OvertimeRate[]);
    } catch (error) {
      console.error('Error fetching overtime rates:', error);
      toast.error('Failed to load overtime rates');
    } finally {
      setLoading(false);
    }
  }, []);

  const updateRate = async (id: string, rateAmount: number) => {
    try {
      const { error } = await supabase
        .from('overtime_rates')
        .update({ rate_amount: rateAmount, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      toast.success('Overtime rate updated');
      await fetchRates();
    } catch (error) {
      console.error('Error updating rate:', error);
      toast.error('Failed to update rate');
      throw error;
    }
  };

  const addRate = async (positionName: string, dayType: string, rateAmount: number) => {
    try {
      const { error } = await supabase
        .from('overtime_rates')
        .insert({ position_name: positionName, day_type: dayType, rate_amount: rateAmount });

      if (error) throw error;
      toast.success('Overtime rate added');
      await fetchRates();
    } catch (error) {
      console.error('Error adding rate:', error);
      toast.error('Failed to add rate');
      throw error;
    }
  };

  const deleteRate = async (id: string) => {
    try {
      const { error } = await supabase
        .from('overtime_rates')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Overtime rate deleted');
      await fetchRates();
    } catch (error) {
      console.error('Error deleting rate:', error);
      toast.error('Failed to delete rate');
      throw error;
    }
  };

  // Get rate for a specific position and day type
  const getRateForPosition = (position: string, date: Date): number => {
    const dayOfWeek = date.getDay();
    let dayType: 'weekday' | 'saturday' | 'sunday';
    
    if (dayOfWeek === 0) {
      dayType = 'sunday';
    } else if (dayOfWeek === 6) {
      dayType = 'saturday';
    } else {
      dayType = 'weekday';
    }

    const rate = rates.find(
      r => r.position_name.toLowerCase() === position.toLowerCase() && r.day_type === dayType
    );

    return rate?.rate_amount || 0;
  };

  // Calculate overtime amount based on hours and position
  const calculateOvertimeAmount = (hours: number, position: string, date: Date): number => {
    const hourlyRate = getRateForPosition(position, date);
    return hours * hourlyRate;
  };

  useEffect(() => {
    fetchRates();
  }, [fetchRates]);

  return {
    rates,
    loading,
    updateRate,
    addRate,
    deleteRate,
    getRateForPosition,
    calculateOvertimeAmount,
    refetch: fetchRates,
  };
}
