import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { format, parseISO, isSameDay } from 'date-fns';
import { Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAttendanceLogs } from '@/hooks/attendance/useAttendanceLogs';
import { Skeleton } from '@/components/ui/skeleton';
import { listContainerVariants, listItemVariants } from '@/utils/animations';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export function AttendanceHistory() {
  const { recentLogs, loading } = useAttendanceLogs();
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredLogs = recentLogs.filter((log: any) => {
    if (locationFilter !== 'all' && log.location_type !== locationFilter) return false;
    if (statusFilter === 'on-time' && log.is_late) return false;
    if (statusFilter === 'late' && !log.is_late) return false;
    return true;
  });

  // Group logs by date
  const groupedLogs = useMemo(() => {
    const groups: { [key: string]: any[] } = {};
    
    filteredLogs.forEach((log: any) => {
      const dateKey = format(parseISO(log.clock_in_time), 'yyyy-MM-dd');
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(log);
    });

    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filteredLogs]);

  const getStatusBadge = (log: any) => {
    if (!log.clock_out_time) {
      return <Badge className="bg-attendance-info text-white">Active</Badge>;
    }
    if (log.is_late) {
      return <Badge className="bg-attendance-warning text-white">Late</Badge>;
    }
    return <Badge className="bg-attendance-success text-white">On Time</Badge>;
  };

  const calculateDuration = (log: any) => {
    if (!log.clock_out_time) return '--:--:--';
    
    const clockIn = new Date(log.clock_in_time);
    const clockOut = new Date(log.clock_out_time);
    const diff = clockOut.getTime() - clockIn.getTime();
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
  };

  return (
    <Card className="bg-white shadow-[0_4px_12px_rgba(0,0,0,0.1)]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-attendance-primary">History</CardTitle>
          
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Filter className="h-4 w-4" />
                Filter
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Filter History</SheetTitle>
                <SheetDescription>
                  Filter attendance records by location and status
                </SheetDescription>
              </SheetHeader>
              <div className="space-y-4 mt-6">
                <div>
                  <label className="text-sm font-medium mb-2 block">Location</label>
                  <Select value={locationFilter} onValueChange={setLocationFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Locations" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Locations</SelectItem>
                      <SelectItem value="office">Office</SelectItem>
                      <SelectItem value="field">Field</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Status</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="on-time">On Time</SelectItem>
                      <SelectItem value="late">Late</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {(locationFilter !== 'all' || statusFilter !== 'all') && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setLocationFilter('all');
                      setStatusFilter('all');
                    }}
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : groupedLogs.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>No attendance records found</p>
          </div>
        ) : (
          <motion.div 
            className="space-y-6"
            variants={listContainerVariants}
            initial="hidden"
            animate="visible"
          >
            {groupedLogs.map(([dateKey, logs], groupIndex) => (
              <motion.div 
                key={dateKey}
                variants={listItemVariants}
              >
                {/* Date Header */}
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-foreground">
                    {format(parseISO(dateKey), 'MMMM d, yyyy')}
                  </h3>
                  {logs.every((log: any) => !log.is_late && log.clock_out_time) && (
                    <Badge className="bg-attendance-success text-white">On Time</Badge>
                  )}
                </div>

                {/* Records for this date */}
                <motion.div 
                  className="space-y-3"
                  variants={listContainerVariants}
                >
                  {logs.map((log: any, logIndex) => (
                    <motion.div
                      key={log.id}
                      className="bg-muted/30 rounded-lg p-4 hover:bg-muted/50 transition-colors"
                      variants={listItemVariants}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-muted-foreground">
                            {log.location_type === 'office' ? 'Office' : 'Field Work'}
                          </span>
                        </div>
                        {getStatusBadge(log)}
                      </div>

                      {/* 3-Column Layout */}
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Clock In Time</p>
                          <p className="text-lg font-bold text-attendance-primary">
                            {format(parseISO(log.clock_in_time), 'HH:mm:ss')}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Clock Out Time</p>
                          <p className="text-lg font-bold text-foreground">
                            {log.clock_out_time 
                              ? format(parseISO(log.clock_out_time), 'HH:mm:ss')
                              : '--:--:--'
                            }
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Work Duration</p>
                          <p className="text-lg font-bold text-foreground">
                            {calculateDuration(log)}
                          </p>
                        </div>
                      </div>

                      {/* Additional Info */}
                      {log.location_type === 'field' && log.field_work_location && (
                        <div className="mt-3 pt-3 border-t">
                          <p className="text-xs text-muted-foreground">
                            Location: {log.field_work_location}
                          </p>
                        </div>
                      )}

                      {log.is_late && log.late_by_minutes && (
                        <div className="mt-2">
                          <p className="text-xs text-attendance-warning">
                            Late by {log.late_by_minutes} minutes
                          </p>
                        </div>
                      )}

                      {(log.overtime_hours || log.is_night_shift) && (
                        <div className="mt-3 pt-3 border-t flex gap-4">
                          {log.overtime_hours && log.overtime_hours > 0 && (
                            <div className="text-xs">
                              <span className="text-muted-foreground">Overtime: </span>
                              <span className="font-semibold text-attendance-primary">
                                {log.overtime_hours.toFixed(1)}h
                              </span>
                            </div>
                          )}
                          {log.is_night_shift && (
                            <Badge variant="secondary" className="text-xs">
                              Night Shift
                            </Badge>
                          )}
                        </div>
                      )}
                    </motion.div>
                  ))}
                </motion.div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}
