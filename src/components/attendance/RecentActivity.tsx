import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, MapPin, Coffee } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, isToday, isYesterday } from 'date-fns';

type Activity = {
  type: string;
  time: string;
  date: string;
  location: string;
  status: string;
  icon: any;
  iconBg: string;
  statusColor: string;
  timestamp: Date;
};

export function RecentActivity() {
  const { user } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecentActivities = async () => {
      if (!user?.id) return;

      try {
        const recentActivities: Activity[] = [];

        // Fetch recent attendance logs
        const { data: logs } = await supabase
          .from('attendance_logs')
          .select('*, branch:attendance_branches(name)')
          .eq('employee_id', user.id)
          .order('clock_in_time', { ascending: false })
          .limit(5);

        logs?.forEach(log => {
          const clockInTime = new Date(log.clock_in_time);
          const dateLabel = isToday(clockInTime) ? 'Today' : isYesterday(clockInTime) ? 'Yesterday' : format(clockInTime, 'MMM dd');
          
          recentActivities.push({
            type: 'clock-in',
            time: format(clockInTime, 'hh:mm a'),
            date: dateLabel,
            location: (log.branch as any)?.name || 'Office',
            status: log.is_late ? 'Late' : 'On time',
            icon: Clock,
            iconBg: log.is_late ? 'bg-yellow-500' : 'bg-green-500',
            statusColor: log.is_late 
              ? 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/30 dark:text-yellow-400 dark:border-yellow-800'
              : 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800',
            timestamp: clockInTime
          });

          if (log.clock_out_time) {
            const clockOutTime = new Date(log.clock_out_time);
            const outDateLabel = isToday(clockOutTime) ? 'Today' : isYesterday(clockOutTime) ? 'Yesterday' : format(clockOutTime, 'MMM dd');
            
            recentActivities.push({
              type: 'clock-out',
              time: format(clockOutTime, 'hh:mm a'),
              date: outDateLabel,
              location: (log.branch as any)?.name || 'Office',
              status: 'Completed',
              icon: Clock,
              iconBg: 'bg-red-500',
              statusColor: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800',
              timestamp: clockOutTime
            });
          }
        });

        // Fetch recent breaks
        const { data: breaks } = await supabase
          .from('attendance_breaks')
          .select('*')
          .eq('employee_id', user.id)
          .order('break_start', { ascending: false })
          .limit(3);

        breaks?.forEach(breakRecord => {
          const breakTime = new Date(breakRecord.break_start);
          const dateLabel = isToday(breakTime) ? 'Today' : isYesterday(breakTime) ? 'Yesterday' : format(breakTime, 'MMM dd');
          
          recentActivities.push({
            type: 'break',
            time: format(breakTime, 'hh:mm a'),
            date: dateLabel,
            location: breakRecord.break_type || 'Break',
            status: breakRecord.break_duration_minutes ? `${breakRecord.break_duration_minutes} min` : 'Active',
            icon: Coffee,
            iconBg: 'bg-amber-500',
            statusColor: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800',
            timestamp: breakTime
          });
        });

        // Fetch recent field trips
        const { data: trips } = await supabase
          .from('field_trips')
          .select('*')
          .eq('employee_id', user.id)
          .order('start_time', { ascending: false })
          .limit(3);

        trips?.forEach(trip => {
          const tripTime = new Date(trip.start_time);
          const dateLabel = isToday(tripTime) ? 'Today' : isYesterday(tripTime) ? 'Yesterday' : format(tripTime, 'MMM dd');
          
          recentActivities.push({
            type: 'field',
            time: format(tripTime, 'hh:mm a'),
            date: dateLabel,
            location: trip.destination_address || trip.purpose,
            status: 'Field work',
            icon: MapPin,
            iconBg: 'bg-blue-500',
            statusColor: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-800',
            timestamp: tripTime
          });
        });

        // Sort by timestamp and take top 4
        recentActivities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        setActivities(recentActivities.slice(0, 4));
      } catch (error) {
        console.error('Error fetching recent activities:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecentActivities();
  }, [user?.id]);

  if (loading) {
    return (
      <Card className="p-8 shadow-lg">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-xl font-bold tracking-tight">Recent Activity</h3>
        </div>
        <p className="text-sm text-muted-foreground">Loading activities...</p>
      </Card>
    );
  }

  if (activities.length === 0) {
    return (
      <Card className="p-8 shadow-lg">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-xl font-bold tracking-tight">Recent Activity</h3>
        </div>
        <p className="text-sm text-muted-foreground">No recent activities to display.</p>
      </Card>
    );
  }

  return (
    <Card className="p-8 shadow-lg">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-xl font-bold tracking-tight">Recent Activity</h3>
        <button className="text-sm text-orange-600 hover:text-orange-700 font-semibold transition-colors hover:underline underline-offset-4">
          View All
        </button>
      </div>
      
      <div className="space-y-4">
        {activities.map((activity, index) => (
          <div 
            key={index}
            className="flex items-center gap-5 p-5 bg-gradient-to-r from-gray-50/50 to-white dark:from-gray-900 dark:to-gray-800 rounded-xl border-2 border-gray-100 dark:border-gray-700 transition-all duration-300 hover:shadow-lg hover:scale-[1.01] hover:border-gray-200"
          >
            <div className={`p-3 ${activity.iconBg} rounded-xl shadow-xl`}>
              <activity.icon className="w-6 h-6 text-white" />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <p className="font-bold text-sm truncate">{activity.location}</p>
                <Badge variant="outline" className={`${activity.statusColor} text-xs px-2.5 py-1 font-semibold`}>
                  {activity.status}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground font-medium">
                {activity.date} at {activity.time}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
