
import { useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { CommitteeReviewDetail } from '@/components/CommitteeReviewDetail';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, Calendar, Clock, CheckCircle } from 'lucide-react';

export default function Committee() {
  const [selectedAppraisalId, setSelectedAppraisalId] = useState<string>('');

  const { data: committeeAppraisals, isLoading } = useQuery({
    queryKey: ['committee-appraisals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('appraisals')
        .select(`
          *,
          employee:profiles!appraisals_employee_id_fkey(first_name, last_name, email),
          cycle:appraisal_cycles(name, year, quarter)
        `)
        .eq('status', 'committee_review')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
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
        </div>

        {/* Committee Member Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Select Committee Member for Review</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedAppraisalId} onValueChange={setSelectedAppraisalId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a committee member to review" />
              </SelectTrigger>
              <SelectContent>
                {committeeAppraisals?.map((appraisal) => (
                  <SelectItem key={appraisal.id} value={appraisal.id}>
                    {appraisal.employee?.first_name} {appraisal.employee?.last_name} - {appraisal.cycle?.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Show detailed review interface when an appraisal is selected */}
        {selectedAppraisalId ? (
          <CommitteeReviewDetail appraisalId={selectedAppraisalId} />
        ) : (
          <>
            {/* List of available appraisals */}
            {committeeAppraisals && committeeAppraisals.length > 0 ? (
              <div className="grid gap-4">
                {committeeAppraisals.map((appraisal) => (
                  <Card key={appraisal.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center space-x-3">
                          <Users className="h-5 w-5 text-gray-500" />
                          <div>
                            <CardTitle className="text-lg">
                              {appraisal.employee?.first_name} {appraisal.employee?.last_name}
                            </CardTitle>
                            <p className="text-sm text-gray-600">{appraisal.employee?.email}</p>
                            <p className="text-sm text-gray-600">{appraisal.cycle?.name}</p>
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
                              <CheckCircle className="h-4 w-4" />
                              <span>Score: {appraisal.overall_score}/100</span>
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
