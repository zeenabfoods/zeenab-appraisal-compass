import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Download, Search, Clock, DollarSign, Calendar, TrendingUp } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
}

export function OvertimePayrollReport() {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState((currentDate.getMonth() + 1).toString());
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear().toString());
  const [searchTerm, setSearchTerm] = useState('');
  const [baseHourlyRate] = useState(2000); // Base rate in Naira per hour

  const { data: overtimeData, isLoading, refetch } = useQuery({
    queryKey: ['overtime-report', selectedMonth, selectedYear],
    queryFn: async () => {
      const startDate = `${selectedYear}-${selectedMonth.padStart(2, '0')}-01`;
      const endDate = new Date(parseInt(selectedYear), parseInt(selectedMonth), 0)
        .toISOString()
        .split('T')[0];

      // Fetch attendance rules for rates
      const { data: rules } = await supabase
        .from('attendance_rules')
        .select('overtime_rate, night_shift_rate')
        .eq('is_active', true)
        .limit(1)
        .single();

      const overtimeRate = rules?.overtime_rate || 1.5;
      const nightShiftRate = rules?.night_shift_rate || 1.2;

      // Fetch attendance logs with overtime
      const { data: logs, error } = await supabase
        .from('attendance_logs')
        .select(`
          employee_id,
          total_hours,
          overtime_hours,
          is_night_shift,
          night_shift_hours,
          clock_in_time,
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
        .order('employee_id');

      if (error) throw error;

      // Group by employee and calculate totals
      const employeeMap = new Map<string, OvertimeReportData>();

      logs?.forEach((log: any) => {
        if (!log.employee) return;

        const employeeId = log.employee_id;
        const overtimeHours = log.overtime_hours || 0;
        const nightShiftHours = log.night_shift_hours || 0;
        const totalHours = log.total_hours || 0;
        const regularHours = totalHours - overtimeHours;

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
          });
        }

        const employee = employeeMap.get(employeeId)!;
        employee.total_overtime_hours += overtimeHours;
        employee.regular_hours += regularHours;
        employee.night_shift_hours += nightShiftHours;
        
        if (overtimeHours > 0) {
          employee.days_with_overtime += 1;
        }

        // Calculate payments
        employee.overtime_amount += overtimeHours * baseHourlyRate * overtimeRate;
        employee.night_shift_amount += nightShiftHours * baseHourlyRate * (nightShiftRate - 1);
        employee.total_payment = employee.overtime_amount + employee.night_shift_amount;
      });

      return Array.from(employeeMap.values()).sort((a, b) => 
        b.total_payment - a.total_payment
      );
    },
  });

  const filteredData = overtimeData?.filter((item) =>
    item.employee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalOvertimeHours = filteredData?.reduce((sum, item) => sum + item.total_overtime_hours, 0) || 0;
  const totalPayment = filteredData?.reduce((sum, item) => sum + item.total_payment, 0) || 0;
  const employeesWithOvertime = filteredData?.filter(item => item.total_overtime_hours > 0).length || 0;

  const exportToCSV = () => {
    if (!filteredData || filteredData.length === 0) {
      toast.error('No data to export');
      return;
    }

    const headers = [
      'Employee ID',
      'Employee Name',
      'Department',
      'Position',
      'Regular Hours',
      'Overtime Hours',
      'Night Shift Hours',
      'Days with Overtime',
      'Overtime Payment (₦)',
      'Night Shift Payment (₦)',
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
          item.regular_hours.toFixed(2),
          item.total_overtime_hours.toFixed(2),
          item.night_shift_hours.toFixed(2),
          item.days_with_overtime,
          item.overtime_amount.toFixed(2),
          item.night_shift_amount.toFixed(2),
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
    a.download = `overtime-report-${selectedYear}-${selectedMonth}.csv`;
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Monthly Overtime & Payroll Report
            </CardTitle>
            <Button onClick={exportToCSV} disabled={!filteredData || filteredData.length === 0}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="month">Month</Label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger id="month">
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
              <Label htmlFor="year">Year</Label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger id="year">
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
            <div>
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="search"
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
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead className="text-right">Regular Hours</TableHead>
                    <TableHead className="text-right">Overtime Hours</TableHead>
                    <TableHead className="text-right">Night Shift Hours</TableHead>
                    <TableHead className="text-center">Days with OT</TableHead>
                    <TableHead className="text-right">Overtime Pay</TableHead>
                    <TableHead className="text-right">Night Shift Pay</TableHead>
                    <TableHead className="text-right">Total Payment</TableHead>
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
                        <Badge variant="outline">{item.department}</Badge>
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
                      <TableCell className="text-right font-medium">
                        ₦{item.night_shift_amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-bold text-green-600">
                          ₦{item.total_payment.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              Base hourly rate: ₦{baseHourlyRate.toLocaleString()} | Showing {filteredData?.length || 0} employees
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
