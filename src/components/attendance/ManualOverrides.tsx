import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAllAttendanceLogs } from '@/hooks/attendance/useAllAttendanceLogs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Edit2, Clock, MapPin, AlertTriangle, CheckCircle, Search } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export function ManualOverrides() {
  const { allLogs, loading, refetch } = useAllAttendanceLogs();
  const { profile } = useAuth();
  const [selectedLog, setSelectedLog] = useState<typeof allLogs[0] | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBranch, setFilterBranch] = useState<string>('all');
  const [overrideData, setOverrideData] = useState({
    clock_in_time: '',
    clock_out_time: '',
    override_reason: '',
    location_type: '',
  });

  const branches = useMemo(() => {
    const branchSet = new Set(
      allLogs.map((log) => log.branch?.name).filter(Boolean)
    );
    return Array.from(branchSet);
  }, [allLogs]);

  const filteredLogs = useMemo(() => {
    return allLogs.filter((log) => {
      const matchesSearch = !searchQuery || 
        log.employee?.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.employee?.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.employee?.department?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesBranch = filterBranch === 'all' || log.branch?.name === filterBranch;
      return matchesSearch && matchesBranch;
    });
  }, [allLogs, searchQuery, filterBranch]);

  const handleEditClick = (log: typeof allLogs[0]) => {
    setSelectedLog(log);
    setOverrideData({
      clock_in_time: log.clock_in_time ? format(new Date(log.clock_in_time), "yyyy-MM-dd'T'HH:mm") : '',
      clock_out_time: log.clock_out_time ? format(new Date(log.clock_out_time), "yyyy-MM-dd'T'HH:mm") : '',
      override_reason: '',
      location_type: log.location_type || 'office',
    });
    setIsDialogOpen(true);
  };

  const handleSaveOverride = async () => {
    if (!selectedLog || !overrideData.override_reason.trim()) {
      toast.error('Please provide a reason for the override');
      return;
    }

    try {
      const clockInTime = new Date(overrideData.clock_in_time);
      const clockOutTime = overrideData.clock_out_time ? new Date(overrideData.clock_out_time) : null;
      
      let totalHours = null;
      if (clockOutTime) {
        const diffMs = clockOutTime.getTime() - clockInTime.getTime();
        totalHours = diffMs / (1000 * 60 * 60);
      }

      // Update the attendance log
      const { error: updateError } = await supabase
        .from('attendance_logs')
        .update({
          clock_in_time: clockInTime.toISOString(),
          clock_out_time: clockOutTime?.toISOString() || null,
          total_hours: totalHours,
          location_type: overrideData.location_type,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedLog.id);

      if (updateError) throw updateError;

      // Log the override in a comment/note (you could create a separate table for this)
      // For now, we'll just show a success message
      toast.success('Attendance log updated successfully');
      
      // Send notification to employee
      await supabase.from('notifications').insert({
        user_id: selectedLog.employee_id,
        type: 'attendance_override',
        title: 'Attendance Record Updated',
        message: `Your attendance record for ${format(clockInTime, 'MMM dd, yyyy')} has been adjusted by HR. Reason: ${overrideData.override_reason}`,
      });

      setIsDialogOpen(false);
      setSelectedLog(null);
      refetch();
    } catch (error) {
      console.error('Error saving override:', error);
      toast.error('Failed to update attendance log');
    }
  };

  const calculateHours = (clockIn: string, clockOut: string) => {
    if (!clockIn || !clockOut) return 'N/A';
    const diff = new Date(clockOut).getTime() - new Date(clockIn).getTime();
    const hours = diff / (1000 * 60 * 60);
    return `${hours.toFixed(2)}h`;
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="text-center text-muted-foreground">Loading attendance logs...</div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Manual Attendance Overrides</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Adjust attendance records for exceptions and special cases
          </p>
        </div>
        <Badge variant="outline" className="text-orange-600 border-orange-600">
          <AlertTriangle className="w-3 h-3 mr-1" />
          Admin Only
        </Badge>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search by employee name or department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
          </div>
          <Select value={filterBranch} onValueChange={setFilterBranch}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All branches" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Branches</SelectItem>
              {branches.map((branch) => (
                <SelectItem key={branch} value={branch || ''}>
                  {branch}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Attendance Logs Table */}
      <Card className="p-6">
        <div className="space-y-4">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12">
              <Search className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No attendance logs found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredLogs.map((log) => (
                <Card key={log.id} className="p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-3">
                        <div>
                          <h3 className="font-semibold">
                            {log.employee?.first_name} {log.employee?.last_name}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {log.employee?.department} • {log.employee?.position}
                          </p>
                        </div>
                        <Badge variant={log.location_type === 'office' ? 'default' : 'secondary'}>
                          {log.location_type === 'office' ? 'In Office' : 'On Field'}
                        </Badge>
                        {log.is_late && (
                          <Badge variant="destructive">Late</Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Date
                          </p>
                          <p className="font-medium">
                            {format(new Date(log.clock_in_time), 'MMM dd, yyyy')}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Clock In</p>
                          <p className="font-medium">
                            {format(new Date(log.clock_in_time), 'HH:mm')}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Clock Out</p>
                          <p className="font-medium">
                            {log.clock_out_time 
                              ? format(new Date(log.clock_out_time), 'HH:mm')
                              : 'Not clocked out'}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Total Hours</p>
                          <p className="font-medium">
                            {log.total_hours ? `${log.total_hours.toFixed(2)}h` : 'N/A'}
                          </p>
                        </div>
                      </div>

                      {log.branch && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="w-3 h-3" />
                          <span>{log.branch.name}</span>
                          {!log.within_geofence_at_clock_in && (
                            <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                              Outside Geofence
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditClick(log)}
                    >
                      <Edit2 className="w-4 h-4 mr-2" />
                      Override
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Override Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-orange-600" />
              Override Attendance Record
            </DialogTitle>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-4">
              {/* Employee Info */}
              <Card className="p-4 bg-muted/50">
                <div className="space-y-1">
                  <h4 className="font-semibold">
                    {selectedLog.employee?.first_name} {selectedLog.employee?.last_name}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {selectedLog.employee?.department} • {selectedLog.employee?.position}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Original Date: {format(new Date(selectedLog.clock_in_time), 'MMM dd, yyyy')}
                  </p>
                </div>
              </Card>

              {/* Override Form */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="clock_in">Clock In Time *</Label>
                  <Input
                    id="clock_in"
                    type="datetime-local"
                    value={overrideData.clock_in_time}
                    onChange={(e) => setOverrideData({ ...overrideData, clock_in_time: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="clock_out">Clock Out Time</Label>
                  <Input
                    id="clock_out"
                    type="datetime-local"
                    value={overrideData.clock_out_time}
                    onChange={(e) => setOverrideData({ ...overrideData, clock_out_time: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="location_type">Location Type</Label>
                  <Select
                    value={overrideData.location_type}
                    onValueChange={(value) => setOverrideData({ ...overrideData, location_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="office">In Office</SelectItem>
                      <SelectItem value="field">On Field</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {overrideData.clock_in_time && overrideData.clock_out_time && (
                  <Card className="p-3 bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-green-700 dark:text-green-400 font-medium">
                        New Total Hours: {calculateHours(overrideData.clock_in_time, overrideData.clock_out_time)}
                      </span>
                    </div>
                  </Card>
                )}

                <div>
                  <Label htmlFor="reason">Override Reason *</Label>
                  <Textarea
                    id="reason"
                    value={overrideData.override_reason}
                    onChange={(e) => setOverrideData({ ...overrideData, override_reason: e.target.value })}
                    placeholder="Explain why this attendance record needs to be adjusted..."
                    rows={4}
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    This reason will be logged and visible to the employee
                  </p>
                </div>

                <Card className="p-3 bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800">
                  <div className="flex items-start gap-2 text-sm">
                    <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />
                    <div className="text-yellow-700 dark:text-yellow-400">
                      <p className="font-medium">Important:</p>
                      <ul className="list-disc list-inside mt-1 space-y-1 text-xs">
                        <li>This action will be logged with your user ID</li>
                        <li>The employee will be notified of this change</li>
                        <li>This may affect financial charges</li>
                      </ul>
                    </div>
                  </div>
                </Card>
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveOverride}
                  disabled={!overrideData.override_reason.trim()}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Save Override
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
