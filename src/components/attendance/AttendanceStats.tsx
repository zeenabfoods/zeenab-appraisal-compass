import { Card } from '@/components/ui/card';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { startOfWeek, startOfMonth, endOfWeek, endOfMonth } from 'date-fns';

export function AttendanceStats() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    weekDays: 0,
    weekHours: 0,
    monthOvertime: 0,
    avgBreakTime: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!user?.id) return;

      try {
        const now = new Date();
        const weekStart = startOfWeek(now, { weekStartsOn: 1 }).toISOString();
        const weekEnd = endOfWeek(now, { weekStartsOn: 1 }).toISOString();
        const monthStart = startOfMonth(now).toISOString();
        const monthEnd = endOfMonth(now).toISOString();

        // Fetch week attendance
        const { data: weekLogs } = await supabase
          .from('attendance_logs')
          .select('*')
          .eq('employee_id', user.id)
          .gte('clock_in_time', weekStart)
          .lte('clock_in_time', weekEnd);

        // Fetch month overtime
        const { data: monthLogs } = await supabase
          .from('attendance_logs')
          .select('overtime_hours')
          .eq('employee_id', user.id)
          .gte('clock_in_time', monthStart)
          .lte('clock_in_time', monthEnd);

        // Fetch breaks for average
        const { data: breaks } = await supabase
          .from('attendance_breaks')
          .select('break_duration_minutes')
          .eq('employee_id', user.id)
          .not('break_duration_minutes', 'is', null);

        const weekDays = weekLogs?.length || 0;
        const weekHours = weekLogs?.reduce((sum, log) => sum + (log.total_hours || 0), 0) || 0;
        const monthOvertime = monthLogs?.reduce((sum, log) => sum + (log.overtime_hours || 0), 0) || 0;
        const avgBreakTime = breaks?.length 
          ? breaks.reduce((sum, b) => sum + (b.break_duration_minutes || 0), 0) / breaks.length
          : 0;

        setStats({
          weekDays,
          weekHours,
          monthOvertime,
          avgBreakTime
        });
      } catch (error) {
        console.error('Error fetching attendance stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user?.id]);

  const displayStats = [
    {
      label: 'Total Attendance',
      value: loading ? '...' : `${stats.weekDays} Days`,
      subtext: 'This week'
    },
    {
      label: 'Total Hours',
      value: loading ? '...' : `${stats.weekHours.toFixed(1)}h`,
      subtext: 'This week'
    },
    {
      label: 'Overtime',
      value: loading ? '...' : `${stats.monthOvertime.toFixed(1)} Hours`,
      subtext: 'This month'
    },
    {
      label: 'Break Time',
      value: loading ? '...' : `${Math.round(stats.avgBreakTime)} min`,
      subtext: 'Daily average'
    }
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4">
      {displayStats.map((stat, index) => (
        <Card 
          key={index}
          className="p-4 sm:p-6 bg-white hover:shadow-md transition-all duration-300 border-attendance-card-border"
        >
          <div className="text-left">
            <p className="text-xs sm:text-sm text-muted-foreground mb-1 sm:mb-2">{stat.label}</p>
            <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-attendance-primary mb-1">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.subtext}</p>
          </div>
        </Card>
      ))}
    </div>
  );
}
