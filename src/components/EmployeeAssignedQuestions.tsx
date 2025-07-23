
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { GroupedQuestionRenderer } from './GroupedQuestionRenderer';
import { Save, Send, AlertTriangle, User, Calendar, Building } from 'lucide-react';

interface EmployeeAssignedQuestionsProps {
  employeeId: string;
}

export function EmployeeAssignedQuestions({ employeeId }: EmployeeAssignedQuestionsProps) {
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [activeTab, setActiveTab] = useState('pending');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  console.log('📝 EmployeeAssignedQuestions: Loading for employee:', employeeId);

  const { data: currentAppraisal, isLoading, error } = useQuery({
    queryKey: ['employee-current-appraisal', employeeId],
    queryFn: async () => {
      console.log('🔍 Fetching current appraisal for employee:', employeeId);
      
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
        .eq('employee_id', employeeId)
        .in('status', ['draft', 'submitted'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('❌ Error fetching current appraisal:', error);
        throw error;
      }

      console.log('✅ Current appraisal loaded:', data);
      return data;
    },
    enabled: !!employeeId,
    retry: 2
  });

  const { data: completedAppraisals } = useQuery({
    queryKey: ['employee-completed-appraisals', employeeId],
    queryFn: async () => {
      console.log('📊 Fetching completed appraisals for employee:', employeeId);
      
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
        .eq('employee_id', employeeId)
        .in('status', ['manager_review', 'committee_review', 'hr_review', 'completed'])
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('❌ Error fetching completed appraisals:', error);
        return [];
      }

      console.log('✅ Completed appraisals loaded:', data?.length || 0);
      return data || [];
    },
    enabled: !!employeeId,
    retry: 1
  });

  const submitAppraisalMutation = useMutation({
    mutationFn: async (isDraft: boolean = false) => {
      if (!currentAppraisal) return;

      console.log('🚀 Submitting appraisal responses...');
      
      const responseUpdates = Object.entries(responses).map(([responseId, value]) => ({
        id: responseId,
        emp_rating: typeof value === 'number' ? value : null,
        emp_comment: typeof value === 'string' ? value : null,
        updated_at: new Date().toISOString()
      }));

      if (responseUpdates.length === 0) {
        throw new Error('No responses to submit');
      }

      for (const update of responseUpdates) {
        const { error } = await supabase
          .from('appraisal_responses')
          .update(update)
          .eq('id', update.id);

        if (error) {
          console.error('❌ Error updating response:', error);
          throw error;
        }
      }

      if (!isDraft) {
        const { error: appraisalError } = await supabase
          .from('appraisals')
          .update({
            status: 'manager_review',
            emp_submitted_at: new Date().toISOString()
          })
          .eq('id', currentAppraisal.id);

        if (appraisalError) {
          console.error('❌ Error updating appraisal status:', appraisalError);
          throw appraisalError;
        }
      }

      console.log('✅ Appraisal responses submitted successfully');
    },
    onSuccess: (_, isDraft) => {
      toast({
        title: isDraft ? "Draft Saved" : "Appraisal Submitted",
        description: isDraft 
          ? "Your responses have been saved as a draft."
          : "Your appraisal has been submitted for manager review.",
      });
      queryClient.invalidateQueries({ queryKey: ['employee-current-appraisal', employeeId] });
      queryClient.invalidateQueries({ queryKey: ['employee-completed-appraisals', employeeId] });
    },
    onError: (error: any) => {
      console.error('❌ Submit mutation failed:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit appraisal",
        variant: "destructive",
      });
    }
  });

  const handleResponseChange = (questionId: string, value: any) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const canSubmit = () => {
    if (!currentAppraisal?.responses) return false;
    
    const requiredQuestions = currentAppraisal.responses.filter(r => r.question?.is_required);
    const answeredRequired = requiredQuestions.filter(q => responses[q.id]);
    
    return answeredRequired.length === requiredQuestions.length;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center space-y-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="text-gray-600">Loading your appraisal...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <AlertTriangle className="h-12 w-12 text-red-400 mb-4" />
          <h3 className="text-lg font-medium text-red-900 mb-2">Error Loading Appraisal</h3>
          <p className="text-red-600 text-center">
            {error?.message || 'Unable to load your appraisal questions'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pending" className="flex items-center space-x-2">
            <User className="h-4 w-4" />
            <span>Current Appraisal</span>
          </TabsTrigger>
          <TabsTrigger value="completed" className="flex items-center space-x-2">
            <Calendar className="h-4 w-4" />
            <span>Completed ({completedAppraisals?.length || 0})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-6">
          {currentAppraisal ? (
            <>
              <Card className="border-l-4 border-l-blue-500">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex items-center space-x-4">
                      <div className="bg-gradient-to-r from-blue-100 to-indigo-100 p-4 rounded-full">
                        <User className="h-8 w-8 text-blue-600" />
                      </div>
                      <div>
                        <CardTitle className="text-2xl">
                          {currentAppraisal.employee?.first_name} {currentAppraisal.employee?.last_name}
                        </CardTitle>
                        <p className="text-gray-600 text-lg">{currentAppraisal.employee?.email}</p>
                        <div className="flex items-center space-x-2 mt-2">
                          <Building className="h-4 w-4 text-gray-500" />
                          <span className="text-sm text-gray-500">
                            {currentAppraisal.employee?.position || 'Position not set'} • {currentAppraisal.employee?.department?.name || 'Department not assigned'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className="bg-blue-100 text-blue-800 text-sm px-3 py-1">
                        {currentAppraisal.status === 'draft' ? 'Draft' : 'Submitted'}
                      </Badge>
                      <p className="text-sm text-gray-500 mt-2">
                        <strong>{currentAppraisal.cycle?.name || 'Unknown Cycle'}</strong>
                      </p>
                      <p className="text-xs text-gray-400">
                        Year: {currentAppraisal.cycle?.year || '?'} • Q{currentAppraisal.cycle?.quarter || '?'}
                      </p>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Appraisal Questions</CardTitle>
                  <p className="text-sm text-gray-600">
                    Please complete all required questions. You can save as draft or submit for manager review.
                  </p>
                </CardHeader>
                <CardContent>
                  <GroupedQuestionRenderer
                    questions={currentAppraisal.responses?.map(r => ({
                      id: r.id,
                      question_text: r.question?.question_text || '',
                      question_type: r.question?.question_type || 'rating',
                      is_required: r.question?.is_required || false,
                      multiple_choice_options: r.question?.multiple_choice_options || [],
                      section: r.question?.section
                    })) || []}
                    values={responses}
                    onChange={handleResponseChange}
                    disabled={false}
                    employeeName={`${currentAppraisal.employee?.first_name} ${currentAppraisal.employee?.last_name}`}
                  />

                  <div className="flex justify-between items-center mt-8 pt-6 border-t">
                    <div className="text-sm text-gray-600">
                      Progress: {Object.keys(responses).length}/{currentAppraisal.responses?.length || 0} questions answered
                    </div>
                    
                    <div className="flex space-x-3">
                      <Button
                        variant="outline"
                        onClick={() => submitAppraisalMutation.mutate(true)}
                        disabled={submitAppraisalMutation.isPending}
                        className="flex items-center space-x-2"
                      >
                        <Save className="h-4 w-4" />
                        <span>Save Draft</span>
                      </Button>
                      
                      <Button
                        onClick={() => submitAppraisalMutation.mutate(false)}
                        disabled={!canSubmit() || submitAppraisalMutation.isPending}
                        className="flex items-center space-x-2"
                      >
                        <Send className="h-4 w-4" />
                        <span>Submit for Review</span>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <User className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Current Appraisal</h3>
                <p className="text-gray-600 text-center">
                  You don't have any pending appraisals at this time.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {completedAppraisals && completedAppraisals.length > 0 ? (
            <div className="space-y-4">
              {completedAppraisals.map((appraisal) => (
                <Card key={appraisal.id} className="border-l-4 border-l-green-500">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">
                          {appraisal.cycle?.name || 'Unknown Cycle'}
                        </CardTitle>
                        <p className="text-sm text-gray-600">
                          Year: {appraisal.cycle?.year || '?'} • Quarter: {appraisal.cycle?.quarter || '?'}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge className="bg-green-100 text-green-800">
                          {appraisal.status}
                        </Badge>
                        {appraisal.overall_score && (
                          <p className="text-sm text-gray-600 mt-1">
                            Score: {appraisal.overall_score}/100
                          </p>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <GroupedQuestionRenderer
                      questions={appraisal.responses?.map(r => ({
                        id: r.id,
                        question_text: r.question?.question_text || '',
                        question_type: r.question?.question_type || 'rating',
                        is_required: r.question?.is_required || false,
                        multiple_choice_options: r.question?.multiple_choice_options || [],
                        section: r.question?.section
                      })) || []}
                      values={appraisal.responses?.reduce((acc, r) => {
                        acc[r.id] = {
                          emp_rating: r.emp_rating,
                          mgr_rating: r.mgr_rating,
                          committee_rating: r.committee_rating,
                          emp_comment: r.emp_comment,
                          mgr_comment: r.mgr_comment,
                          committee_comment: r.committee_comment
                        };
                        return acc;
                      }, {} as Record<string, any>) || {}}
                      onChange={() => {}} // Read-only
                      disabled={true}
                      employeeName={`${appraisal.employee?.first_name} ${appraisal.employee?.last_name}`}
                      hideRatingsForTextSections={true}
                    />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Calendar className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Completed Appraisals</h3>
                <p className="text-gray-600 text-center">
                  You haven't completed any appraisals yet.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
