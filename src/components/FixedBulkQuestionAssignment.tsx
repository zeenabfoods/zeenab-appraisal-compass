
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { CheckSquare, Square } from 'lucide-react';

interface Question {
  id: string;
  question_text: string;
  section_id: string;
  question_type: string;
  weight: number;
  is_required: boolean;
  is_active: boolean;
  sort_order: number;
}

interface Section {
  id: string;
  name: string;
  description: string;
  sort_order: number;
  max_score: number;
  weight: number;
  is_active: boolean;
}

interface FixedBulkQuestionAssignmentProps {
  employeeId: string;
  employeeName: string;
  sections: Section[];
  allQuestions: Question[];
  assignedQuestions: Question[];
  onAssignmentComplete: () => void;
}

export function FixedBulkQuestionAssignment({
  employeeId,
  employeeName,
  sections,
  allQuestions,
  assignedQuestions,
  onAssignmentComplete
}: FixedBulkQuestionAssignmentProps) {
  const { toast } = useToast();
  const { profile } = useAuth();
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const [isAssigning, setIsAssigning] = useState(false);

  const assignedQuestionIds = assignedQuestions.map(q => q.id);

  const handleQuestionToggle = (questionId: string, checked: boolean) => {
    if (checked) {
      setSelectedQuestions(prev => [...prev, questionId]);
    } else {
      setSelectedQuestions(prev => prev.filter(id => id !== questionId));
    }
  };

  const handleSectionToggle = (sectionId: string) => {
    const sectionQuestions = allQuestions.filter(q => 
      q.section_id === sectionId && 
      !assignedQuestionIds.includes(q.id)
    );
    
    const sectionQuestionIds = sectionQuestions.map(q => q.id);
    const allSectionQuestionsSelected = sectionQuestionIds.every(id => selectedQuestions.includes(id));
    
    if (allSectionQuestionsSelected) {
      // Deselect all questions in this section
      setSelectedQuestions(prev => prev.filter(id => !sectionQuestionIds.includes(id)));
    } else {
      // Select all questions in this section
      setSelectedQuestions(prev => [...new Set([...prev, ...sectionQuestionIds])]);
    }
  };

  const handleBulkAssignment = async () => {
    if (selectedQuestions.length === 0) {
      toast({
        title: "No Questions Selected",
        description: "Please select at least one question to assign.",
        variant: "destructive"
      });
      return;
    }

    setIsAssigning(true);
    
    try {
      const assignments = selectedQuestions.map(questionId => ({
        employee_id: employeeId,
        question_id: questionId,
        cycle_id: '00000000-0000-0000-0000-000000000000',
        assigned_by: profile?.id
      }));

      const { error: assignError } = await supabase
        .from('employee_appraisal_questions')
        .insert(assignments);

      if (assignError) throw assignError;

      // Send notification to line manager
      if (profile && (profile.role === 'hr' || profile.role === 'admin')) {
        try {
          const { error: notificationError } = await supabase.rpc('notify_line_manager', {
            employee_id_param: employeeId,
            question_ids_param: selectedQuestions,
            assigned_by_param: profile.id
          });
          
          if (notificationError) {
            console.error('Error sending notification:', notificationError);
          }
        } catch (notifError) {
          console.error('Error with notification function:', notifError);
        }
      }

      toast({
        title: "Questions Assigned Successfully",
        description: `${selectedQuestions.length} questions have been assigned to ${employeeName}. Line manager has been notified.`
      });

      setSelectedQuestions([]);
      onAssignmentComplete();
    } catch (error: any) {
      console.error('Error assigning questions:', error);
      toast({
        title: "Assignment Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Assign Questions to {employeeName}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {sections.map(section => {
          const sectionQuestions = allQuestions.filter(q => q.section_id === section.id);
          const availableQuestions = sectionQuestions.filter(q => !assignedQuestionIds.includes(q.id));
          const sectionSelectedCount = availableQuestions.filter(q => selectedQuestions.includes(q.id)).length;
          const isSectionFullySelected = availableQuestions.length > 0 && 
            availableQuestions.every(q => selectedQuestions.includes(q.id));
          
          if (availableQuestions.length === 0) return null;

          return (
            <div key={section.id} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{section.name}</h3>
                  <p className="text-sm text-gray-600">{section.description}</p>
                  <div className="flex items-center space-x-2 mt-2">
                    <Badge variant="outline">Weight: {section.weight}</Badge>
                    <Badge variant="outline">Max Score: {section.max_score}</Badge>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSectionToggle(section.id)}
                    className="flex items-center space-x-2"
                  >
                    {isSectionFullySelected ? (
                      <CheckSquare className="h-4 w-4 text-blue-600" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                    <span className="text-sm font-medium">
                      Select All ({sectionSelectedCount}/{availableQuestions.length})
                    </span>
                  </Button>
                </div>
              </div>
              
              <div className="space-y-3">
                {availableQuestions.map(question => {
                  const isSelected = selectedQuestions.includes(question.id);
                  
                  return (
                    <div key={question.id} className="flex items-start space-x-3 p-3 border rounded bg-gray-50">
                      <Checkbox
                        id={`question-${question.id}`}
                        checked={isSelected}
                        onCheckedChange={(checked) => handleQuestionToggle(question.id, !!checked)}
                      />
                      <div className="flex-1">
                        <label htmlFor={`question-${question.id}`} className="text-sm font-medium cursor-pointer">
                          {question.question_text}
                        </label>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            {question.question_type}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            Weight: {question.weight}
                          </Badge>
                          {question.is_required && (
                            <Badge variant="destructive" className="text-xs">Required</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-gray-600">
            {selectedQuestions.length} questions selected for assignment
          </div>
          <Button 
            onClick={handleBulkAssignment}
            disabled={selectedQuestions.length === 0 || isAssigning}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isAssigning ? 'Assigning...' : `Assign ${selectedQuestions.length} Questions`}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
