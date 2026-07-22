import { useState, useMemo, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { Calendar, MapPin, Clock, Filter, User, Building, Download, Search, Trash2, Moon, ChevronLeft, ChevronRight } from 'lucide-react';
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
import { toast } from 'sonner';
import ExcelJS from 'exceljs';

export function HRAttendanceView() {
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

  // Pass filters to hook for server-side filtering
  const { allLogs, loading, deleteLog, currentPage, totalPages, totalCount, goToPage, pageSize } = useAllAttendanceLogs({
    branchId: branchFilter,
    departmentFilter,
    employeeFilter,
    monthFilter,
    startDate,
    endDate,
    locationFilter,
    shiftFilter,
    searchQuery,
  });

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

  // Fetch filter options from database directly (not from paginated logs)
  const [dbBranches, setDbBranches] = useState<Array<{ id: string; name: string }>>([]);
  const [dbDepartments, setDbDepartments] = useState<Array<{ id: string; name: string }>>([]);
  const [dbEmployees, setDbEmployees] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    const fetchFilterOptions = async () => {
      const [branchesRes, departmentsRes, employeesRes] = await Promise.all([
        supabase.from('attendance_branches').select('id, name').eq('is_active', true).order('name'),
        supabase.from('departments').select('id, name').eq('is_active', true).order('name'),
        supabase.from('profiles').select('id, first_name, last_name, department').eq('is_active', true).order('first_name'),
      ]);
      if (branchesRes.data) setDbBranches(branchesRes.data);
      if (departmentsRes.data) setDbDepartments(departmentsRes.data);
      if (employeesRes.data) {
        setDbEmployees(employeesRes.data.map(e => ({ id: e.id, name: `${e.first_name} ${e.last_name}` })));
      }
    };
    fetchFilterOptions();
  }, []);

  // Only geofence filter remains client-side (simple boolean, not worth server roundtrip)
  const filteredLogs = useMemo(() => {
    if (geofenceFilter === 'all') return allLogs;
    return allLogs.filter((log: any) => {
      if (geofenceFilter === 'inside') return log.within_geofence_at_clock_in;
      if (geofenceFilter === 'outside') return !log.within_geofence_at_clock_in;
      return true;
    });
  }, [allLogs, geofenceFilter]);

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

  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    try {
      setExporting(true);
      toast.info('Preparing full export — this may take a moment...');

      // Resolve search -> employee ids (mirrors hook logic)
      let searchEmployeeIds: string[] | null = null;
      if (searchQuery && searchQuery.trim()) {
        const q = searchQuery.trim();
        const { data: matches } = await supabase
          .from('profiles')
          .select('id')
          .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,email.ilike.%${q}%,department.ilike.%${q}%`)
          .limit(1000);
        searchEmployeeIds = (matches || []).map((m: any) => m.id);
        if (searchEmployeeIds.length === 0) {
          toast.warning('No employees match the search.');
          setExporting(false);
          return;
        }
      }

      // Fetch ALL matching logs in batches (bypass 1000-row cap)
      const BATCH = 1000;
      let from = 0;
      const all: any[] = [];
      while (true) {
        let q = supabase
          .from('attendance_logs')
          .select(`
            *,
            employee:profiles!attendance_logs_employee_id_fkey(id, first_name, last_name, department, position, email),
            branch:attendance_branches!attendance_logs_branch_id_fkey(id, name, address)
          `)
          .order('clock_in_time', { ascending: true })
          .range(from, from + BATCH - 1);

        if (employeeFilter && employeeFilter !== 'all') q = q.eq('employee_id', employeeFilter);
        if (searchEmployeeIds) q = q.in('employee_id', searchEmployeeIds);
        if (branchFilter && branchFilter !== 'all') q = q.eq('branch_id', branchFilter);
        if (locationFilter && locationFilter !== 'all') q = q.eq('location_type', locationFilter);
        if (shiftFilter === 'night') q = q.eq('is_night_shift', true);
        else if (shiftFilter === 'day') q = q.eq('is_night_shift', false);
        if (startDate) q = q.gte('clock_in_time', `${startDate}T00:00:00`);
        if (endDate) q = q.lte('clock_in_time', `${endDate}T23:59:59`);
        if (monthFilter && monthFilter !== 'all') {
          const sel = new Date(monthFilter + '-01');
          q = q.gte('clock_in_time', startOfMonth(sel).toISOString())
               .lte('clock_in_time', endOfMonth(sel).toISOString());
        }

        const { data, error } = await q;
        if (error) throw error;
        if (!data || data.length === 0) break;
        all.push(...data);
        if (data.length < BATCH) break;
        from += BATCH;
      }

      // Client-side filters (department, geofence)
      let logs = all;
      if (departmentFilter && departmentFilter !== 'all') {
        logs = logs.filter((l: any) => l.employee?.department === departmentFilter);
      }
      if (geofenceFilter !== 'all') {
        logs = logs.filter((l: any) =>
          geofenceFilter === 'inside' ? l.within_geofence_at_clock_in : !l.within_geofence_at_clock_in
        );
      }

      if (logs.length === 0) {
        toast.warning('No records match the current filters.');
        setExporting(false);
        return;
      }

      // Group: branch -> employee -> records
      const branchMap = new Map<string, Map<string, { name: string; email: string; department: string; position: string; records: any[] }>>();
      for (const log of logs) {
        const branchName = log.branch?.name || 'No Branch';
        const empId = log.employee_id;
        const empName = `${log.employee?.first_name || ''} ${log.employee?.last_name || ''}`.trim() || 'Unknown';
        if (!branchMap.has(branchName)) branchMap.set(branchName, new Map());
        const empMap = branchMap.get(branchName)!;
        if (!empMap.has(empId)) {
          empMap.set(empId, {
            name: empName,
            email: log.employee?.email || '',
            department: log.employee?.department || '',
            position: log.employee?.position || '',
            records: [],
          });
        }
        empMap.get(empId)!.records.push(log);
      }

      // Build protected XLSX workbook grouped by branch → employee
      const headers = ['Date', 'Day', 'Clock In', 'Clock Out', 'Hours', 'Location', 'Geofence', 'Distance (m)', 'Field Location', 'Field Reason', 'GPS'];
      const periodLabel = monthFilter !== 'all'
        ? format(new Date(monthFilter + '-01'), 'MMMM yyyy')
        : (startDate || endDate) ? `${startDate || '...'} to ${endDate || '...'}` : 'All periods';

      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Zeenab HR System';
      workbook.created = new Date();
      const sheet = workbook.addWorksheet('Attendance Report');

      // Title rows
      sheet.addRow([`Attendance Report — ${periodLabel}`]);
      sheet.getRow(1).font = { bold: true, size: 14 };
      sheet.addRow([`Total records: ${logs.length}`]);
      sheet.addRow([`Generated: ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}`]);
      sheet.addRow([]);

      const branchNames = Array.from(branchMap.keys()).sort();
      for (const branchName of branchNames) {
        const bRow = sheet.addRow([`BRANCH: ${branchName}`]);
        bRow.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
        bRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF6B35' } };

        const empMap = branchMap.get(branchName)!;
        const employees = Array.from(empMap.values()).sort((a, b) => a.name.localeCompare(b.name));

        for (const emp of employees) {
          const totalHours = emp.records.reduce((s, r) => s + (r.total_hours || 0), 0);
          const daysPresent = emp.records.filter(r => r.clock_in_time).length;
          sheet.addRow([]);
          const eRow = sheet.addRow([`Employee: ${emp.name}`, `Email: ${emp.email}`, `Dept: ${emp.department}`, `Position: ${emp.position}`]);
          eRow.font = { bold: true };
          eRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF2E5' } };
          sheet.addRow([`Days present: ${daysPresent}`, `Total hours: ${totalHours.toFixed(2)}`]);
          const hRow = sheet.addRow(headers);
          hRow.font = { bold: true };
          hRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEEEEE' } };

          const sorted = emp.records.slice().sort((a, b) =>
            new Date(a.clock_in_time || 0).getTime() - new Date(b.clock_in_time || 0).getTime()
          );
          for (const log of sorted) {
            const ci = log.clock_in_time ? new Date(log.clock_in_time) : null;
            const co = log.clock_out_time ? new Date(log.clock_out_time) : null;
            sheet.addRow([
              ci ? format(ci, 'yyyy-MM-dd') : '-',
              ci ? format(ci, 'EEE') : '-',
              ci ? format(ci, 'HH:mm:ss') : '-',
              log.isPlaceholder ? '-' : co ? format(co, 'HH:mm:ss') : 'Active',
              log.total_hours ? Number(log.total_hours.toFixed(2)) : '',
              log.location_type || '-',
              log.isPlaceholder ? '-' : log.within_geofence_at_clock_in ? 'Inside' : 'Outside',
              log.geofence_distance_at_clock_in ?? '',
              log.field_work_location || '',
              log.field_work_reason || '',
              log.clock_in_latitude && log.clock_in_longitude
                ? `${log.clock_in_latitude.toFixed(6)}, ${log.clock_in_longitude.toFixed(6)}`
                : '',
            ]);
          }
        }
        sheet.addRow([]);
      }

      // Column widths
      [12, 6, 10, 10, 8, 10, 10, 12, 20, 20, 24].forEach((w, i) => { sheet.getColumn(i + 1).width = w; });

      // Compute SHA-256 integrity hash over the full data payload
      const payload = JSON.stringify(logs.map((l: any) => ({
        id: l.id, e: l.employee_id, ci: l.clock_in_time, co: l.clock_out_time,
        h: l.total_hours, b: l.branch_id, lt: l.location_type,
      })));
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(payload));
      const hashHex = Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');

      // Integrity sheet
      const integrity = workbook.addWorksheet('Integrity');
      integrity.addRow(['Field', 'Value']);
      integrity.getRow(1).font = { bold: true };
      integrity.addRow(['Generated At', format(new Date(), 'yyyy-MM-dd HH:mm:ss')]);
      integrity.addRow(['Period', periodLabel]);
      integrity.addRow(['Total Records', logs.length]);
      integrity.addRow(['Branches', branchNames.length]);
      integrity.addRow(['SHA-256 Hash', hashHex]);
      integrity.addRow(['Notice', 'This file is read-only. Any modification will invalidate the hash above.']);
      integrity.getColumn(1).width = 18;
      integrity.getColumn(2).width = 80;

      // Lock both sheets (read-only). Password required to unlock in Excel.
      const LOCK_PASSWORD = 'ZeenabHR-Locked-2026';
      await sheet.protect(LOCK_PASSWORD, {
        selectLockedCells: true,
        selectUnlockedCells: true,
        formatCells: false,
        formatColumns: false,
        formatRows: false,
        insertRows: false,
        insertColumns: false,
        deleteRows: false,
        deleteColumns: false,
        sort: false,
        autoFilter: false,
        pivotTables: false,
      });
      await integrity.protect(LOCK_PASSWORD, {
        selectLockedCells: true,
        selectUnlockedCells: true,
      });

      const buf = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const fileName = monthFilter !== 'all'
        ? `attendance-report-${monthFilter}-by-branch.xlsx`
        : `attendance-report-${format(new Date(), 'yyyy-MM-dd')}-by-branch.xlsx`;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${logs.length} locked records across ${branchNames.length} branch(es).`);
    } catch (err: any) {
      console.error('Export failed:', err);
      toast.error('Failed to export attendance report');
    } finally {
      setExporting(false);
    }
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
            <Button onClick={handleExport} variant="outline" size="sm" disabled={exporting}>
              <Download className="h-4 w-4 mr-2" />
              {exporting ? 'Exporting...' : 'Export Locked XLSX'}
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
                  {dbEmployees.map((emp) => (
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
                  {dbDepartments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.name}>
                      {dept.name}
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
                  {dbBranches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.name}
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
                          {log.clock_in_time ? format(new Date(log.clock_in_time), 'MMM dd') : '-'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {log.clock_in_time ? format(new Date(log.clock_in_time), 'EEE') : 'No record'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          {!log.isPlaceholder && <Clock className="h-3 w-3 text-muted-foreground" />}
                          {log.clock_in_time ? format(new Date(log.clock_in_time), 'h:mm a') : '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        {log.isPlaceholder ? (
                          <span className="text-muted-foreground text-sm">-</span>
                        ) : log.clock_out_time ? (
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
                        {log.isPlaceholder ? (
                          <span className="text-xs text-muted-foreground">-</span>
                        ) : log.branch ? (
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
                          {log.isPlaceholder ? (
                            <span className="text-sm text-muted-foreground">-</span>
                          ) : log.location_type === 'office' ? (
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
                        {log.isPlaceholder ? (
                          <span className="text-xs text-muted-foreground">-</span>
                        ) : log.within_geofence_at_clock_in ? (
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
                        {log.isPlaceholder ? (
                          <span className="text-xs text-muted-foreground">-</span>
                        ) : (
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
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination Controls */}
          {!loading && totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, totalCount)} of {totalCount} records
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage <= 1 || loading}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        className="w-8 h-8 p-0"
                        onClick={() => goToPage(pageNum)}
                        disabled={loading}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage >= totalPages || loading}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
