import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuthContext } from '@/components/AuthProvider';
import { playAttendanceNotification } from '@/utils/attendanceNotifications';

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
  const [breakHistory, setBreakHistory] = useState<Break[]>([]);
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

  const fetchBreakHistory = useCallback(async () => {
    if (!profile?.id) return;

    try {
      const { data, error } = await supabase
        .from('attendance_breaks')
        .select('*')
        .eq('employee_id', profile.id)
        .not('break_end', 'is', null)
        .order('break_start', { ascending: false })
        .limit(50);

      if (error) throw error;
      setBreakHistory(data || []);
    } catch (error) {
      console.error('Error fetching break history:', error);
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

    // Check if employee already has a break today
    const today = new Date().toISOString().split('T')[0];
    const { data: existingBreaks, error: checkError } = await supabase
      .from('attendance_breaks')
      .select('id')
      .eq('employee_id', profile.id)
      .gte('break_start', `${today}T00:00:00`)
      .lte('break_start', `${today}T23:59:59`);

    if (checkError) {
      console.error('Error checking existing breaks:', checkError);
    }

    if (existingBreaks && existingBreaks.length > 0) {
      toast.error('Only One Break Per Day', {
        description: 'You have already taken your break for today. Only one break is allowed per employee per day.',
      });
      return;
    }

    try {
      setLoading(true);

      // Check if break is within scheduled time
      const { data: schedules } = await supabase
        .from('attendance_break_schedules')
        .select('*')
        .eq('is_active', true)
        .eq('break_type', breakType);

      if (schedules && schedules.length > 0) {
        const now = new Date();
        const currentHours = now.getHours();
        const currentMinutes = now.getMinutes();
        const currentTimeInMinutes = currentHours * 60 + currentMinutes;

        // Check if current time is within ANY scheduled window for this break type
        const isWithinSchedule = schedules.some(schedule => {
          const [startHour, startMinute] = schedule.scheduled_start_time.split(':').map(Number);
          const [endHour, endMinute] = schedule.scheduled_end_time.split(':').map(Number);
          
          const startTimeInMinutes = startHour * 60 + startMinute;
          const endTimeInMinutes = endHour * 60 + endMinute;

          return currentTimeInMinutes >= startTimeInMinutes && currentTimeInMinutes <= endTimeInMinutes;
        });

        if (!isWithinSchedule) {
          const schedule = schedules[0]; // Get first schedule for error message
          toast.error('Break Not Available', {
            description: `${schedule.break_name} is only available between ${schedule.scheduled_start_time.slice(0, 5)} - ${schedule.scheduled_end_time.slice(0, 5)}`,
          });
          // Play voice guide for break not allowed
          playAttendanceNotification('break_not_allowed');
          setLoading(false);
          return;
        }
      }

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

      // Play voice guide for break started
      playAttendanceNotification('break_started');

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

      // Play voice guide for break ended
      playAttendanceNotification('break_ended');

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
      fetchBreakHistory();
    }
  }, [profile?.id, attendanceLogId, fetchActiveBreak, fetchTodayBreaks, fetchBreakHistory]);

  return {
    activeBreak,
    todayBreaks,
    breakHistory,
    loading,
    startBreak,
    endBreak,
    refetch: () => {
      fetchActiveBreak();
      fetchTodayBreaks();
      fetchBreakHistory();
    },
  };
}
