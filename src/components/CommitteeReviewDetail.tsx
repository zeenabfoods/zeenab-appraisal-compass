import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Users, BarChart3, Clock, Target, Send, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { CommitteeScoreComparison } from './CommitteeScoreComparison';
import { CommitteeAnalytics } from './CommitteeAnalytics';

interface CommitteeReviewDetailProps {
  appraisalId: string;
}

export function CommitteeReviewDetail({ appraisalId }: CommitteeReviewDetailProps) {
  const [committeeComments, setCommitteeComments] = useState('');
  const [committeeScores, setCommitteeScores] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch appraisal details with employee info and responses
  const { data: appraisalData, isLoading } = useQuery({
    queryKey: ['committee-appraisal-detail', appraisalId],
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
          cycle:appraisal_cycles(name, year, quarter),
          responses:appraisal_responses(
            *,
            question:appraisal_questions(
              question_text,
              section:appraisal_question_sections(name)
            )
          )
        `)
        .eq('id', appraisalId)
        .single();
      
      if (error) throw error;
      return data;
    }
  });

  // Fetch appraisal history for the employee
  const { data: appraisalHistory } = useQuery({
    queryKey: ['employee-appraisal-history', appraisalData?.employee_id],
    queryFn: async () => {
      if (!appraisalData?.employee_id) return [];
      
      const { data, error } = await supabase
        .from('appraisals')
        .select(`
          *,
          cycle:appraisal_cycles(name, year, quarter)
        `)
        .eq('employee_id', appraisalData.employee_id)
        .neq('id', appraisalId)
        .eq('status', 'completed')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!appraisalData?.employee_id
  });

  // Fetch performance analytics
  const { data: analytics } = useQuery({
    queryKey: ['employee-analytics', appraisalData?.employee_id],
    queryFn: async () => {
      if (!appraisalData?.employee_id) return null;
      
      const { data, error } = await supabase
        .from('performance_analytics')
        .select('*')
        .eq('employee_id', appraisalData.employee_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!appraisalData?.employee_id
  });

  // Submit committee review
  const submitReviewMutation = useMutation({
    mutationFn: async () => {
      setIsSubmitting(true);
      
      // Calculate final scores
      let totalWeightedScore = 0;
      let totalWeight = 0;
      
      const responses = appraisalData?.responses || [];
      
      // Update individual response scores with committee ratings
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
          
          // Weight calculation (assuming weight from question)
          const weight = 1; // Default weight, you can get this from question data
          totalWeightedScore += committeeScore * 20; // Convert to 100 scale
          totalWeight += weight;
        }
      }
      
      const finalScore = Math.round(totalWeightedScore / totalWeight);
      
      // Calculate performance band
      let performanceBand = 'Poor';
      if (finalScore >= 91) performanceBand = 'Exceptional';
      else if (finalScore >= 81) performanceBand = 'Excellent';
      else if (finalScore >= 71) performanceBand = 'Very Good';
      else if (finalScore >= 61) performanceBand = 'Good';
      else if (finalScore >= 51) performanceBand = 'Fair';

      // Update appraisal with committee review
      const { error: appraisalError } = await supabase
        .from('appraisals')
        .update({
          committee_comments: committeeComments,
          committee_reviewed_at: new Date().toISOString(),
          committee_reviewed_by: (await supabase.auth.getUser()).data.user?.id,
          overall_score: finalScore,
          performance_band: performanceBand,
          status: 'hr_review'
        })
        .eq('id', appraisalId);

      if (appraisalError) throw appraisalError;
      
      setIsSubmitting(false);
    },
    onSuccess: () => {
      toast({
        title: "Committee Review Completed",
        description: "The appraisal has been reviewed and forwarded to HR for final processing.",
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
      console.error('Committee review error:', error);
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  if (!appraisalData) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <p className="text-gray-600">Appraisal not found</p>
        </CardContent>
      </Card>
    );
  }

  const employee = appraisalData.employee;
  const responses = appraisalData.responses || [];

  return (
    <div className="space-y-6">
      {/* Employee Header */}
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
                  {employee?.position} • {employee?.department?.name}
                </p>
              </div>
            </div>
            <div className="text-right">
              <Badge className="bg-purple-100 text-purple-800 text-sm px-3 py-1">
                Committee Review
              </Badge>
              <p className="text-sm text-gray-500 mt-2">
                <strong>{appraisalData.cycle?.name}</strong>
              </p>
              <p className="text-xs text-gray-400">
                Year: {appraisalData.cycle?.year} • Q{appraisalData.cycle?.quarter}
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
          <TabsTrigger value="goals" className="flex items-center space-x-2">
            <CheckCircle className="h-4 w-4" />
            <span>Goals & Comments</span>
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
              <CommitteeScoreComparison
                responses={responses}
                committeeScores={committeeScores}
                onScoreChange={handleScoreChange}
              />
            </CardContent>
          </Card>

          {/* Committee Final Comments */}
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
                          <h4 className="font-medium">{appraisal.cycle?.name}</h4>
                          <p className="text-sm text-gray-600">
                            Year: {appraisal.cycle?.year} • Quarter: {appraisal.cycle?.quarter}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline">{appraisal.performance_band}</Badge>
                          <p className="text-sm font-medium mt-1">
                            Score: {appraisal.overall_score}/100
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

        <TabsContent value="goals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Target className="h-5 w-5" />
                <span>Goals & Development Areas</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-medium mb-2">Current Goals</h4>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-700">
                    {appraisalData.goals || 'No goals specified'}
                  </p>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Training Needs</h4>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-700">
                    {appraisalData.training_needs || 'No training needs identified'}
                  </p>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Noteworthy Achievements</h4>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-700">
                    {appraisalData.noteworthy || 'No achievements noted'}
                  </p>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Employee Comments</h4>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-700">
                    {appraisalData.emp_comments || 'No employee comments'}
                  </p>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Manager Comments</h4>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-700">
                    {appraisalData.mgr_comments || 'No manager comments'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
