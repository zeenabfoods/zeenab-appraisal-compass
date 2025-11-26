import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { Calendar, MapPin, Clock, Filter, User, Building } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAttendanceLogs } from '@/hooks/attendance/useAttendanceLogs';
import { Skeleton } from '@/components/ui/skeleton';

export function AttendanceHistory() {
  const { recentLogs, loading } = useAttendanceLogs();
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [geofenceFilter, setGeofenceFilter] = useState<string>('all');
  const [branchFilter, setBranchFilter] = useState<string>('all');

  // Extract unique branches from logs
  const uniqueBranches = useMemo(() => {
    const branches = recentLogs
      .map((log: any) => log.branch)
      .filter((branch): branch is { name: string; address: string | null } => branch !== null);
    const uniqueMap = new Map();
    branches.forEach(branch => {
      if (branch && !uniqueMap.has(branch.name)) {
        uniqueMap.set(branch.name, branch);
      }
    });
    return Array.from(uniqueMap.values());
  }, [recentLogs]);

  const filteredLogs = recentLogs.filter((log: any) => {
    if (locationFilter !== 'all' && log.location_type !== locationFilter) return false;
    if (geofenceFilter === 'inside' && !log.within_geofence_at_clock_in) return false;
    if (geofenceFilter === 'outside' && log.within_geofence_at_clock_in) return false;
    if (branchFilter !== 'all' && log.branch?.name !== branchFilter) return false;
    return true;
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Attendance History
        </CardTitle>
        <CardDescription>View your past clock-in and clock-out records</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                <SelectItem value="office">Office</SelectItem>
                <SelectItem value="field">Field</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Select value={geofenceFilter} onValueChange={setGeofenceFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Geofence" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="inside">Inside</SelectItem>
              <SelectItem value="outside">Outside</SelectItem>
            </SelectContent>
          </Select>

          <Select value={branchFilter} onValueChange={setBranchFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Branch" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Branches</SelectItem>
              {uniqueBranches.map((branch) => (
                <SelectItem key={branch.name} value={branch.name}>
                  {branch.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {(locationFilter !== 'all' || geofenceFilter !== 'all' || branchFilter !== 'all') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setLocationFilter('all');
                setGeofenceFilter('all');
                setBranchFilter('all');
              }}
            >
              Clear Filters
            </Button>
          )}
        </div>

        {/* Table */}
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No attendance records found</p>
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
                  <TableHead>Overtime</TableHead>
                  <TableHead>Night Shift</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
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
                            {log.employee?.department || 'No Department'}
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
                      {log.overtime_hours && log.overtime_hours > 0 ? (
                        <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                          +{log.overtime_hours.toFixed(1)}h
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {log.is_night_shift ? (
                        <div className="flex flex-col gap-1">
                          <Badge variant="default" className="bg-purple-600">
                            Night Shift
                          </Badge>
                          {log.night_shift_hours && log.night_shift_hours > 0 && (
                            <span className="text-xs text-muted-foreground">
                              {log.night_shift_hours.toFixed(1)}h
                            </span>
                          )}
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
                            {log.branch.address && (
                              <div className="text-xs text-muted-foreground line-clamp-1">
                                {log.branch.address}
                              </div>
                            )}
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
                      {log.location_type === 'field' && log.field_work_location && (
                        <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                          {log.field_work_location}
                        </div>
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
