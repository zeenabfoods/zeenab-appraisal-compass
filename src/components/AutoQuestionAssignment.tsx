
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AutoQuestionAssignmentProps {
  employeeId: string;
  cycleId?: string;
  onAssignmentComplete?: () => void;
}

export function AutoQuestionAssignment({ employeeId, cycleId, onAssignmentComplete }: AutoQuestionAssignmentProps) {
  const { toast } = useToast();
  const [isAssigning, setIsAssigning] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);

  useEffect(() => {
    // Prevent infinite loops by limiting attempts
    if (employeeId && cycleId && !isAssigning && !hasRun && attemptCount < 3) {
      checkAndAssignQuestions();
    } else if (attemptCount >= 3) {
      console.error('❌ Max auto-assignment attempts reached, stopping to prevent infinite loop');
    }
  }, [employeeId, cycleId, hasRun, attemptCount]);

  const checkAndAssignQuestions = async () => {
    if (isAssigning || hasRun) return;
    
    try {
      setIsAssigning(true);
      setHasRun(true);
      setAttemptCount(prev => prev + 1);
      console.log('🔍 Checking if employee has assigned questions... (attempt', attemptCount + 1, ')');

      // Check if employee already has questions assigned for this cycle
      const { data: existingAssignments, error: checkError } = await supabase
        .from('employee_appraisal_questions')
        .select('id')
        .eq('employee_id', employeeId)
        .eq('cycle_id', cycleId)
        .eq('is_active', true);

      if (checkError) {
        console.error('❌ Error checking existing assignments:', checkError);
        return;
      }

      if (existingAssignments && existingAssignments.length > 0) {
        console.log('✅ Employee already has questions assigned');
        // Questions are already assigned, no need to trigger callback
        return;
      }

      console.log('⚠️ No questions assigned, auto-assigning default questions...');
      await autoAssignDefaultQuestions();

    } catch (error) {
      console.error('❌ Error in auto question assignment:', error);
    } finally {
      setIsAssigning(false);
    }
  };

  const autoAssignDefaultQuestions = async () => {
    try {
      // Get all active questions from the system
      const { data: questions, error: questionsError } = await supabase
        .from('appraisal_questions')
        .select('id')
        .eq('is_active', true)
        .limit(5); // Assign a reasonable number of default questions

      if (questionsError) {
        console.error('❌ Error fetching questions:', questionsError);
        return;
      }

      if (!questions || questions.length === 0) {
        console.log('⚠️ No questions available to assign');
        await createDefaultQuestions();
        return;
      }

      // Assign the questions to the employee
      const assignments = questions.map(question => ({
        employee_id: employeeId,
        question_id: question.id,
        cycle_id: cycleId,
        assigned_by: null, // Auto-assigned
        is_active: true
      }));

      const { error: assignError } = await supabase
        .from('employee_appraisal_questions')
        .insert(assignments);

      if (assignError) {
        console.error('❌ Error assigning questions:', assignError);
        return;
      }

      console.log('✅ Successfully auto-assigned questions to employee');
      toast({
        title: "Questions Assigned",
        description: `${questions.length} appraisal questions have been automatically assigned to you.`,
      });

      // Trigger callback to refresh parent component with a delay to ensure DB consistency
      if (onAssignmentComplete) {
        setTimeout(() => {
          console.log('🔄 Triggering assignment complete callback');
          onAssignmentComplete();
        }, 1000);
      }

    } catch (error) {
      console.error('❌ Error in autoAssignDefaultQuestions:', error);
    }
  };

  const createDefaultQuestions = async () => {
    try {
      console.log('📝 Creating default appraisal questions...');

      // First, ensure we have a default section
      let { data: section, error: sectionError } = await supabase
        .from('appraisal_question_sections')
        .select('id')
        .eq('name', 'General Performance')
        .eq('is_active', true)
        .maybeSingle();

      if (sectionError && sectionError.code !== 'PGRST116') {
        console.error('❌ Error checking section:', sectionError);
        return;
      }

      if (!section) {
        const { data: newSection, error: createSectionError } = await supabase
          .from('appraisal_question_sections')
          .insert({
            name: 'General Performance',
            description: 'General performance evaluation questions',
            sort_order: 1,
            is_active: true
          })
          .select()
          .single();

        if (createSectionError) {
          console.error('❌ Error creating section:', createSectionError);
          return;
        }
        section = newSection;
      }

      // Create default questions
      const defaultQuestions = [
        {
          question_text: 'How would you rate your overall job performance this quarter?',
          question_type: 'rating',
          section_id: section.id,
          weight: 1.0,
          is_required: true,
          sort_order: 1,
          is_active: true
        },
        {
          question_text: 'What were your key achievements this quarter?',
          question_type: 'text',
          section_id: section.id,
          weight: 1.0,
          is_required: true,
          sort_order: 2,
          is_active: true
        },
        {
          question_text: 'What challenges did you face and how did you overcome them?',
          question_type: 'text',
          section_id: section.id,
          weight: 1.0,
          is_required: false,
          sort_order: 3,
          is_active: true
        },
        {
          question_text: 'How would you rate your collaboration with team members?',
          question_type: 'rating',
          section_id: section.id,
          weight: 1.0,
          is_required: true,
          sort_order: 4,
          is_active: true
        },
        {
          question_text: 'What are your goals for the next quarter?',
          question_type: 'text',
          section_id: section.id,
          weight: 1.0,
          is_required: false,
          sort_order: 5,
          is_active: true
        }
      ];

      const { data: createdQuestions, error: questionsError } = await supabase
        .from('appraisal_questions')
        .insert(defaultQuestions)
        .select();

      if (questionsError) {
        console.error('❌ Error creating questions:', questionsError);
        return;
      }

      console.log('✅ Created default questions:', createdQuestions?.length);

      // Now assign these questions to the employee
      if (createdQuestions && createdQuestions.length > 0) {
        const assignments = createdQuestions.map(question => ({
          employee_id: employeeId,
          question_id: question.id,
          cycle_id: cycleId,
          assigned_by: null,
          is_active: true
        }));

        const { error: assignError } = await supabase
          .from('employee_appraisal_questions')
          .insert(assignments);

        if (assignError) {
          console.error('❌ Error assigning created questions:', assignError);
          return;
        }

        console.log('✅ Successfully assigned default questions');
        toast({
          title: "Questions Created and Assigned",
          description: `${createdQuestions.length} default appraisal questions have been created and assigned to you.`,
        });

        // Trigger callback to refresh parent component with a delay to ensure DB consistency
        if (onAssignmentComplete) {
          setTimeout(() => {
            console.log('🔄 Triggering assignment complete callback (default questions)');
            onAssignmentComplete();
          }, 1000);
        }
      }

    } catch (error) {
      console.error('❌ Error creating default questions:', error);
    }
  };

  // This component doesn't render anything visible
  return null;
}
