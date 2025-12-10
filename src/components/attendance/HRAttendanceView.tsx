import { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, subMonths, parseISO, startOfDay, endOfDay } from 'date-fns';
import { Calendar, MapPin, Clock, Filter, User, Building, Download, Search, Trash2, Moon } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAllAttendanceLogs } from '@/hooks/attendance/useAllAttendanceLogs';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiDemoModeSettings } from './ApiDemoModeSettings';

export function HRAttendanceView() {
  const { allLogs, loading, deleteLog } = useAllAttendanceLogs();
  const [searchQuery, setSearchQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [geofenceFilter, setGeofenceFilter] = useState<string>('all');
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [monthFilter, setMonthFilter] = useState<string>('all');
  const [employeeFilter, setEmployeeFilter] = useState<string>('all');
  const [shiftFilter, setShiftFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Generate month options (current month + last 11 months)
  const monthOptions = useMemo(() => {
    const months = [];
    for (let i = 0; i < 12; i++) {
      const date = subMonths(new Date(), i);
      months.push({
        value: format(date, 'yyyy-MM'),
        label: format(date, 'MMMM yyyy'),
      });
    }
    return months;
  }, []);

  // Extract unique values for filters
  const { uniqueBranches, uniqueDepartments, uniqueEmployees } = useMemo(() => {
    const branches = new Set<string>();
    const departments = new Set<string>();
    const employees = new Map<string, { id: string; name: string }>();

    allLogs.forEach((log: any) => {
      if (log.branch?.name) branches.add(log.branch.name);
      if (log.employee?.department) departments.add(log.employee.department);
      if (log.employee?.id) {
        const name = `${log.employee.first_name} ${log.employee.last_name}`;
        employees.set(log.employee.id, { id: log.employee.id, name });
      }
    });

    return {
      uniqueBranches: Array.from(branches),
      uniqueDepartments: Array.from(departments),
      uniqueEmployees: Array.from(employees.values()).sort((a, b) => a.name.localeCompare(b.name)),
    };
  }, [allLogs]);

  const filteredLogs = useMemo(() => {
    return allLogs.filter((log: any) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const employeeName = `${log.employee?.first_name} ${log.employee?.last_name}`.toLowerCase();
        const email = log.employee?.email?.toLowerCase() || '';
        const department = log.employee?.department?.toLowerCase() || '';
        
        if (!employeeName.includes(query) && !email.includes(query) && !department.includes(query)) {
          return false;
        }
      }

      // Employee filter
      if (employeeFilter !== 'all' && log.employee?.id !== employeeFilter) return false;

      // Date range filter
      if (startDate) {
        const logDate = startOfDay(new Date(log.clock_in_time));
        const filterStartDate = startOfDay(parseISO(startDate));
        if (logDate < filterStartDate) return false;
      }
      if (endDate) {
        const logDate = endOfDay(new Date(log.clock_in_time));
        const filterEndDate = endOfDay(parseISO(endDate));
        if (logDate > filterEndDate) return false;
      }

      // Month filter
      if (monthFilter !== 'all') {
        const logDate = new Date(log.clock_in_time);
        const selectedMonth = new Date(monthFilter + '-01');
        const monthStart = startOfMonth(selectedMonth);
        const monthEnd = endOfMonth(selectedMonth);
        
        if (logDate < monthStart || logDate > monthEnd) {
          return false;
        }
      }

      // Other filters
      if (locationFilter !== 'all' && log.location_type !== locationFilter) return false;
      if (geofenceFilter === 'inside' && !log.within_geofence_at_clock_in) return false;
      if (geofenceFilter === 'outside' && log.within_geofence_at_clock_in) return false;
      if (branchFilter !== 'all' && log.branch?.name !== branchFilter) return false;
      if (departmentFilter !== 'all' && log.employee?.department !== departmentFilter) return false;
      
      // Shift filter (day shift vs night shift)
      if (shiftFilter === 'night' && !log.is_night_shift) return false;
      if (shiftFilter === 'day' && log.is_night_shift) return false;

      return true;
    });
  }, [allLogs, searchQuery, locationFilter, geofenceFilter, branchFilter, departmentFilter, monthFilter, employeeFilter, shiftFilter, startDate, endDate]);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalRecords = filteredLogs.length;
    const activeRecords = filteredLogs.filter((log: any) => !log.clock_out_time).length;
    const officeRecords = filteredLogs.filter((log: any) => log.location_type === 'office').length;
    const fieldRecords = filteredLogs.filter((log: any) => log.location_type === 'field').length;
    const insideGeofence = filteredLogs.filter((log: any) => log.within_geofence_at_clock_in).length;
    const nightShiftRecords = filteredLogs.filter((log: any) => log.is_night_shift).length;
    const totalHours = filteredLogs.reduce((sum: number, log: any) => sum + (log.total_hours || 0), 0);
    const totalNightShiftHours = filteredLogs.reduce((sum: number, log: any) => sum + (log.night_shift_hours || 0), 0);

    return {
      totalRecords,
      activeRecords,
      officeRecords,
      fieldRecords,
      insideGeofence,
      nightShiftRecords,
      totalNightShiftHours: totalNightShiftHours.toFixed(1),
      avgHours: totalRecords > 0 ? (totalHours / totalRecords).toFixed(1) : '0',
    };
  }, [filteredLogs]);

  const handleExport = () => {
    // Prepare CSV data
    const headers = ['Employee', 'Email', 'Department', 'Date', 'Clock In', 'Clock Out', 'Hours', 'Branch', 'Location', 'Geofence Status', 'Distance (m)', 'Field Location', 'Field Reason', 'GPS Coordinates'];
    const rows = filteredLogs.map((log: any) => [
      `${log.employee?.first_name} ${log.employee?.last_name}`,
      log.employee?.email || '',
      log.employee?.department || '',
      format(new Date(log.clock_in_time), 'yyyy-MM-dd'),
      format(new Date(log.clock_in_time), 'HH:mm:ss'),
      log.clock_out_time ? format(new Date(log.clock_out_time), 'HH:mm:ss') : 'Active',
      log.total_hours?.toFixed(2) || '',
      log.branch?.name || '',
      log.location_type,
      log.within_geofence_at_clock_in ? 'Inside' : 'Outside',
      log.geofence_distance_at_clock_in || '',
      log.field_work_location || '',
      log.field_work_reason || '',
      log.clock_in_latitude && log.clock_in_longitude 
        ? `${log.clock_in_latitude.toFixed(6)}, ${log.clock_in_longitude.toFixed(6)}` 
        : '',
    ]);

    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const fileName = monthFilter !== 'all' 
      ? `attendance-report-${monthFilter}.csv`
      : `attendance-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* API Demo Mode Settings */}
      <ApiDemoModeSettings />
      
      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Records</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRecords}</div>
            <p className="text-xs text-muted-foreground">{stats.activeRecords} active sessions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Office / Field</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.officeRecords} / {stats.fieldRecords}</div>
            <p className="text-xs text-muted-foreground">Location distribution</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Night Shift</CardTitle>
            <Moon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.nightShiftRecords}</div>
            <p className="text-xs text-muted-foreground">{stats.totalNightShiftHours}h total night hours</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Geofence Compliance</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalRecords > 0 ? ((stats.insideGeofence / stats.totalRecords) * 100).toFixed(0) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">{stats.insideGeofence} inside geofence</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Hours/Session</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgHours}h</div>
            <p className="text-xs text-muted-foreground">Per attendance record</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Employee Attendance</CardTitle>
              <CardDescription>View and manage attendance records for all employees</CardDescription>
            </div>
            <Button onClick={handleExport} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search and Filters */}
          <div className="space-y-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by employee name, email, or department..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Employee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Employees</SelectItem>
                  {uniqueEmployees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-[160px]"
                  placeholder="Start date"
                />
                <span className="text-muted-foreground">to</span>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-[160px]"
                  placeholder="End date"
                />
              </div>

              <Select value={monthFilter} onValueChange={setMonthFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Month" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Months</SelectItem>
                  {monthOptions.map((month) => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {uniqueDepartments.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={locationFilter} onValueChange={setLocationFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  <SelectItem value="office">Office</SelectItem>
                  <SelectItem value="field">Field</SelectItem>
                </SelectContent>
              </Select>

              <Select value={geofenceFilter} onValueChange={setGeofenceFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Geofence" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="inside">Inside</SelectItem>
                  <SelectItem value="outside">Outside</SelectItem>
                </SelectContent>
              </Select>

              <Select value={branchFilter} onValueChange={setBranchFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Branch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Branches</SelectItem>
                  {uniqueBranches.map((branch) => (
                    <SelectItem key={branch} value={branch}>
                      {branch}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={shiftFilter} onValueChange={setShiftFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Shift" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Shifts</SelectItem>
                  <SelectItem value="day">Day Shift</SelectItem>
                  <SelectItem value="night">Night Shift</SelectItem>
                </SelectContent>
              </Select>

              {(searchQuery || monthFilter !== 'all' || locationFilter !== 'all' || geofenceFilter !== 'all' || branchFilter !== 'all' || departmentFilter !== 'all' || employeeFilter !== 'all' || shiftFilter !== 'all' || startDate || endDate) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchQuery('');
                    setMonthFilter('all');
                    setLocationFilter('all');
                    setGeofenceFilter('all');
                    setBranchFilter('all');
                    setDepartmentFilter('all');
                    setEmployeeFilter('all');
                    setShiftFilter('all');
                    setStartDate('');
                    setEndDate('');
                  }}
                >
                  Clear All
                </Button>
              )}
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-lg font-medium">No attendance records found</p>
              <p className="text-sm">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Clock In</TableHead>
                    <TableHead>Clock Out</TableHead>
                    <TableHead>Hours</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Field Details</TableHead>
                    <TableHead>GPS Coordinates</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log: any) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-primary/10 rounded-full">
                            <User className="h-3 w-3 text-primary" />
                          </div>
                          <div>
                            <div className="font-medium text-sm">
                              {log.employee?.first_name} {log.employee?.last_name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {log.employee?.department || 'No Dept'} • {log.employee?.position || 'No Position'}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-sm">
                          {format(new Date(log.clock_in_time), 'MMM dd')}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(log.clock_in_time), 'EEE')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          {format(new Date(log.clock_in_time), 'h:mm a')}
                        </div>
                      </TableCell>
                      <TableCell>
                        {log.clock_out_time ? (
                          <div className="flex items-center gap-1 text-sm">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            {format(new Date(log.clock_out_time), 'h:mm a')}
                          </div>
                        ) : (
                          <Badge variant="secondary" className="text-xs">Active</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {log.total_hours ? (
                          <div className="font-semibold text-sm">
                            {log.total_hours.toFixed(1)}h
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {log.branch ? (
                          <div className="flex items-center gap-1.5">
                            <Building className="h-3 w-3 text-muted-foreground" />
                            <div>
                              <div className="font-medium text-sm">{log.branch.name}</div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">No branch</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {log.location_type === 'office' ? (
                            <>
                              <MapPin className="h-3 w-3 text-blue-500" />
                              <span className="text-sm">Office</span>
                            </>
                          ) : (
                            <>
                              <MapPin className="h-3 w-3 text-orange-500" />
                              <span className="text-sm">Field</span>
                            </>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {log.location_type === 'field' ? (
                          <div className="max-w-[150px]">
                            {log.field_work_location && (
                              <div className="text-sm font-medium truncate" title={log.field_work_location}>
                                📍 {log.field_work_location}
                              </div>
                            )}
                            {log.field_work_reason && (
                              <div className="text-xs text-muted-foreground truncate" title={log.field_work_reason}>
                                Reason: {log.field_work_reason}
                              </div>
                            )}
                            {!log.field_work_location && !log.field_work_reason && (
                              <span className="text-xs text-muted-foreground">No details</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {log.clock_in_latitude && log.clock_in_longitude ? (
                          <div className="text-xs">
                            <a 
                              href={`https://www.openstreetmap.org/?mlat=${log.clock_in_latitude}&mlon=${log.clock_in_longitude}&zoom=17`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline flex items-center gap-1"
                            >
                              <MapPin className="h-3 w-3" />
                              View Map
                            </a>
                            <div className="text-muted-foreground mt-0.5">
                              {log.clock_in_latitude.toFixed(4)}, {log.clock_in_longitude.toFixed(4)}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">No GPS</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {log.within_geofence_at_clock_in ? (
                          <Badge variant="default" className="bg-green-500 hover:bg-green-600 text-xs">
                            Inside
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="text-xs">
                            Outside
                          </Badge>
                        )}
                        {log.geofence_distance_at_clock_in !== null && (
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {log.geofence_distance_at_clock_in}m
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this attendance record?')) {
                              deleteLog(log.id);
                            }
                          }}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
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
