import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Users, BarChart3, Clock, Target, Send, CheckCircle, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { GroupedCommitteeScoreReview } from './GroupedCommitteeScoreReview';
import { CommitteeAnalytics } from './CommitteeAnalytics';
import { GroupedQuestionRenderer } from './GroupedQuestionRenderer';

interface CommitteeReviewDetailProps {
  appraisalId: string;
}

export function CommitteeReviewDetail({ appraisalId }: CommitteeReviewDetailProps) {
  const [committeeComments, setCommitteeComments] = useState('');
  const [committeeScores, setCommitteeScores] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  console.log('🔍 CommitteeReviewDetail: Loading appraisal ID:', appraisalId);

  const { data: appraisalData, isLoading, error } = useQuery({
    queryKey: ['committee-appraisal-detail', appraisalId],
    queryFn: async () => {
      console.log('📋 CommitteeReviewDetail: Fetching appraisal details...');
      
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
              *,
              question:appraisal_questions(
                question_text,
                question_type,
                is_required,
                multiple_choice_options,
                section:appraisal_question_sections(name)
              )
            )
          `)
          .eq('id', appraisalId)
          .single();
        
        if (error) {
          console.error('❌ CommitteeReviewDetail: Database error:', error);
          throw error;
        }

        console.log('✅ CommitteeReviewDetail: Appraisal data loaded:', data);
        return data;
      } catch (err: any) {
        console.error('❌ CommitteeReviewDetail: Query failed:', err);
        setLoadingError(err.message || 'Failed to load appraisal data');
        throw err;
      }
    },
    retry: 2,
    retryDelay: 1000,
    enabled: !!appraisalId
  });

  const { data: appraisalHistory } = useQuery({
    queryKey: ['employee-appraisal-history', appraisalData?.employee_id],
    queryFn: async () => {
      if (!appraisalData?.employee_id) return [];
      
      console.log('📊 CommitteeReviewDetail: Fetching appraisal history...');
      
      const { data, error } = await supabase
        .from('appraisals')
        .select(`
          *,
          cycle:appraisal_cycles(name, year, quarter)
        `)
        .eq('employee_id', appraisalData.employee_id)
        .neq('id', appraisalId)
        .in('status', ['completed', 'hr_review'])
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) {
        console.error('❌ CommitteeReviewDetail: History query error:', error);
        return [];
      }
      
      console.log('✅ CommitteeReviewDetail: History loaded:', data?.length || 0);
      return data || [];
    },
    enabled: !!appraisalData?.employee_id,
    retry: 1
  });

  const { data: analytics } = useQuery({
    queryKey: ['employee-analytics', appraisalData?.employee_id],
    queryFn: async () => {
      if (!appraisalData?.employee_id) return null;
      
      console.log('📈 CommitteeReviewDetail: Fetching analytics...');
      
      const { data, error } = await supabase
        .from('performance_analytics')
        .select('*')
        .eq('employee_id', appraisalData.employee_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) {
        console.error('❌ CommitteeReviewDetail: Analytics query error:', error);
        return null;
      }
      
      console.log('✅ CommitteeReviewDetail: Analytics loaded:', !!data);
      return data;
    },
    enabled: !!appraisalData?.employee_id,
    retry: 0
  });

  const submitReviewMutation = useMutation({
    mutationFn: async () => {
      console.log('🚀 CommitteeReviewDetail: Submitting review...');
      setIsSubmitting(true);
      
      let totalWeightedScore = 0;
      let totalWeight = 0;
      
      const responses = appraisalData?.responses || [];
      
      for (const response of responses) {
        const committeeScore = committeeScores[response.id];
        if (committeeScore) {
          const { error: responseError } = await supabase
            .from('appraisal_responses')
            .update({
              committee_rating: committeeScore,
              committee_comment: committeeComments
            })
            .eq('id', response.id);

          if (responseError) throw responseError;
          
          const weight = 1;
          totalWeightedScore += committeeScore * 20;
          totalWeight += weight;
        }
      }
      
      const finalScore = Math.round(totalWeightedScore / totalWeight);
      
      let performanceBand = 'Poor';
      if (finalScore >= 91) performanceBand = 'Exceptional';
      else if (finalScore >= 81) performanceBand = 'Excellent';
      else if (finalScore >= 71) performanceBand = 'Very Good';
      else if (finalScore >= 61) performanceBand = 'Good';
      else if (finalScore >= 51) performanceBand = 'Fair';

      const { error: appraisalError } = await supabase
        .from('appraisals')
        .update({
          committee_comments: committeeComments,
          committee_reviewed_at: new Date().toISOString(),
          committee_reviewed_by: (await supabase.auth.getUser()).data.user?.id,
          overall_score: finalScore,
          performance_band: performanceBand,
          status: 'completed'
        })
        .eq('id', appraisalId);

      if (appraisalError) throw appraisalError;

      // Calculate and save performance analytics
      try {
        const { PerformanceCalculationService } = await import('@/services/performanceCalculationService');
        const calculation = await PerformanceCalculationService.calculatePerformanceScore(
          appraisalData?.employee_id,
          appraisalData?.cycle_id
        );
        
        if (calculation) {
          await PerformanceCalculationService.savePerformanceAnalytics(
            appraisalData?.employee_id,
            appraisalData?.cycle_id,
            calculation
          );
        }
      } catch (perfError) {
        console.error('Performance calculation error:', perfError);
        // Don't fail the main operation if performance calculation fails
      }
      
      console.log('✅ CommitteeReviewDetail: Review submitted successfully');
      setIsSubmitting(false);
    },
    onSuccess: () => {
      toast({
        title: "Committee Review Completed",
        description: "The appraisal has been completed successfully. Performance scores have been finalized.",
      });
      queryClient.invalidateQueries({ queryKey: ['committee-appraisals'] });
    },
    onError: (error) => {
      setIsSubmitting(false);
      toast({
        title: "Error",
        description: "Failed to submit committee review. Please try again.",
        variant: "destructive",
      });
      console.error('❌ CommitteeReviewDetail: Review submission error:', error);
    }
  });

  const handleScoreChange = (responseId: string, score: number) => {
    setCommitteeScores(prev => ({
      ...prev,
      [responseId]: score
    }));
  };

  const canSubmit = () => {
    const responses = appraisalData?.responses || [];
    const scoredResponses = Object.keys(committeeScores).length;
    return scoredResponses === responses.length && committeeComments.trim().length > 0;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center space-y-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
          <span className="text-gray-600">Loading appraisal details...</span>
        </div>
      </div>
    );
  }

  if (error || loadingError) {
    return (
      <Card className="border-red-200">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <AlertTriangle className="h-12 w-12 text-red-400 mb-4" />
          <h3 className="text-lg font-medium text-red-900 mb-2">Failed to Load Appraisal</h3>
          <p className="text-red-600 text-center mb-4">
            {loadingError || error?.message || 'Unable to load appraisal details'}
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
    );
  }

  if (!appraisalData) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <AlertTriangle className="h-12 w-12 text-gray-400 mb-4" />
          <p className="text-gray-600">Appraisal not found</p>
        </CardContent>
      </Card>
    );
  }

  const employee = appraisalData.employee;
  const responses = appraisalData.responses || [];

  // Transform responses into properly formatted questions for GroupedQuestionRenderer
  const questions = responses.map(response => ({
    id: response.id,
    question_text: response.question?.question_text || '',
    question_type: response.question?.question_type || 'rating',
    is_required: response.question?.is_required || false,
    multiple_choice_options: response.question?.multiple_choice_options || [],
    section: response.question?.section
  }));

  // Create proper response values format that GroupedQuestionRenderer expects
  const responseValues = responses.reduce((acc, response) => {
    acc[response.id] = {
      emp_rating: response.emp_rating,
      mgr_rating: response.mgr_rating,
      committee_rating: response.committee_rating,
      emp_comment: response.emp_comment,
      mgr_comment: response.mgr_comment,
      committee_comment: response.committee_comment
    };
    return acc;
  }, {} as Record<string, any>);

  return (
    <div className="space-y-6">
      <Card className="border-l-4 border-l-purple-500">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-r from-purple-100 to-pink-100 p-4 rounded-full">
                <Users className="h-8 w-8 text-purple-600" />
              </div>
              <div>
                <CardTitle className="text-2xl">
                  {employee?.first_name} {employee?.last_name}
                </CardTitle>
                <p className="text-gray-600 text-lg">{employee?.email}</p>
                <p className="text-sm text-gray-500">
                  {employee?.position || 'Position not set'} • {employee?.department?.name || 'Department not assigned'}
                </p>
              </div>
            </div>
            <div className="text-right">
              <Badge className="bg-purple-100 text-purple-800 text-sm px-3 py-1">
                Committee Review
              </Badge>
              <p className="text-sm text-gray-500 mt-2">
                <strong>{appraisalData.cycle?.name || 'Unknown Cycle'}</strong>
              </p>
              <p className="text-xs text-gray-400">
                Year: {appraisalData.cycle?.year || '?'} • Q{appraisalData.cycle?.quarter || '?'}
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="scores" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="scores" className="flex items-center space-x-2">
            <BarChart3 className="h-4 w-4" />
            <span>Score Review</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center space-x-2">
            <Target className="h-4 w-4" />
            <span>Analytics</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center space-x-2">
            <Clock className="h-4 w-4" />
            <span>History</span>
          </TabsTrigger>
          <TabsTrigger value="questions" className="flex items-center space-x-2">
            <CheckCircle className="h-4 w-4" />
            <span>Questions Review</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="scores" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Score Comparison & Committee Review</CardTitle>
              <p className="text-sm text-gray-600">
                Review employee and manager ratings, then provide your committee assessment
              </p>
            </CardHeader>
            <CardContent>
              <GroupedCommitteeScoreReview
                responses={responses}
                appraisalData={appraisalData}
                committeeScores={committeeScores}
                onScoreChange={handleScoreChange}
                employeeName={`${employee?.first_name} ${employee?.last_name}`}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Committee Final Comments</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="committee-comments">
                  Provide detailed feedback and justification for score adjustments *
                </Label>
                <Textarea
                  id="committee-comments"
                  placeholder="Provide comprehensive feedback on the employee's performance, justification for any score adjustments, and recommendations for development..."
                  value={committeeComments}
                  onChange={(e) => setCommitteeComments(e.target.value)}
                  rows={6}
                  className="resize-none"
                />
                <p className="text-xs text-gray-500">
                  Minimum 50 characters required. Current: {committeeComments.length}
                </p>
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <div className="text-sm text-gray-600">
                  Progress: {Object.keys(committeeScores).length}/{responses.length} questions scored
                </div>
                
                <Button 
                  onClick={() => submitReviewMutation.mutate()}
                  disabled={!canSubmit() || isSubmitting}
                  className="flex items-center space-x-2"
                  size="lg"
                >
                  <Send className="h-4 w-4" />
                  <span>
                    {isSubmitting ? 'Submitting...' : 'Complete Committee Review'}
                  </span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <CommitteeAnalytics
            appraisalData={appraisalData}
            appraisalHistory={appraisalHistory || []}
            analytics={analytics}
            responses={responses}
          />
        </TabsContent>

        <TabsContent value="questions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5" />
                <span>Questions & Responses Review</span>
              </CardTitle>
              <p className="text-sm text-gray-600">
                Review all questions organized by sections with employee and manager responses
              </p>
            </CardHeader>
            <CardContent>
              <GroupedQuestionRenderer
                questions={questions}
                values={responseValues}
                onChange={() => {}} // Read-only display
                disabled={true}
                employeeName={`${employee?.first_name} ${employee?.last_name}`}
                hideRatingsForTextSections={true}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="h-5 w-5" />
                <span>Appraisal History</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {appraisalHistory && appraisalHistory.length > 0 ? (
                <div className="space-y-4">
                  {appraisalHistory.map((appraisal) => (
                    <div key={appraisal.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium">{appraisal.cycle?.name || 'Unknown Cycle'}</h4>
                          <p className="text-sm text-gray-600">
                            Year: {appraisal.cycle?.year || '?'} • Quarter: {appraisal.cycle?.quarter || '?'}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline">{appraisal.performance_band || 'No Band'}</Badge>
                          <p className="text-sm font-medium mt-1">
                            Score: {appraisal.overall_score || 'No Score'}/100
                          </p>
                        </div>
                      </div>
                      {appraisal.committee_comments && (
                        <div className="mt-3 p-3 bg-gray-50 rounded">
                          <p className="text-sm text-gray-700">{appraisal.committee_comments}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No previous appraisals found</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
