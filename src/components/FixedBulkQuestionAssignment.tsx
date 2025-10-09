
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { CheckSquare, Square, Info } from 'lucide-react';

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
  const [activeCycle, setActiveCycle] = useState<any>(null);

  const assignedQuestionIds = assignedQuestions.map(q => q.id);

  useEffect(() => {
    fetchActiveCycle();
  }, []);

  const fetchActiveCycle = async () => {
    try {
      const { data: cycles, error } = await supabase
        .from('appraisal_cycles')
        .select('*')
        .eq('status', 'active')
        .single();

      if (error) {
        console.error('Error fetching active cycle:', error);
        toast({
          title: "No Active Cycle",
          description: "Please activate an appraisal cycle first before assigning questions.",
          variant: "destructive"
        });
        return;
      }

      setActiveCycle(cycles);
    } catch (error) {
      console.error('Error in fetchActiveCycle:', error);
      toast({
        title: "Error",
        description: "Failed to fetch active appraisal cycle",
        variant: "destructive"
      });
    }
  };

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
      setSelectedQuestions(prev => prev.filter(id => !sectionQuestionIds.includes(id)));
    } else {
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

    if (!activeCycle) {
      toast({
        title: "No Active Cycle",
        description: "Please activate an appraisal cycle first before assigning questions.",
        variant: "destructive"
      });
      return;
    }

    setIsAssigning(true);
    
    try {
      // Step 1: Check for existing assignments (active and soft-deleted) to avoid duplicates and allow reactivation
      // DON'T filter by cycle_id here - we need to find ALL existing assignments regardless of cycle
      console.log('Checking for existing assignments (including soft-deleted)...');
      const { data: existingAny, error: checkError } = await supabase
        .from('employee_appraisal_questions')
        .select('question_id, is_active, deleted_at, cycle_id')
        .eq('employee_id', employeeId)
        .in('question_id', selectedQuestions);

      if (checkError) {
        console.error('Error checking existing assignments:', checkError);
        throw checkError;
      }

      const existingAllIds = existingAny?.map(a => a.question_id) || [];
      const existingActiveIds = (existingAny || []).filter(a => a.deleted_at === null && a.is_active === true).map(a => a.question_id);
      const toReactivateIds = (existingAny || []).filter(a => a.deleted_at !== null || a.is_active === false).map(a => a.question_id);
      const existingQuestionIds = existingActiveIds;
      const newQuestionIds = selectedQuestions.filter(id => !existingAllIds.includes(id));

      console.log('Existing (any status):', existingAllIds);
      console.log('To reactivate:', toReactivateIds);
      console.log('New questions to assign:', newQuestionIds);

      // Validation commented out to allow re-assignment after deletion
      // if (newQuestionIds.length === 0) {
      //   toast({
      //     title: "No New Questions to Assign",
      //     description: "All selected questions are already assigned to this employee for the current cycle.",
      //     variant: "destructive"
      //   });
      //   setIsAssigning(false);
      //   return;
      // }

      // Step 2: Create or get existing appraisal for this employee and cycle
      let appraisalId;
      
      const { data: existingAppraisal, error: appraisalCheckError } = await supabase
        .from('appraisals')
        .select('id')
        .eq('employee_id', employeeId)
        .eq('cycle_id', activeCycle.id)
        .maybeSingle();

      if (appraisalCheckError) {
        console.error('Error checking existing appraisal:', appraisalCheckError);
        throw appraisalCheckError;
      }

      if (existingAppraisal) {
        appraisalId = existingAppraisal.id;
        console.log('Using existing appraisal:', appraisalId);
      } else {
        // Create new appraisal
        const { data: newAppraisal, error: createAppraisalError } = await supabase
          .from('appraisals')
          .insert({
            employee_id: employeeId,
            cycle_id: activeCycle.id,
            status: 'draft',
            year: activeCycle.year,
            quarter: activeCycle.quarter
          })
          .select('id')
          .single();

        if (createAppraisalError) {
          console.error('Error creating appraisal:', createAppraisalError);
          throw createAppraisalError;
        }
        
        appraisalId = newAppraisal.id;
        console.log('Created new appraisal:', appraisalId);
      }

      // Step 3: Reactivate soft-deleted/inactive and assign only brand-new questions
      if (toReactivateIds.length > 0) {
        console.log('Reactivating assignments:', toReactivateIds);
        const { error: reactivateError } = await supabase
          .from('employee_appraisal_questions')
          .update({
            deleted_at: null,
            is_active: true,
            assigned_by: profile?.id,
            assigned_at: new Date().toISOString(),
            cycle_id: activeCycle.id // Update to current cycle
          })
          .eq('employee_id', employeeId)
          .in('question_id', toReactivateIds);

        if (reactivateError) {
          console.error('Error reactivating assignments:', reactivateError);
          throw reactivateError;
        }
      }

      if (newQuestionIds.length > 0) {
        const assignments = newQuestionIds.map(questionId => ({
          employee_id: employeeId,
          question_id: questionId,
          cycle_id: activeCycle.id,
          assigned_by: profile?.id
        }));

        console.log('Inserting new assignments:', assignments);

        const { error: assignError } = await supabase
          .from('employee_appraisal_questions')
          .insert(assignments);

        if (assignError) {
          console.error('Error inserting assignments:', assignError);
          throw assignError;
        }
      } else {
        console.log('No brand-new assignments to insert.');
      }

      // Step 4: Send notification to line manager
      if (profile && (profile.role === 'hr' || profile.role === 'admin')) {
        try {
          const { error: notificationError } = await supabase.rpc('notify_line_manager', {
            employee_id_param: employeeId,
            question_ids_param: newQuestionIds,
            assigned_by_param: profile.id
          });
          
          if (notificationError) {
            console.error('Error sending notification:', notificationError);
          } else {
            console.log('Notification sent successfully to line manager');
          }
        } catch (notifError) {
          console.error('Error with notification function:', notifError);
        }
      }

      // Step 5: Create notification for the employee
      try {
        const { error: empNotificationError } = await supabase
          .from('notifications')
          .insert({
            user_id: employeeId,
            type: 'questions_assigned',
            title: 'New Appraisal Questions Assigned',
            message: `${newQuestionIds.length} appraisal questions have been assigned to you for the ${activeCycle.name} cycle. Please log in to complete your appraisal.`,
            related_employee_id: employeeId,
            related_question_ids: newQuestionIds
          });

        if (empNotificationError) {
          console.error('Error creating employee notification:', empNotificationError);
        } else {
          console.log('Employee notification created successfully');
        }
      } catch (empNotifError) {
        console.error('Error creating employee notification:', empNotifError);
      }

      const reactivatedCount = toReactivateIds.length;
      const alreadyActiveCount = existingQuestionIds.length;
      const parts: string[] = [];
      if (newQuestionIds.length > 0) parts.push(`${newQuestionIds.length} new questions assigned`);
      if (reactivatedCount > 0) parts.push(`${reactivatedCount} previously removed reactivated`);
      if (alreadyActiveCount > 0) parts.push(`${alreadyActiveCount} already active and skipped`);
      const message = parts.length > 0 
        ? `${parts.join('. ')}.`
        : `No changes were needed.`;

      toast({
        title: "Questions Assigned Successfully",
        description: message
      });

      setSelectedQuestions([]);
      onAssignmentComplete();
    } catch (error: any) {
      console.error('Error assigning questions:', error);
      toast({
        title: "Assignment Failed",
        description: error.message || "Failed to assign questions. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsAssigning(false);
    }
  };

  if (!activeCycle) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Assign Questions to {employeeName}</CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <p className="text-gray-600 mb-4">No active appraisal cycle found.</p>
          <p className="text-sm text-gray-500">Please activate an appraisal cycle in the Appraisal Cycles section before assigning questions.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Assign Questions to {employeeName}</CardTitle>
        <p className="text-sm text-gray-600">Active Cycle: {activeCycle.name} (Q{activeCycle.quarter} {activeCycle.year})</p>
        <div className="flex items-center space-x-2 mt-2 p-3 bg-blue-50 rounded-lg">
          <Info className="h-4 w-4 text-blue-600" />
          <p className="text-sm text-blue-800">
            Questions will remain in the question bank after assignment and can be reused for future cycles.
          </p>
        </div>
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
