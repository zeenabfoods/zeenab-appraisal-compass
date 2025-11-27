import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { WeeklyVarianceData } from '@/utils/eyeServiceDetection';
import { TrendingUp } from 'lucide-react';

interface PatternCorrelationHeatMapProps {
  weeklyVariance: WeeklyVarianceData;
  employeeName: string;
}

export function PatternCorrelationHeatMap({ weeklyVariance, employeeName }: PatternCorrelationHeatMapProps) {
  const days = [
    { name: 'Monday', value: weeklyVariance.monday, key: 'monday' },
    { name: 'Tuesday', value: weeklyVariance.tuesday, key: 'tuesday' },
    { name: 'Wednesday', value: weeklyVariance.wednesday, key: 'wednesday' },
    { name: 'Thursday', value: weeklyVariance.thursday, key: 'thursday' },
    { name: 'Friday', value: weeklyVariance.friday, key: 'friday' },
  ];

  // Find min/max for color scaling
  const values = days.map(d => d.value).filter(v => v > 0);
  const minTime = Math.min(...values);
  const maxTime = Math.max(...values);
  const avgTime = values.reduce((a, b) => a + b, 0) / values.length;

  const getColor = (value: number) => {
    if (value === 0) return 'bg-gray-200 dark:bg-gray-800';
    
    // Early arrival (before average) = green
    // Late arrival (after average) = red
    if (value < avgTime - 15) {
      return 'bg-green-500/80';
    } else if (value < avgTime) {
      return 'bg-green-400/60';
    } else if (value < avgTime + 15) {
      return 'bg-yellow-400/60';
    } else if (value < avgTime + 30) {
      return 'bg-orange-400/70';
    } else {
      return 'bg-red-500/80';
    }
  };

  const formatTime = (minutes: number): string => {
    if (minutes === 0) return 'N/A';
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Weekly Arrival Pattern Heat Map
        </CardTitle>
        <CardDescription>
          Average clock-in times by day of week for {employeeName}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {days.map((day) => (
            <div key={day.key} className="flex items-center gap-3">
              <div className="w-24 text-sm font-medium text-muted-foreground">
                {day.name}
              </div>
              <div className="flex-1 flex items-center gap-2">
                <div 
                  className={`h-10 rounded flex items-center justify-center text-white font-semibold text-sm transition-all ${getColor(day.value)}`}
                  style={{ width: '100%' }}
                >
                  {formatTime(day.value)}
                </div>
              </div>
              <div className="w-20 text-sm text-right text-muted-foreground">
                {day.value > 0 && Math.abs(day.value - avgTime) > 5 && (
                  <span className={day.value < avgTime ? 'text-green-600' : 'text-red-600'}>
                    {day.value < avgTime ? '-' : '+'}{Math.abs(Math.round(day.value - avgTime))}min
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="mt-6 pt-4 border-t">
          <div className="text-xs font-semibold mb-2 text-muted-foreground">LEGEND</div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-green-500/80"></div>
              <span className="text-muted-foreground">Early Arrival</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-yellow-400/60"></div>
              <span className="text-muted-foreground">On Time</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-red-500/80"></div>
              <span className="text-muted-foreground">Late Arrival</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Reference: Average arrival time is {formatTime(avgTime)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
