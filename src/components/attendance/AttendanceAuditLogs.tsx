import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  FileText, 
  Filter, 
  X,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Eye,
  Clock,
  User
} from 'lucide-react';
import { useAttendanceAuditLogs } from '@/hooks/attendance/useAttendanceAuditLogs';
import { format } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';

const ACTION_CATEGORIES = [
  { value: 'role_management', label: 'Role Management' },
  { value: 'manual_override', label: 'Manual Override' },
  { value: 'charge_management', label: 'Charge Management' },
  { value: 'rule_change', label: 'Rule Changes' },
  { value: 'branch_management', label: 'Branch Management' },
  { value: 'overtime_approval', label: 'Overtime Approval' },
  { value: 'record_deletion', label: 'Record Deletion' },
];

const ACTION_TYPES = [
  { value: 'role_assigned', label: 'Role Assigned' },
  { value: 'role_revoked', label: 'Role Revoked' },
  { value: 'clock_time_modified', label: 'Clock Time Modified' },
  { value: 'record_deleted', label: 'Record Deleted' },
  { value: 'charge_waived', label: 'Charge Waived' },
  { value: 'charge_disputed', label: 'Charge Disputed' },
  { value: 'rule_updated', label: 'Rule Updated' },
  { value: 'branch_created', label: 'Branch Created' },
  { value: 'branch_updated', label: 'Branch Updated' },
  { value: 'overtime_approved', label: 'Overtime Approved' },
];

function getActionBadgeVariant(actionType: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (actionType.includes('deleted') || actionType.includes('revoked')) return 'destructive';
  if (actionType.includes('approved') || actionType.includes('assigned')) return 'default';
  if (actionType.includes('waived')) return 'secondary';
  return 'outline';
}

export function AttendanceAuditLogs() {
  const {
    logs,
    loading,
    currentPage,
    totalPages,
    totalCount,
    filters,
    applyFilters,
    clearFilters,
    goToPage,
  } = useAttendanceAuditLogs();

  const [filterOpen, setFilterOpen] = useState(false);
  const [tempFilters, setTempFilters] = useState(filters);
  const [detailLog, setDetailLog] = useState<typeof logs[0] | null>(null);

  const handleApplyFilters = () => {
    applyFilters(tempFilters);
    setFilterOpen(false);
  };

  const handleClearFilters = () => {
    setTempFilters({});
    clearFilters();
    setFilterOpen(false);
  };

  const hasActiveFilters = Object.values(filters).some(v => v);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Audit Logs
            </CardTitle>
            <CardDescription>
              Track all attendance system changes and actions ({totalCount} total records)
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" />
                Clear Filters
              </Button>
            )}
            <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                  {hasActiveFilters && (
                    <Badge variant="secondary" className="ml-2">
                      {Object.values(filters).filter(v => v).length}
                    </Badge>
                  )}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Filter Audit Logs</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Action Category</Label>
                    <Select
                      value={tempFilters.actionCategory || ''}
                      onValueChange={(v) => setTempFilters({ ...tempFilters, actionCategory: v || undefined })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All categories</SelectItem>
                        {ACTION_CATEGORIES.map(cat => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Action Type</Label>
                    <Select
                      value={tempFilters.actionType || ''}
                      onValueChange={(v) => setTempFilters({ ...tempFilters, actionType: v || undefined })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All types</SelectItem>
                        {ACTION_TYPES.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>From Date</Label>
                      <Input
                        type="date"
                        value={tempFilters.dateFrom || ''}
                        onChange={(e) => setTempFilters({ ...tempFilters, dateFrom: e.target.value || undefined })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>To Date</Label>
                      <Input
                        type="date"
                        value={tempFilters.dateTo || ''}
                        onChange={(e) => setTempFilters({ ...tempFilters, dateTo: e.target.value || undefined })}
                      />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={handleClearFilters}>
                    Clear All
                  </Button>
                  <Button onClick={handleApplyFilters}>
                    Apply Filters
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No audit logs found</p>
            {hasActiveFilters && (
              <p className="text-sm">Try adjusting your filters</p>
            )}
          </div>
        ) : (
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Performed By</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead className="text-right">Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">
                              {format(new Date(log.created_at), 'MMM d, yyyy')}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(log.created_at), 'h:mm a')}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <Badge variant={getActionBadgeVariant(log.action_type)}>
                            {log.action_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            {log.action_category.replace(/_/g, ' ')}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                            <User className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">
                              {log.performer?.first_name} {log.performer?.last_name}
                            </p>
                            <p className="text-xs text-muted-foreground">{log.performer?.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {log.target_employee ? (
                          <p className="text-sm">
                            {log.target_employee.first_name} {log.target_employee.last_name}
                          </p>
                        ) : log.target_table ? (
                          <p className="text-sm text-muted-foreground">{log.target_table}</p>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDetailLog(log)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}

        {/* Detail Dialog */}
        <Dialog open={!!detailLog} onOpenChange={() => setDetailLog(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Audit Log Details</DialogTitle>
            </DialogHeader>
            {detailLog && (
              <ScrollArea className="max-h-[60vh]">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Action Type</Label>
                      <p className="font-medium">
                        {detailLog.action_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Category</Label>
                      <p className="font-medium">
                        {detailLog.action_category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </p>
                    </div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Performed By</Label>
                    <p className="font-medium">
                      {detailLog.performer?.first_name} {detailLog.performer?.last_name}
                    </p>
                    <p className="text-sm text-muted-foreground">{detailLog.performer?.email}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Timestamp</Label>
                    <p className="font-medium">
                      {format(new Date(detailLog.created_at), 'MMMM d, yyyy h:mm:ss a')}
                    </p>
                  </div>
                  {detailLog.target_employee && (
                    <div>
                      <Label className="text-muted-foreground">Target Employee</Label>
                      <p className="font-medium">
                        {detailLog.target_employee.first_name} {detailLog.target_employee.last_name}
                      </p>
                    </div>
                  )}
                  {detailLog.reason && (
                    <div>
                      <Label className="text-muted-foreground">Reason</Label>
                      <p className="font-medium">{detailLog.reason}</p>
                    </div>
                  )}
                  {detailLog.old_values && (
                    <div>
                      <Label className="text-muted-foreground">Previous Values</Label>
                      <pre className="mt-1 p-2 bg-muted rounded-md text-xs overflow-x-auto">
                        {JSON.stringify(detailLog.old_values, null, 2)}
                      </pre>
                    </div>
                  )}
                  {detailLog.new_values && (
                    <div>
                      <Label className="text-muted-foreground">New Values</Label>
                      <pre className="mt-1 p-2 bg-muted rounded-md text-xs overflow-x-auto">
                        {JSON.stringify(detailLog.new_values, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
