
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

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

interface BulkQuestionAssignmentProps {
  employeeId: string;
  employeeName: string;
  sections: Section[];
  allQuestions: Question[];
  assignedQuestions: Question[];
  onAssignmentComplete: () => void;
}

export function BulkQuestionAssignment({
  employeeId,
  employeeName,
  sections,
  allQuestions,
  assignedQuestions,
  onAssignmentComplete
}: BulkQuestionAssignmentProps) {
  const { toast } = useToast();
  const { profile } = useAuth();
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const [isAssigning, setIsAssigning] = useState(false);

  const assignedQuestionIds = assignedQuestions.map(q => q.id);

  const handleQuestionToggle = (questionId: string, isChecked: boolean) => {
    if (isChecked) {
      setSelectedQuestions(prev => [...prev, questionId]);
    } else {
      setSelectedQuestions(prev => prev.filter(id => id !== questionId));
    }
  };

  const handleSelectAllInSection = (sectionId: string, isChecked: boolean) => {
    const sectionQuestions = allQuestions.filter(q => 
      q.section_id === sectionId && 
      !assignedQuestionIds.includes(q.id)
    );
    
    if (isChecked) {
      const newSelections = sectionQuestions.map(q => q.id);
      setSelectedQuestions(prev => [...new Set([...prev, ...newSelections])]);
    } else {
      const sectionQuestionIds = sectionQuestions.map(q => q.id);
      setSelectedQuestions(prev => prev.filter(id => !sectionQuestionIds.includes(id)));
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
      // Assign questions to employee
      const assignments = selectedQuestions.map(questionId => ({
        employee_id: employeeId,
        question_id: questionId,
        cycle_id: '00000000-0000-0000-0000-000000000000', // Default cycle
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
          
          if (availableQuestions.length === 0) return null;

          return (
            <div key={section.id} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-lg">{section.name}</h3>
                  <p className="text-sm text-gray-600">{section.description}</p>
                  <div className="flex items-center space-x-2 mt-2">
                    <Badge variant="outline">Weight: {section.weight}</Badge>
                    <Badge variant="outline">Max Score: {section.max_score}</Badge>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={`section-${section.id}`}
                    checked={sectionSelectedCount === availableQuestions.length && availableQuestions.length > 0}
                    onCheckedChange={(checked) => handleSelectAllInSection(section.id, checked as boolean)}
                  />
                  <label htmlFor={`section-${section.id}`} className="text-sm font-medium">
                    Select All ({sectionSelectedCount}/{availableQuestions.length})
                  </label>
                </div>
              </div>
              
              <div className="space-y-3">
                {availableQuestions.map(question => (
                  <div key={question.id} className="flex items-start space-x-3 p-3 border rounded bg-gray-50">
                    <Checkbox
                      id={`question-${question.id}`}
                      checked={selectedQuestions.includes(question.id)}
                      onCheckedChange={(checked) => handleQuestionToggle(question.id, checked as boolean)}
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
                ))}
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
          >
            {isAssigning ? 'Assigning...' : `Assign ${selectedQuestions.length} Questions`}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
