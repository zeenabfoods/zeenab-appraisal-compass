import { Card } from '@/components/ui/card';
import { Calendar, Clock, TrendingUp, Coffee } from 'lucide-react';

export function AttendanceStats() {
  const stats = [
    {
      icon: Calendar,
      label: 'This Week',
      value: '5/5 days',
      subtext: '100% attendance',
      color: 'text-green-600',
      bgColor: 'bg-green-50 dark:bg-green-950/30',
      borderColor: 'border-green-200 dark:border-green-800'
    },
    {
      icon: Clock,
      label: 'Avg. Clock In',
      value: '08:42 AM',
      subtext: '3 min early',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-950/30',
      borderColor: 'border-blue-200 dark:border-blue-800'
    },
    {
      icon: TrendingUp,
      label: 'Total Hours',
      value: '42.5h',
      subtext: 'This week',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50 dark:bg-purple-950/30',
      borderColor: 'border-purple-200 dark:border-purple-800'
    },
    {
      icon: Coffee,
      label: 'Break Time',
      value: '45 min',
      subtext: 'Daily average',
      color: 'text-amber-600',
      bgColor: 'bg-amber-50 dark:bg-amber-950/30',
      borderColor: 'border-amber-200 dark:border-amber-800'
    }
  ];

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <Card 
          key={index}
          className={`p-6 ${stat.bgColor} ${stat.borderColor} transition-all duration-300 hover:scale-105 hover:shadow-lg`}
        >
          <div className="flex items-start justify-between mb-3">
            <div className={`p-2 ${stat.bgColor} rounded-lg border ${stat.borderColor}`}>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">{stat.label}</p>
            <p className={`text-2xl font-bold ${stat.color} mb-1`}>{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.subtext}</p>
          </div>
        </Card>
      ))}
    </div>
  );
}
