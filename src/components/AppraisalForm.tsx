
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthContext } from '@/components/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { formatCycleName } from '@/utils/cycleFormatting';
import { GroupedQuestionRenderer } from './GroupedQuestionRenderer';

// Browser-native UUID generation with fallback
const generateId = () => {
  try {
    return window.crypto.randomUUID();
  } catch (e) {
    console.warn('crypto.randomUUID() not available, using fallback');
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }
};

interface AppraisalQuestion {
  id: string;
  question_text: string;
  weight: number;
  section_id: string;
  appraisal_question_sections: {
    name: string;
  };
}

interface AppraisalResponse {
  id?: string;
  question_id: string;
  emp_rating: number | null;
  mgr_rating: number | null;
  emp_comment: string;
  mgr_comment: string;
  question?: AppraisalQuestion;
}

interface AppraisalData {
  id?: string;
  employee_id: string;
  cycle_id: string;
  status: string;
  goals: string;
  training_needs: string;
  noteworthy: string;
  emp_comments: string;
  mgr_comments: string;
  overall_score: number | null;
  performance_band: string;
  employee_submitted_at: string | null;
  manager_reviewed_at: string | null;
  cycle: {
    name: string;
    quarter: number;
    year: number;
  };
  employee: {
    first_name: string;
    last_name: string;
    position: string;
    email: string;
    line_manager_id: string | null;
    department: {
      name: string;
    };
  };
}

interface AppraisalFormProps {
  appraisalId?: string;
}

