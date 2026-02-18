
import { useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Users, CheckCircle, Clock, TrendingUp, Eye, AlertTriangle, Lock, Unlock, Calendar, Filter, UserCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { CommitteeReviewDetail } from '@/components/CommitteeReviewDetail';
import { useAuthContext } from '@/components/AuthProvider';
import { PendingAppraisalsTable } from '@/components/PendingAppraisalsTable';

export default function HRAppraisals() {
  const [selectedAppraisalId, setSelectedAppraisalId] = useState<string>('');
  const [completedCycleFilter, setCompletedCycleFilter] = useState<string>('all');
  const [lockCycleFilter, setLockCycleFilter] = useState<string>('all');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { profile } = useAuthContext();

  // Fetch all cycles for dropdowns
  const { data: allCycles = [] } = useQuery({
    queryKey: ['all-appraisal-cycles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('appraisal_cycles')
        .select('id, name, quarter, year, status')
        .order('year', { ascending: false })
        .order('quarter', { ascending: false });
      if (error) throw error;
      return data || [];
    }
  });

  // Fetch global submission lock settings
  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ['appraisal-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('appraisal_settings')
        .select('*')
        .limit(1)
        .single();
      if (error) throw error;
      return data;
    }
  });

  // Fetch defaulted staff (draft appraisals, not yet submitted) filtered by cycle
  const { data: staffDefaulters = [] } = useQuery({
    queryKey: ['staff-defaulters', lockCycleFilter],
    queryFn: async () => {
      let query = supabase
        .from('appraisals')
        .select(`
          id,
          status,
          created_at,
          employee:profiles!appraisals_employee_id_fkey(
            id, first_name, last_name, email, role,
            department:departments!profiles_department_id_fkey(name)
          ),
          cycle:appraisal_cycles(id, name, quarter, year)
        `)
        .eq('status', 'draft');

      if (lockCycleFilter !== 'all') {
        query = query.eq('cycle_id', lockCycleFilter);
      }

      const { data, error } = await query.order('created_at', { ascending: true });
      if (error) throw error;

      // Exclude managers/hr/admin from staff defaulters
      return (data || []).filter((a: any) => {
        const role = a.employee?.role;
        return !['manager', 'hr', 'admin'].includes(role);
      });
    }
  });

  // Fetch defaulted managers (appraisals submitted by staff but not yet reviewed by manager)
  const { data: managerDefaulters = [] } = useQuery({
    queryKey: ['manager-defaulters', lockCycleFilter],
    queryFn: async () => {
      let query = supabase
        .from('appraisals')
        .select(`
          id,
          status,
          employee_submitted_at,
          employee:profiles!appraisals_employee_id_fkey(
            id, first_name, last_name,
            line_manager_id,
            department:departments!profiles_department_id_fkey(name)
          ),
          cycle:appraisal_cycles(id, name, quarter, year)
        `)
        .eq('status', 'submitted');

      if (lockCycleFilter !== 'all') {
        query = query.eq('cycle_id', lockCycleFilter);
      }

      const { data, error } = await query.order('employee_submitted_at', { ascending: true });
      if (error) throw error;
      if (!data || data.length === 0) return [];

      // Fetch manager profiles
      const managerIds = [...new Set((data as any[]).map(a => a.employee?.line_manager_id).filter(Boolean))];
      const managerMap = new Map<string, any>();
      if (managerIds.length > 0) {
        const { data: managers } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email')
          .in('id', managerIds);
        managers?.forEach(m => managerMap.set(m.id, m));
      }

      // Group by manager
      const grouped = new Map<string, { manager: any; subordinates: any[]; cycle: any }>();
      (data as any[]).forEach(appraisal => {
        const managerId = appraisal.employee?.line_manager_id || 'unassigned';
        const manager = managerId !== 'unassigned' ? managerMap.get(managerId) : null;
        if (!grouped.has(managerId)) {
          grouped.set(managerId, {
            manager: manager || { first_name: 'No', last_name: 'Manager', email: '-' },
            subordinates: [],
            cycle: appraisal.cycle
          });
        }
        grouped.get(managerId)!.subordinates.push(appraisal);
      });

      return Array.from(grouped.values());
    }
  });

  // Toggle staff submission lock
  const toggleStaffLockMutation = useMutation({
    mutationFn: async (locked: boolean) => {
      const { error } = await supabase
        .from('appraisal_settings')
        .update({
          submission_locked: locked,
          locked_by: locked ? profile?.id : null,
          locked_at: locked ? new Date().toISOString() : null
        })
        .eq('id', settings?.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appraisal-settings'] });
      toast({
        title: "Success",
        description: settings?.submission_locked
          ? "Staff appraisal submissions have been unlocked"
          : "Staff appraisal submissions have been locked"
      });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update lock", variant: "destructive" });
    }
  });

  // Toggle manager submission lock
  const toggleManagerLockMutation = useMutation({
    mutationFn: async (locked: boolean) => {
      const { error } = await supabase
        .from('appraisal_settings')
        .update({
          manager_submission_locked: locked,
          manager_locked_by: locked ? profile?.id : null,
          manager_locked_at: locked ? new Date().toISOString() : null
        })
        .eq('id', settings?.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appraisal-settings'] });
      toast({
        title: "Success",
        description: (settings as any)?.manager_submission_locked
          ? "Manager appraisal reviews have been unlocked"
          : "Manager appraisal reviews have been locked"
      });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update lock", variant: "destructive" });
    }
  });

  // Fetch appraisals awaiting HR final approval
  const { data: hrAppraisals, isLoading, error } = useQuery({
    queryKey: ['hr-appraisals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('appraisals')
        .select(`
          *,
          employee:profiles!appraisals_employee_id_fkey(
            first_name, last_name, email, position,
            department:departments!profiles_department_id_fkey(name)
          ),
          cycle:appraisal_cycles(name, year, quarter),
          committee_reviewer:profiles!appraisals_committee_reviewed_by_fkey(first_name, last_name)
        `)
        .eq('status', 'hr_review')
        .order('committee_reviewed_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    retry: 2,
    retryDelay: 1000
  });

  // Fetch completed appraisals
  const { data: completedAppraisals } = useQuery({
    queryKey: ['completed-hr-appraisals', completedCycleFilter],
    queryFn: async () => {
      let query = supabase
        .from('appraisals')
        .select(`
          *,
          employee:profiles!appraisals_employee_id_fkey(
            first_name, last_name, email, position,
            department:departments!profiles_department_id_fkey(name)
          ),
          cycle:appraisal_cycles(name, year, quarter)
        `)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false });

      if (completedCycleFilter !== 'all') {
        query = query.eq('cycle_id', completedCycleFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    retry: 1
  });

  // Mark appraisal as completed
  const markCompletedMutation = useMutation({
    mutationFn: async (appraisalId: string) => {
      const { error } = await supabase
        .from('appraisals')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          hr_finalized_at: new Date().toISOString()
        })
        .eq('id', appraisalId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr-appraisals'] });
      queryClient.invalidateQueries({ queryKey: ['completed-hr-appraisals'] });
      toast({ title: "Success", description: "Appraisal marked as completed successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to mark appraisal as completed", variant: "destructive" });
    }
  });

  const handleMarkCompleted = (appraisalId: string) => {
    if (confirm('Are you sure you want to mark this appraisal as completed? This will finalize the appraisal process.')) {
      markCompletedMutation.mutate(appraisalId);
    }
  };

  const formatCycleName = (cycle: any) => {
    if (!cycle) return 'Unknown Cycle';
    return `${cycle.name} (Q${cycle.quarter} ${cycle.year})`;
  };

  const getPerformanceBadgeColor = (band: string) => {
    switch (band?.toLowerCase()) {
      case 'exceptional': return 'bg-green-100 text-green-800';
      case 'excellent': return 'bg-blue-100 text-blue-800';
      case 'very good': return 'bg-indigo-100 text-indigo-800';
      case 'good': return 'bg-yellow-100 text-yellow-800';
      case 'fair': return 'bg-orange-100 text-orange-800';
      case 'poor': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const staffLocked = settings?.submission_locked || false;
  const managerLocked = (settings as any)?.manager_submission_locked || false;

  if (isLoading) {
    return (
      <DashboardLayout pageTitle="HR Appraisals" showSearch={false}>
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center space-y-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
            <span className="text-muted-foreground">Loading HR appraisals...</span>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout pageTitle="HR Appraisals" showSearch={false}>
        <Card className="border-destructive/30">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
            <h3 className="text-lg font-medium text-destructive mb-2">Failed to Load HR Data</h3>
            <p className="text-muted-foreground text-center mb-4">{(error as any)?.message || 'Unable to load HR appraisals'}</p>
            <Button variant="outline" onClick={() => window.location.reload()}>Try Again</Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout pageTitle="HR Appraisals" showSearch={false}>
      <div className="space-y-6">

        {/* ── Submission Control Panel ── */}
        <Card className="border-2 border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {staffLocked || managerLocked ? (
                  <Lock className="h-6 w-6 text-destructive" />
                ) : (
                  <Unlock className="h-6 w-6 text-green-600" />
                )}
                <CardTitle className="text-base">Appraisal Submission Control</CardTitle>
              </div>
              {/* Quarter filter for the lock section */}
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={lockCycleFilter} onValueChange={setLockCycleFilter}>
                  <SelectTrigger className="w-52 h-8 text-sm">
                    <SelectValue placeholder="Filter by quarter..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Quarters</SelectItem>
                    {allCycles.map(cycle => (
                      <SelectItem key={cycle.id} value={cycle.id}>
                        {cycle.name} — Q{cycle.quarter} {cycle.year}
                        {cycle.status === 'active' && ' (Active)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Staff Lock Row */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-white/70 border border-orange-100">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium text-sm flex items-center gap-2">
                    Staff Submission Lock
                    {staffLocked && <Badge variant="destructive" className="text-xs">LOCKED</Badge>}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {staffLocked
                      ? "Staff cannot submit appraisals. Line managers are unaffected."
                      : "Staff can submit their appraisals normally."}
                  </p>
                  {staffLocked && settings?.locked_at && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Locked on {new Date(settings.locked_at).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Label htmlFor="staff-lock" className="text-sm font-medium">
                  {staffLocked ? 'Unlock' : 'Lock'} Staff
                </Label>
                <Switch
                  id="staff-lock"
                  checked={staffLocked}
                  onCheckedChange={(checked) => toggleStaffLockMutation.mutate(checked)}
                  disabled={settingsLoading || toggleStaffLockMutation.isPending}
                  className="data-[state=checked]:bg-destructive"
                />
              </div>
            </div>

            {/* Manager Lock Row */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-white/70 border border-orange-100">
              <div className="flex items-center gap-3">
                <UserCheck className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="font-medium text-sm flex items-center gap-2">
                    Manager Review Lock
                    {managerLocked && <Badge variant="destructive" className="text-xs">LOCKED</Badge>}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {managerLocked
                      ? "Line managers cannot submit appraisal reviews."
                      : "Line managers can review and submit appraisals normally."}
                  </p>
                  {managerLocked && (settings as any)?.manager_locked_at && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Locked on {new Date((settings as any).manager_locked_at).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Label htmlFor="manager-lock" className="text-sm font-medium">
                  {managerLocked ? 'Unlock' : 'Lock'} Managers
                </Label>
                <Switch
                  id="manager-lock"
                  checked={managerLocked}
                  onCheckedChange={(checked) => toggleManagerLockMutation.mutate(checked)}
                  disabled={settingsLoading || toggleManagerLockMutation.isPending}
                  className="data-[state=checked]:bg-destructive"
                />
              </div>
            </div>

            {/* Staff Defaulters Table */}
            {staffLocked && (
              <div className="mt-2">
                <Separator className="mb-3" />
                <p className="text-sm font-semibold text-destructive mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Staff Who Have Not Submitted
                  {lockCycleFilter !== 'all' && (
                    <span className="text-muted-foreground font-normal text-xs">
                      ({allCycles.find(c => c.id === lockCycleFilter)?.name})
                    </span>
                  )}
                  <Badge variant="destructive" className="ml-auto">{staffDefaulters.length}</Badge>
                </p>
                {staffDefaulters.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic px-2">No staff defaulters found for the selected quarter.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Quarter</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {staffDefaulters.map((appraisal: any) => (
                        <TableRow key={appraisal.id}>
                          <TableCell className="font-medium">
                            {appraisal.employee?.first_name} {appraisal.employee?.last_name}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{appraisal.employee?.email}</TableCell>
                          <TableCell>{appraisal.employee?.department?.name || 'Not assigned'}</TableCell>
                          <TableCell>
                            {appraisal.cycle ? `Q${appraisal.cycle.quarter} ${appraisal.cycle.year}` : '—'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="border-orange-400 text-orange-700 bg-orange-50">
                              Not Submitted
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            )}

            {/* Manager Defaulters Table */}
            {managerLocked && (
              <div className="mt-2">
                <Separator className="mb-3" />
                <p className="text-sm font-semibold text-destructive mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Managers Who Have Not Reviewed
                  {lockCycleFilter !== 'all' && (
                    <span className="text-muted-foreground font-normal text-xs">
                      ({allCycles.find(c => c.id === lockCycleFilter)?.name})
                    </span>
                  )}
                  <Badge variant="destructive" className="ml-auto">{managerDefaulters.length}</Badge>
                </p>
                {managerDefaulters.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic px-2">No manager defaulters found for the selected quarter.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Manager Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Pending Subordinates</TableHead>
                        <TableHead>Quarter</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {managerDefaulters.map((group: any, idx: number) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">
                            {group.manager?.first_name} {group.manager?.last_name}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{group.manager?.email || '—'}</TableCell>
                          <TableCell>
                            <Badge variant="destructive">{group.subordinates.length}</Badge>
                            <span className="ml-2 text-xs text-muted-foreground">
                              {group.subordinates.map((s: any) =>
                                `${s.employee?.first_name} ${s.employee?.last_name}`
                              ).join(', ')}
                            </span>
                          </TableCell>
                          <TableCell>
                            {group.cycle ? `Q${group.cycle.quarter} ${group.cycle.year}` : '—'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="border-purple-400 text-purple-700 bg-purple-50">
                              Review Pending
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Appraisals Summary Table */}
        <PendingAppraisalsTable />

        <div className="flex justify-between items-center">
          <div>
            <p className="text-muted-foreground">Review and finalize appraisals that have completed committee review</p>
          </div>
          <div className="flex gap-4">
            <div className="bg-orange-50 p-3 rounded-lg">
              <div className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-orange-600" />
                <div>
                  <p className="text-sm text-orange-600">Pending HR Review</p>
                  <p className="text-xl font-bold text-orange-800">{hrAppraisals?.length || 0}</p>
                </div>
              </div>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm text-green-600">Completed</p>
                  <p className="text-xl font-bold text-green-800">{completedAppraisals?.length || 0}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {selectedAppraisalId ? (
          <div className="space-y-4">
            <Button variant="outline" onClick={() => setSelectedAppraisalId('')} className="mb-4">
              ← Back to List
            </Button>
            <CommitteeReviewDetail appraisalId={selectedAppraisalId} />
          </div>
        ) : (
          <>
            {hrAppraisals && hrAppraisals.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Appraisals Awaiting HR Final Approval ({hrAppraisals.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Position</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Cycle</TableHead>
                        <TableHead>Committee Review Date</TableHead>
                        <TableHead>Final Score</TableHead>
                        <TableHead>Performance Band</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {hrAppraisals.map((appraisal) => (
                        <TableRow key={appraisal.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 flex items-center justify-center text-white text-sm font-semibold">
                                {appraisal.employee?.first_name?.[0]}{appraisal.employee?.last_name?.[0]}
                              </div>
                              <div>
                                <p className="font-medium">{appraisal.employee?.first_name} {appraisal.employee?.last_name}</p>
                                <p className="text-sm text-muted-foreground">{appraisal.employee?.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{appraisal.employee?.position || 'Not set'}</TableCell>
                          <TableCell>{(appraisal.employee as any)?.department?.name || 'Not assigned'}</TableCell>
                          <TableCell>
                            <p className="font-medium">{formatCycleName(appraisal.cycle)}</p>
                          </TableCell>
                          <TableCell>
                            {appraisal.committee_reviewed_at ? (
                              <span className="text-sm">{new Date(appraisal.committee_reviewed_at).toLocaleDateString()}</span>
                            ) : (
                              <span className="text-sm text-muted-foreground">Not reviewed</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {appraisal.overall_score ? (
                              <div className="flex items-center space-x-1">
                                <TrendingUp className="h-4 w-4 text-blue-500" />
                                <Badge variant="default" className="bg-blue-100 text-blue-800">
                                  {appraisal.overall_score}/100
                                </Badge>
                              </div>
                            ) : (
                              <Badge variant="secondary">Pending</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {appraisal.performance_band ? (
                              <Badge className={getPerformanceBadgeColor(appraisal.performance_band)}>
                                {appraisal.performance_band}
                              </Badge>
                            ) : (
                              <Badge variant="secondary">Not Set</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedAppraisalId(appraisal.id)}
                                className="flex items-center gap-1"
                              >
                                <Eye className="h-3 w-3" />
                                View
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleMarkCompleted(appraisal.id)}
                                disabled={markCompletedMutation.isPending}
                                className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white"
                              >
                                <CheckCircle className="h-3 w-3" />
                                Complete
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Users className="h-16 w-16 text-muted-foreground/30 mb-4" />
                  <h3 className="text-lg font-medium text-muted-foreground mb-2">No Appraisals Pending</h3>
                  <p className="text-muted-foreground text-center">There are no appraisals awaiting HR final approval at this time.</p>
                </CardContent>
              </Card>
            )}

            {/* Completed Appraisals Section */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    Completed Appraisals ({completedAppraisals?.length || 0})
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <Select value={completedCycleFilter} onValueChange={setCompletedCycleFilter}>
                      <SelectTrigger className="w-56 h-8 text-sm">
                        <SelectValue placeholder="Filter by quarter..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Quarters</SelectItem>
                        {allCycles.map(cycle => (
                          <SelectItem key={cycle.id} value={cycle.id}>
                            {cycle.name} — Q{cycle.quarter} {cycle.year}
                            {cycle.status === 'active' && ' (Active)'}
                            {cycle.status === 'completed' && ' (Completed)'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {!completedAppraisals || completedAppraisals.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <CheckCircle className="h-12 w-12 text-muted-foreground/30 mb-3" />
                    <p className="text-muted-foreground">No completed appraisals found</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Cycle</TableHead>
                        <TableHead>Final Score</TableHead>
                        <TableHead>Performance Band</TableHead>
                        <TableHead>Completed</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {completedAppraisals.map((appraisal) => (
                        <TableRow key={appraisal.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-green-400 to-teal-400 flex items-center justify-center text-white text-sm font-semibold">
                                {appraisal.employee?.first_name?.[0]}{appraisal.employee?.last_name?.[0]}
                              </div>
                              <div>
                                <p className="font-medium">{appraisal.employee?.first_name} {appraisal.employee?.last_name}</p>
                                <p className="text-sm text-muted-foreground">{appraisal.employee?.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{(appraisal.employee as any)?.department?.name || 'Not assigned'}</TableCell>
                          <TableCell>{formatCycleName(appraisal.cycle)}</TableCell>
                          <TableCell>
                            {appraisal.overall_score ? (
                              <Badge className="bg-blue-100 text-blue-800">{appraisal.overall_score}/100</Badge>
                            ) : (
                              <Badge variant="secondary">N/A</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {appraisal.performance_band ? (
                              <Badge className={getPerformanceBadgeColor(appraisal.performance_band)}>
                                {appraisal.performance_band}
                              </Badge>
                            ) : (
                              <Badge variant="secondary">Not Set</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {appraisal.completed_at
                              ? new Date(appraisal.completed_at).toLocaleDateString()
                              : '—'}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedAppraisalId(appraisal.id)}
                              className="flex items-center gap-1"
                            >
                              <Eye className="h-3 w-3" />
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
