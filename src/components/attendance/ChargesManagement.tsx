import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAttendanceCharges } from '@/hooks/attendance/useAttendanceCharges';
import { DollarSign, Download, Filter, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';

export function ChargesManagement() {
  const { charges, loading, updateChargeStatus, getMonthlyReport } = useAttendanceCharges();
  const { profile } = useAuth();
  const [selectedCharge, setSelectedCharge] = useState<typeof charges[0] | null>(null);
  const [actionType, setActionType] = useState<'waive' | 'resolve' | null>(null);
  const [reason, setReason] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCharges = useMemo(() => {
    return charges.filter((charge) => {
      const matchesStatus = filterStatus === 'all' || charge.status === filterStatus;
      const matchesSearch = !searchQuery || 
        charge.employee?.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        charge.employee?.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        charge.employee?.department?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [charges, filterStatus, searchQuery]);

  const stats = useMemo(() => {
    return {
      total: charges.length,
      pending: charges.filter((c) => c.status === 'pending').length,
      waived: charges.filter((c) => c.status === 'waived').length,
      disputed: charges.filter((c) => c.dispute_reason && !c.dispute_resolution).length,
      totalAmount: charges
        .filter((c) => c.status === 'pending')
        .reduce((sum, c) => sum + Number(c.charge_amount), 0),
    };
  }, [charges]);

  const handleAction = async () => {
    if (!selectedCharge || !actionType || !reason) return;

    try {
      if (actionType === 'waive') {
        await updateChargeStatus(selectedCharge.id, {
          status: 'waived',
          waived_by: profile?.id,
          waiver_reason: reason,
        });
      } else if (actionType === 'resolve') {
        await updateChargeStatus(selectedCharge.id, {
          status: 'resolved',
          dispute_resolution: reason,
        });
      }
      setSelectedCharge(null);
      setActionType(null);
      setReason('');
    } catch (error) {
      console.error('Error processing charge action:', error);
    }
  };

  const handleExportMonthly = async () => {
    const now = new Date();
    const month = (now.getMonth() + 1).toString();
    const year = now.getFullYear();
    
    const data = await getMonthlyReport(month, year);
    
    // Create CSV
    const headers = ['Employee', 'Department', 'Charge Type', 'Amount (₦)', 'Date', 'Status'];
    const rows = data.map((charge) => [
      `${charge.employee?.first_name} ${charge.employee?.last_name}`,
      charge.employee?.department || 'N/A',
      charge.charge_type,
      charge.charge_amount,
      format(new Date(charge.charge_date), 'yyyy-MM-dd'),
      charge.status,
    ]);
    
    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-charges-${year}-${month}.csv`;
    a.click();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="default">Pending</Badge>;
      case 'waived':
        return <Badge variant="secondary">Waived</Badge>;
      case 'resolved':
        return <Badge variant="outline">Resolved</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="text-center text-muted-foreground">Loading charges...</div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Financial Charges Management</h2>
        <Button onClick={handleExportMonthly}>
          <Download className="w-4 h-4 mr-2" />
          Export Monthly Report
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Charges</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
            <DollarSign className="w-8 h-8 text-muted-foreground" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
            </div>
            <AlertCircle className="w-8 h-8 text-yellow-600" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Waived</p>
              <p className="text-2xl font-bold text-green-600">{stats.waived}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Disputed</p>
              <p className="text-2xl font-bold text-red-600">{stats.disputed}</p>
            </div>
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
        </Card>
        <Card className="p-4">
          <div>
            <p className="text-sm text-muted-foreground">Pending Amount</p>
            <p className="text-2xl font-bold">₦{stats.totalAmount.toLocaleString()}</p>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search by employee name or department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[180px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="waived">Waived</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Charges List */}
      <div className="space-y-3">
        {filteredCharges.length === 0 ? (
          <Card className="p-8 text-center">
            <DollarSign className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No charges found</p>
          </Card>
        ) : (
          filteredCharges.map((charge) => (
            <Card key={charge.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold">
                      {charge.employee?.first_name} {charge.employee?.last_name}
                    </h3>
                    {getStatusBadge(charge.status || 'pending')}
                    {charge.is_escalated && (
                      <Badge variant="destructive">Escalated</Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Department</p>
                      <p className="font-medium">{charge.employee?.department || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Charge Type</p>
                      <p className="font-medium capitalize">{charge.charge_type}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Amount</p>
                      <p className="font-medium">₦{Number(charge.charge_amount).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Date</p>
                      <p className="font-medium">{format(new Date(charge.charge_date), 'MMM dd, yyyy')}</p>
                    </div>
                  </div>
                  {charge.dispute_reason && (
                    <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                      <p className="text-sm font-medium text-yellow-800">Dispute Reason:</p>
                      <p className="text-sm text-yellow-700">{charge.dispute_reason}</p>
                    </div>
                  )}
                </div>
                {charge.status === 'pending' && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedCharge(charge);
                        setActionType('waive');
                      }}
                    >
                      Waive
                    </Button>
                    {charge.dispute_reason && (
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedCharge(charge);
                          setActionType('resolve');
                        }}
                      >
                        Resolve
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Action Dialog */}
      <Dialog open={!!selectedCharge} onOpenChange={() => setSelectedCharge(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'waive' ? 'Waive Charge' : 'Resolve Dispute'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>
                {actionType === 'waive' ? 'Waiver Reason *' : 'Resolution Notes *'}
              </Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={
                  actionType === 'waive'
                    ? 'Explain why this charge should be waived...'
                    : 'Provide resolution details...'
                }
                rows={4}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setSelectedCharge(null)}>
                Cancel
              </Button>
              <Button onClick={handleAction} disabled={!reason}>
                Confirm
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