export function AppraisalForm({ appraisalId: propsAppraisalId }: AppraisalFormProps) {
  const { appraisalId: paramAppraisalId } = useParams<{ appraisalId: string }>();
  const appraisalId = propsAppraisalId || paramAppraisalId;
  
  const navigate = useNavigate();
  const { profile } = useAuthContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [appraisalData, setAppraisalData] = useState<AppraisalData | null>(null);
  const [responses, setResponses] = useState<AppraisalResponse[]>([]);
  const [goals, setGoals] = useState('');
  const [trainingNeeds, setTrainingNeeds] = useState('');
  const [noteworthy, setNoteworthy] = useState('');
  const [empComments, setEmpComments] = useState('');
  const [mgrComments, setMgrComments] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  console.log('🔍 AppraisalForm: Rendered with appraisalId:', appraisalId);

  // Fetch global submission lock status
  const { data: submissionSettings } = useQuery({
    queryKey: ['appraisal-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('appraisal_settings')
        .select('submission_locked, manager_submission_locked')
        .limit(1)
        .single();
      
      if (error) {
        console.error('Error fetching submission settings:', error);
        return { submission_locked: false, manager_submission_locked: false }; // Default to unlocked on error
      }
      
      return data;
    }
  });

  // Fetch appraisal data
  const { data: appraisalQuery, isLoading } = useQuery({
    queryKey: ['appraisal', appraisalId],
    queryFn: async () => {
      if (!appraisalId) throw new Error("Appraisal ID is required");

      console.log('📋 AppraisalForm: Fetching appraisal data for ID:', appraisalId);

          const { data, error } = await supabase
            .from('appraisals')
            .select(`
              *,
              cycle:appraisal_cycles(name, quarter, year),
              employee:profiles!appraisals_employee_id_fkey(
                first_name,
                last_name,
                position,
                email,
                line_manager_id,
                department:departments!profiles_department_id_fkey(name)
              )
            `)
            .eq('id', appraisalId)
            .single();

      if (error) {
        console.error("❌ AppraisalForm: Error fetching appraisal:", error);
        throw error;
      }

      console.log('✅ AppraisalForm: Appraisal data loaded:', data);

      // Ensure we have the proper structure
      if (!data.employee || !data.cycle) {
        throw new Error("Missing required appraisal data");
      }

      return data;
    },
    enabled: !!appraisalId,
  });

  // Fetch appraisal responses
  const { data: responsesQuery } = useQuery({
    queryKey: ['appraisal-responses', appraisalId],
    queryFn: async () => {
      if (!appraisalId) throw new Error("Appraisal ID is required");

      console.log('📋 AppraisalForm: Fetching responses for appraisal:', appraisalId);

      const { data, error } = await supabase
        .from('appraisal_responses')
        .select(`
          *,
          question:appraisal_questions(
            id,
            question_text,
            weight,
            section_id,
            appraisal_question_sections(name)
          )
        `)
        .eq('appraisal_id', appraisalId);

      if (error) {
        console.error("❌ AppraisalForm: Error fetching appraisal responses:", error);
        throw error;
      }

      console.log('✅ AppraisalForm: Responses loaded:', data?.length || 0);
      return data as AppraisalResponse[];
    },
    enabled: !!appraisalId,
});

  // Fetch assigned questions (ensures questions appear even when responses haven't been created yet)
  const { data: assignedQuestions } = useQuery({
    queryKey: ['assigned-questions', (appraisalQuery as any)?.employee_id, (appraisalQuery as any)?.cycle_id],
    queryFn: async () => {
      if (!appraisalQuery) throw new Error('Appraisal data not loaded');

      // 1) Active, non-deleted assignments for this employee and cycle
      const { data: assignments, error: assignmentsError } = await supabase
        .from('employee_appraisal_questions')
        .select('question_id')
        .eq('employee_id', (appraisalQuery as any).employee_id)
        .eq('cycle_id', (appraisalQuery as any).cycle_id)
        .eq('is_active', true)
        .is('deleted_at', null);

      if (assignmentsError) {
        console.error('❌ AppraisalForm: Error fetching assignments:', assignmentsError);
        throw assignmentsError;
      }

      const questionIds = (assignments || []).map(a => a.question_id).filter(Boolean);
      if (questionIds.length === 0) return [] as any[];

      // 2) Load question details
      const { data: questions, error: questionsError } = await supabase
        .from('appraisal_questions')
        .select(`
          id,
          question_text,
          weight,
          section_id,
          appraisal_question_sections(name)
        `)
        .in('id', questionIds);

      if (questionsError) {
        console.error('❌ AppraisalForm: Error fetching questions:', questionsError);
        throw questionsError;
      }

      console.log('✅ AppraisalForm: Assigned questions loaded:', questions?.length || 0);
      return questions || [];
    },
    enabled: !!(appraisalQuery as any)?.employee_id && !!(appraisalQuery as any)?.cycle_id,
  });

useEffect(() => {
    if (appraisalQuery) {
      console.log('📋 AppraisalForm: Setting appraisal data from query');
      setAppraisalData(appraisalQuery as AppraisalData);
      setGoals(appraisalQuery?.goals || '');
      setTrainingNeeds(appraisalQuery?.training_needs || '');
      setNoteworthy(appraisalQuery?.noteworthy || '');
      setEmpComments(appraisalQuery?.emp_comments || '');
      setMgrComments(appraisalQuery?.mgr_comments || '');
    }
  }, [appraisalQuery]);

useEffect(() => {
    // Merge existing responses with placeholders for assigned questions so all assigned items are visible
    // Only return early if we don't have either data set - we need at least one to proceed
    if (!responsesQuery && !assignedQuestions) return;

    console.log('🧩 AppraisalForm: Merging responses...', {
      existingResponses: responsesQuery?.length || 0,
      assignedQuestions: assignedQuestions?.length || 0
    });

    const existingByQuestion = new Map(
      (responsesQuery || []).map((r: any) => [r.question_id, r])
    );

    const placeholders: AppraisalResponse[] = (assignedQuestions || [])
      .filter((q: any) => !existingByQuestion.has(q.id))
      .map((q: any) => ({
        question_id: q.id,
        emp_rating: null,
        mgr_rating: null,
        emp_comment: '',
        mgr_comment: '',
        question: {
          id: q.id,
          question_text: q.question_text,
          weight: q.weight,
          section_id: q.section_id,
          appraisal_question_sections: { name: q.appraisal_question_sections?.name || '' }
        }
      }));

    const merged = ([...(responsesQuery || []), ...placeholders]);
    console.log('🧩 AppraisalForm: Merged responses count:', merged.length);
    console.log('🧩 AppraisalForm: Existing responses:', responsesQuery?.length || 0);
    console.log('🧩 AppraisalForm: New placeholders:', placeholders.length);
    setResponses(merged);
  }, [responsesQuery, assignedQuestions]);

  const isEmployee = appraisalData?.employee_id === profile?.id;
  const isManagerReviewer = profile?.id && appraisalData?.employee?.line_manager_id === profile?.id && ['submitted','manager_review'].includes(appraisalData?.status || '');
  const isManagerReadOnly = ['committee_review', 'completed'].includes(appraisalData?.status || '');
  const isReadOnly = isEmployee ? (appraisalData?.status !== 'draft') : !isManagerReviewer;

  const updateResponseMutation = useMutation({
    mutationFn: async (updatedResponse: AppraisalResponse) => {
      if (!updatedResponse.id) {
        // If the response doesn't have an ID, it's a new response
        const { data, error } = await supabase
          .from('appraisal_responses')
          .insert([
            {
              appraisal_id: appraisalId,
              question_id: updatedResponse.question_id,
              emp_rating: updatedResponse.emp_rating,
              mgr_rating: updatedResponse.mgr_rating,
              emp_comment: updatedResponse.emp_comment,
              mgr_comment: updatedResponse.mgr_comment,
            },
          ])
          .select()
          .single();

        if (error) {
          console.error("Error creating appraisal response:", error);
          throw error;
        }

        return data as AppraisalResponse;
      } else {
        // If the response has an ID, it's an existing response
        const { data, error } = await supabase
          .from('appraisal_responses')
          .update({
            emp_rating: updatedResponse.emp_rating,
            mgr_rating: updatedResponse.mgr_rating,
            emp_comment: updatedResponse.emp_comment,
            mgr_comment: updatedResponse.mgr_comment,
          })
          .eq('id', updatedResponse.id)
          .select()
          .single();

        if (error) {
          console.error("Error updating appraisal response:", error);
          throw error;
        }

        return data as AppraisalResponse;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appraisal-responses', appraisalId] });
    },
    onError: (error) => {
      console.error("Error updating appraisal response:", error);
      toast({
        title: "Error",
        description: "Failed to update appraisal response. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleResponseChange = (responseId: string, field: string, value: any) => {
    setResponses((prevResponses) =>
      prevResponses.map((response) => {
        if (response.id === responseId || response.question_id === responseId) {
          return { ...response, [field]: value };
        }
        return response;
      })
    );
  };

  // Convert responses to values format for GroupedQuestionRenderer
  const getQuestionValues = () => {
    const values: Record<string, any> = {};
    responses.forEach((response) => {
      const questionId = response.question_id || response.id;
      if (questionId) {
        values[questionId] = {
          emp_rating: response.emp_rating,
          emp_comment: response.emp_comment,
          mgr_rating: response.mgr_rating,
          mgr_comment: response.mgr_comment
        };
      }
    });
    return values;
  };

  // Convert questions from responses for GroupedQuestionRenderer
  const getQuestionsFromResponses = () => {
    return responses
      .filter(response => response.question)
      .map(response => ({
        id: response.question!.id,
        question_text: response.question!.question_text,
        question_type: 'rating',
        is_required: true,
        section: response.question!.appraisal_question_sections
      }));
  };

  const handleQuestionChange = (questionId: string, value: any) => {
    // Find the response by question_id and update it
    setResponses((prevResponses) =>
      prevResponses.map((response) => {
        if (response.question_id === questionId) {
          return { ...response, ...value };
        }
        return response;
      })
    );
  };

  const handleSaveResponse = async (response: AppraisalResponse) => {
    if (isReadOnly) return;
    
    try {
      await updateResponseMutation.mutateAsync(response);
      toast({
        title: "Success",
        description: "Appraisal response saved successfully."
      });
    } catch (error) {
      console.error("Error saving appraisal response:", error);
      toast({
        title: "Error",
        description: "Failed to save appraisal response. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleInputChange = (field: string, value: string) => {
    switch (field) {
      case 'goals':
        setGoals(value);
        break;
      case 'training_needs':
        setTrainingNeeds(value);
        break;
      case 'noteworthy':
        setNoteworthy(value);
        break;
      case 'emp_comments':
        setEmpComments(value);
        break;
      case 'mgr_comments':
        setMgrComments(value);
        break;
      default:
        break;
    }
  };

  const saveResponses = async () => {
    if (!appraisalId) throw new Error("Appraisal ID is required");

    // Split into inserts vs updates while avoiding undefined IDs (which cause NOT NULL violations)
    const toInsert = responses
      .filter((r) => !r.id)
      .map((r) => ({
        appraisal_id: appraisalId,
        question_id: r.question_id,
        emp_rating: r.emp_rating,
        emp_comment: r.emp_comment,
        mgr_rating: r.mgr_rating,
        mgr_comment: r.mgr_comment,
      }));

    const toUpsert = responses
      .filter((r) => !!r.id)
      .map((r) => ({
        id: r.id as string,
        appraisal_id: appraisalId,
        question_id: r.question_id,
        emp_rating: r.emp_rating,
        emp_comment: r.emp_comment,
        mgr_rating: r.mgr_rating,
        mgr_comment: r.mgr_comment,
      }));

    if (toInsert.length === 0 && toUpsert.length === 0) return;

    // 1) Insert new responses
    if (toInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('appraisal_responses')
        .insert(toInsert)
        .select();

      if (insertError) {
        console.error('Error inserting responses:', insertError);
        throw insertError;
      }
    }

    // 2) Upsert existing responses by id
    if (toUpsert.length > 0) {
      const { error: upsertError } = await supabase
        .from('appraisal_responses')
        .upsert(toUpsert, { onConflict: 'id' })
        .select();

      if (upsertError) {
        console.error('Error upserting responses:', upsertError);
        throw upsertError;
      }
    }
  };

  const handleSaveChanges = async () => {
    if (isReadOnly) return;
    
    setIsSubmitting(true);
    try {
      if (!appraisalId) throw new Error("Appraisal ID is required");

      // 1) Persist responses
      await saveResponses();

      // 2) Update top-level fields
      const { error } = await supabase
        .from('appraisals')
        .update({
          goals: goals,
          training_needs: trainingNeeds,
          noteworthy: noteworthy,
          emp_comments: empComments,
          mgr_comments: mgrComments,
        })
        .eq('id', appraisalId);

      if (error) {
        console.error("Error updating appraisal:", error);
        throw error;
      }

      toast({
        title: "Success",
        description: "Changes saved successfully."
      });
    } catch (error) {
      console.error("Error saving changes:", error);
      toast({
        title: "Error",
        description: "Failed to save changes. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (isReadOnly) return;
    
    // Determine if this is a manager submission
    const isManagerSubmission = isManagerReviewer && appraisalData?.status === 'submitted';

    // Check manager lock for manager submissions
    if (isManagerSubmission && submissionSettings?.manager_submission_locked) {
      toast({
        title: "Manager Review Not Allowed",
        description: "Manager appraisal reviews are currently locked. Deadline has been met, please contact HR.",
        variant: "destructive"
      });
      return;
    }

    // Check staff lock for employee submissions (not applicable to managers submitting reviews)
    if (!isManagerSubmission && submissionSettings?.submission_locked) {
      toast({
        title: "Submission Not Allowed",
        description: "Appraisal submission is not allowed. Deadline has been met, please contact HR.",
        variant: "destructive"
      });
      return; // Exit early without submitting
    }
    
    setIsSubmitting(true);
    try {
      if (!appraisalId) throw new Error("Appraisal ID is required");

      // Ensure responses are saved before submission
      await saveResponses();

      let updateData: any;
      let successMessage: string;
      let navigationPath: string;

      if (isManagerSubmission) {
        // Manager submitting review to committee
        updateData = {
          status: 'committee_review' as any,
          manager_reviewed_at: new Date().toISOString(),
          manager_reviewed_by: profile?.id,
          goals: goals,
          training_needs: trainingNeeds,
          noteworthy: noteworthy,
          emp_comments: empComments,
          mgr_comments: mgrComments,
        };
        successMessage = "Manager review submitted to committee successfully.";
        navigationPath = '/manager-appraisals';

        // Notify HR about manager review completion
        try {
          await supabase.rpc('notify_hr_manager_review', {
            appraisal_id_param: appraisalId,
            manager_id_param: profile?.id
          });
        } catch (notificationError) {
          console.warn('Failed to send HR notification:', notificationError);
          // Don't fail the submission if notification fails
        }
      } else {
        // Employee submitting their appraisal
        updateData = {
          status: 'submitted' as any,
          employee_submitted_at: new Date().toISOString(),
          submitted_at: new Date().toISOString(),
          goals: goals,
          training_needs: trainingNeeds,
          noteworthy: noteworthy,
          emp_comments: empComments,
          mgr_comments: mgrComments,
        };
        successMessage = "Appraisal submitted successfully.";
        navigationPath = '/my-appraisals';

        // Notify line manager about employee submission
        try {
          await supabase.rpc('notify_line_manager_submission', {
            appraisal_id_param: appraisalId,
            employee_id_param: appraisalData?.employee_id
          });
        } catch (notificationError) {
          console.warn('Failed to send manager notification:', notificationError);
          // Don't fail the submission if notification fails
        }
      }

      const { error: submitError } = await supabase
        .from('appraisals')
        .update(updateData)
        .eq('id', appraisalId);

      if (submitError) {
        console.error("Error submitting appraisal:", submitError);
        throw submitError;
      }

      // Invalidate queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['appraisal', appraisalId] });
      queryClient.invalidateQueries({ queryKey: ['appraisal-responses', appraisalId] });
      queryClient.invalidateQueries({ queryKey: ['manager-team-appraisals'] });

      toast({
        title: "Success",
        description: successMessage
      });
      navigate(navigationPath);
    } catch (error) {
      console.error("Error submitting appraisal:", error);
      toast({
        title: "Error",
        description: "Failed to submit appraisal. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmSubmit = () => {
    setIsConfirmOpen(true);
  };

  const handleCancelSubmit = () => {
    setIsConfirmOpen(false);
  };

  if (isLoading || !appraisalQuery) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center space-y-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
          <span className="text-gray-600">Loading appraisal...</span>
        </div>
      </div>
    );
  }

  if (!appraisalData) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Appraisal Not Found</h3>
        <p className="text-gray-600 text-center mb-4">The requested appraisal could not be found.</p>
        <Button onClick={() => navigate('/my-appraisals')}>
          Return to My Appraisals
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Appraisal Details Header */}
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div className="flex items-center space-x-4">
              <div className="bg-blue-100 p-3 rounded-full">
                <div className="text-blue-600 text-lg font-semibold">
                  {appraisalData?.employee?.first_name} {appraisalData?.employee?.last_name}
                </div>
              </div>
              <div>
                <p className="text-gray-600 text-lg">{appraisalData?.employee?.position}</p>
                <p className="text-sm text-gray-500">
                  {appraisalData?.employee?.email} • {appraisalData?.employee?.department?.name}
                </p>
              </div>
            </div>
            <div className="text-right">
              <Badge className="bg-blue-100 text-blue-800 text-sm px-3 py-1">
                {appraisalData?.status}
              </Badge>
              <p className="text-sm text-gray-500 mt-2">
                {formatCycleName(appraisalData?.cycle)}
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Show read-only message if applicable */}
      {(isReadOnly || (isManagerReviewer && isManagerReadOnly)) && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="text-orange-800">
              <p className="font-medium">Read-Only Mode</p>
              <p className="text-sm">
                {isManagerReadOnly && isManagerReviewer
                  ? 'This appraisal has been submitted to committee and is now read-only for transparency.'
                  : appraisalData?.status !== 'draft' 
                    ? 'This appraisal has been submitted and cannot be edited.' 
                    : 'You can only view the details.'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {responses && responses.length > 0 && (
        <GroupedQuestionRenderer
          questions={getQuestionsFromResponses()}
          values={getQuestionValues()}
          onChange={handleQuestionChange}
          disabled={isReadOnly || (isManagerReviewer && isManagerReadOnly)}
          employeeName={`${appraisalData?.employee?.first_name} ${appraisalData?.employee?.last_name}`}
          hideRatingsForTextSections={false}
          mode={isManagerReviewer ? 'manager' : 'employee'}
        />
      )}

      {/* Additional Sections */}
      <Card>
        <CardHeader>
          <CardTitle>Additional Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="goals">Goals</Label>
              {(isReadOnly || isManagerReviewer) ? (
                <div className="p-2 bg-gray-100 rounded border min-h-[80px]">
                  {goals || 'No goals specified'}
                </div>
              ) : (
                <Textarea
                  id="goals"
                  placeholder="Enter your goals"
                  value={goals}
                  onChange={(e) => handleInputChange('goals', e.target.value)}
                />
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="training-needs">Training Needs</Label>
              {(isReadOnly || isManagerReviewer) ? (
                <div className="p-2 bg-gray-100 rounded border min-h-[80px]">
                  {trainingNeeds || 'No training needs specified'}
                </div>
              ) : (
                <Textarea
                  id="training-needs"
                  placeholder="Enter your training needs"
                  value={trainingNeeds}
                  onChange={(e) => handleInputChange('training_needs', e.target.value)}
                />
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="noteworthy">Noteworthy Achievements</Label>
            {(isReadOnly || isManagerReviewer) ? (
              <div className="p-2 bg-gray-100 rounded border min-h-[80px]">
                {noteworthy || 'No achievements noted'}
              </div>
            ) : (
              <Textarea
                id="noteworthy"
                placeholder="Enter any noteworthy achievements"
                value={noteworthy}
                onChange={(e) => handleInputChange('noteworthy', e.target.value)}
              />
            )}
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="employee-comments">Additional Comments</Label>
              {(isReadOnly || isManagerReviewer) ? (
                <div className="p-2 bg-gray-100 rounded border min-h-[80px]">
                  {empComments || 'No additional comments'}
                </div>
              ) : (
                <Textarea
                  id="employee-comments"
                  placeholder="Enter any additional comments"
                  value={empComments}
                  onChange={(e) => handleInputChange('emp_comments', e.target.value)}
                />
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="manager-comments">Manager Comments</Label>
              {(isManagerReviewer && !isManagerReadOnly) ? (
                <Textarea
                  id="manager-comments"
                  placeholder="Enter your manager comments"
                  value={mgrComments}
                  onChange={(e) => handleInputChange('mgr_comments', e.target.value)}
                />
              ) : (
                <div className="p-2 bg-gray-100 rounded border min-h-[80px]">
                  {mgrComments || 'No manager comments'}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons - only show if not read-only */}
      {!isReadOnly && !(isManagerReviewer && isManagerReadOnly) && (
        <div className="flex justify-between">
          <Button variant="outline" onClick={() => navigate('/my-appraisals')}>
            Cancel
          </Button>
          <div>
            <Button className="mr-2" onClick={handleSaveChanges} disabled={isSubmitting}>
              Save Changes
            </Button>
            <Button onClick={handleConfirmSubmit} disabled={isSubmitting}>
              {isManagerReviewer ? 'Submit to Committee' : 'Submit Appraisal'}
            </Button>
          </div>
        </div>
      )}

      {/* Confirm Submit Dialog */}
      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isManagerReviewer ? 'Submit to Committee?' : 'Are you sure you want to submit?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isManagerReviewer 
                ? 'This will submit your manager review to the committee. After submission, your responses will become read-only. Please ensure all information is correct.'
                : 'This action cannot be undone. Please ensure all information is correct before submitting.'
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelSubmit}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSubmit} disabled={isSubmitting}>
              {isManagerReviewer ? 'Submit to Committee' : 'Submit'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
