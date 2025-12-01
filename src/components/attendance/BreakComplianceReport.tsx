import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfDay, endOfDay } from 'date-fns';
import { Coffee, CheckCircle, XCircle, Clock, AlertCircle, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { CalendarIcon } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface BreakCompliance {
  employee_id: string;
  employee_name: string;
  department: string;
  schedule_name: string;
  scheduled_time: string;
  actual_break_start: string | null;
  took_break: boolean;
  was_on_time: boolean | null;
  minutes_late: number | null;
}

export function BreakComplianceReport() {
  const [date, setDate] = useState<Date>(new Date());
  const [compliance, setCompliance] = useState<BreakCompliance[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'took_break' | 'missed_break'>('all');
  const [stats, setStats] = useState({
    total: 0,
    taken: 0,
    missed: 0,
    onTime: 0,
  });

  useEffect(() => {
    fetchBreakCompliance();
  }, [date]);

  const fetchBreakCompliance = async () => {
    try {
      setLoading(true);
      const startDate = startOfDay(date);
      const endDate = endOfDay(date);

      // Get all active break schedules
      const { data: schedules, error: scheduleError } = await supabase
        .from('attendance_break_schedules')
        .select('*')
        .eq('is_active', true);

      if (scheduleError) throw scheduleError;

      // Get all active employees
      const { data: employees, error: employeeError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, department')
        .eq('is_active', true);

      if (employeeError) throw employeeError;

      // Get all breaks taken on this date
      const { data: breaks, error: breakError } = await supabase
        .from('attendance_breaks')
        .select('*')
        .gte('break_start', startDate.toISOString())
        .lte('break_start', endDate.toISOString());

      if (breakError) throw breakError;

      // Build compliance report
      const complianceData: BreakCompliance[] = [];
      const processedBreakIds = new Set<string>();

      // First, add all scheduled breaks
      schedules?.forEach((schedule) => {
        employees?.forEach((employee) => {
          // Check if department applies (null means all departments)
          const appliesToEmployee = !schedule.applies_to_departments || 
            schedule.applies_to_departments.length === 0 ||
            schedule.applies_to_departments.includes(employee.department);

          if (!appliesToEmployee) return;

          // Find if employee took this break
          const employeeBreak = breaks?.find(
            (b) => b.employee_id === employee.id && b.schedule_id === schedule.id
          );

          if (employeeBreak) {
            processedBreakIds.add(employeeBreak.id);
          }

          complianceData.push({
            employee_id: employee.id,
            employee_name: `${employee.first_name} ${employee.last_name}`,
            department: employee.department || 'N/A',
            schedule_name: schedule.break_name,
            scheduled_time: schedule.scheduled_start_time,
            actual_break_start: employeeBreak?.break_start || null,
            took_break: !!employeeBreak,
            was_on_time: employeeBreak?.was_on_time || null,
            minutes_late: employeeBreak?.minutes_late || null,
          });
        });
      });

      // Add unscheduled breaks (breaks without schedule_id or not matched above)
      breaks?.forEach((breakRecord) => {
        if (!processedBreakIds.has(breakRecord.id)) {
          const employee = employees?.find((e) => e.id === breakRecord.employee_id);
          if (employee) {
            complianceData.push({
              employee_id: employee.id,
              employee_name: `${employee.first_name} ${employee.last_name}`,
              department: employee.department || 'N/A',
              schedule_name: breakRecord.break_type + ' (Not Scheduled)',
              scheduled_time: 'N/A',
              actual_break_start: breakRecord.break_start,
              took_break: true,
              was_on_time: null,
              minutes_late: null,
            });
          }
        }
      });

      setCompliance(complianceData);

      const total = complianceData.length;
      const taken = (breaks ?? []).length;
      const onTime = (breaks ?? []).filter((b) => b.was_on_time).length;
      const missed = Math.max(total - taken, 0);

      setStats({ total, taken, missed, onTime });
    } catch (error) {
      console.error('Error fetching break compliance:', error);
      toast.error('Failed to load break compliance data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (item: BreakCompliance) => {
    if (!item.took_break) {
      return (
        <Badge variant="destructive" className="gap-1">
          <XCircle className="h-3 w-3" />
          Not Taken
        </Badge>
      );
    }

    if (item.was_on_time) {
      return (
        <Badge variant="default" className="gap-1 bg-green-500">
          <CheckCircle className="h-3 w-3" />
          On Time
        </Badge>
      );
    }

    return (
      <Badge variant="secondary" className="gap-1 bg-yellow-500 text-yellow-950">
        <AlertCircle className="h-3 w-3" />
        Late ({item.minutes_late} min)
      </Badge>
    );
  };


  const filteredCompliance = compliance.filter((item) => {
    if (filter === 'took_break') return item.took_break;
    if (filter === 'missed_break') return !item.took_break;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Date Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Break Compliance Report</CardTitle>
          <CardDescription>Track which employees took scheduled breaks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[240px] justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(date, 'PPP')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} />
              </PopoverContent>
            </Popover>
            
            <Select value={filter} onValueChange={(value: any) => setFilter(value)}>
              <SelectTrigger className="w-[200px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Employees</SelectItem>
                <SelectItem value="took_break">Took Break</SelectItem>
                <SelectItem value="missed_break">Missed Break</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-sm text-muted-foreground">Total Expected</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-500">{stats.taken}</div>
            <p className="text-sm text-muted-foreground">Breaks Taken</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-destructive">{stats.missed}</div>
            <p className="text-sm text-muted-foreground">Breaks Missed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-500">{stats.onTime}</div>
            <p className="text-sm text-muted-foreground">On Time</p>
          </CardContent>
        </Card>
      </div>

      {/* Compliance Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coffee className="h-5 w-5" />
            Employee Break Compliance
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : filteredCompliance.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {compliance.length === 0 
                ? "No break schedules found for this date"
                : "No employees match the selected filter"}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredCompliance.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="font-medium">{item.employee_name}</div>
                    <div className="text-sm text-muted-foreground">
                      {item.department} • {item.schedule_name}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Scheduled: {item.scheduled_time.slice(0, 5)}
                      </div>
                      {item.actual_break_start && (
                        <div className="text-xs">
                          Actual: {format(new Date(item.actual_break_start), 'h:mm a')}
                        </div>
                      )}
                    </div>
                    {getStatusBadge(item)}
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
