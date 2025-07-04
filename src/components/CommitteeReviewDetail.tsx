
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Users, Calendar, TrendingUp, Target, MessageSquare, Star, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CommitteeReviewDetailProps {
  appraisalId: string;
}

export function CommitteeReviewDetail({ appraisalId }: CommitteeReviewDetailProps) {
  const [committeeComments, setCommitteeComments] = useState('');
  const [committeeScores, setCommitteeScores] = useState<Record<string, number>>({});
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
      return data;
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
      // Update appraisal with committee review
      const { error: appraisalError } = await supabase
        .from('appraisals')
        .update({
          committee_comments: committeeComments,
          committee_reviewed_at: new Date().toISOString(),
          committee_reviewed_by: (await supabase.auth.getUser()).data.user?.id,
          status: 'hr_review'
        })
        .eq('id', appraisalId);

      if (appraisalError) throw appraisalError;

      // Update individual response scores with committee ratings
      for (const [responseId, score] of Object.entries(committeeScores)) {
        const { error: responseError } = await supabase
          .from('appraisal_responses')
          .update({
            committee_rating: score,
            committee_comment: committeeComments
          })
          .eq('id', responseId);

        if (responseError) throw responseError;
      }
    },
    onSuccess: () => {
      toast({
        title: "Committee Review Submitted",
        description: "The appraisal has been reviewed and forwarded to HR.",
      });
      queryClient.invalidateQueries({ queryKey: ['committee-appraisals'] });
    },
    onError: (error) => {
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
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div className="flex items-center space-x-4">
              <div className="bg-orange-100 p-3 rounded-full">
                <Users className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <CardTitle className="text-xl">
                  {employee?.first_name} {employee?.last_name}
                </CardTitle>
                <p className="text-gray-600">{employee?.email}</p>
                <p className="text-sm text-gray-500">
                  {employee?.position} • {employee?.department?.name}
                </p>
              </div>
            </div>
            <div className="text-right">
              <Badge className="bg-purple-100 text-purple-800">
                Committee Review
              </Badge>
              <p className="text-sm text-gray-500 mt-1">
                {appraisalData.cycle?.name}
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="scores" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="scores">Score Comparison</TabsTrigger>
          <TabsTrigger value="history">Appraisal History</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="goals">Goals & Development</TabsTrigger>
        </TabsList>

        <TabsContent value="scores" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Score Comparison & Committee Review</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {responses.map((response) => (
                <div key={response.id} className="border rounded-lg p-4 space-y-4">
                  <div>
                    <h4 className="font-medium">{response.question?.question_text}</h4>
                    <p className="text-sm text-gray-500">
                      Section: {response.question?.section?.name}
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Employee Score */}
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <Label className="text-sm font-medium text-blue-700">Employee Score</Label>
                      <div className="flex items-center space-x-2 mt-1">
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`h-4 w-4 ${
                                star <= (response.emp_rating || 0)
                                  ? 'text-blue-500 fill-current'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-sm font-medium">{response.emp_rating}/5</span>
                      </div>
                      {response.emp_comment && (
                        <p className="text-xs text-gray-600 mt-1">{response.emp_comment}</p>
                      )}
                    </div>

                    {/* Manager Score */}
                    <div className="bg-green-50 p-3 rounded-lg">
                      <Label className="text-sm font-medium text-green-700">Manager Score</Label>
                      <div className="flex items-center space-x-2 mt-1">
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`h-4 w-4 ${
                                star <= (response.mgr_rating || 0)
                                  ? 'text-green-500 fill-current'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-sm font-medium">{response.mgr_rating}/5</span>
                      </div>
                      {response.mgr_comment && (
                        <p className="text-xs text-gray-600 mt-1">{response.mgr_comment}</p>
                      )}
                    </div>

                    {/* Committee Score */}
                    <div className="bg-purple-50 p-3 rounded-lg">
                      <Label className="text-sm font-medium text-purple-700">Committee Score</Label>
                      <div className="flex items-center space-x-2 mt-1">
                        <Select
                          value={committeeScores[response.id]?.toString() || ''}
                          onValueChange={(value) => handleScoreChange(response.id, parseInt(value))}
                        >
                          <SelectTrigger className="w-20 h-8">
                            <SelectValue placeholder="Rate" />
                          </SelectTrigger>
                          <SelectContent>
                            {[1, 2, 3, 4, 5].map((score) => (
                              <SelectItem key={score} value={score.toString()}>
                                {score}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <span className="text-sm text-gray-500">/5</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              <Separator />

              <div className="space-y-4">
                <Label htmlFor="committee-comments">Committee Comments</Label>
                <Textarea
                  id="committee-comments"
                  placeholder="Provide detailed feedback and justification for score adjustments..."
                  value={committeeComments}
                  onChange={(e) => setCommitteeComments(e.target.value)}
                  rows={4}
                />
              </div>

              <Button 
                onClick={() => submitReviewMutation.mutate()}
                disabled={submitReviewMutation.isPending}
                className="w-full"
              >
                {submitReviewMutation.isPending ? 'Submitting...' : 'Submit Committee Review'}
              </Button>
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

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5" />
                <span>Performance Analytics</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analytics ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h4 className="font-medium text-blue-900">Overall Performance</h4>
                      <p className="text-2xl font-bold text-blue-600 mt-1">
                        {analytics.overall_score}/100
                      </p>
                      <p className="text-sm text-blue-700">{analytics.performance_band}</p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <h4 className="font-medium text-green-900">Performance Trend</h4>
                      <p className="text-sm text-green-700 mt-1">
                        {analytics.trends ? 'Trending upward' : 'Stable performance'}
                      </p>
                    </div>
                  </div>
                  
                  {analytics.section_scores && (
                    <div>
                      <h4 className="font-medium mb-3">Section Breakdown</h4>
                      <div className="space-y-2">
                        {Object.entries(analytics.section_scores as Record<string, number>).map(([section, score]) => (
                          <div key={section} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                            <span className="text-sm">{section}</span>
                            <span className="font-medium">{score}/100</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {analytics.recommendations && (
                    <div>
                      <h4 className="font-medium mb-3">AI Recommendations</h4>
                      <div className="p-3 bg-yellow-50 rounded-lg">
                        <p className="text-sm text-yellow-800">
                          {JSON.stringify(analytics.recommendations)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No analytics data available</p>
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
