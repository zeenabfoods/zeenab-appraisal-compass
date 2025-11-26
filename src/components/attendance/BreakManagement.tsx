import { Coffee, Clock, Play, Square, Bell } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useBreaks } from '@/hooks/attendance/useBreaks';
import { useAttendanceLogs } from '@/hooks/attendance/useAttendanceLogs';
import { useBreakSchedules } from '@/hooks/attendance/useBreakSchedules';
import { format } from 'date-fns';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export function BreakManagement() {
  const { todayLog, isClocked } = useAttendanceLogs();
  const { activeBreak, todayBreaks, loading, startBreak, endBreak } = useBreaks(todayLog?.id || null);
  const { schedules } = useBreakSchedules();
  const [breakDuration, setBreakDuration] = useState<string>('0:00');
  const [nextBreak, setNextBreak] = useState<any>(null);

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Check for upcoming breaks and send notifications
  useEffect(() => {
    if (!isClocked || schedules.length === 0) return;

    const checkBreakSchedules = () => {
      const now = new Date();
      const currentTime = now.getHours() * 60 + now.getMinutes(); // minutes since midnight

      schedules.forEach((schedule) => {
        const [startHour, startMinute] = schedule.scheduled_start_time.split(':').map(Number);
        const scheduledTime = startHour * 60 + startMinute;
        const notifyTime = scheduledTime - schedule.notification_minutes_before;

        // Check if it's time to notify (within 1 minute window)
        if (Math.abs(currentTime - notifyTime) <= 1) {
          // Send notification
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Break Time Reminder! ☕', {
              body: `${schedule.break_name} starts in ${schedule.notification_minutes_before} minutes (${schedule.scheduled_start_time.slice(0, 5)})`,
              icon: '/favicon.ico',
              tag: `break-${schedule.id}`,
            });
          }
          
          // Show toast
          toast.info(`${schedule.break_name} starts in ${schedule.notification_minutes_before} minutes!`, {
            description: `Scheduled: ${schedule.scheduled_start_time.slice(0, 5)} - ${schedule.scheduled_end_time.slice(0, 5)}`,
            duration: 10000,
          });
        }

        // Find next upcoming break
        if (currentTime < scheduledTime && (!nextBreak || scheduledTime < nextBreak.scheduledTime)) {
          setNextBreak({
            ...schedule,
            scheduledTime,
          });
        }
      });
    };

    // Check immediately
    checkBreakSchedules();

    // Check every minute
    const interval = setInterval(checkBreakSchedules, 60000);

    return () => clearInterval(interval);
  }, [isClocked, schedules, nextBreak]);

  // Update break duration every second
  useEffect(() => {
    if (!activeBreak) {
      setBreakDuration('0:00');
      return;
    }

    const updateDuration = () => {
      const startTime = new Date(activeBreak.break_start);
      const now = new Date();
      const diffMs = now.getTime() - startTime.getTime();
      const minutes = Math.floor(diffMs / (1000 * 60));
      const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
      setBreakDuration(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    };

    updateDuration();
    const interval = setInterval(updateDuration, 1000);

    return () => clearInterval(interval);
  }, [activeBreak]);

  const totalBreakTime = todayBreaks.reduce(
    (sum, b) => sum + (b.break_duration_minutes || 0),
    0
  );

  const getBreakTypeLabel = (type: string) => {
    switch (type) {
      case 'lunch':
        return 'Lunch Break';
      case 'short_break':
        return 'Short Break';
      default:
        return 'Break';
    }
  };

  const getBreakTypeColor = (type: string) => {
    switch (type) {
      case 'lunch':
        return 'bg-orange-500';
      case 'short_break':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      {/* Next Scheduled Break */}
      {nextBreak && !activeBreak && (
        <Card className="border-blue-500 bg-blue-50 dark:bg-blue-950/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-blue-500" />
              <div>
                <div className="font-semibold text-blue-900 dark:text-blue-100">
                  Next Break: {nextBreak.break_name}
                </div>
                <div className="text-sm text-blue-700 dark:text-blue-300">
                  Scheduled at {nextBreak.scheduled_start_time.slice(0, 5)} • 
                  You'll be notified {nextBreak.notification_minutes_before} min before
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Break Card */}
      <Card className={activeBreak ? 'border-orange-500 shadow-lg' : ''}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coffee className="h-5 w-5" />
            Break Management
          </CardTitle>
          <CardDescription>
            {isClocked ? 'Take breaks and track your rest time' : 'Clock in to take breaks'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {activeBreak ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-500 rounded-full">
                    <Coffee className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <div className="font-semibold text-orange-900 dark:text-orange-100">
                      {getBreakTypeLabel(activeBreak.break_type)}
                    </div>
                    <div className="text-sm text-orange-700 dark:text-orange-300">
                      Started at {format(new Date(activeBreak.break_start), 'h:mm a')}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-orange-600 dark:text-orange-400 font-mono">
                    {breakDuration}
                  </div>
                  <div className="text-xs text-orange-600 dark:text-orange-400">Duration</div>
                </div>
              </div>

              <Button
                onClick={endBreak}
                disabled={loading}
                className="w-full bg-orange-500 hover:bg-orange-600"
                size="lg"
              >
                <Square className="h-5 w-5 mr-2" />
                End Break
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <Button
                onClick={() => startBreak('short_break')}
                disabled={!isClocked || loading}
                variant="outline"
                className="w-full"
                size="lg"
              >
                <Play className="h-5 w-5 mr-2" />
                Start Short Break
              </Button>

              <Button
                onClick={() => startBreak('lunch')}
                disabled={!isClocked || loading}
                variant="outline"
                className="w-full"
                size="lg"
              >
                <Coffee className="h-5 w-5 mr-2" />
                Start Lunch Break
              </Button>

              {!isClocked && (
                <p className="text-sm text-muted-foreground text-center">
                  Please clock in before taking a break
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Break Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Today's Breaks
          </CardTitle>
          <CardDescription>
            Total break time: {totalBreakTime} minutes
          </CardDescription>
        </CardHeader>
        <CardContent>
          {todayBreaks.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Coffee className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>No breaks taken today</p>
            </div>
          ) : (
            <div className="space-y-3">
              {todayBreaks.map((breakItem) => (
                <div
                  key={breakItem.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${getBreakTypeColor(breakItem.break_type)}`} />
                    <div>
                      <div className="font-medium text-sm">
                        {getBreakTypeLabel(breakItem.break_type)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(breakItem.break_start), 'h:mm a')}
                        {breakItem.break_end && (
                          <> - {format(new Date(breakItem.break_end), 'h:mm a')}</>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    {breakItem.break_end ? (
                      <Badge variant="secondary">
                        {breakItem.break_duration_minutes} min
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300">
                        Active
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
