import { useState, useEffect } from 'react';
import { useLatenessData } from '@/hooks/attendance/useLatenessData';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, Users, Clock, AlertCircle, XCircle, TrendingDown } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

export function LatenessDashboard() {
  const {
    records,
    stats,
    loading,
    dateFilter,
    setDateFilter,
    selectedDate,
    setSelectedDate,
    employeeFilter,
    setEmployeeFilter,
    departmentFilter,
    setDepartmentFilter,
    branchFilter,
    setBranchFilter,
  } = useLatenessData();

  const [employees, setEmployees] = useState<Array<{ id: string; name: string }>>([]);
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([]);
  const [branches, setBranches] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    fetchFilters();
  }, []);

  const fetchFilters = async () => {
    try {
      const [employeesRes, departmentsRes, branchesRes] = await Promise.all([
        supabase.from('profiles').select('id, first_name, last_name').eq('is_active', true),
        supabase.from('departments').select('id, name').eq('is_active', true),
        supabase.from('attendance_branches').select('id, name').eq('is_active', true),
      ]);

      if (employeesRes.data) {
        setEmployees(
          employeesRes.data.map((e) => ({
            id: e.id,
            name: `${e.first_name} ${e.last_name}`,
          }))
        );
      }

      if (departmentsRes.data) {
        setDepartments(departmentsRes.data);
      }

      if (branchesRes.data) {
        setBranches(branchesRes.data);
      }
    } catch (error) {
      console.error('Error fetching filters:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'on-time':
        return <Badge className="bg-green-500 text-white hover:bg-green-600">On Time</Badge>;
      case 'late':
        return <Badge className="bg-red-500 text-white hover:bg-red-600">Late</Badge>;
      case 'absent':
        return <Badge className="bg-red-600 text-white hover:bg-red-700">Absent</Badge>;
      case 'early-closure':
        return <Badge className="bg-red-500 text-white hover:bg-red-600">Early Closure</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const statCards = [
    {
      title: 'Total Records',
      value: stats.totalRecords,
      icon: Users,
      color: 'bg-blue-500',
    },
    {
      title: 'On Time',
      value: stats.onTimeCount,
      icon: Clock,
      color: 'bg-green-500',
    },
    {
      title: 'Late Arrivals',
      value: stats.lateCount,
      icon: AlertCircle,
      color: 'bg-red-500',
    },
    {
      title: 'Absences',
      value: stats.absentCount,
      icon: XCircle,
      color: 'bg-red-600',
    },
    {
      title: 'Early Closures',
      value: stats.earlyClosureCount,
      icon: TrendingDown,
      color: 'bg-red-500',
    },
    {
      title: 'Avg Late (mins)',
      value: Math.round(stats.averageLateMinutes),
      icon: Clock,
      color: 'bg-orange-500',
    },
  ];

  return (
    <div className="space-y-6 w-full max-w-full overflow-x-hidden">
      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.title} className="p-4">
            <div className="flex items-center gap-3">
              <div className={cn('p-2 rounded-lg', stat.color)}>
                <stat.icon className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground truncate">{stat.title}</p>
                <p className="text-xl font-bold">{stat.value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Time Period</label>
            <Select value={dateFilter} onValueChange={(value: any) => setDateFilter(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Day</SelectItem>
                <SelectItem value="week">Week</SelectItem>
                <SelectItem value="month">Month</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Select Date</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(selectedDate, 'MMM dd, yyyy')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={selectedDate} onSelect={(date) => date && setSelectedDate(date)} />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Employee</label>
            <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Employees</SelectItem>
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Department</label>
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.name}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Branch</label>
            <Select value={branchFilter} onValueChange={setBranchFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Branches</SelectItem>
                {branches.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Records Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Clock In</TableHead>
                <TableHead>Clock Out</TableHead>
                <TableHead>Late By</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : records.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No records found
                  </TableCell>
                </TableRow>
              ) : (
                records.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">{record.employee_name}</TableCell>
                    <TableCell>{record.department_name}</TableCell>
                    <TableCell>{record.branch_name}</TableCell>
                    <TableCell>
                      {record.clock_in_time ? format(new Date(record.clock_in_time), 'MMM dd, hh:mm a') : 'N/A'}
                    </TableCell>
                    <TableCell>
                      {record.clock_out_time ? format(new Date(record.clock_out_time), 'MMM dd, hh:mm a') : 'N/A'}
                    </TableCell>
                    <TableCell>{record.late_by_minutes > 0 ? `${record.late_by_minutes} mins` : '-'}</TableCell>
                    <TableCell>{getStatusBadge(record.status)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
