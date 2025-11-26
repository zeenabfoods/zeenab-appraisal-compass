import { Card } from '@/components/ui/card';

export function AttendanceStats() {
  const stats = [
    {
      label: 'Total Attendance',
      value: '6 Days',
      subtext: 'This week'
    },
    {
      label: 'Total Hours',
      value: '42.5h',
      subtext: 'This week'
    },
    {
      label: 'Overtime',
      value: '5 Hours',
      subtext: 'This month'
    },
    {
      label: 'Break Time',
      value: '45 min',
      subtext: 'Daily average'
    }
  ];

  return (
    <div className="grid grid-cols-2 gap-4">
      {stats.map((stat, index) => (
        <Card 
          key={index}
          className="p-6 bg-white hover:shadow-md transition-all duration-300 border-attendance-card-border"
        >
          <div className="text-left">
            <p className="text-sm text-muted-foreground mb-2">{stat.label}</p>
            <p className="text-3xl md:text-4xl font-bold text-attendance-primary mb-1">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.subtext}</p>
          </div>
        </Card>
      ))}
    </div>
  );
}
