
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, User, MessageSquare, Star, Award, AlertTriangle, CheckCircle } from 'lucide-react';
import { AppraisalQuestionRenderer } from '@/components/AppraisalQuestionRenderer';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface QuestionResponse {
  id: string;
  question_text: string;
  question_type: string;
  is_required: boolean;
  section_name: string;
  employee_response?: any;
  employee_score?: number;
  manager_response?: any;
  manager_score?: number;
  multiple_choice_options?: string[];
}

interface EmployeeInfo {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  position: string;
  department?: {
    name: string;
  };
}

export default function EmployeeQuestionsView() {
  const { employeeId } = useParams<{ employeeId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [employee, setEmployee] = useState<EmployeeInfo | null>(null);
  const [questions, setQuestions] = useState<QuestionResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('employee');

  useEffect(() => {
    if (employeeId) {
      fetchEmployeeData();
      fetchQuestionResponses();
    }
  }, [employeeId]);

  const fetchEmployeeData = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          first_name,
          last_name,
          email,
          position,
          department:departments!profiles_department_id_fkey(name)
        `)
        .eq('id', employeeId)
        .single();

      if (error) throw error;
      setEmployee(data);
    } catch (error) {
      console.error('Error fetching employee data:', error);
      toast({
        title: "Error",
        description: "Failed to load employee information",
        variant: "destructive"
      });
    }
  };

  const fetchQuestionResponses = async () => {
    try {
      setLoading(true);
      
      // Get assigned questions with responses
      const { data: assignedQuestions, error: questionsError } = await supabase
        .from('employee_appraisal_questions')
        .select(`
          question_id,
          appraisal_questions (
            id,
            question_text,
            question_type,
            is_required,
            multiple_choice_options,
            appraisal_question_sections (
              name
            )
          )
        `)
        .eq('employee_id', employeeId)
        .eq('is_active', true);

      if (questionsError) throw questionsError;

      // Get appraisal responses for this employee
      const { data: responses, error: responsesError } = await supabase
        .from('appraisal_responses')
        .select('*')
        .eq('employee_id', employeeId);

      if (responsesError) throw responsesError;

      // Combine questions with responses
      const questionsWithResponses = (assignedQuestions || []).map(item => {
        const question = item.appraisal_questions;
        const employeeResponse = responses?.find(r => r.question_id === question.id);
        
        return {
          id: question.id,
          question_text: question.question_text,
          question_type: question.question_type,
          is_required: question.is_required,
          multiple_choice_options: question.multiple_choice_options,
          section_name: question.appraisal_question_sections?.name || 'General',
          employee_response: employeeResponse?.emp_comment || employeeResponse?.emp_rating,
          employee_score: employeeResponse?.emp_rating,
          manager_response: employeeResponse?.mgr_comment || employeeResponse?.mgr_rating,
          manager_score: employeeResponse?.mgr_rating,
        };
      });

      setQuestions(questionsWithResponses);
    } catch (error) {
      console.error('Error fetching question responses:', error);
      toast({
        title: "Error",
        description: "Failed to load question responses",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number | null | undefined) => {
    if (!score) return 'text-gray-500';
    if (score >= 4) return 'text-green-600';
    if (score >= 3) return 'text-blue-600';
    if (score >= 2) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadge = (score: number | null | undefined) => {
    if (!score) return null;
    const colors = {
      5: 'bg-green-100 text-green-800',
      4: 'bg-blue-100 text-blue-800',
      3: 'bg-yellow-100 text-yellow-800',
      2: 'bg-orange-100 text-orange-800',
      1: 'bg-red-100 text-red-800'
    };
    return (
      <Badge className={colors[score as keyof typeof colors] || 'bg-gray-100 text-gray-800'}>
        {score}/5 <Star className="h-3 w-3 ml-1" />
      </Badge>
    );
  };

  const renderQuestionResponse = (question: QuestionResponse, isManager = false) => {
    const response = isManager ? question.manager_response : question.employee_response;
    const score = isManager ? question.manager_score : question.employee_score;

    return (
      <Card key={`${question.id}-${isManager ? 'manager' : 'employee'}`} className="mb-6 shadow-lg border-0">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-lg font-semibold text-gray-800 mb-2">
                {question.question_text}
                {question.is_required && (
                  <span className="text-red-500 ml-2">*</span>
                )}
              </CardTitle>
              <div className="flex items-center space-x-3">
                <Badge variant="outline" className="text-sm">
                  {question.section_name}
                </Badge>
                <Badge variant="secondary" className="text-sm capitalize">
                  {question.question_type.replace('_', ' ')}
                </Badge>
              </div>
            </div>
            {score && getScoreBadge(score)}
          </div>
        </CardHeader>
        <CardContent>
          {question.question_type === 'rating' ? (
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <div
                    key={rating}
                    className={`w-10 h-10 rounded-lg border-2 flex items-center justify-center font-semibold ${
                      score === rating
                        ? 'bg-orange-500 text-white border-orange-500'
                        : 'bg-gray-100 text-gray-600 border-gray-300'
                    }`}
                  >
                    {rating}
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>Poor</span>
                <span>Excellent</span>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 p-4 rounded-lg">
              {response ? (
                <p className="text-gray-800">{response}</p>
              ) : (
                <p className="text-gray-500 italic">No response provided</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading employee questions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/committee')}
            className="hover:bg-gray-100"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Committee Review
          </Button>
        </div>
      </div>

      {/* Employee Info */}
      {employee && (
        <Card className="border-0 shadow-xl bg-gradient-to-br from-orange-50 to-red-50">
          <CardContent className="py-6">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center">
                <User className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-orange-900">
                  {employee.first_name} {employee.last_name}
                </h1>
                <p className="text-orange-700">
                  {employee.position} • {employee.department?.name}
                </p>
                <p className="text-sm text-orange-600">{employee.email}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Questions and Responses */}
      <Card className="border-0 shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center text-xl">
            <MessageSquare className="h-6 w-6 mr-3" />
            Questions & Responses
          </CardTitle>
          <CardDescription>
            Compare employee self-assessment with manager evaluation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="employee" className="flex items-center space-x-2">
                <User className="h-4 w-4" />
                <span>Employee Responses</span>
              </TabsTrigger>
              <TabsTrigger value="manager" className="flex items-center space-x-2">
                <Award className="h-4 w-4" />
                <span>Manager Evaluation</span>
              </TabsTrigger>
              <TabsTrigger value="comparison" className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4" />
                <span>Side-by-Side</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="employee" className="space-y-6">
              <div className="bg-blue-50 p-4 rounded-lg mb-6">
                <h3 className="font-semibold text-blue-800 mb-2">Employee Self-Assessment</h3>
                <p className="text-blue-700 text-sm">
                  These are the responses provided by the employee during their self-evaluation.
                </p>
              </div>
              {questions.map(question => renderQuestionResponse(question, false))}
            </TabsContent>

            <TabsContent value="manager" className="space-y-6">
              <div className="bg-purple-50 p-4 rounded-lg mb-6">
                <h3 className="font-semibold text-purple-800 mb-2">Manager Evaluation</h3>
                <p className="text-purple-700 text-sm">
                  These are the ratings and comments provided by the line manager.
                </p>
              </div>
              {questions.map(question => renderQuestionResponse(question, true))}
            </TabsContent>

            <TabsContent value="comparison" className="space-y-6">
              <div className="bg-green-50 p-4 rounded-lg mb-6">
                <h3 className="font-semibold text-green-800 mb-2">Comparative Analysis</h3>
                <p className="text-green-700 text-sm">
                  Side-by-side comparison of employee and manager responses for comprehensive review.
                </p>
              </div>
              {questions.map(question => (
                <Card key={question.id} className="mb-8 shadow-lg border-0">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold text-gray-800 mb-2">
                      {question.question_text}
                      {question.is_required && (
                        <span className="text-red-500 ml-2">*</span>
                      )}
                    </CardTitle>
                    <div className="flex items-center space-x-3">
                      <Badge variant="outline">{question.section_name}</Badge>
                      <Badge variant="secondary" className="capitalize">
                        {question.question_type.replace('_', ' ')}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-6">
                      {/* Employee Response */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-blue-700 flex items-center">
                            <User className="h-4 w-4 mr-2" />
                            Employee Response
                          </h4>
                          {question.employee_score && getScoreBadge(question.employee_score)}
                        </div>
                        {question.question_type === 'rating' ? (
                          <div className="flex items-center space-x-2">
                            {[1, 2, 3, 4, 5].map((rating) => (
                              <div
                                key={rating}
                                className={`w-8 h-8 rounded border-2 flex items-center justify-center text-sm font-semibold ${
                                  question.employee_score === rating
                                    ? 'bg-blue-500 text-white border-blue-500'
                                    : 'bg-gray-100 text-gray-600 border-gray-300'
                                }`}
                              >
                                {rating}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="bg-blue-50 p-3 rounded-lg">
                            {question.employee_response ? (
                              <p className="text-gray-800 text-sm">{question.employee_response}</p>
                            ) : (
                              <p className="text-gray-500 italic text-sm">No response provided</p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Manager Response */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-purple-700 flex items-center">
                            <Award className="h-4 w-4 mr-2" />
                            Manager Evaluation
                          </h4>
                          {question.manager_score && getScoreBadge(question.manager_score)}
                        </div>
                        {question.question_type === 'rating' ? (
                          <div className="flex items-center space-x-2">
                            {[1, 2, 3, 4, 5].map((rating) => (
                              <div
                                key={rating}
                                className={`w-8 h-8 rounded border-2 flex items-center justify-center text-sm font-semibold ${
                                  question.manager_score === rating
                                    ? 'bg-purple-500 text-white border-purple-500'
                                    : 'bg-gray-100 text-gray-600 border-gray-300'
                                }`}
                              >
                                {rating}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="bg-purple-50 p-3 rounded-lg">
                            {question.manager_response ? (
                              <p className="text-gray-800 text-sm">{question.manager_response}</p>
                            ) : (
                              <p className="text-gray-500 italic text-sm">No evaluation provided</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Score Variance Alert */}
                    {question.question_type === 'rating' && 
                     question.employee_score && 
                     question.manager_score && 
                     Math.abs(question.employee_score - question.manager_score) >= 2 && (
                      <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <div className="flex items-center">
                          <AlertTriangle className="h-4 w-4 text-amber-600 mr-2" />
                          <span className="text-amber-800 text-sm font-medium">
                            Significant score variance detected 
                            ({Math.abs(question.employee_score - question.manager_score)} point difference)
                          </span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          </Tabs>

          {questions.length === 0 && (
            <div className="text-center py-12">
              <MessageSquare className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium mb-2 text-gray-700">No Questions Found</h3>
              <p className="text-gray-500">
                No appraisal questions have been assigned to this employee yet.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
