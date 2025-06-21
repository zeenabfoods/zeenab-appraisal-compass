
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
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set());
  const [selectedSections, setSelectedSections] = useState<Set<string>>(new Set());
  const [isAssigning, setIsAssigning] = useState(false);

  const assignedQuestionIds = new Set(assignedQuestions.map(q => q.id));

  const handleQuestionToggle = (questionId: string) => {
    setSelectedQuestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
  };

  const handleSectionToggle = (sectionId: string) => {
    const sectionQuestions = allQuestions.filter(q => 
      q.section_id === sectionId && 
      !assignedQuestionIds.has(q.id)
    );
    
    setSelectedSections(prev => {
      const newSectionSet = new Set(prev);
      const newQuestionSet = new Set(selectedQuestions);
      
      if (newSectionSet.has(sectionId)) {
        // Deselect section and all its questions
        newSectionSet.delete(sectionId);
        sectionQuestions.forEach(q => newQuestionSet.delete(q.id));
      } else {
        // Select section and all its questions
        newSectionSet.add(sectionId);
        sectionQuestions.forEach(q => newQuestionSet.add(q.id));
      }
      
      setSelectedQuestions(newQuestionSet);
      return newSectionSet;
    });
  };

  // Update section selection state when individual questions change
  useEffect(() => {
    const newSelectedSections = new Set<string>();
    
    sections.forEach(section => {
      const sectionQuestions = allQuestions.filter(q => 
        q.section_id === section.id && 
        !assignedQuestionIds.has(q.id)
      );
      
      if (sectionQuestions.length > 0 && 
          sectionQuestions.every(q => selectedQuestions.has(q.id))) {
        newSelectedSections.add(section.id);
      }
    });
    
    setSelectedSections(newSelectedSections);
  }, [selectedQuestions, sections, allQuestions, assignedQuestionIds]);

  const handleBulkAssignment = async () => {
    if (selectedQuestions.size === 0) {
      toast({
        title: "No Questions Selected",
        description: "Please select at least one question to assign.",
        variant: "destructive"
      });
      return;
    }

    setIsAssigning(true);
    
    try {
      const assignments = Array.from(selectedQuestions).map(questionId => ({
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
            question_ids_param: Array.from(selectedQuestions),
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
        description: `${selectedQuestions.size} questions have been assigned to ${employeeName}. Line manager has been notified.`
      });

      setSelectedQuestions(new Set());
      setSelectedSections(new Set());
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
          const availableQuestions = sectionQuestions.filter(q => !assignedQuestionIds.has(q.id));
          const sectionSelectedCount = availableQuestions.filter(q => selectedQuestions.has(q.id)).length;
          const isSectionSelected = selectedSections.has(section.id);
          
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
                    {isSectionSelected ? (
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
                  const isSelected = selectedQuestions.has(question.id);
                  
                  return (
                    <div key={question.id} className="flex items-start space-x-3 p-3 border rounded bg-gray-50">
                      <Checkbox
                        id={`question-${question.id}`}
                        checked={isSelected}
                        onCheckedChange={() => handleQuestionToggle(question.id)}
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
            {selectedQuestions.size} questions selected for assignment
          </div>
          <Button 
            onClick={handleBulkAssignment}
            disabled={selectedQuestions.size === 0 || isAssigning}
          >
            {isAssigning ? 'Assigning...' : `Assign ${selectedQuestions.size} Questions`}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
