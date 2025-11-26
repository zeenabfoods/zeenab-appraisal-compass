import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tables, TablesInsert } from '@/integrations/supabase/types';
import { toast } from 'sonner';
import { useAuthContext } from '@/components/AuthProvider';

type AttendanceLog = Tables<'attendance_logs'>;
type AttendanceLogInsert = TablesInsert<'attendance_logs'>;

interface ClockInParams {
  locationType: 'office' | 'field';
  latitude?: number;
  longitude?: number;
  branchId?: string;
  fieldWorkReason?: string;
  fieldWorkLocation?: string;
  withinGeofence?: boolean;
  geofenceDistance?: number;
}

export function useAttendanceLogs() {
  const { profile } = useAuthContext();
  const [todayLog, setTodayLog] = useState<AttendanceLog | null>(null);
  const [recentLogs, setRecentLogs] = useState<AttendanceLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isClocked, setIsClocked] = useState(false);

  const fetchTodayLog = useCallback(async () => {
    if (!profile?.id) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('attendance_logs')
        .select('*')
        .eq('employee_id', profile.id)
        .gte('clock_in_time', `${today}T00:00:00`)
        .lte('clock_in_time', `${today}T23:59:59`)
        .is('clock_out_time', null)
        .order('clock_in_time', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setTodayLog(data);
      setIsClocked(!!data);
    } catch (error) {
      console.error('Error fetching today log:', error);
    } finally {
      setLoading(false);
    }
  }, [profile?.id]);

  const fetchRecentLogs = useCallback(async () => {
    if (!profile?.id) return;

    try {
      const { data, error } = await supabase
        .from('attendance_logs')
        .select('*')
        .eq('employee_id', profile.id)
        .order('clock_in_time', { ascending: false })
        .limit(10);

      if (error) throw error;
      setRecentLogs(data || []);
    } catch (error) {
      console.error('Error fetching recent logs:', error);
    }
  }, [profile?.id]);

  const clockIn = async (params: ClockInParams) => {
    if (!profile?.id) {
      toast.error('Please log in to clock in');
      return;
    }

    try {
      const logData: AttendanceLogInsert = {
        employee_id: profile.id,
        location_type: params.locationType,
        clock_in_latitude: params.latitude,
        clock_in_longitude: params.longitude,
        branch_id: params.branchId,
        field_work_reason: params.fieldWorkReason,
        field_work_location: params.fieldWorkLocation,
        within_geofence_at_clock_in: params.withinGeofence,
        geofence_distance_at_clock_in: params.geofenceDistance,
        device_timestamp: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('attendance_logs')
        .insert(logData)
        .select()
        .single();

      if (error) throw error;

      setTodayLog(data);
      setIsClocked(true);
      toast.success('Clocked in successfully');

      // Trigger haptic feedback if available
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }

      return data;
    } catch (error) {
      console.error('Error clocking in:', error);
      toast.error('Failed to clock in');
      throw error;
    }
  };

  const clockOut = async (latitude?: number, longitude?: number, withinGeofence?: boolean) => {
    if (!todayLog) {
      toast.error('No active clock-in found');
      return;
    }

    try {
      const clockOutTime = new Date().toISOString();
      const clockInTime = new Date(todayLog.clock_in_time);
      const diffMs = new Date(clockOutTime).getTime() - clockInTime.getTime();
      const totalHours = diffMs / (1000 * 60 * 60);

      const { error } = await supabase
        .from('attendance_logs')
        .update({
          clock_out_time: clockOutTime,
          clock_out_latitude: latitude,
          clock_out_longitude: longitude,
          within_geofence_at_clock_out: withinGeofence,
          total_hours: Number(totalHours.toFixed(2)),
        })
        .eq('id', todayLog.id);

      if (error) throw error;

      setTodayLog(null);
      setIsClocked(false);
      toast.success('Clocked out successfully');

      // Trigger haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate([50, 50, 50]);
      }

      await fetchRecentLogs();
    } catch (error) {
      console.error('Error clocking out:', error);
      toast.error('Failed to clock out');
      throw error;
    }
  };

  useEffect(() => {
    if (profile?.id) {
      fetchTodayLog();
      fetchRecentLogs();
    }
  }, [profile?.id, fetchTodayLog, fetchRecentLogs]);

  return {
    todayLog,
    recentLogs,
    loading,
    isClocked,
    clockIn,
    clockOut,
    refetch: fetchTodayLog,
  };
}
