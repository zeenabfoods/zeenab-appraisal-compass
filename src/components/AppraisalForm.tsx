
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Save, Send, Clock, CheckCircle } from 'lucide-react';

interface Question {
  id: string;
  question_text: string;
  weight: number;
  section_id: string;
  is_required: boolean;
  question_type: string;
}

interface Section {
  id: string;
  name: string;
  description: string;
  max_score: number;
  weight: number;
  sort_order: number;
}

interface AppraisalResponse {
  question_id: string;
  emp_rating?: number;
  emp_comment?: string;
  mgr_rating?: number;
  mgr_comment?: string;
}

interface AppraisalFormProps {
  cycleId: string;
  employeeId: string;
  mode: 'employee' | 'manager' | 'hr';
  onComplete?: () => void;
}

export function AppraisalForm({ cycleId, employeeId, mode, onComplete }: AppraisalFormProps) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [sections, setSections] = useState<Section[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [responses, setResponses] = useState<Record<string, AppraisalResponse>>({});
  const [appraisalData, setAppraisalData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadAppraisalData();
  }, [cycleId, employeeId]);

  const loadAppraisalData = async () => {
    try {
      // Load sections
      const { data: sectionsData, error: sectionsError } = await supabase
        .from('appraisal_question_sections')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (sectionsError) throw sectionsError;
      setSections(sectionsData || []);

      // Load questions for the cycle
      const { data: questionsData, error: questionsError } = await supabase
        .from('appraisal_questions')
        .select('*')
        .eq('cycle_id', cycleId)
        .eq('is_active', true)
        .order('sort_order');

      if (questionsError) throw questionsError;
      setQuestions(questionsData || []);

      // Load existing appraisal and responses
      const { data: appraisalData, error: appraisalError } = await supabase
        .from('appraisals')
        .select('*')
        .eq('cycle_id', cycleId)
        .eq('employee_id', employeeId)
        .single();

      if (appraisalError && appraisalError.code !== 'PGRST116') {
        throw appraisalError;
      }

      setAppraisalData(appraisalData);

      if (appraisalData) {
        // Load existing responses
        const { data: responsesData, error: responsesError } = await supabase
          .from('appraisal_responses')
          .select('*')
          .eq('appraisal_id', appraisalData.id);

        if (responsesError) throw responsesError;

        const responsesMap: Record<string, AppraisalResponse> = {};
        responsesData?.forEach(response => {
          responsesMap[response.question_id] = response;
        });
        setResponses(responsesMap);
      }
    } catch (error) {
      console.error('Error loading appraisal data:', error);
      toast({
        title: "Error",
        description: "Failed to load appraisal data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRatingChange = (questionId: string, rating: number) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        question_id: questionId,
        [mode === 'employee' ? 'emp_rating' : 'mgr_rating']: rating,
      }
    }));
  };

  const handleCommentChange = (questionId: string, comment: string) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        question_id: questionId,
        [mode === 'employee' ? 'emp_comment' : 'mgr_comment']: comment,
      }
    }));
  };

  const saveAppraisal = async (submit = false) => {
    if (!profile) return;
    
    setSaving(true);
    try {
      let appraisalId = appraisalData?.id;

      // Create appraisal if it doesn't exist
      if (!appraisalId) {
        const { data: newAppraisal, error: appraisalError } = await supabase
          .from('appraisals')
          .insert({
            employee_id: employeeId,
            cycle_id: cycleId,
            manager_id: mode === 'manager' ? profile.id : null,
            status: submit ? 'submitted' : 'draft',
            ...(submit && mode === 'employee' && { employee_submitted_at: new Date().toISOString() }),
            ...(submit && mode === 'manager' && { manager_reviewed_at: new Date().toISOString() }),
          })
          .select()
          .single();

        if (appraisalError) throw appraisalError;
        appraisalId = newAppraisal.id;
        setAppraisalData(newAppraisal);
      } else if (submit) {
        // Update appraisal status
        const updateData: any = {};
        if (mode === 'employee') {
          updateData.status = 'submitted';
          updateData.employee_submitted_at = new Date().toISOString();
        } else if (mode === 'manager') {
          updateData.status = 'manager_review';
          updateData.manager_reviewed_at = new Date().toISOString();
        }

        const { error: updateError } = await supabase
          .from('appraisals')
          .update(updateData)
          .eq('id', appraisalId);

        if (updateError) throw updateError;
      }

      // Save responses
      const responsesToSave = Object.values(responses).map(response => ({
        ...response,
        appraisal_id: appraisalId,
        cycle_id: cycleId,
        employee_id: employeeId,
        manager_id: mode === 'manager' ? profile.id : null,
        status: submit ? (mode === 'employee' ? 'employee_submitted' : 'manager_reviewed') : 'pending',
        ...(submit && mode === 'employee' && { employee_submitted_at: new Date().toISOString() }),
        ...(submit && mode === 'manager' && { manager_reviewed_at: new Date().toISOString() }),
      }));

      for (const response of responsesToSave) {
        const { error } = await supabase
          .from('appraisal_responses')
          .upsert(response, {
            onConflict: 'appraisal_id,question_id'
          });
        
        if (error) throw error;
      }

      toast({
        title: "Success",
        description: submit ? "Appraisal submitted successfully" : "Progress saved",
      });

      if (submit && onComplete) {
        onComplete();
      }
    } catch (error) {
      console.error('Error saving appraisal:', error);
      toast({
        title: "Error",
        description: "Failed to save appraisal",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const getCompletionPercentage = () => {
    const requiredQuestions = questions.filter(q => q.is_required);
    const completedQuestions = requiredQuestions.filter(q => {
      const response = responses[q.id];
      const hasRating = mode === 'employee' ? response?.emp_rating : response?.mgr_rating;
      return hasRating && hasRating > 0;
    });
    return requiredQuestions.length > 0 ? (completedQuestions.length / requiredQuestions.length) * 100 : 0;
  };

  const canSubmit = () => {
    return getCompletionPercentage() === 100;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const isReadOnly = mode === 'hr' || (appraisalData?.status === 'completed');
  const completionPercentage = getCompletionPercentage();

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Performance Appraisal</CardTitle>
              <CardDescription>
                Complete your performance evaluation for this cycle
              </CardDescription>
            </div>
            <div className="text-right">
              <Badge variant={appraisalData?.status === 'completed' ? 'default' : 'secondary'}>
                {appraisalData?.status || 'Draft'}
              </Badge>
              {!isReadOnly && (
                <div className="mt-2">
                  <Progress value={completionPercentage} className="w-32" />
                  <p className="text-xs text-gray-500 mt-1">{Math.round(completionPercentage)}% Complete</p>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Questions by Section */}
      {sections.map(section => {
        const sectionQuestions = questions.filter(q => q.section_id === section.id);
        if (sectionQuestions.length === 0) return null;

        return (
          <Card key={section.id}>
            <CardHeader>
              <CardTitle className="text-lg">{section.name}</CardTitle>
              {section.description && (
                <CardDescription>{section.description}</CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-6">
              {sectionQuestions.map((question, index) => {
                const response = responses[question.id] || {};
                const currentRating = mode === 'employee' ? response.emp_rating : response.mgr_rating;
                const currentComment = mode === 'employee' ? response.emp_comment : response.mgr_comment;

                return (
                  <div key={question.id} className="space-y-4">
                    <div className="flex justify-between items-start">
                      <h4 className="font-medium text-gray-900">
                        {index + 1}. {question.question_text}
                      </h4>
                      {question.is_required && (
                        <Badge variant="outline" className="text-xs">Required</Badge>
                      )}
                    </div>

                    {/* Rating */}
                    <div className="space-y-2">
                      <Label>Rating (1-5 scale)</Label>
                      <RadioGroup
                        value={currentRating?.toString() || ''}
                        onValueChange={(value) => handleRatingChange(question.id, parseInt(value))}
                        className="flex space-x-4"
                        disabled={isReadOnly}
                      >
                        {[1, 2, 3, 4, 5].map(rating => (
                          <div key={rating} className="flex items-center space-x-2">
                            <RadioGroupItem value={rating.toString()} id={`${question.id}-${rating}`} />
                            <Label htmlFor={`${question.id}-${rating}`}>{rating}</Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </div>

                    {/* Comment */}
                    <div className="space-y-2">
                      <Label>Comments</Label>
                      <Textarea
                        placeholder="Add your comments..."
                        value={currentComment || ''}
                        onChange={(e) => handleCommentChange(question.id, e.target.value)}
                        disabled={isReadOnly}
                        rows={3}
                      />
                    </div>

                    {/* Show other person's feedback if available */}
                    {mode === 'manager' && response.emp_rating && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-sm font-medium text-gray-700">Employee Self-Assessment:</p>
                        <p className="text-sm">Rating: {response.emp_rating}/5</p>
                        {response.emp_comment && (
                          <p className="text-sm mt-1">"{response.emp_comment}"</p>
                        )}
                      </div>
                    )}

                    {index < sectionQuestions.length - 1 && <Separator />}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        );
      })}

      {/* Action Buttons */}
      {!isReadOnly && (
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => saveAppraisal(false)}
            disabled={saving}
          >
            <Save className="h-4 w-4 mr-2" />
            Save Progress
          </Button>
          
          <Button
            onClick={() => saveAppraisal(true)}
            disabled={saving || !canSubmit()}
          >
            <Send className="h-4 w-4 mr-2" />
            Submit Appraisal
          </Button>
        </div>
      )}
    </div>
  );
}
