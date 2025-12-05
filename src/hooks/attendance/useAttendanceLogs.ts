import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tables, TablesInsert } from '@/integrations/supabase/types';
import { toast } from 'sonner';
import { useAuthContext } from '@/components/AuthProvider';
import { playAttendanceNotification } from '@/utils/attendanceNotifications';

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
  const [isClockingIn, setIsClockingIn] = useState(false); // Prevent duplicate clicks

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
        .select(`
          *,
          employee:profiles!attendance_logs_employee_id_fkey(
            first_name,
            last_name,
            department,
            position
          ),
          branch:attendance_branches!attendance_logs_branch_id_fkey(
            name,
            address
          )
        `)
        .eq('employee_id', profile.id)
        .order('clock_in_time', { ascending: false })
        .limit(50);

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

    // Prevent duplicate clicks
    if (isClockingIn) {
      toast.warning('Clock-in in progress', {
        description: 'Please wait, your clock-in is being processed.',
      });
      return;
    }

    setIsClockingIn(true);

    try {
      // Check if already clocked in today (prevents duplicate records)
      const today = new Date().toISOString().split('T')[0];
      const { data: existingActiveLog } = await supabase
        .from('attendance_logs')
        .select('id')
        .eq('employee_id', profile.id)
        .gte('clock_in_time', `${today}T00:00:00`)
        .lte('clock_in_time', `${today}T23:59:59`)
        .is('clock_out_time', null)
        .maybeSingle();

      if (existingActiveLog) {
        toast.warning('Already Clocked In', {
          description: 'You already have an active clock-in session. Please clock out first.',
        });
        setIsClockingIn(false);
        // Refresh to show current state
        await fetchTodayLog();
        return;
      }

      // Check today's sessions for one-transition-only rule
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const { data: todaySessions } = await supabase
        .from('attendance_logs')
        .select('location_type, clock_out_time')
        .eq('employee_id', profile.id)
        .gte('clock_in_time', todayStart.toISOString())
        .order('clock_in_time', { ascending: true });

      // Check if trying to clock in at office
      if (params.locationType === 'office') {
        // Block if already has an office session today
        const hasOfficeSession = todaySessions?.some(s => s.location_type === 'office');
        if (hasOfficeSession) {
          toast.error('Office Session Already Exists', {
            description: 'You already have an office session today. Only one office session per day is allowed.',
          });
          return;
        }

        // Block if already transitioned (has field session)
        const hasFieldSession = todaySessions?.some(s => s.location_type === 'field');
        if (hasFieldSession) {
          toast.error('Cannot Return to Office Mode', {
            description: 'You have already transitioned to field work today. Only one transition per day is allowed.',
          });
          return;
        }

        // Auto clock-out any active field trip before clocking into office
        const { data: activeFieldTrip } = await supabase
          .from('field_trips')
          .select('id')
          .eq('employee_id', profile.id)
          .eq('status', 'active')
          .maybeSingle();

        if (activeFieldTrip) {
          await supabase
            .from('field_trips')
            .update({
              status: 'completed',
              actual_end_time: new Date().toISOString(),
              notes: 'Auto-completed when clocking in at office'
            })
            .eq('id', activeFieldTrip.id);
          
          toast.info('Field trip auto-completed');
        }
      }

      // Fetch attendance rules to calculate lateness
      const { data: rules } = await supabase
        .from('attendance_rules')
        .select('work_start_time, late_threshold_minutes, grace_period_minutes')
        .eq('is_active', true)
        .limit(1)
        .single();

      let isLate = false;
      let lateByMinutes = 0;

      if (rules && rules.work_start_time) {
        const now = new Date();
        const [workStartHour, workStartMin] = rules.work_start_time.split(':').map(Number);
        
        // Create work start time for today in local time
        const workStartTime = new Date(now);
        workStartTime.setHours(workStartHour, workStartMin, 0, 0);
        
        // Only grace period is used - anyone clocking in after work_start_time + grace_period is LATE
        // e.g., work starts 8:00 + 5 min grace = 8:05 deadline, 8:06 is late
        const gracePeriod = rules.grace_period_minutes || 5;
        
        const lateDeadline = new Date(workStartTime.getTime() + gracePeriod * 60 * 1000);
        
        if (now > lateDeadline) {
          isLate = true;
          lateByMinutes = Math.round((now.getTime() - workStartTime.getTime()) / (60 * 1000));
        }
      }

      const logData: AttendanceLogInsert = {
        employee_id: profile.id,
        location_type: params.locationType,
        clock_in_latitude: params.latitude,
        clock_in_longitude: params.longitude,
        branch_id: params.branchId,
        field_work_reason: params.fieldWorkReason,
        field_work_location: params.fieldWorkLocation,
        within_geofence_at_clock_in: params.withinGeofence,
        geofence_distance_at_clock_in: params.geofenceDistance ? Math.round(params.geofenceDistance) : null,
        device_timestamp: new Date().toISOString(),
        is_late: isLate,
        late_by_minutes: lateByMinutes,
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

      // Play sound notification - different for late vs on-time
      if (isLate) {
        playAttendanceNotification('clock_in_late');
      } else {
        playAttendanceNotification('clock_in_success');
      }

      // Trigger haptic feedback if available
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }

      return data;
    } catch (error) {
      console.error('Error clocking in:', error);
      toast.error('Failed to clock in');
      throw error;
    } finally {
      setIsClockingIn(false);
    }
  };

  const clockOut = async (latitude?: number, longitude?: number, withinGeofence?: boolean, isEarlyClosure: boolean = false) => {
    if (!todayLog) {
      toast.error('No active clock-in found');
      return;
    }

    try {
      const clockOutTime = new Date().toISOString();
      const clockInTime = new Date(todayLog.clock_in_time);
      const diffMs = new Date(clockOutTime).getTime() - clockInTime.getTime();
      const totalHours = diffMs / (1000 * 60 * 60);

      // Fetch the log to check if overtime was approved
      const { data: logData } = await supabase
        .from('attendance_logs')
        .select('overtime_approved, overtime_start_time')
        .eq('id', todayLog.id)
        .single();

      // Fetch attendance rules for overtime and night shift calculation
      const { data: rules } = await supabase
        .from('attendance_rules')
        .select('*')
        .eq('is_active', true)
        .limit(1)
        .single();

      let overtimeHours = 0;
      let isNightShift = false;
      let nightShiftHours = 0;

      // Calculate overtime hours only if overtime was approved
      if (logData?.overtime_approved && logData?.overtime_start_time) {
        const overtimeStartTime = new Date(logData.overtime_start_time);
        const clockOutTimeDate = new Date(clockOutTime);
        const overtimeMs = clockOutTimeDate.getTime() - overtimeStartTime.getTime();
        overtimeHours = Math.max(0, overtimeMs / (1000 * 60 * 60));
      }

      if (rules) {

        // Detect night shift (check if clock-in is within night shift window)
        const nightStart = rules.night_shift_start_time || '22:00';
        const nightEnd = rules.night_shift_end_time || '06:00';
        const [nightStartH, nightStartM] = nightStart.split(':').map(Number);
        const [nightEndH, nightEndM] = nightEnd.split(':').map(Number);

        const clockInHour = clockInTime.getHours();
        const clockInMinute = clockInTime.getMinutes();
        const clockInMinutes = clockInHour * 60 + clockInMinute;
        const nightStartMinutes = nightStartH * 60 + nightStartM;
        const nightEndMinutes = nightEndH * 60 + nightEndM;

        // Handle night shift window that spans midnight
        if (nightStartMinutes > nightEndMinutes) {
          // e.g., 22:00 to 06:00
          isNightShift = clockInMinutes >= nightStartMinutes || clockInMinutes <= nightEndMinutes;
        } else {
          // e.g., 00:00 to 08:00
          isNightShift = clockInMinutes >= nightStartMinutes && clockInMinutes <= nightEndMinutes;
        }

        // Calculate night shift hours (simplified: if night shift, count hours within window)
        if (isNightShift) {
          nightShiftHours = Math.min(totalHours, 8); // Simplified calculation
        }
      }

      const { error } = await supabase
        .from('attendance_logs')
        .update({
          clock_out_time: clockOutTime,
          clock_out_latitude: latitude,
          clock_out_longitude: longitude,
          within_geofence_at_clock_out: withinGeofence,
          total_hours: Number(totalHours.toFixed(2)),
          overtime_hours: Number(overtimeHours.toFixed(2)),
          is_night_shift: isNightShift,
          night_shift_hours: Number(nightShiftHours.toFixed(2)),
          early_closure: isEarlyClosure,
        })
        .eq('id', todayLog.id);

      if (error) throw error;

      // Create early closure charge if applicable
      if (isEarlyClosure && rules?.early_closure_charge_amount) {
        const { error: chargeError } = await supabase
          .from('attendance_charges')
          .insert({
            employee_id: profile!.id,
            attendance_log_id: todayLog.id,
            charge_type: 'early_closure',
            charge_amount: rules.early_closure_charge_amount,
            charge_date: new Date().toISOString().split('T')[0],
            status: 'pending'
          });

        if (chargeError) {
          console.error('Error creating early closure charge:', chargeError);
        } else {
          toast.warning('Early Closure Charge Applied', {
            description: `A charge of ₦${rules.early_closure_charge_amount.toLocaleString()} has been added to your account.`,
          });
        }
      }

      setTodayLog(null);
      setIsClocked(false);
      
      let message = 'Clocked out successfully';
      if (overtimeHours > 0) {
        message += ` • +${overtimeHours.toFixed(1)}h overtime`;
      }
      if (isNightShift) {
        message += ` • Night shift`;
      }
      
      toast.success(message);

      // Play sound notification
      playAttendanceNotification('clock_out_success');

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
    isClockingIn,
    clockIn,
    clockOut,
    refetch: fetchTodayLog,
  };
}
