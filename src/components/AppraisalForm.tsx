
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
    if (responsesQuery) {
      console.log('📋 AppraisalForm: Setting responses from query');
      setResponses(responsesQuery);
    }
  }, [responsesQuery]);

  // Check if the appraisal is in read-only mode
  const isReadOnly = appraisalData?.status !== 'draft' || appraisalData?.employee_id !== profile?.id;

  console.log('🔒 AppraisalForm: Read-only mode:', isReadOnly, 'Status:', appraisalData?.status, 'Employee matches profile:', appraisalData?.employee_id === profile?.id);

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
        if (response.id === responseId) {
          return { ...response, [field]: value };
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

  const handleSaveChanges = async () => {
    if (isReadOnly) return;
    
    setIsSubmitting(true);
    try {
      if (!appraisalId) throw new Error("Appraisal ID is required");

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
        description: "Appraisal saved successfully."
      });
    } catch (error) {
      console.error("Error updating appraisal:", error);
      toast({
        title: "Error",
        description: "Failed to save appraisal. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (isReadOnly) return;
    
    setIsSubmitting(true);
    try {
      if (!appraisalId) throw new Error("Appraisal ID is required");

      // Submit the appraisal
      const { error: submitError } = await supabase
        .from('appraisals')
        .update({
          status: 'submitted' as any, // Type assertion to fix the TypeScript error
          employee_submitted_at: new Date().toISOString(),
          submitted_at: new Date().toISOString()
        })
        .eq('id', appraisalId);

      if (submitError) {
        console.error("Error submitting appraisal:", submitError);
        throw submitError;
      }

      toast({
        title: "Success",
        description: "Appraisal submitted successfully."
      });
      navigate('/my-appraisals');
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
      {isReadOnly && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="text-orange-800">
              <p className="font-medium">Read-Only Mode</p>
              <p className="text-sm">
                This appraisal is in read-only mode. 
                {appraisalData?.status !== 'draft' 
                  ? ' It has been submitted and cannot be edited.' 
                  : ' You can only view the details.'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Appraisal Form */}
      <div className="grid md:grid-cols-2 gap-6">
        {responses?.map((response) => (
          <Card key={response.id || generateId()}>
            <CardHeader>
              <CardTitle>{response.question?.question_text}</CardTitle>
              <p className="text-sm text-gray-500">
                Section: {response.question?.appraisal_question_sections?.name}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor={`employee-rating-${response.id}`}>Your Rating</Label>
                {isReadOnly ? (
                  <div className="p-2 bg-gray-100 rounded border">
                    {response.emp_rating 
                      ? `${response.emp_rating} - ${['Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][response.emp_rating - 1]}`
                      : 'Not Rated'
                    }
                  </div>
                ) : (
                  <Select
                    value={response.emp_rating !== null ? response.emp_rating.toString() : ''}
                    onValueChange={(value) =>
                      handleResponseChange(response.id || '', 'emp_rating', parseInt(value))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a rating" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 - Poor</SelectItem>
                      <SelectItem value="2">2 - Fair</SelectItem>
                      <SelectItem value="3">3 - Good</SelectItem>
                      <SelectItem value="4">4 - Very Good</SelectItem>
                      <SelectItem value="5">5 - Excellent</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor={`employee-comment-${response.id}`}>Your Comment</Label>
                {isReadOnly ? (
                  <div className="p-2 bg-gray-100 rounded border min-h-[80px]">
                    {response.emp_comment || 'No comment provided'}
                  </div>
                ) : (
                  <Textarea
                    id={`employee-comment-${response.id}`}
                    placeholder="Enter your comment"
                    value={response.emp_comment || ''}
                    onChange={(e) =>
                      handleResponseChange(response.id || '', 'emp_comment', e.target.value)
                    }
                  />
                )}
              </div>
              {!isReadOnly && (
                <Button onClick={() => handleSaveResponse(response)} disabled={isSubmitting}>
                  Save Response
                </Button>
              )}

              {/* Show manager ratings if available */}
              {response.mgr_rating && (
                <div className="pt-4 border-t">
                  <div className="space-y-2">
                    <Label>Manager Rating</Label>
                    <div className="p-2 bg-blue-50 rounded border">
                      {response.mgr_rating} - {['Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][response.mgr_rating - 1]}
                    </div>
                  </div>
                  {response.mgr_comment && (
                    <div className="space-y-2 mt-2">
                      <Label>Manager Comment</Label>
                      <div className="p-2 bg-blue-50 rounded border">
                        {response.mgr_comment}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Additional Sections */}
      <Card>
        <CardHeader>
          <CardTitle>Additional Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="goals">Goals</Label>
              {isReadOnly ? (
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
              {isReadOnly ? (
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
            {isReadOnly ? (
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
              {isReadOnly ? (
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
              <div className="p-2 bg-gray-100 rounded border min-h-[80px]">
                {mgrComments || 'No manager comments'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons - only show if not read-only */}
      {!isReadOnly && (
        <div className="flex justify-between">
          <Button variant="outline" onClick={() => navigate('/my-appraisals')}>
            Cancel
          </Button>
          <div>
            <Button className="mr-2" onClick={handleSaveChanges} disabled={isSubmitting}>
              Save Changes
            </Button>
            <Button onClick={handleConfirmSubmit} disabled={isSubmitting}>
              Submit Appraisal
            </Button>
          </div>
        </div>
      )}

      {/* Confirm Submit Dialog */}
      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to submit?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Please ensure all information is correct
              before submitting.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelSubmit}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSubmit} disabled={isSubmitting}>
              Submit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
