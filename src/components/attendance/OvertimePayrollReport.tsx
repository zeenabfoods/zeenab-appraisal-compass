import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Download, Search, Clock, DollarSign, Calendar, TrendingUp, CalendarIcon, Trash2, AlertTriangle, Sun, Moon } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, getDay, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import type { DateRange } from 'react-day-picker';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface OvertimeReportData {
  employee_id: string;
  employee_name: string;
  department: string;
  position: string;
  total_overtime_hours: number;
  regular_hours: number;
  night_shift_hours: number;
  days_with_overtime: number;
  overtime_amount: number;
  night_shift_amount: number;
  total_payment: number;
  shift_type: 'day' | 'night' | 'mixed';
}

type FilterMode = 'day' | 'week' | 'month' | 'custom';

export function OvertimePayrollReport() {
  const currentDate = new Date();
  const [filterMode, setFilterMode] = useState<FilterMode>('month');
  const [selectedDate, setSelectedDate] = useState<Date>(currentDate);
  const [selectedMonth, setSelectedMonth] = useState((currentDate.getMonth() + 1).toString());
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear().toString());
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(currentDate),
    to: endOfMonth(currentDate),
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeletingEmployee, setIsDeletingEmployee] = useState<string | null>(null);

  // Calculate date range based on filter mode
  const getDateRange = (): { startDate: string; endDate: string } => {
    switch (filterMode) {
      case 'day':
        const dayStr = format(selectedDate, 'yyyy-MM-dd');
        return { startDate: dayStr, endDate: dayStr };
      
      case 'week':
        const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
        return { 
          startDate: format(weekStart, 'yyyy-MM-dd'), 
          endDate: format(weekEnd, 'yyyy-MM-dd') 
        };
      
      case 'month':
        const monthStart = `${selectedYear}-${selectedMonth.padStart(2, '0')}-01`;
        const monthEnd = new Date(parseInt(selectedYear), parseInt(selectedMonth), 0)
          .toISOString().split('T')[0];
        return { startDate: monthStart, endDate: monthEnd };
      
      case 'custom':
        if (dateRange?.from) {
          return {
            startDate: format(dateRange.from, 'yyyy-MM-dd'),
            endDate: dateRange.to 
              ? format(dateRange.to, 'yyyy-MM-dd')
              : format(dateRange.from, 'yyyy-MM-dd')
          };
        }
        return { startDate: format(currentDate, 'yyyy-MM-dd'), endDate: format(currentDate, 'yyyy-MM-dd') };
      
      default:
        return { startDate: format(currentDate, 'yyyy-MM-dd'), endDate: format(currentDate, 'yyyy-MM-dd') };
    }
  };

  const { data: overtimeData, isLoading, refetch } = useQuery({
    queryKey: ['overtime-report', filterMode, selectedDate, selectedMonth, selectedYear, dateRange],
    queryFn: async () => {
      const { startDate, endDate } = getDateRange();

      // Fetch overtime rates from database
      const { data: overtimeRates } = await supabase
        .from('overtime_rates')
        .select('*');

      // Helper to get rate based on position and day
      const getRateForLog = (position: string, clockInTime: Date): number => {
        const dayOfWeek = getDay(clockInTime);
        let dayType: 'weekday' | 'saturday' | 'sunday';
        
        if (dayOfWeek === 0) {
          dayType = 'sunday';
        } else if (dayOfWeek === 6) {
          dayType = 'saturday';
        } else {
          dayType = 'weekday';
        }

        const normalizedPosition = position?.toLowerCase() || '';
        let matchedPosition = 'Helper';

        if (normalizedPosition.includes('operator')) {
          matchedPosition = 'Operator';
        }

        const rate = overtimeRates?.find(
          r => r.position_name === matchedPosition && r.day_type === dayType
        );

        // Use configured rates: Operator weekday=1000, Helper weekday=800, etc.
        return rate?.rate_amount || (matchedPosition === 'Operator' ? 1000 : 800);
      };

      // Fetch attendance logs with all relevant data
      const { data: logs, error } = await supabase
        .from('attendance_logs')
        .select(`
          employee_id,
          total_hours,
          overtime_hours,
          overtime_approved,
          is_night_shift,
          night_shift_hours,
          clock_in_time,
          clock_out_time,
          employee:profiles!attendance_logs_employee_id_fkey(
            first_name,
            last_name,
            department,
            position
          )
        `)
        .gte('clock_in_time', `${startDate}T00:00:00`)
        .lte('clock_in_time', `${endDate}T23:59:59`)
        .not('employee_id', 'is', null)
        .not('clock_out_time', 'is', null) // Only count completed sessions
        .order('employee_id');

      if (error) throw error;

      // Group by employee and calculate totals correctly
      const employeeMap = new Map<string, OvertimeReportData>();

      logs?.forEach((log: any) => {
        if (!log.employee) return;

        const employeeId = log.employee_id;
        const totalHours = log.total_hours || 0;
        const clockInTime = new Date(log.clock_in_time);
        const clockInHour = clockInTime.getHours();
        
        // Determine if this is actually a night shift based on clock-in time (8pm-7am)
        const isActualNightShift = clockInHour >= 20 || clockInHour < 7;
        
        // Standard shift hours: Day = 9 hours, Night = 11 hours
        const standardHours = isActualNightShift ? 11 : 9;
        
        // Calculate actual overtime (hours beyond standard shift)
        // Only count if employee was approved for overtime OR worked beyond standard hours
        let actualOvertimeHours = 0;
        if (log.overtime_approved && log.overtime_hours > 0) {
          actualOvertimeHours = log.overtime_hours;
        } else if (totalHours > standardHours) {
          actualOvertimeHours = totalHours - standardHours;
        }

        // Regular hours (capped at standard shift hours)
        const regularHours = Math.min(totalHours, standardHours);

        // Night shift hours = total hours if night shift, 0 otherwise
        const nightShiftHours = isActualNightShift ? totalHours : 0;

        if (!employeeMap.has(employeeId)) {
          employeeMap.set(employeeId, {
            employee_id: employeeId,
            employee_name: `${log.employee.first_name} ${log.employee.last_name}`,
            department: log.employee.department || 'N/A',
            position: log.employee.position || 'N/A',
            total_overtime_hours: 0,
            regular_hours: 0,
            night_shift_hours: 0,
            days_with_overtime: 0,
            overtime_amount: 0,
            night_shift_amount: 0,
            total_payment: 0,
            shift_type: isActualNightShift ? 'night' : 'day',
          });
        }

        const employee = employeeMap.get(employeeId)!;
        employee.regular_hours += regularHours;
        employee.night_shift_hours += nightShiftHours;
        
        // Only count overtime if there are actual overtime hours
        if (actualOvertimeHours > 0) {
          employee.total_overtime_hours += actualOvertimeHours;
          employee.days_with_overtime += 1;
          
          // Calculate overtime payment based on position and day using configured rates
          const hourlyRate = getRateForLog(log.employee.position, clockInTime);
          employee.overtime_amount += actualOvertimeHours * hourlyRate;
        }

        // Update shift type
        if (employee.shift_type === 'day' && isActualNightShift) {
          employee.shift_type = 'mixed';
        } else if (employee.shift_type === 'night' && !isActualNightShift) {
          employee.shift_type = 'mixed';
        }

        employee.total_payment = employee.overtime_amount + employee.night_shift_amount;
      });

      return Array.from(employeeMap.values())
        .filter(item => item.total_overtime_hours > 0 || item.night_shift_hours > 0)
        .sort((a, b) => b.total_payment - a.total_payment);
    },
  });

  const filteredData = overtimeData?.filter((item) =>
    item.employee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalOvertimeHours = filteredData?.reduce((sum, item) => sum + item.total_overtime_hours, 0) || 0;
  const totalPayment = filteredData?.reduce((sum, item) => sum + item.total_payment, 0) || 0;
  const employeesWithOvertime = filteredData?.filter(item => item.total_overtime_hours > 0).length || 0;

  // Delete all overtime records
  const deleteAllOvertimeRecords = async () => {
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('attendance_logs')
        .update({ 
          overtime_hours: 0, 
          night_shift_hours: 0,
          overtime_approved: false,
          overtime_start_time: null,
          overtime_approved_at: null,
          is_night_shift: false
        })
        .gt('overtime_hours', 0);

      if (error) throw error;

      await supabase
        .from('attendance_logs')
        .update({ 
          night_shift_hours: 0,
          is_night_shift: false
        })
        .gt('night_shift_hours', 0);

      toast.success('All overtime records cleared');
      refetch();
    } catch (error: any) {
      toast.error('Failed to delete records', { description: error.message });
    } finally {
      setIsDeleting(false);
    }
  };

  // Delete overtime records for a specific employee
  const deleteEmployeeOvertimeRecords = async (employeeId: string, employeeName: string) => {
    setIsDeletingEmployee(employeeId);
    try {
      const { error } = await supabase
        .from('attendance_logs')
        .update({ 
          overtime_hours: 0, 
          night_shift_hours: 0,
          overtime_approved: false,
          overtime_start_time: null,
          overtime_approved_at: null,
          is_night_shift: false
        })
        .eq('employee_id', employeeId);

      if (error) throw error;

      toast.success(`Overtime records cleared for ${employeeName}`);
      refetch();
    } catch (error: any) {
      toast.error('Failed to delete records', { description: error.message });
    } finally {
      setIsDeletingEmployee(null);
    }
  };

  const setQuickFilter = (preset: string) => {
    const today = new Date();
    let from: Date;
    let to: Date = today;

    switch (preset) {
      case 'today':
        setSelectedDate(today);
        setFilterMode('day');
        return;
      case 'yesterday':
        setSelectedDate(subDays(today, 1));
        setFilterMode('day');
        return;
      case 'this-week':
        setSelectedDate(today);
        setFilterMode('week');
        return;
      case 'last-week':
        setSelectedDate(subDays(today, 7));
        setFilterMode('week');
        return;
      case 'this-month':
        setSelectedMonth((today.getMonth() + 1).toString());
        setSelectedYear(today.getFullYear().toString());
        setFilterMode('month');
        return;
      default:
        return;
    }
  };

  const exportToCSV = () => {
    if (!filteredData || filteredData.length === 0) {
      toast.error('No data to export');
      return;
    }

    const { startDate, endDate } = getDateRange();
    const filename = `overtime-report-${startDate}-to-${endDate}.csv`;

    const headers = [
      'Employee ID',
      'Employee Name',
      'Department',
      'Position',
      'Shift Type',
      'Regular Hours',
      'Overtime Hours',
      'Night Shift Hours',
      'Days with Overtime',
      'Overtime Payment (₦)',
      'Total Payment (₦)',
    ];

    const csvContent = [
      headers.join(','),
      ...filteredData.map((item) =>
        [
          item.employee_id,
          `"${item.employee_name}"`,
          `"${item.department}"`,
          `"${item.position}"`,
          item.shift_type,
          item.regular_hours.toFixed(2),
          item.total_overtime_hours.toFixed(2),
          item.night_shift_hours.toFixed(2),
          item.days_with_overtime,
          item.overtime_amount.toFixed(2),
          item.total_payment.toFixed(2),
        ].join(',')
      ),
      '',
      `Total Overtime Hours,${totalOvertimeHours.toFixed(2)}`,
      `Total Payment,₦${totalPayment.toFixed(2)}`,
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast.success('Report exported successfully');
  };

  const months = [
    { value: '1', label: 'January' },
    { value: '2', label: 'February' },
    { value: '3', label: 'March' },
    { value: '4', label: 'April' },
    { value: '5', label: 'May' },
    { value: '6', label: 'June' },
    { value: '7', label: 'July' },
    { value: '8', label: 'August' },
    { value: '9', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' },
  ];

  const years = Array.from({ length: 5 }, (_, i) => (currentDate.getFullYear() - i).toString());

  const getFilterDescription = () => {
    const { startDate, endDate } = getDateRange();
    if (startDate === endDate) {
      return format(parseISO(startDate), 'EEEE, MMMM d, yyyy');
    }
    return `${format(parseISO(startDate), 'MMM d')} - ${format(parseISO(endDate), 'MMM d, yyyy')}`;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Overtime & Payroll Report
            </CardTitle>
            <div className="flex items-center gap-2">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    disabled={!filteredData || filteredData.length === 0 || isDeleting}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    {isDeleting ? 'Deleting...' : 'Clear All'}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-destructive" />
                      Delete All Overtime Records?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      This will reset overtime_hours and night_shift_hours to 0 for all attendance records.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={deleteAllOvertimeRecords} className="bg-destructive text-destructive-foreground">
                      Delete All
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button onClick={exportToCSV} size="sm" disabled={!filteredData || filteredData.length === 0}>
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Filter Mode Tabs */}
          <div className="flex flex-wrap items-center gap-2 p-2 bg-muted rounded-lg">
            <Button
              variant={filterMode === 'day' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setFilterMode('day')}
            >
              Day
            </Button>
            <Button
              variant={filterMode === 'week' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setFilterMode('week')}
            >
              Week
            </Button>
            <Button
              variant={filterMode === 'month' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setFilterMode('month')}
            >
              Month
            </Button>
            <Button
              variant={filterMode === 'custom' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setFilterMode('custom')}
            >
              Custom Range
            </Button>
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setQuickFilter('today')}>
              Today
            </Button>
            <Button variant="outline" size="sm" onClick={() => setQuickFilter('yesterday')}>
              Yesterday
            </Button>
            <Button variant="outline" size="sm" onClick={() => setQuickFilter('this-week')}>
              This Week
            </Button>
            <Button variant="outline" size="sm" onClick={() => setQuickFilter('last-week')}>
              Last Week
            </Button>
            <Button variant="outline" size="sm" onClick={() => setQuickFilter('this-month')}>
              This Month
            </Button>
          </div>

          {/* Filter Controls based on mode */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {filterMode === 'day' && (
              <div className="md:col-span-2">
                <Label>Select Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(selectedDate, 'PPP')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => date && setSelectedDate(date)}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}

            {filterMode === 'week' && (
              <div className="md:col-span-2">
                <Label>Select Week (pick any day)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      Week of {format(startOfWeek(selectedDate, { weekStartsOn: 1 }), 'MMM d, yyyy')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => date && setSelectedDate(date)}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}

            {filterMode === 'month' && (
              <>
                <div>
                  <Label>Month</Label>
                  <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {months.map((month) => (
                        <SelectItem key={month.value} value={month.value}>
                          {month.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Year</Label>
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map((year) => (
                        <SelectItem key={year} value={year}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {filterMode === 'custom' && (
              <div className="md:col-span-2">
                <Label>Date Range</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn("w-full justify-start text-left", !dateRange && "text-muted-foreground")}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange?.from ? (
                        dateRange.to ? (
                          <>
                            {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
                          </>
                        ) : (
                          format(dateRange.from, "LLL dd, y")
                        )
                      ) : (
                        <span>Pick a date range</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      initialFocus
                      mode="range"
                      defaultMonth={dateRange?.from}
                      selected={dateRange}
                      onSelect={setDateRange}
                      numberOfMonths={2}
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}

            <div>
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Employee or department..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="flex items-end">
              <Button onClick={() => refetch()} variant="outline" className="w-full">
                <Calendar className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>

          {/* Current Filter Display */}
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">
              Showing overtime for: <span className="font-medium text-foreground">{getFilterDescription()}</span>
            </p>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Overtime Hours</p>
                    <p className="text-3xl font-bold">{totalOvertimeHours.toFixed(1)}</p>
                  </div>
                  <Clock className="w-8 h-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Payment</p>
                    <p className="text-3xl font-bold">₦{totalPayment.toLocaleString()}</p>
                  </div>
                  <DollarSign className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Employees with Overtime</p>
                    <p className="text-3xl font-bold">{employeesWithOvertime}</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Data Table */}
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading overtime data...
            </div>
          ) : !filteredData || filteredData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No overtime records found for this period</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Shift</TableHead>
                    <TableHead className="text-right">Regular Hrs</TableHead>
                    <TableHead className="text-right">Overtime Hrs</TableHead>
                    <TableHead className="text-right">Night Hrs</TableHead>
                    <TableHead className="text-center">OT Days</TableHead>
                    <TableHead className="text-right">OT Pay</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((item) => (
                    <TableRow key={item.employee_id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{item.employee_name}</div>
                          <div className="text-xs text-muted-foreground">{item.position}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={item.shift_type === 'night' ? 'secondary' : item.shift_type === 'mixed' ? 'outline' : 'default'} className="gap-1">
                          {item.shift_type === 'night' ? (
                            <><Moon className="w-3 h-3" /> Night</>
                          ) : item.shift_type === 'day' ? (
                            <><Sun className="w-3 h-3" /> Day</>
                          ) : (
                            'Mixed'
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {item.regular_hours.toFixed(1)}h
                      </TableCell>
                      <TableCell className="text-right">
                        {item.total_overtime_hours > 0 ? (
                          <span className="font-semibold text-orange-600">
                            {item.total_overtime_hours.toFixed(1)}h
                          </span>
                        ) : (
                          <span className="text-muted-foreground">0h</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.night_shift_hours > 0 ? (
                          <span className="font-semibold text-purple-600">
                            {item.night_shift_hours.toFixed(1)}h
                          </span>
                        ) : (
                          <span className="text-muted-foreground">0h</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{item.days_with_overtime}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ₦{item.overtime_amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-bold text-green-600">
                          ₦{item.total_payment.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              disabled={isDeletingEmployee === item.employee_id}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Overtime Records?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will reset overtime records for {item.employee_name}.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => deleteEmployeeOvertimeRecords(item.employee_id, item.employee_name)}
                                className="bg-destructive text-destructive-foreground"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t flex-wrap gap-4">
            <div className="text-sm text-muted-foreground">
              <span className="font-medium">Configured Rates:</span> Weekday: Operator ₦1,000 | Helper ₦800 • Saturday: Operator ₦1,500 | Helper ₦1,200 • Sunday: Operator ₦2,000 | Helper ₦1,500
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Grand Total</div>
              <div className="text-2xl font-bold text-green-600">
                ₦{totalPayment.toLocaleString()}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
