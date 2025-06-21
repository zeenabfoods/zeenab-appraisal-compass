
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useEmployeeAssignedQuestions } from '@/hooks/useEmployeeAssignedQuestions';
import { ClipboardList, Calendar, Target, Star } from 'lucide-react';

interface EmployeeAssignedQuestionsProps {
  employeeId: string;
}

export function EmployeeAssignedQuestions({ employeeId }: EmployeeAssignedQuestionsProps) {
  const { questions, loading } = useEmployeeAssignedQuestions(employeeId);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (questions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <ClipboardList className="h-5 w-5 mr-2 text-blue-600" />
            My Assigned Questions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Target className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Questions Assigned</h3>
            <p className="text-gray-500">
              You don't have any appraisal questions assigned yet. Check back later or contact your HR department.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Group questions by section
  const questionsBySection = questions.reduce((acc, question) => {
    const section = question.section_name;
    if (!acc[section]) {
      acc[section] = [];
    }
    acc[section].push(question);
    return acc;
  }, {} as Record<string, typeof questions>);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <ClipboardList className="h-5 w-5 mr-2 text-blue-600" />
              My Assigned Questions ({questions.length})
            </CardTitle>
            <Button onClick={() => window.location.href = '/my-appraisals'}>
              Start Appraisal
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6">
            {Object.entries(questionsBySection).map(([sectionName, sectionQuestions]) => (
              <div key={sectionName} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-lg">{sectionName}</h3>
                  <Badge variant="outline">
                    {sectionQuestions.length} question{sectionQuestions.length !== 1 ? 's' : ''}
                  </Badge>
                </div>
                
                <div className="space-y-3">
                  {sectionQuestions.map((question, index) => (
                    <div key={question.id} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-sm mb-2">
                            {index + 1}. {question.question_text}
                          </p>
                          <div className="flex items-center space-x-2">
                            <Badge variant="secondary" className="text-xs">
                              {question.question_type}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              Weight: {question.weight}
                            </Badge>
                            {question.is_required && (
                              <Badge variant="destructive" className="text-xs">
                                Required
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="text-right text-sm text-gray-500">
                          <div className="flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            {new Date(question.assigned_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
