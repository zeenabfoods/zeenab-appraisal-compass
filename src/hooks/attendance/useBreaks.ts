import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuthContext } from '@/components/AuthProvider';

interface Break {
  id: string;
  attendance_log_id: string;
  employee_id: string;
  break_type: string;
  break_start: string;
  break_end: string | null;
  break_duration_minutes: number | null;
  break_start_latitude: number | null;
  break_start_longitude: number | null;
}

export function useBreaks(attendanceLogId: string | null) {
  const { profile } = useAuthContext();
  const [activeBreak, setActiveBreak] = useState<Break | null>(null);
  const [todayBreaks, setTodayBreaks] = useState<Break[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchActiveBreak = useCallback(async () => {
    if (!profile?.id || !attendanceLogId) return;

    try {
      const { data, error } = await supabase
        .from('attendance_breaks')
        .select('*')
        .eq('employee_id', profile.id)
        .eq('attendance_log_id', attendanceLogId)
        .is('break_end', null)
        .order('break_start', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setActiveBreak(data);
    } catch (error) {
      console.error('Error fetching active break:', error);
    }
  }, [profile?.id, attendanceLogId]);

  const fetchTodayBreaks = useCallback(async () => {
    if (!profile?.id) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('attendance_breaks')
        .select('*')
        .eq('employee_id', profile.id)
        .gte('break_start', `${today}T00:00:00`)
        .lte('break_start', `${today}T23:59:59`)
        .order('break_start', { ascending: false });

      if (error) throw error;
      setTodayBreaks(data || []);
    } catch (error) {
      console.error('Error fetching today breaks:', error);
    }
  }, [profile?.id]);

  const startBreak = async (breakType: string = 'short_break') => {
    if (!profile?.id || !attendanceLogId) {
      toast.error('Please clock in first');
      return;
    }

    if (activeBreak) {
      toast.error('Please end your current break first');
      return;
    }

    try {
      setLoading(true);

      // Get current location
      let latitude: number | undefined;
      let longitude: number | undefined;

      if ('geolocation' in navigator) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 5000,
            });
          });
          latitude = position.coords.latitude;
          longitude = position.coords.longitude;
        } catch (error) {
          console.log('Could not get location for break');
        }
      }

      const { data, error } = await supabase
        .from('attendance_breaks')
        .insert({
          employee_id: profile.id,
          attendance_log_id: attendanceLogId,
          break_type: breakType,
          break_start_latitude: latitude,
          break_start_longitude: longitude,
        })
        .select()
        .single();

      if (error) throw error;

      setActiveBreak(data);
      toast.success(`${breakType === 'lunch' ? 'Lunch' : 'Short'} break started`);

      // Haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }

      await fetchTodayBreaks();
    } catch (error) {
      console.error('Error starting break:', error);
      toast.error('Failed to start break');
    } finally {
      setLoading(false);
    }
  };

  const endBreak = async () => {
    if (!activeBreak) {
      toast.error('No active break found');
      return;
    }

    try {
      setLoading(true);

      const breakEndTime = new Date().toISOString();
      const breakStartTime = new Date(activeBreak.break_start);
      const durationMs = new Date(breakEndTime).getTime() - breakStartTime.getTime();
      const durationMinutes = Math.round(durationMs / (1000 * 60));

      const { error } = await supabase
        .from('attendance_breaks')
        .update({
          break_end: breakEndTime,
          break_duration_minutes: durationMinutes,
        })
        .eq('id', activeBreak.id);

      if (error) throw error;

      setActiveBreak(null);
      toast.success(`Break ended (${durationMinutes} minutes)`);

      // Haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate([50, 50, 50]);
      }

      await fetchTodayBreaks();
    } catch (error) {
      console.error('Error ending break:', error);
      toast.error('Failed to end break');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile?.id && attendanceLogId) {
      fetchActiveBreak();
      fetchTodayBreaks();
    }
  }, [profile?.id, attendanceLogId, fetchActiveBreak, fetchTodayBreaks]);

  return {
    activeBreak,
    todayBreaks,
    loading,
    startBreak,
    endBreak,
    refetch: () => {
      fetchActiveBreak();
      fetchTodayBreaks();
    },
  };
}
