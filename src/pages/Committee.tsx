import { useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { CommitteeReviewDetail } from '@/components/CommitteeReviewDetail';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, Calendar, Clock, CheckCircle, TrendingUp, Eye, Trash2, AlertTriangle, History } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function Committee() {
  const [selectedAppraisalId, setSelectedAppraisalId] = useState<string>('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  console.log('🏛️ Committee page: Rendering with SINGLE header only via DashboardLayout');

  const { data: committeeAppraisals, isLoading, error } = useQuery({
    queryKey: ['committee-appraisals'],
    queryFn: async () => {
      console.log('🔍 Fetching committee appraisals...');
      
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
            responses:appraisal_responses(
              id,
              emp_rating,
              mgr_rating,
              committee_rating,
              emp_comment,
              mgr_comment,
              committee_comment,
              question:appraisal_questions(
                question_text,
                weight
              )
            )
          `)
          .eq('status', 'committee_review')
          .order('manager_reviewed_at', { ascending: false });
        
        if (error) {
          console.error('❌ Error fetching committee appraisals:', error);
          throw error;
        }
        
        console.log('✅ Committee appraisals fetched:', data?.length || 0);
        
        const enrichedData = data?.map(appraisal => {
          const responses = appraisal.responses || [];
          let totalScore = 0;
          let totalWeight = 0;
          
          responses.forEach(response => {
            const score = response.mgr_rating || response.emp_rating || 0;
            const weight = response.question?.weight || 1;
            totalScore += score * weight;
            totalWeight += weight;
          });
          
          const calculatedScore = totalWeight > 0 ? Math.round((totalScore / totalWeight) * 20) : null;
          
          return {
            ...appraisal,
            calculated_score: calculatedScore
          };
        }) || [];
        
        return enrichedData;
      } catch (err: any) {
        console.error('❌ Committee appraisals query failed:', err);
        throw err;
      }
    },
    retry: 2,
    retryDelay: 1000
  });

  // Fetch completed appraisals for reference
  const { data: completedAppraisals } = useQuery({
    queryKey: ['completed-committee-appraisals'],
    queryFn: async () => {
      console.log('🔍 Fetching completed committee appraisals...');
      
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
          .in('status', ['hr_review', 'completed'])
          .not('committee_reviewed_at', 'is', null)
          .order('committee_reviewed_at', { ascending: false })
          .limit(20);
        
        if (error) {
          console.error('❌ Error fetching completed appraisals:', error);
          throw error;
        }
        
        console.log('✅ Completed committee appraisals fetched:', data?.length || 0);
        return data || [];
      } catch (err: any) {
        console.error('❌ Completed appraisals query failed:', err);
        return [];
      }
    },
    retry: 1
  });

  const { data: committeeStats } = useQuery({
    queryKey: ['committee-stats'],
    queryFn: async () => {
      console.log('📊 Fetching committee statistics...');
      
      try {
        const { data: pending, error: pendingError } = await supabase
          .from('appraisals')
          .select('id')
          .eq('status', 'committee_review');

        const { data: completed, error: completedError } = await supabase
          .from('appraisals')
          .select('id')
          .eq('status', 'hr_review');

        if (pendingError || completedError) {
          console.error('❌ Error fetching committee stats:', pendingError || completedError);
          throw pendingError || completedError;
        }

        const stats = {
          pending: pending?.length || 0,
          completed: completed?.length || 0
        };
        
        console.log('📊 Committee stats:', stats);
        return stats;
      } catch (err: any) {
        console.error('❌ Committee stats query failed:', err);
        return { pending: 0, completed: 0 };
      }
    },
    retry: 1
  });

  const deleteAppraisalMutation = useMutation({
    mutationFn: async (appraisalId: string) => {
      console.log('🗑️ Deleting appraisal with ID:', appraisalId);
      
      const { error: responsesError } = await supabase
        .from('appraisal_responses')
        .delete()
        .eq('appraisal_id', appraisalId);
      
      if (responsesError) {
        console.error('❌ Error deleting appraisal responses:', responsesError);
        throw responsesError;
      }

      const { error: notificationsError } = await supabase
        .from('notifications')
        .delete()
        .eq('related_appraisal_id', appraisalId);
      
      if (notificationsError) {
        console.error('❌ Error deleting notifications:', notificationsError);
      }

      const { error } = await supabase
        .from('appraisals')
        .delete()
        .eq('id', appraisalId);
      
      if (error) {
        console.error('❌ Error deleting appraisal:', error);
        throw error;
      }

      console.log('✅ Appraisal deleted successfully');
    },
    onSuccess: () => {
      console.log('✅ Delete mutation successful, invalidating queries...');
      queryClient.invalidateQueries({ queryKey: ['committee-appraisals'] });
      queryClient.invalidateQueries({ queryKey: ['committee-stats'] });
      toast({
        title: "Success",
        description: "Appraisal deleted successfully"
      });
    },
    onError: (error: any) => {
      console.error('❌ Delete mutation failed:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete appraisal",
        variant: "destructive"
      });
    }
  });

  const handleDeleteAppraisal = (appraisalId: string) => {
    console.log('🗑️ Delete button clicked for appraisal:', appraisalId);
    if (confirm('Are you sure you want to delete this appraisal? This action cannot be undone and will remove all related data.')) {
      deleteAppraisalMutation.mutate(appraisalId);
    }
  };

  const handleAppraisalSelect = (appraisalId: string) => {
    console.log('👆 Committee: Selected appraisal ID:', appraisalId);
    setSelectedAppraisalId(appraisalId);
  };

  const handleViewCompletedAppraisal = (appraisalId: string) => {
    console.log('👁️ Viewing completed appraisal:', appraisalId);
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
      <DashboardLayout pageTitle="Committee Review" showSearch={false}>
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center space-y-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
            <span className="text-gray-600">Loading committee appraisals...</span>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout pageTitle="Committee Review" showSearch={false}>
        <Card className="border-red-200">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertTriangle className="h-12 w-12 text-red-400 mb-4" />
            <h3 className="text-lg font-medium text-red-900 mb-2">Failed to Load Committee Data</h3>
            <p className="text-red-600 text-center mb-4">
              {error?.message || 'Unable to load committee appraisals'}
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

  console.log('🎨 Rendering Committee page with', committeeAppraisals?.length || 0, 'appraisals - SINGLE HEADER ONLY');

  return (
    <DashboardLayout pageTitle="Committee Review" showSearch={false}>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-gray-600">Review appraisals that require committee attention</p>
          </div>
          
          <div className="flex gap-4">
            <div className="bg-orange-50 p-3 rounded-lg">
              <div className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-orange-600" />
                <div>
                  <p className="text-sm text-orange-600">Pending Review</p>
                  <p className="text-xl font-bold text-orange-800">{committeeStats?.pending || 0}</p>
                </div>
              </div>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm text-green-600">Completed</p>
                  <p className="text-xl font-bold text-green-800">{committeeStats?.completed || 0}</p>
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
            {committeeAppraisals && committeeAppraisals.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Quick Select</CardTitle>
                </CardHeader>
                <CardContent>
                  <Select value={selectedAppraisalId} onValueChange={handleAppraisalSelect}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select an employee to review" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border shadow-lg z-50">
                      {committeeAppraisals.map((appraisal) => (
                        <SelectItem 
                          key={appraisal.id} 
                          value={appraisal.id}
                          className="hover:bg-gray-100"
                        >
                          {appraisal.employee?.first_name} {appraisal.employee?.last_name} - {formatCycleName(appraisal.cycle)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
            )}

            {committeeAppraisals && committeeAppraisals.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Appraisals Pending Committee Review ({committeeAppraisals.length})
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
                        <TableHead>Manager Review Date</TableHead>
                        <TableHead>Current Score</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {committeeAppraisals.map((appraisal) => (
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
                            {appraisal.manager_reviewed_at ? (
                              <div className="flex items-center space-x-1">
                                <Calendar className="h-4 w-4 text-gray-400" />
                                <span className="text-sm">
                                  {new Date(appraisal.manager_reviewed_at).toLocaleDateString()}
                                </span>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-400">Not reviewed</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {appraisal.overall_score || appraisal.calculated_score ? (
                              <div className="flex items-center space-x-1">
                                <TrendingUp className="h-4 w-4 text-blue-500" />
                                <Badge variant="default" className="bg-blue-100 text-blue-800">
                                  {appraisal.overall_score || appraisal.calculated_score}/100
                                </Badge>
                              </div>
                            ) : (
                              <Badge variant="secondary">
                                Pending
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge className="bg-purple-100 text-purple-800">
                              Committee Review
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button 
                                size="sm"
                                variant="outline" 
                                onClick={() => handleAppraisalSelect(appraisal.id)}
                                className="flex items-center space-x-1"
                              >
                                <Eye className="h-4 w-4" />
                                <span>Review</span>
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteAppraisal(appraisal.id)}
                                className="hover:bg-red-100 text-red-600 hover:text-red-700"
                                disabled={deleteAppraisalMutation.isPending}
                              >
                                <Trash2 className="h-4 w-4" />
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
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Committee Reviews</h3>
                  <p className="text-gray-600 text-center">
                    There are no appraisals pending committee review at this time.
                    <br />
                    <span className="text-sm text-gray-500 mt-2 block">
                      Appraisals will appear here after managers complete their reviews.
                    </span>
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Completed Appraisals Reference Table */}
            {completedAppraisals && completedAppraisals.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <History className="h-5 w-5" />
                    Previously Completed Appraisals ({completedAppraisals.length})
                  </CardTitle>
                  <p className="text-sm text-gray-600">
                    Reference completed committee reviews for context and consistency
                  </p>
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
                        <TableHead>Committee Review Date</TableHead>
                        <TableHead>Reviewed By</TableHead>
                         <TableHead>Status</TableHead>
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
                            {appraisal.committee_reviewed_at ? (
                              <div className="flex items-center space-x-1">
                                <Calendar className="h-4 w-4 text-gray-400" />
                                <span className="text-sm">
                                  {new Date(appraisal.committee_reviewed_at).toLocaleDateString()}
                                </span>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-400">N/A</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {appraisal.committee_reviewer ? (
                              <span className="text-sm">
                                {appraisal.committee_reviewer.first_name} {appraisal.committee_reviewer.last_name}
                              </span>
                            ) : (
                              <span className="text-sm text-gray-400">N/A</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge className={appraisal.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}>
                              {appraisal.status === 'completed' ? 'Fully Completed' : 'Awaiting HR'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button 
                              size="sm"
                              variant="outline" 
                              onClick={() => handleViewCompletedAppraisal(appraisal.id)}
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
