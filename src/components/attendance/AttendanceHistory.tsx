import { useState } from 'react';
import { format } from 'date-fns';
import { Calendar, MapPin, Clock, Filter } from 'lucide-react';
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

  const filteredLogs = recentLogs.filter(log => {
    if (locationFilter !== 'all' && log.location_type !== locationFilter) return false;
    if (geofenceFilter === 'inside' && !log.within_geofence_at_clock_in) return false;
    if (geofenceFilter === 'outside' && log.within_geofence_at_clock_in) return false;
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
        <div className="flex gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Location Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                <SelectItem value="office">Office</SelectItem>
                <SelectItem value="field">Field</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Select value={geofenceFilter} onValueChange={setGeofenceFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Geofence Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="inside">Inside Geofence</SelectItem>
              <SelectItem value="outside">Outside Geofence</SelectItem>
            </SelectContent>
          </Select>

          {(locationFilter !== 'all' || geofenceFilter !== 'all') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setLocationFilter('all');
                setGeofenceFilter('all');
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
                  <TableHead>Date</TableHead>
                  <TableHead>Clock In</TableHead>
                  <TableHead>Clock Out</TableHead>
                  <TableHead>Total Hours</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Geofence</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <div className="font-medium">
                        {format(new Date(log.clock_in_time), 'MMM dd, yyyy')}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(log.clock_in_time), 'EEEE')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        {format(new Date(log.clock_in_time), 'h:mm a')}
                      </div>
                    </TableCell>
                    <TableCell>
                      {log.clock_out_time ? (
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          {format(new Date(log.clock_out_time), 'h:mm a')}
                        </div>
                      ) : (
                        <Badge variant="secondary">Active</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {log.total_hours ? (
                        <div className="font-medium">
                          {log.total_hours.toFixed(2)} hrs
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {log.location_type === 'office' ? (
                          <>
                            <MapPin className="h-3 w-3 text-blue-500" />
                            <span>Office</span>
                          </>
                        ) : (
                          <>
                            <MapPin className="h-3 w-3 text-orange-500" />
                            <span>Field</span>
                          </>
                        )}
                      </div>
                      {log.location_type === 'field' && log.field_work_location && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {log.field_work_location}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {log.within_geofence_at_clock_in ? (
                        <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                          Inside
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          Outside
                        </Badge>
                      )}
                      {log.geofence_distance_at_clock_in !== null && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {log.geofence_distance_at_clock_in}m away
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
