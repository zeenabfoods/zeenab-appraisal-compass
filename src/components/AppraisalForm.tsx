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
import { Save, Send, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { AutoQuestionAssignment } from '@/components/AutoQuestionAssignment';

interface Question {
  id: string;
  question_text: string;
  weight: number;
  section_id: string;
  is_required: boolean;
  question_type: string;
  section_name?: string;
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
  const [error, setError] = useState<string>('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [cycleId, employeeId]);

  const loadData = async () => {
    try {
      console.log('🔄 Starting data load for:', { cycleId, employeeId, mode });
      setLoading(true);
      setError('');

      // Step 1: Load sections first
      await loadSections();
      
      // Step 2: Load assigned questions for the employee
      await loadQuestions();
      
      // Step 3: Load existing appraisal and responses
      await loadExistingData();

      console.log('✅ All data loaded successfully');
    } catch (error: any) {
      console.error('❌ Error loading data:', error);
      setError(error.message || 'Failed to load appraisal data');
      toast({
        title: "Error Loading Data",
        description: error.message || 'Failed to load appraisal data',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadSections = async () => {
    console.log('📁 Loading sections...');
    const { data: sectionsData, error: sectionsError } = await supabase
      .from('appraisal_question_sections')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');

    if (sectionsError) {
      console.error('❌ Sections error:', sectionsError);
      throw new Error(`Failed to load sections: ${sectionsError.message}`);
    }
    
    console.log('✅ Sections loaded:', sectionsData?.length || 0);
    setSections(sectionsData || []);
  };

  const loadQuestions = async () => {
    console.log('📝 Loading assigned questions...');
    
    // Get assigned questions for this employee and cycle
    const { data: assignedQuestions, error: assignedError } = await supabase
      .from('employee_appraisal_questions')
      .select(`
        question_id,
        appraisal_questions!inner (
          id,
          question_text,
          question_type,
          weight,
          is_required,
          section_id,
          appraisal_question_sections (
            name
          )
        )
      `)
      .eq('employee_id', employeeId)
      .eq('cycle_id', cycleId)
      .eq('is_active', true);

    if (assignedError) {
      console.error('❌ Assigned questions error:', assignedError);
      throw new Error(`Failed to load questions: ${assignedError.message}`);
    }

    console.log('📊 Raw assigned questions:', assignedQuestions);

    if (!assignedQuestions || assignedQuestions.length === 0) {
      console.log('⚠️ No questions assigned');
      setQuestions([]);
      return;
    }

    // Process questions
    const processedQuestions: Question[] = assignedQuestions.map((item: any) => ({
      id: item.appraisal_questions.id,
      question_text: item.appraisal_questions.question_text,
      question_type: item.appraisal_questions.question_type,
      weight: item.appraisal_questions.weight,
      is_required: item.appraisal_questions.is_required,
      section_id: item.appraisal_questions.section_id,
      section_name: item.appraisal_questions.appraisal_question_sections?.name || 'General'
    }));

    console.log('✅ Questions processed:', processedQuestions.length);
    setQuestions(processedQuestions);
  };

  const loadExistingData = async () => {
    console.log('🔍 Loading existing appraisal data...');
    
    // Check for existing appraisal
    const { data: existingAppraisal, error: appraisalError } = await supabase
      .from('appraisals')
      .select('*')
      .eq('cycle_id', cycleId)
      .eq('employee_id', employeeId)
      .maybeSingle();

    if (appraisalError) {
      console.error('❌ Appraisal error:', appraisalError);
      throw new Error(`Failed to load appraisal: ${appraisalError.message}`);
    }

    console.log('📋 Existing appraisal:', existingAppraisal ? 'Found' : 'Not found');
    setAppraisalData(existingAppraisal);

    // Load existing responses if appraisal exists
    if (existingAppraisal) {
      const { data: responsesData, error: responsesError } = await supabase
        .from('appraisal_responses')
        .select('*')
        .eq('appraisal_id', existingAppraisal.id);

      if (responsesError) {
        console.error('❌ Responses error:', responsesError);
        // Don't throw - just log and continue with empty responses
      } else {
        const responsesMap: Record<string, AppraisalResponse> = {};
        responsesData?.forEach(response => {
          responsesMap[response.question_id] = response;
        });
        console.log('✅ Responses loaded:', Object.keys(responsesMap).length);
        setResponses(responsesMap);
      }
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
            status: submit ? (mode === 'employee' ? 'submitted' : 'manager_review') : 'draft',
            ...(submit && mode === 'employee' && { employee_submitted_at: new Date().toISOString() }),
            ...(submit && mode === 'manager' && { 
              manager_reviewed_at: new Date().toISOString(),
              manager_reviewed_by: profile.id 
            }),
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
          updateData.status = 'committee_review';
          updateData.manager_reviewed_at = new Date().toISOString();
          updateData.manager_reviewed_by = profile.id;
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
        description: submit ? (mode === 'employee' ? "Appraisal submitted successfully" : "Review completed successfully") : "Progress saved",
      });

      if (submit && onComplete) {
        onComplete();
      }
    } catch (error: any) {
      console.error('Error saving appraisal:', error);
      toast({
        title: "Error",
        description: `Failed to save appraisal: ${error.message}`,
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
        <span className="ml-2">Loading appraisal data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-red-600">
            <AlertCircle className="h-5 w-5 mr-2" />
            Error Loading Appraisal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="flex space-x-2">
            <Button onClick={() => loadData()} variant="outline">
              Try Again
            </Button>
            <Button onClick={() => window.location.reload()} variant="outline">
              Refresh Page
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="space-y-6">
        <AutoQuestionAssignment 
          employeeId={employeeId} 
          cycleId={cycleId}
          onAssignmentComplete={() => {
            console.log('Questions assigned, reloading data...');
            loadData();
          }}
        />
        <Card>
          <CardHeader>
            <CardTitle>No Questions Assigned</CardTitle>
            <CardDescription>
              No appraisal questions have been assigned for this cycle yet.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Questions are being automatically assigned. Please wait a moment...
            </p>
            <div className="flex space-x-2">
              <Button onClick={() => loadData()} variant="outline" disabled={loading}>
                {loading ? 'Loading...' : 'Refresh Data'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isReadOnly = mode === 'hr' || (appraisalData?.status === 'completed');
  const completionPercentage = getCompletionPercentage();

  // Group questions by section
  const questionsBySection = questions.reduce((acc, question) => {
    const sectionName = question.section_name || 'General';
    if (!acc[sectionName]) {
      acc[sectionName] = [];
    }
    acc[sectionName].push(question);
    return acc;
  }, {} as Record<string, Question[]>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>
                {mode === 'manager' ? 'Manager Review' : 'Performance Appraisal'}
              </CardTitle>
              <CardDescription>
                {mode === 'manager' 
                  ? 'Review and evaluate your team member\'s performance' 
                  : 'Complete your performance evaluation for this cycle'
                }
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
      {Object.entries(questionsBySection).map(([sectionName, sectionQuestions]) => (
        <Card key={sectionName}>
          <CardHeader>
            <CardTitle className="text-lg">{sectionName}</CardTitle>
            <CardDescription>
              {sectionQuestions.length} question{sectionQuestions.length !== 1 ? 's' : ''} in this section
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {sectionQuestions.map((question, index) => {
              const response = responses[question.id] || {} as AppraisalResponse;
              const currentRating = mode === 'employee' ? response.emp_rating : response.mgr_rating;
              const currentComment = mode === 'employee' ? response.emp_comment : response.mgr_comment;

              return (
                <div key={question.id} className="space-y-4">
                  <div className="flex justify-between items-start">
                    <h4 className="font-medium text-gray-900">
                      {index + 1}. {question.question_text}
                    </h4>
                    <div className="flex items-center space-x-2">
                      {question.is_required && (
                        <Badge variant="outline" className="text-xs">Required</Badge>
                      )}
                      <Badge variant="secondary" className="text-xs">
                        Weight: {question.weight}
                      </Badge>
                    </div>
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

                  {mode === 'employee' && response.mgr_rating && (
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <p className="text-sm font-medium text-blue-700">Manager Assessment:</p>
                      <p className="text-sm">Rating: {response.mgr_rating}/5</p>
                      {response.mgr_comment && (
                        <p className="text-sm mt-1">"{response.mgr_comment}"</p>
                      )}
                    </div>
                  )}

                  {index < sectionQuestions.length - 1 && <Separator />}
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}

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
            {mode === 'employee' ? 'Submit Appraisal' : 'Complete Review'}
          </Button>
        </div>
      )}
    </div>
  );
}
