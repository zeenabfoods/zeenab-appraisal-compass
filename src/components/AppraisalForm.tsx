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
  console.log('🚀 AppraisalForm component rendered with props:', { cycleId, employeeId, mode });
  
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
    console.log('🔄 useEffect triggered with:', { cycleId, employeeId });
    if (cycleId && employeeId) {
      loadData();
    }
  }, [cycleId, employeeId]);

  useEffect(() => {
    console.log('🔍 Final questions state:', questions);
  }, [questions]);

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
    console.log('📝 Loading assigned questions for employee:', employeeId, 'cycle:', cycleId);
    console.log('🔍 Current dependencies check:', { cycleId, employeeId, mode });
    
    // Get assigned questions for this employee and cycle - use LEFT JOIN to avoid filtering
    const { data: assignedQuestions, error: assignedError } = await supabase
      .from('employee_appraisal_questions')
      .select(`
        question_id,
        appraisal_questions (
          id,
          question_text,
          question_type,
          weight,
          is_required,
          section_id,
          is_active,
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

    console.log('🔍 Raw API response:', assignedQuestions);
    console.log('📊 Raw assigned questions count:', assignedQuestions?.length || 0);
    console.log('📊 Raw assigned questions sample:', assignedQuestions?.slice(0, 2));
    
    // Deep inspection of first question structure
    if (assignedQuestions && assignedQuestions.length > 0) {
      console.log('🔍 Deep inspection of first question:', 
        JSON.stringify(assignedQuestions[0]?.appraisal_questions, null, 2));
      console.log('🔍 Is active status check:', 
        assignedQuestions.map(q => ({
          hasQuestionObj: !!q.appraisal_questions,
          isActive: q.appraisal_questions?.is_active,
          id: q.appraisal_questions?.id
        })));
    }

    if (!assignedQuestions || assignedQuestions.length === 0) {
      console.log('⚠️ No questions assigned - will trigger auto assignment');
      setQuestions([]);
      return;
    }

    // Process questions with comprehensive validation
    try {
      const processedQuestions: Question[] = assignedQuestions
        .filter(item => {
          // Detailed validation with individual checks
          const hasQuestionObj = !!item.appraisal_questions;
          const hasId = !!item.appraisal_questions?.id;
          const hasText = !!item.appraisal_questions?.question_text;
          const isActive = item.appraisal_questions?.is_active;
          const isActiveValid = isActive !== false; // Allow null/undefined to pass
          
          const isValid = hasQuestionObj && hasId && hasText && isActiveValid;
          
          if (!isValid) {
            console.log('❌ Filtered question:', {
              item: item,
              hasQuestionObj,
              hasId,
              hasText,
              isActive,
              isActiveValid,
              reason: !hasQuestionObj ? 'Missing question object' :
                     !hasId ? 'Missing ID' :
                     !hasText ? 'Missing question text' :
                     !isActiveValid ? `is_active is false (${isActive})` :
                     'Unknown'
            });
          } else {
            console.log('✅ Valid question passed filter:', {
              id: item.appraisal_questions?.id,
              text: item.appraisal_questions?.question_text?.substring(0, 50) + '...',
              isActive: item.appraisal_questions?.is_active
            });
          }
          
          return isValid;
        })
        .map((item: any) => {
          console.log('🗺️ Mapping item:', item); // Add mapping debug
          const question = item.appraisal_questions;
          const mapped = {
            id: question?.id || 'missing-id',
            question_text: question?.question_text || 'missing-text',
            question_type: question?.question_type || 'rating',
            weight: question?.weight || 1.0,
            is_required: question?.is_required || false,
            section_id: question?.section_id || null,
            section_name: question?.appraisal_question_sections?.name || 'General'
          };
          console.log('✅ Mapped to:', mapped);
          return mapped;
        });

      console.log('🔍 Processed questions:', processedQuestions);
      console.log('✅ Questions processed successfully:', processedQuestions.length);
      
      if (processedQuestions.length === 0) {
        console.warn('⚠️ All questions were filtered out - checking raw data again');
        console.log('📊 Full raw data for debugging:', JSON.stringify(assignedQuestions, null, 2));
        setQuestions([]);
        return;
      }
      
      console.log('🔄 Setting questions state with:', processedQuestions.length, 'questions');
      setQuestions(processedQuestions);
      console.log('✅ Final questions state should be:', processedQuestions.length);
    } catch (processingError) {
      console.error('❌ Error processing questions:', processingError);
      console.error('❌ Raw data that failed:', assignedQuestions);
      throw new Error(`Failed to process questions: ${processingError}`);
    }
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

  if (questions.length === 0 && !loading) {
    return (
      <div className="space-y-6">
        {/* TEMPORARILY COMMENTED OUT FOR DEBUGGING
        <AutoQuestionAssignment 
          employeeId={employeeId} 
          cycleId={cycleId}
          onAssignmentComplete={() => {
            console.log('Questions assigned, reloading all data...');
            loadData();
          }}
        />
        */}
        <Card>
          <CardHeader>
            <CardTitle>🐛 Debug: No Questions Found</CardTitle>
            <CardDescription>
              No appraisal questions have been assigned for this cycle yet.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              AutoQuestionAssignment temporarily disabled for debugging.
            </p>
            <div className="flex space-x-2">
              <Button onClick={() => loadData()} variant="outline" disabled={loading}>
                {loading ? 'Loading...' : 'Refresh Data'}
              </Button>
              <Button 
                onClick={() => {
                  console.log('🧪 Setting mock questions for testing...');
                  const mockQuestions: Question[] = [
                    {
                      id: 'mock-1',
                      question_text: 'How would you rate your overall performance this quarter?',
                      question_type: 'rating',
                      weight: 1.0,
                      is_required: true,
                      section_id: 'mock-section',
                      section_name: 'Mock Performance'
                    },
                    {
                      id: 'mock-2',
                      question_text: 'What were your key achievements?',
                      question_type: 'text',
                      weight: 1.0,
                      is_required: false,
                      section_id: 'mock-section',
                      section_name: 'Mock Performance'
                    }
                  ];
                  setQuestions(mockQuestions);
                  console.log('✅ Mock questions set:', mockQuestions);
                }} 
                variant="secondary"
              >
                🧪 Test with Mock Questions
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
      {Object.entries(questionsBySection).map(([sectionName, sectionQuestions]) => {
        try {
          return (
            <Card key={sectionName}>
              <CardHeader>
                <CardTitle className="text-lg">{sectionName}</CardTitle>
                <CardDescription>
                  {sectionQuestions.length} question{sectionQuestions.length !== 1 ? 's' : ''} in this section
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {sectionQuestions.map((question, index) => {
                  try {
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
                  } catch (questionError) {
                    console.error('❌ Error rendering question:', questionError, question);
                    return (
                      <div key={question?.id || `error-${index}`} className="bg-red-50 p-3 rounded-lg">
                        <p className="text-red-600 text-sm">Error rendering question {index + 1}</p>
                      </div>
                    );
                  }
                })}
              </CardContent>
            </Card>
          );
        } catch (sectionError) {
          console.error('❌ Error rendering section:', sectionError, sectionName);
          return (
            <Card key={sectionName}>
              <CardContent>
                <p className="text-red-600">Error rendering section: {sectionName}</p>
              </CardContent>
            </Card>
          );
        }
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
            {mode === 'employee' ? 'Submit Appraisal' : 'Complete Review'}
          </Button>
        </div>
      )}
    </div>
  );
}
