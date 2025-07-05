
import { useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { CommitteeReviewDetail } from '@/components/CommitteeReviewDetail';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, Calendar, Clock, CheckCircle, TrendingUp } from 'lucide-react';

export default function Committee() {
  const [selectedAppraisalId, setSelectedAppraisalId] = useState<string>('');

  const { data: committeeAppraisals, isLoading } = useQuery({
    queryKey: ['committee-appraisals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('appraisals')
        .select(`
          *,
          employee:profiles!appraisals_employee_id_fkey(
            first_name, 
            last_name, 
            email,
            position,
            department:departments(name)
          ),
          cycle:appraisal_cycles(name, year, quarter)
        `)
        .eq('status', 'committee_review')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
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
            {/* Committee Member Selection */}
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

            {/* List of available appraisals */}
            {committeeAppraisals && committeeAppraisals.length > 0 ? (
              <div className="grid gap-4">
                {committeeAppraisals.map((appraisal) => (
                  <Card key={appraisal.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 flex items-center justify-center text-white font-semibold">
                            {appraisal.employee?.first_name?.[0]}{appraisal.employee?.last_name?.[0]}
                          </div>
                          <div>
                            <CardTitle className="text-lg">
                              {appraisal.employee?.first_name} {appraisal.employee?.last_name}
                            </CardTitle>
                            <p className="text-sm text-gray-600">{appraisal.employee?.email}</p>
                            <p className="text-sm text-gray-600">
                              {appraisal.employee?.position} • {appraisal.employee?.department?.name}
                            </p>
                          </div>
                        </div>
                        <Badge className="bg-purple-100 text-purple-800">
                          Committee Review
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-between items-center">
                        <div className="text-sm text-gray-600 space-y-1">
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-4 w-4" />
                            <span>Cycle: {appraisal.cycle?.name}</span>
                          </div>
                          {appraisal.manager_reviewed_at && (
                            <div className="flex items-center space-x-1">
                              <Clock className="h-4 w-4" />
                              <span>Manager Review: {new Date(appraisal.manager_reviewed_at).toLocaleDateString()}</span>
                            </div>
                          )}
                          {appraisal.overall_score && (
                            <div className="flex items-center space-x-1">
                              <TrendingUp className="h-4 w-4" />
                              <span>Current Score: {appraisal.overall_score}/100</span>
                            </div>
                          )}
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setSelectedAppraisalId(appraisal.id)}
                        >
                          Review Details
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
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
