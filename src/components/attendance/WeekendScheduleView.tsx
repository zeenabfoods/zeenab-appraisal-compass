import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar, Users, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useWeekendWorkSchedule } from '@/hooks/attendance/useWeekendWorkSchedule';
import { format, parseISO } from 'date-fns';

export function WeekendScheduleView() {
  const { schedules, loading, fetchAllSchedules, getUpcomingWeekendDates } = useWeekendWorkSchedule();
  const [selectedDate, setSelectedDate] = useState<string>('');
  const weekendDates = getUpcomingWeekendDates();

  useEffect(() => {
    if (selectedDate) {
      fetchAllSchedules(selectedDate);
    } else {
      fetchAllSchedules();
    }
  }, [selectedDate, fetchAllSchedules]);

  const workingCount = schedules.filter(s => s.will_work).length;
  const notWorkingCount = schedules.filter(s => !s.will_work).length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Weekend Work Schedule
              </CardTitle>
              <CardDescription>
                View employees who have indicated they will work on weekends
              </CardDescription>
            </div>
            <Select value={selectedDate} onValueChange={setSelectedDate}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Filter by date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Dates</SelectItem>
                {weekendDates.map(date => (
                  <SelectItem key={date.value} value={date.value}>
                    {date.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-green-100">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{workingCount}</p>
                    <p className="text-sm text-muted-foreground">Will Work</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-gray-100">
                    <XCircle className="h-5 w-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{notWorkingCount}</p>
                    <p className="text-sm text-muted-foreground">Not Working</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : schedules.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No weekend work responses yet</p>
              <p className="text-sm">Employees will be prompted on Fridays and Saturdays</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Weekend Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Confirmed At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schedules.map(schedule => (
                    <TableRow key={schedule.id}>
                      <TableCell className="font-medium">
                        {schedule.employee?.first_name} {schedule.employee?.last_name}
                      </TableCell>
                      <TableCell>{schedule.employee?.department || 'N/A'}</TableCell>
                      <TableCell>
                        {format(parseISO(schedule.weekend_date), 'EEEE, MMM d, yyyy')}
                      </TableCell>
                      <TableCell>
                        {schedule.will_work ? (
                          <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                            Will Work
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Not Working</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(parseISO(schedule.confirmed_at), 'MMM d, h:mm a')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
