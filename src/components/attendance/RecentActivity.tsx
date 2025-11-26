import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, MapPin, Coffee } from 'lucide-react';

export function RecentActivity() {
  const activities = [
    {
      type: 'clock-in',
      time: '08:45 AM',
      date: 'Today',
      location: 'Head Office',
      status: 'On time',
      icon: Clock,
      iconBg: 'bg-green-500',
      statusColor: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800'
    },
    {
      type: 'break',
      time: '12:30 PM',
      date: 'Today',
      location: 'Lunch Break',
      status: '30 min',
      icon: Coffee,
      iconBg: 'bg-amber-500',
      statusColor: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800'
    },
    {
      type: 'clock-out',
      time: '05:15 PM',
      date: 'Yesterday',
      location: 'Head Office',
      status: 'Completed',
      icon: Clock,
      iconBg: 'bg-red-500',
      statusColor: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800'
    },
    {
      type: 'field',
      time: '10:00 AM',
      date: 'Yesterday',
      location: 'Client Meeting - Lekki',
      status: 'Field work',
      icon: MapPin,
      iconBg: 'bg-blue-500',
      statusColor: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-800'
    }
  ];

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Recent Activity</h3>
        <button className="text-sm text-orange-600 hover:text-orange-700 font-medium transition-colors">
          View All
        </button>
      </div>
      
      <div className="space-y-4">
        {activities.map((activity, index) => (
          <div 
            key={index}
            className="flex items-center gap-4 p-4 bg-gradient-to-r from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 transition-all duration-300 hover:shadow-md hover:scale-[1.01]"
          >
            <div className={`p-2.5 ${activity.iconBg} rounded-lg shadow-lg`}>
              <activity.icon className="w-5 h-5 text-white" />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-semibold text-sm truncate">{activity.location}</p>
                <Badge variant="outline" className={`${activity.statusColor} text-xs px-2 py-0.5`}>
                  {activity.status}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {activity.date} at {activity.time}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
