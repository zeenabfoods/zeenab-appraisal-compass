import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format, addDays, isFriday, isSaturday, startOfWeek, endOfWeek } from 'date-fns';

interface WeekendWorkSchedule {
  id: string;
  employee_id: string;
  weekend_date: string;
  will_work: boolean;
  confirmed_at: string;
  attendance_logged: boolean;
  employee?: {
    id: string;
    first_name: string;
    last_name: string;
    department: string;
  };
}

export function useWeekendWorkSchedule() {
  const { profile } = useAuth();
  const [schedules, setSchedules] = useState<WeekendWorkSchedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [promptDates, setPromptDates] = useState<{ saturday: string; sunday: string } | null>(null);

  // Check if we should show the weekend work prompt
  const checkForPrompt = useCallback(() => {
    const today = new Date();
    
    // Show prompt on Friday for Saturday/Sunday
    if (isFriday(today)) {
      const saturday = addDays(today, 1);
      const sunday = addDays(today, 2);
      setPromptDates({
        saturday: format(saturday, 'yyyy-MM-dd'),
        sunday: format(sunday, 'yyyy-MM-dd'),
      });
      setShowPrompt(true);
    }
    // Show prompt on Saturday for Sunday
    else if (isSaturday(today)) {
      const sunday = addDays(today, 1);
      setPromptDates({
        saturday: '', // Already passed
        sunday: format(sunday, 'yyyy-MM-dd'),
      });
      setShowPrompt(true);
    }
  }, []);

  // Check if user already responded for these weekend dates
  const checkExistingResponse = useCallback(async () => {
    if (!profile?.id || !promptDates) return;

    const datesToCheck = [promptDates.saturday, promptDates.sunday].filter(Boolean);
    if (datesToCheck.length === 0) return;

    const { data, error } = await supabase
      .from('weekend_work_schedules')
      .select('*')
      .eq('employee_id', profile.id)
      .in('weekend_date', datesToCheck);

    if (!error && data && data.length === datesToCheck.length) {
      // Already responded for all dates
      setShowPrompt(false);
    }
  }, [profile?.id, promptDates]);

  // Submit weekend work intention
  const submitWeekendWork = async (selections: { saturday: boolean; sunday: boolean }) => {
    if (!profile?.id || !promptDates) return;

    setLoading(true);
    try {
      const records = [];
      
      if (promptDates.saturday && selections.saturday !== undefined) {
        records.push({
          employee_id: profile.id,
          weekend_date: promptDates.saturday,
          will_work: selections.saturday,
        });
      }
      
      if (promptDates.sunday && selections.sunday !== undefined) {
        records.push({
          employee_id: profile.id,
          weekend_date: promptDates.sunday,
          will_work: selections.sunday,
        });
      }

      if (records.length > 0) {
        const { error } = await supabase
          .from('weekend_work_schedules')
          .upsert(records, { onConflict: 'employee_id,weekend_date' });

        if (error) throw error;
        toast.success('Weekend work schedule saved');
        setShowPrompt(false);
      }
    } catch (error) {
      console.error('Error saving weekend work schedule:', error);
      toast.error('Failed to save weekend work schedule');
    } finally {
      setLoading(false);
    }
  };

  // Dismiss prompt without responding
  const dismissPrompt = () => {
    setShowPrompt(false);
  };

  // Fetch all weekend schedules for HR view
  const fetchAllSchedules = useCallback(async (weekendDate?: string) => {
    setLoading(true);
    try {
      let query = supabase
        .from('weekend_work_schedules')
        .select('*')
        .order('weekend_date', { ascending: false });

      if (weekendDate) {
        query = query.eq('weekend_date', weekendDate);
      }

      const { data: scheduleData, error } = await query;

      if (error) throw error;

      // Fetch employee profiles separately
      if (scheduleData && scheduleData.length > 0) {
        const employeeIds = [...new Set(scheduleData.map(s => s.employee_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, department')
          .in('id', employeeIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
        
        const enriched = scheduleData.map(s => ({
          ...s,
          employee: profileMap.get(s.employee_id),
        }));

        setSchedules(enriched);
      } else {
        setSchedules([]);
      }
    } catch (error) {
      console.error('Error fetching weekend schedules:', error);
      toast.error('Failed to load weekend schedules');
    } finally {
      setLoading(false);
    }
  }, []);

  // Get upcoming weekend dates for filtering
  const getUpcomingWeekendDates = useCallback(() => {
    const today = new Date();
    const dates: { label: string; value: string }[] = [];
    
    // Get this weekend
    const thisWeekStart = startOfWeek(today, { weekStartsOn: 1 }); // Monday
    const thisSaturday = addDays(thisWeekStart, 5);
    const thisSunday = addDays(thisWeekStart, 6);
    
    dates.push({
      label: `This Saturday (${format(thisSaturday, 'MMM d')})`,
      value: format(thisSaturday, 'yyyy-MM-dd'),
    });
    dates.push({
      label: `This Sunday (${format(thisSunday, 'MMM d')})`,
      value: format(thisSunday, 'yyyy-MM-dd'),
    });

    // Get next weekend
    const nextSaturday = addDays(thisSaturday, 7);
    const nextSunday = addDays(thisSunday, 7);
    
    dates.push({
      label: `Next Saturday (${format(nextSaturday, 'MMM d')})`,
      value: format(nextSaturday, 'yyyy-MM-dd'),
    });
    dates.push({
      label: `Next Sunday (${format(nextSunday, 'MMM d')})`,
      value: format(nextSunday, 'yyyy-MM-dd'),
    });

    return dates;
  }, []);

  useEffect(() => {
    checkForPrompt();
  }, [checkForPrompt]);

  useEffect(() => {
    if (promptDates) {
      checkExistingResponse();
    }
  }, [promptDates, checkExistingResponse]);

  return {
    schedules,
    loading,
    showPrompt,
    promptDates,
    submitWeekendWork,
    dismissPrompt,
    fetchAllSchedules,
    getUpcomingWeekendDates,
  };
}
