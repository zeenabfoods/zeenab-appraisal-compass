
import { useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Users, CheckCircle, Clock, TrendingUp, Eye, AlertTriangle, Lock, Unlock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { CommitteeReviewDetail } from '@/components/CommitteeReviewDetail';
import { useAuthContext } from '@/components/AuthProvider';

export default function HRAppraisals() {
  const [selectedAppraisalId, setSelectedAppraisalId] = useState<string>('');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { profile } = useAuthContext();

  console.log('🏛️ HR Appraisals page: Rendering');

  // Fetch global submission lock settings
  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ['appraisal-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('appraisal_settings')
        .select('*')
        .limit(1)
        .single();
      
      if (error) {
        console.error('Error fetching appraisal settings:', error);
        throw error;
      }
      
      return data;
    }
  });

  // Toggle submission lock mutation
  const toggleSubmissionLockMutation = useMutation({
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
          ? "Appraisal submissions have been unlocked" 
          : "Appraisal submissions have been locked"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update submission lock",
        variant: "destructive"
      });
    }
  });

  // Fetch appraisals awaiting HR final approval
  const { data: hrAppraisals, isLoading, error } = useQuery({
    queryKey: ['hr-appraisals'],
    queryFn: async () => {
      console.log('🔍 Fetching HR appraisals...');
      
      try {
        const { data, error } = await supabase
          .from('appraisals')
          .select(`
            *,
            employee:profiles!appraisals_employee_id_fkey(
              first_name, 
              last_name, 
              email,
              position,
              department:departments!profiles_department_id_fkey(name)
            ),
            cycle:appraisal_cycles(name, year, quarter),
            committee_reviewer:profiles!appraisals_committee_reviewed_by_fkey(
              first_name,
              last_name
            )
          `)
          .eq('status', 'hr_review')
          .order('committee_reviewed_at', { ascending: false });
        
        if (error) {
          console.error('❌ Error fetching HR appraisals:', error);
          throw error;
        }
        
        console.log('✅ HR appraisals fetched:', data?.length || 0);
        return data || [];
      } catch (err: any) {
        console.error('❌ HR appraisals query failed:', err);
        throw err;
      }
    },
    retry: 2,
    retryDelay: 1000
  });

  // Fetch completed appraisals for reference
  const { data: completedAppraisals } = useQuery({
    queryKey: ['completed-hr-appraisals'],
    queryFn: async () => {
      console.log('🔍 Fetching completed HR appraisals...');
      
      try {
        const { data, error } = await supabase
          .from('appraisals')
          .select(`
            *,
            employee:profiles!appraisals_employee_id_fkey(
              first_name, 
              last_name, 
              email,
              position,
              department:departments!profiles_department_id_fkey(name)
            ),
            cycle:appraisal_cycles(name, year, quarter)
          `)
          .eq('status', 'completed')
          .order('completed_at', { ascending: false })
          .limit(20);
        
        if (error) {
          console.error('❌ Error fetching completed appraisals:', error);
          throw error;
        }
        
        console.log('✅ Completed HR appraisals fetched:', data?.length || 0);
        return data || [];
      } catch (err: any) {
        console.error('❌ Completed appraisals query failed:', err);
        return [];
      }
    },
    retry: 1
  });

  // Mark appraisal as completed
  const markCompletedMutation = useMutation({
    mutationFn: async (appraisalId: string) => {
      console.log('✅ Marking appraisal as completed:', appraisalId);
      
      const { error } = await supabase
        .from('appraisals')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          hr_finalized_at: new Date().toISOString()
        })
        .eq('id', appraisalId);
      
      if (error) {
        console.error('❌ Error marking appraisal as completed:', error);
        throw error;
      }

      console.log('✅ Appraisal marked as completed successfully');
    },
    onSuccess: () => {
      console.log('✅ Mark completed mutation successful, invalidating queries...');
      queryClient.invalidateQueries({ queryKey: ['hr-appraisals'] });
      queryClient.invalidateQueries({ queryKey: ['completed-hr-appraisals'] });
      toast({
        title: "Success",
        description: "Appraisal marked as completed successfully"
      });
    },
    onError: (error: any) => {
      console.error('❌ Mark completed mutation failed:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to mark appraisal as completed",
        variant: "destructive"
      });
    }
  });

  const handleMarkCompleted = (appraisalId: string) => {
    console.log('✅ Mark completed button clicked for appraisal:', appraisalId);
    if (confirm('Are you sure you want to mark this appraisal as completed? This will finalize the appraisal process.')) {
      markCompletedMutation.mutate(appraisalId);
    }
  };

  const handleViewAppraisal = (appraisalId: string) => {
    console.log('👁️ Viewing appraisal:', appraisalId);
    setSelectedAppraisalId(appraisalId);
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

  if (isLoading) {
    return (
      <DashboardLayout pageTitle="HR Appraisals" showSearch={false}>
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center space-y-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
            <span className="text-gray-600">Loading HR appraisals...</span>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout pageTitle="HR Appraisals" showSearch={false}>
        <Card className="border-red-200">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertTriangle className="h-12 w-12 text-red-400 mb-4" />
            <h3 className="text-lg font-medium text-red-900 mb-2">Failed to Load HR Data</h3>
            <p className="text-red-600 text-center mb-4">
              {error?.message || 'Unable to load HR appraisals'}
            </p>
            <Button 
              variant="outline" 
              onClick={() => window.location.reload()}
              className="text-red-600 border-red-600 hover:bg-red-50"
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout pageTitle="HR Appraisals" showSearch={false}>
      <div className="space-y-6">
        {/* Global Submission Lock Control */}
        <Card className="border-2 border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {settings?.submission_locked ? (
                  <Lock className="h-8 w-8 text-red-600" />
                ) : (
                  <Unlock className="h-8 w-8 text-green-600" />
                )}
                <div>
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    Appraisal Submission Control
                    {settings?.submission_locked && (
                      <Badge variant="destructive" className="ml-2">LOCKED</Badge>
                    )}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {settings?.submission_locked 
                      ? "All appraisal submissions are currently blocked. Staff and managers cannot submit appraisals."
                      : "Appraisal submissions are currently allowed for all staff and managers."
                    }
                  </p>
                  {settings?.submission_locked && settings?.locked_at && (
                    <p className="text-xs text-gray-500 mt-1">
                      Locked on {new Date(settings.locked_at).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <Label htmlFor="submission-lock" className="text-sm font-medium">
                  {settings?.submission_locked ? 'Unlock Submissions' : 'Lock Submissions'}
                </Label>
                <Switch
                  id="submission-lock"
                  checked={settings?.submission_locked || false}
                  onCheckedChange={(checked) => toggleSubmissionLockMutation.mutate(checked)}
                  disabled={settingsLoading || toggleSubmissionLockMutation.isPending}
                  className="data-[state=checked]:bg-red-600"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-between items-center">
          <div>
            <p className="text-gray-600">Review and finalize appraisals that have completed committee review</p>
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
            <Button 
              variant="outline" 
              onClick={() => setSelectedAppraisalId('')}
              className="mb-4"
            >
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
                                <p className="font-medium">
                                  {appraisal.employee?.first_name} {appraisal.employee?.last_name}
                                </p>
                                <p className="text-sm text-gray-500">{appraisal.employee?.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{appraisal.employee?.position || 'Not set'}</TableCell>
                          <TableCell>{appraisal.employee?.department?.name || 'Not assigned'}</TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{formatCycleName(appraisal.cycle)}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            {appraisal.committee_reviewed_at ? (
                              <span className="text-sm">
                                {new Date(appraisal.committee_reviewed_at).toLocaleDateString()}
                              </span>
                            ) : (
                              <span className="text-sm text-gray-400">Not reviewed</span>
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
                              <Badge variant="secondary">
                                Pending
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge className={getPerformanceBadgeColor(appraisal.performance_band)}>
                              {appraisal.performance_band || 'Not set'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button 
                                size="sm"
                                variant="outline" 
                                onClick={() => handleViewAppraisal(appraisal.id)}
                                className="flex items-center space-x-1"
                              >
                                <Eye className="h-4 w-4" />
                                <span>View</span>
                              </Button>
                              <Button 
                                size="sm"
                                onClick={() => handleMarkCompleted(appraisal.id)}
                                disabled={markCompletedMutation.isPending}
                                className="flex items-center space-x-1 bg-green-600 hover:bg-green-700"
                              >
                                <CheckCircle className="h-4 w-4" />
                                <span>Complete</span>
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
                  <Users className="h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Appraisals Pending</h3>
                  <p className="text-gray-600 text-center">
                    There are no appraisals awaiting HR final approval at this time.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Completed Appraisals Reference */}
            {completedAppraisals && completedAppraisals.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    Completed Appraisals ({completedAppraisals.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Position</TableHead>
                        <TableHead>Cycle</TableHead>
                        <TableHead>Final Score</TableHead>
                        <TableHead>Performance Band</TableHead>
                        <TableHead>Completed Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {completedAppraisals.map((appraisal) => (
                        <TableRow key={appraisal.id} className="hover:bg-gray-50">
                          <TableCell className="font-medium">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-green-400 to-blue-400 flex items-center justify-center text-white text-sm font-semibold">
                                {appraisal.employee?.first_name?.[0]}{appraisal.employee?.last_name?.[0]}
                              </div>
                              <div>
                                <p className="font-medium">
                                  {appraisal.employee?.first_name} {appraisal.employee?.last_name}
                                </p>
                                <p className="text-sm text-gray-500">{appraisal.employee?.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{appraisal.employee?.position || 'Not set'}</TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{formatCycleName(appraisal.cycle)}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-1">
                              <TrendingUp className="h-4 w-4 text-green-500" />
                              <Badge variant="default" className="bg-green-100 text-green-800">
                                {appraisal.overall_score || 'N/A'}/100
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getPerformanceBadgeColor(appraisal.performance_band)}>
                              {appraisal.performance_band || 'Not set'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {appraisal.completed_at ? (
                              <span className="text-sm">
                                {new Date(appraisal.completed_at).toLocaleDateString()}
                              </span>
                            ) : (
                              <span className="text-sm text-gray-400">N/A</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button 
                              size="sm"
                              variant="outline" 
                              onClick={() => handleViewAppraisal(appraisal.id)}
                              className="flex items-center space-x-1"
                            >
                              <Eye className="h-4 w-4" />
                              <span>View</span>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
