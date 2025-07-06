
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
import { Users, Calendar, Clock, CheckCircle, TrendingUp, Eye, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function Committee() {
  const [selectedAppraisalId, setSelectedAppraisalId] = useState<string>('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: committeeAppraisals, isLoading } = useQuery({
    queryKey: ['committee-appraisals'],
    queryFn: async () => {
      console.log('Fetching committee appraisals...');
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
        .eq('status', 'committee_review')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching committee appraisals:', error);
        throw error;
      }
      console.log('Committee appraisals fetched:', data);
      return data || [];
    }
  });

  // Get committee analytics
  const { data: committeeStats } = useQuery({
    queryKey: ['committee-stats'],
    queryFn: async () => {
      const { data: pending, error: pendingError } = await supabase
        .from('appraisals')
        .select('id')
        .eq('status', 'committee_review');

      const { data: completed, error: completedError } = await supabase
        .from('appraisals')
        .select('id')
        .eq('status', 'hr_review');

      if (pendingError || completedError) throw pendingError || completedError;

      return {
        pending: pending?.length || 0,
        completed: completed?.length || 0
      };
    }
  });

  const deleteAppraisalMutation = useMutation({
    mutationFn: async (appraisalId: string) => {
      const { error } = await supabase
        .from('appraisals')
        .delete()
        .eq('id', appraisalId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['committee-appraisals'] });
      queryClient.invalidateQueries({ queryKey: ['committee-stats'] });
      toast({
        title: "Success",
        description: "Appraisal deleted successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete appraisal",
        variant: "destructive"
      });
    }
  });

  const handleDeleteAppraisal = (appraisalId: string) => {
    if (confirm('Are you sure you want to delete this appraisal? This action cannot be undone.')) {
      deleteAppraisalMutation.mutate(appraisalId);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Committee Review</h1>
            <p className="text-gray-600">Review appraisals that require committee attention</p>
          </div>
          
          {/* Committee Stats */}
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

        {/* Show detailed review interface when an appraisal is selected */}
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
            {/* Quick Select Dropdown */}
            {committeeAppraisals && committeeAppraisals.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Quick Select</CardTitle>
                </CardHeader>
                <CardContent>
                  <Select value={selectedAppraisalId} onValueChange={setSelectedAppraisalId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select an employee to review" />
                    </SelectTrigger>
                    <SelectContent>
                      {committeeAppraisals.map((appraisal) => (
                        <SelectItem key={appraisal.id} value={appraisal.id}>
                          {appraisal.employee?.first_name} {appraisal.employee?.last_name} - {appraisal.cycle?.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
            )}

            {/* Table view of available appraisals */}
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
                              <p className="font-medium">{appraisal.cycle?.name}</p>
                              <p className="text-sm text-gray-500">
                                {appraisal.cycle?.year} Q{appraisal.cycle?.quarter}
                              </p>
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
                            {appraisal.overall_score ? (
                              <div className="flex items-center space-x-1">
                                <TrendingUp className="h-4 w-4 text-blue-500" />
                                <span className="font-medium">{appraisal.overall_score}/100</span>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-400">Not scored</span>
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
                                onClick={() => setSelectedAppraisalId(appraisal.id)}
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
                  </p>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
