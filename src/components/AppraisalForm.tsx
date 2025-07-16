
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
import { Save, Send, Clock, CheckCircle, AlertCircle, Lock, Eye } from 'lucide-react';
import { useAppraisalQuestions } from '@/hooks/useAppraisalQuestions';

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
  console.log('🚀 AppraisalForm component rendered with props:', { cycleId, employeeId, mode });
  
  const { profile } = useAuth();
  const { toast } = useToast();
  const [sections, setSections] = useState<Section[]>([]);
  const [responses, setResponses] = useState<Record<string, AppraisalResponse>>({});
  const [appraisalData, setAppraisalData] = useState<any>(null);
  const [sectionsLoading, setSectionsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submissionAttempted, setSubmissionAttempted] = useState(false);

  // Use the dedicated hook for question loading
  const { 
    questions, 
    loading: questionsLoading, 
    error: questionsError, 
    refetch: refetchQuestions,
    autoAssignQuestions 
  } = useAppraisalQuestions(employeeId, cycleId);

  useEffect(() => {
    console.log('🔄 AppraisalForm: useEffect triggered with:', { cycleId, employeeId });
    if (cycleId && employeeId) {
      loadSectionsAndAppraisalData();
    }
  }, [cycleId, employeeId]);

  const loadSectionsAndAppraisalData = async () => {
    try {
      console.log('🔄 AppraisalForm: Loading sections and appraisal data');
      setSectionsLoading(true);

      // Load sections
      const { data: sectionsData, error: sectionsError } = await supabase
        .from('appraisal_question_sections')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (sectionsError) {
        console.error('❌ AppraisalForm: Sections error:', sectionsError);
        throw new Error(`Failed to load sections: ${sectionsError.message}`);
      }
      
      console.log('✅ AppraisalForm: Sections loaded:', sectionsData?.length || 0);
      setSections(sectionsData || []);

      // Load existing appraisal and responses
      await loadExistingData();

    } catch (error: any) {
      console.error('❌ AppraisalForm: Error loading data:', error);
      toast({
        title: "Error Loading Data",
        description: error.message || 'Failed to load appraisal data',
        variant: "destructive",
      });
    } finally {
      setSectionsLoading(false);
    }
  };

  const loadExistingData = async () => {
    console.log('🔍 AppraisalForm: Loading existing appraisal data...');
    
    // Check for existing appraisal
    const { data: existingAppraisal, error: appraisalError } = await supabase
      .from('appraisals')
      .select('*')
      .eq('cycle_id', cycleId)
      .eq('employee_id', employeeId)
      .maybeSingle();

    if (appraisalError) {
      console.error('❌ AppraisalForm: Appraisal error:', appraisalError);
      throw new Error(`Failed to load appraisal: ${appraisalError.message}`);
    }

    console.log('📋 AppraisalForm: Existing appraisal:', existingAppraisal ? 'Found' : 'Not found');
    console.log('🔍 Workflow Debug - Current Status:', { 
      currentStatus: existingAppraisal?.status, 
      mode,
      isReadOnly: isReadOnlyMode(),
      visibleToCommittee: existingAppraisal?.status === 'committee_review'
    });
    
    setAppraisalData(existingAppraisal);

    // Load existing responses if appraisal exists
    if (existingAppraisal) {
      const { data: responsesData, error: responsesError } = await supabase
        .from('appraisal_responses')
        .select('*')
        .eq('appraisal_id', existingAppraisal.id);

      if (responsesError) {
        console.error('❌ AppraisalForm: Responses error:', responsesError);
      } else {
        const responsesMap: Record<string, AppraisalResponse> = {};
        responsesData?.forEach(response => {
          responsesMap[response.question_id] = response;
        });
        console.log('✅ AppraisalForm: Responses loaded:', Object.keys(responsesMap).length);
        setResponses(responsesMap);
      }
    }
  };

  // Determine if form is in read-only mode
  const isReadOnlyMode = () => {
    if (mode === 'hr') return true;
    if (!appraisalData) return false;
    
    if (mode === 'employee') {
      // Employees can't edit after submission
      const restrictedStatuses = ['submitted', 'manager_review', 'committee_review', 'completed'];
      return restrictedStatuses.includes(appraisalData.status);
    } else if (mode === 'manager') {
      // Managers can't edit once it moves to committee or is completed
      // Also can't edit if it's still in draft (employee hasn't submitted yet)
      const restrictedStatuses = ['committee_review', 'completed'];
      return restrictedStatuses.includes(appraisalData.status) || appraisalData.status === 'draft';
    }
    
    return false;
  };

  // Get read-only reason for display
  const getReadOnlyReason = () => {
    if (mode === 'hr') return 'HR Review Mode - View Only';
    if (!appraisalData) return '';
    
    if (mode === 'employee') {
      switch (appraisalData.status) {
        case 'submitted': return 'Appraisal has been submitted and is under manager review';
        case 'manager_review': return 'Appraisal is currently under manager review';
        case 'committee_review': return 'Appraisal is under committee review';
        case 'completed': return 'Appraisal has been completed';
        default: return '';
      }
    } else if (mode === 'manager') {
      switch (appraisalData.status) {
        case 'draft': return 'Employee has not submitted their self-assessment yet';
        case 'committee_review': return 'Appraisal is under committee review';
        case 'completed': return 'Appraisal has been completed';
        default: return '';
      }
    }
    
    return '';
  };

  const handleRatingChange = (questionId: string, rating: number) => {
    if (isReadOnlyMode()) {
      toast({
        title: "Cannot Edit",
        description: getReadOnlyReason(),
        variant: "destructive",
      });
      return;
    }

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
    if (isReadOnlyMode()) {
      toast({
        title: "Cannot Edit",
        description: getReadOnlyReason(),
        variant: "destructive",
      });
      return;
    }

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
    
    // Prevent multiple rapid submissions
    if (submit && submissionAttempted) {
      toast({
        title: "Submission in Progress",
        description: "Please wait for the current submission to complete.",
        variant: "destructive",
      });
      return;
    }

    if (submit) {
      setSubmissionAttempted(true);
    }
    
    setSaving(true);
    try {
      let appraisalId = appraisalData?.id;

      // Create appraisal if it doesn't exist
      if (!appraisalId) {
        let newStatus = 'draft';
        if (submit) {
          newStatus = mode === 'employee' ? 'submitted' : 'committee_review'; // Manager goes directly to committee
        }

        console.log('🔄 Creating new appraisal with status:', newStatus);

        const { data: newAppraisal, error: appraisalError } = await supabase
          .from('appraisals')
          .insert({
            employee_id: employeeId,
            cycle_id: cycleId,
            manager_id: mode === 'manager' ? profile.id : null,
            status: newStatus,
            ...(submit && mode === 'employee' && { employee_submitted_at: new Date().toISOString() }),
            ...(submit && mode === 'manager' && { 
              manager_reviewed_at: new Date().toISOString(),
              manager_reviewed_by: profile.id 
            }),
          })
          .select()
          .single();

        if (appraisalError) {
          // Check if this is a submission lock error
          if (submit && appraisalError.message.includes('row-level security')) {
            throw new Error('This appraisal has already been submitted and cannot be modified.');
          }
          throw appraisalError;
        }
        appraisalId = newAppraisal.id;
        setAppraisalData(newAppraisal);
      } else if (submit) {
        // Update appraisal status
        const updateData: any = {};
        if (mode === 'employee') {
          updateData.status = 'submitted';
          updateData.employee_submitted_at = new Date().toISOString();
        } else if (mode === 'manager') {
          updateData.status = 'committee_review'; // Skip HR, go directly to committee
          updateData.manager_reviewed_at = new Date().toISOString();
          updateData.manager_reviewed_by = profile.id;
        }

        console.log('🔄 Updating appraisal status to:', updateData.status);

        const { error: updateError } = await supabase
          .from('appraisals')
          .update(updateData)
          .eq('id', appraisalId);

        if (updateError) {
          // Check if this is a submission lock error
          if (updateError.message.includes('row-level security')) {
            throw new Error('This appraisal has already been submitted and cannot be modified.');
          }
          throw updateError;
        }

        // Update local state
        setAppraisalData(prev => ({ ...prev, ...updateData }));
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
        
        if (error) {
          // Check if this is a submission lock error
          if (submit && error.message.includes('row-level security')) {
            throw new Error('This appraisal has already been submitted and cannot be modified.');
          }
          throw error;
        }
      }

      toast({
        title: "Success",
        description: submit ? (mode === 'employee' ? "Appraisal submitted successfully" : "Review completed and sent to committee") : "Progress saved",
      });

      if (submit && onComplete) {
        onComplete();
      }
    } catch (error: any) {
      console.error('❌ AppraisalForm: Error saving appraisal:', error);
      toast({
        title: "Error",
        description: error.message || `Failed to save appraisal`,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
      if (submit) {
        setSubmissionAttempted(false);
      }
    }
  };

  const getCompletionPercentage = () => {
    const requiredQuestions = questions.filter(q => q.is_required);
    const completedQuestions = requiredQuestions.filter(q => {
      const response = responses[q.id];
      
      // For text-type questions, check if comment exists
      if (q.question_type === 'text') {
        const hasComment = mode === 'employee' ? response?.emp_comment : response?.mgr_comment;
        return hasComment && hasComment.trim().length > 0;
      }
      
      // For rating-type questions, check if rating exists
      const hasRating = mode === 'employee' ? response?.emp_rating : response?.mgr_rating;
      return hasRating && hasRating > 0;
    });
    return requiredQuestions.length > 0 ? (completedQuestions.length / requiredQuestions.length) * 100 : 0;
  };

  const canSubmit = () => {
    // Employee can submit if they've completed all required questions
    if (mode === 'employee') {
      return getCompletionPercentage() === 100;
    }
    
    // Manager can submit if employee has submitted and manager has completed review
    if (mode === 'manager') {
      return appraisalData?.status === 'submitted' && getCompletionPercentage() === 100;
    }
    
    return false;
  };

  // Show loading state
  if (sectionsLoading || questionsLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading appraisal data...</span>
      </div>
    );
  }

  // Show error state
  if (questionsError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-red-600">
            <AlertCircle className="h-5 w-5 mr-2" />
            Error Loading Questions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">{questionsError}</p>
          <div className="flex space-x-2">
            <Button onClick={() => refetchQuestions()} variant="outline">
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

  // Show no questions state with auto-assign option
  if (questions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Questions Assigned</CardTitle>
          <CardDescription>
            No appraisal questions have been assigned for this cycle yet.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">
            Would you like to automatically assign default questions to get started?
          </p>
          <div className="flex space-x-2">
            <Button onClick={autoAssignQuestions} variant="default">
              Auto-Assign Questions
            </Button>
            <Button onClick={() => refetchQuestions()} variant="outline">
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isReadOnly = isReadOnlyMode();
  const readOnlyReason = getReadOnlyReason();
  const completionPercentage = getCompletionPercentage();

  // Group questions by section
  const questionsBySection = questions.reduce((acc, question) => {
    const sectionName = question.section_name || 'General';
    if (!acc[sectionName]) {
      acc[sectionName] = [];
    }
    acc[sectionName].push(question);
    return acc;
  }, {} as Record<string, typeof questions>);

  console.log('✅ AppraisalForm: Rendering form with', questions.length, 'questions in', Object.keys(questionsBySection).length, 'sections');

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className={isReadOnly ? 'border-gray-300 bg-gray-50' : ''}>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center gap-2">
                {isReadOnly && <Lock className="h-5 w-5 text-gray-500" />}
                {mode === 'manager' ? 'Manager Review' : 'Performance Appraisal'}
              </CardTitle>
              <CardDescription>
                {mode === 'manager' 
                  ? 'Review and evaluate your team member\'s performance' 
                  : 'Complete your performance evaluation for this cycle'
                }
              </CardDescription>
              {isReadOnly && readOnlyReason && (
                <div className="mt-2 flex items-center gap-2 text-sm text-amber-700 bg-amber-50 px-3 py-2 rounded-md border border-amber-200">
                  <Eye className="h-4 w-4" />
                  <span>{readOnlyReason}</span>
                </div>
              )}
            </div>
            <div className="text-right">
              <Badge variant={appraisalData?.status === 'completed' ? 'default' : 'secondary'}>
                {appraisalData?.status || 'Draft'}
              </Badge>
              {!isReadOnly && mode === 'manager' && appraisalData?.status === 'submitted' && (
                <div className="mt-2">
                  <Progress value={completionPercentage} className="w-32" />
                  <p className="text-xs text-gray-500 mt-1">{Math.round(completionPercentage)}% Complete</p>
                </div>
              )}
              {!isReadOnly && mode === 'employee' && (
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
        <Card key={sectionName} className={isReadOnly ? 'border-gray-300 bg-gray-50' : ''}>
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
                      <Badge variant="outline" className="text-xs">
                        Type: {question.question_type || 'rating'}
                      </Badge>
                    </div>
                  </div>

                  {/* Conditional rendering based on question type */}
                  {question.question_type === 'text' ? (
                    // Text-only questions: Show only textarea, larger and more prominent
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Your Response</Label>
                      <Textarea
                        placeholder={isReadOnly ? "No response provided" : "Enter your detailed response..."}
                        value={currentComment || ''}
                        onChange={(e) => handleCommentChange(question.id, e.target.value)}
                        disabled={isReadOnly}
                        readOnly={isReadOnly}
                        rows={6}
                        className={`min-h-[120px] resize-y ${isReadOnly ? 'bg-gray-100 border-gray-300 text-gray-700 cursor-not-allowed' : ''}`}
                      />
                    </div>
                  ) : (
                    // Rating questions: Show both rating and comment
                    <>
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
                              <RadioGroupItem 
                                value={rating.toString()} 
                                id={`${question.id}-${rating}`}
                                disabled={isReadOnly}
                                className={isReadOnly ? 'cursor-not-allowed opacity-50' : ''}
                              />
                              <Label 
                                htmlFor={`${question.id}-${rating}`}
                                className={isReadOnly ? 'cursor-not-allowed text-gray-500' : 'cursor-pointer'}
                              >
                                {rating}
                              </Label>
                            </div>
                          ))}
                        </RadioGroup>
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>Poor</span>
                          <span>Excellent</span>
                        </div>
                      </div>

                      {/* Comment for rating questions */}
                      <div className="space-y-2">
                        <Label>Comments</Label>
                        <Textarea
                          placeholder={isReadOnly ? "No comments provided" : "Add your comments..."}
                          value={currentComment || ''}
                          onChange={(e) => handleCommentChange(question.id, e.target.value)}
                          disabled={isReadOnly}
                          readOnly={isReadOnly}
                          rows={3}
                          className={isReadOnly ? 'bg-gray-100 border-gray-300 text-gray-700 cursor-not-allowed' : ''}
                        />
                      </div>
                    </>
                  )}

                  {/* Show other person's feedback if available */}
                  {mode === 'manager' && response.emp_rating && (
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm font-medium text-gray-700">Employee Self-Assessment:</p>
                      {question.question_type !== 'text' && (
                        <p className="text-sm">Rating: {response.emp_rating}/5</p>
                      )}
                      {response.emp_comment && (
                        <p className="text-sm mt-1">"{response.emp_comment}"</p>
                      )}
                    </div>
                  )}

                  {mode === 'employee' && response.mgr_rating && (
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <p className="text-sm font-medium text-blue-700">Manager Assessment:</p>
                      {question.question_type !== 'text' && (
                        <p className="text-sm">Rating: {response.mgr_rating}/5</p>
                      )}
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
            disabled={saving || !canSubmit() || submissionAttempted}
          >
            <Send className="h-4 w-4 mr-2" />
            {submissionAttempted ? 'Submitting...' : (mode === 'employee' ? 'Submit Appraisal' : 'Complete Review')}
          </Button>
        </div>
      )}

      {/* Read-only mode info */}
      {isReadOnly && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="flex items-center gap-3 p-4">
            <Eye className="h-5 w-5 text-amber-600" />
            <div>
              <p className="text-sm font-medium text-amber-800">Read-Only Mode</p>
              <p className="text-xs text-amber-700">{readOnlyReason}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
