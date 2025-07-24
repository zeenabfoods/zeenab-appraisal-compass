
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { AppraisalQuestionRenderer } from './AppraisalQuestionRenderer';
import { AppraisalFormHeader } from './AppraisalFormHeader';
import { GroupedQuestionRenderer } from './GroupedQuestionRenderer';

interface Appraisal {
  id: string;
  employee_id: string;
  cycle_id: string;
  status: string;
  goals: string | null;
  training_needs: string | null;
  noteworthy: string | null;
  emp_comments: string | null;
  mgr_comments: string | null;
}

interface Question {
  id: string;
  question_text: string;
  section_id: string;
  question_type: string;
  weight: number;
  is_required: boolean;
  is_active: boolean;
  sort_order: number;
  multiple_choice_options?: string[];
}

interface Response {
  id: string;
  question_id: string;
  appraisal_id: string;
  emp_response: string | null;
  mgr_response: string | null;
  committee_response: string | null;
  emp_rating: number | null;
  mgr_rating: number | null;
  committee_rating: number | null;
}

interface AppraisalFormProps {
  appraisalId?: string;
}

export function AppraisalForm({ appraisalId }: AppraisalFormProps) {
  const { appraisalId: paramAppraisalId } = useParams<{ appraisalId: string }>();
  const finalAppraisalId = appraisalId || paramAppraisalId;
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { toast } = useToast();

  const [appraisal, setAppraisal] = useState<Appraisal | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [responses, setResponses] = useState<Response[]>([]);
  const [employeeName, setEmployeeName] = useState<string>('');
  const [cycleName, setCycleName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchAppraisalData = async () => {
      try {
        setLoading(true);

        // Fetch appraisal
        const { data: appraisalData, error: appraisalError } = await supabase
          .from('appraisals')
          .select('*')
          .eq('id', finalAppraisalId)
          .single();

        if (appraisalError) throw appraisalError;
        setAppraisal(appraisalData);

        // Fetch employee name
        const { data: employeeData, error: employeeError } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', appraisalData.employee_id)
          .single();

        if (employeeError) throw employeeError;
        setEmployeeName(`${employeeData.first_name} ${employeeData.last_name}`);

        // Fetch cycle name
         const { data: cycleData, error: cycleError } = await supabase
          .from('appraisal_cycles')
          .select('name')
          .eq('id', appraisalData.cycle_id)
          .single();

        if (cycleError) throw cycleError;
        setCycleName(cycleData.name);

        // Fetch questions
        const { data: questionData, error: questionError } = await supabase
          .from('appraisal_questions')
          .select('*')
          .eq('is_active', true)
          .order('sort_order');

        if (questionError) throw questionError;
        setQuestions(questionData);

        // Fetch responses
        const { data: responseData, error: responseError } = await supabase
          .from('appraisal_responses')
          .select('*')
          .eq('appraisal_id', finalAppraisalId)
          .order('created_at');

        if (responseError) throw responseError;
        
        // Transform the response data to match our Response interface
        const transformedResponses: Response[] = (responseData || []).map(item => ({
          id: item.id,
          question_id: item.question_id,
          appraisal_id: item.appraisal_id,
          emp_response: item.emp_comment || null,
          mgr_response: item.mgr_comment || null,
          committee_response: item.committee_comment || null,
          emp_rating: item.emp_rating || null,
          mgr_rating: item.mgr_rating || null,
          committee_rating: item.committee_rating || null,
        }));

        setResponses(transformedResponses);

      } catch (error) {
        console.error('Error fetching appraisal data:', error);
        toast({
          title: "Error",
          description: "Failed to load appraisal data",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    if (finalAppraisalId) {
      fetchAppraisalData();
    }
  }, [finalAppraisalId, toast]);

  const canEdit = profile?.id === appraisal?.employee_id && appraisal?.status === 'draft';

  const handleResponseChange = (questionId: string, value: any) => {
    setResponses(prevResponses => {
      const existingResponseIndex = prevResponses.findIndex(r => r.question_id === questionId);

      if (existingResponseIndex !== -1) {
        // Update existing response
        const updatedResponses = [...prevResponses];
        updatedResponses[existingResponseIndex] = {
          ...updatedResponses[existingResponseIndex],
          emp_response: value,
        };
        return updatedResponses;
      } else {
        // Create new response
        const newResponse: Response = {
          id: '', // This will be generated by the database
          question_id: questionId,
          appraisal_id: finalAppraisalId || '',
          emp_response: value,
          mgr_response: null,
          committee_response: null,
          emp_rating: null,
          mgr_rating: null,
          committee_rating: null,
        };
        return [...prevResponses, newResponse];
      }
    });
  };

  const handleAdditionalInfoChange = (field: string, value: string) => {
    setAppraisal(prevAppraisal => {
      if (!prevAppraisal) return prevAppraisal;
      return {
        ...prevAppraisal,
        [field]: value,
      };
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Update appraisal
      const { error: appraisalError } = await supabase
        .from('appraisals')
        .update({
          goals: appraisal?.goals,
          training_needs: appraisal?.training_needs,
          noteworthy: appraisal?.noteworthy,
          emp_comments: appraisal?.emp_comments,
        })
        .eq('id', finalAppraisalId);

      if (appraisalError) throw appraisalError;

      // Upsert responses
      for (const response of responses) {
        const { error: responseError } = await supabase
          .from('appraisal_responses')
          .upsert({
            id: response.id || undefined,
            question_id: response.question_id,
            appraisal_id: finalAppraisalId,
            emp_comment: response.emp_response,
            emp_rating: response.emp_rating,
          }, { onConflict: 'question_id,appraisal_id' });

        if (responseError) {
          console.error('Error upserting response:', responseError);
          throw responseError;
        }
      }

      toast({
        title: "Success",
        description: "Appraisal saved successfully"
      });
    } catch (error) {
      console.error('Error saving appraisal:', error);
      toast({
        title: "Error",
        description: "Failed to save appraisal",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    try {
      setSaving(true);

      // Update appraisal status to 'submitted'
      const { error: appraisalError } = await supabase
        .from('appraisals')
        .update({ status: 'submitted' })
        .eq('id', finalAppraisalId);

      if (appraisalError) throw appraisalError;

      // Save data
      await handleSave();

      toast({
        title: "Success",
        description: "Appraisal submitted successfully"
      });

      navigate('/my-appraisals');
    } catch (error) {
      console.error('Error submitting appraisal:', error);
      toast({
        title: "Error",
        description: "Failed to submit appraisal",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    if (!appraisal) {
      return (
        <div className="text-center p-8">
          <p className="text-gray-600">Appraisal not found</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <AppraisalFormHeader
          appraisalId={appraisal.id}
          employeeName={employeeName}
          cycleName={cycleName}
          status={appraisal.status}
        />

        {/* Questions Section */}
        <Card>
          <CardHeader>
            <CardTitle>Appraisal Questions</CardTitle>
          </CardHeader>
          <CardContent>
            <GroupedQuestionRenderer
              questions={questions}
              onResponseChange={handleResponseChange}
              readonly={!canEdit}
              showEmployeeInfo={false}
            />
          </CardContent>
        </Card>

        {/* Additional Information Section */}
        <Card>
          <CardHeader>
            <CardTitle>Additional Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Goals
                </label>
                <Textarea
                  value={appraisal.goals || ''}
                  onChange={(e) => handleAdditionalInfoChange('goals', e.target.value)}
                  placeholder="Enter your goals"
                  disabled={!canEdit}
                  rows={4}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Training Needs
                </label>
                <Textarea
                  value={appraisal.training_needs || ''}
                  onChange={(e) => handleAdditionalInfoChange('training_needs', e.target.value)}
                  placeholder="Enter your training needs"
                  disabled={!canEdit}
                  rows={4}
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Noteworthy Achievements
              </label>
              <Textarea
                value={appraisal.noteworthy || ''}
                onChange={(e) => handleAdditionalInfoChange('noteworthy', e.target.value)}
                placeholder="Enter any noteworthy achievements"
                disabled={!canEdit}
                rows={4}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Comments
                </label>
                <Textarea
                  value={appraisal.emp_comments || ''}
                  onChange={(e) => handleAdditionalInfoChange('emp_comments', e.target.value)}
                  placeholder="Enter any additional comments"
                  disabled={!canEdit}
                  rows={4}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Manager Comments
                </label>
                <Textarea
                  value={appraisal.mgr_comments || ''}
                  placeholder="Manager comment will appear here..."
                  disabled={true}
                  rows={4}
                  className="bg-gray-50"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        {canEdit && (
          <div className="flex justify-end space-x-4">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {saving ? 'Saving...' : 'Save Draft'}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={saving}
              className="bg-green-600 hover:bg-green-700"
            >
              {saving ? 'Submitting...' : 'Submit for Review'}
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      {renderContent()}
    </div>
  );
}
