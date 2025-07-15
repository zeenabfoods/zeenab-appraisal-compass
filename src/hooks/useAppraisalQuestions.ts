
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Question {
  id: string;
  question_text: string;
  question_type: string;
  weight: number;
  is_required: boolean;
  section_id: string;
  section_name?: string;
}

export function useAppraisalQuestions(employeeId: string, cycleId: string) {
  const { toast } = useToast();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  const loadQuestions = async () => {
    if (!employeeId || !cycleId) {
      console.log('🔍 useAppraisalQuestions: Missing required params:', { employeeId, cycleId });
      setLoading(false);
      return;
    }

    try {
      console.log('📝 useAppraisalQuestions: Starting to load questions for:', { employeeId, cycleId });
      setLoading(true);
      setError('');

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
        console.error('❌ useAppraisalQuestions: Database error:', assignedError);
        throw new Error(`Failed to load questions: ${assignedError.message}`);
      }

      console.log('📊 useAppraisalQuestions: Raw assigned questions:', assignedQuestions?.length || 0);

      if (!assignedQuestions || assignedQuestions.length === 0) {
        console.log('⚠️ useAppraisalQuestions: No questions found, will auto-assign');
        setQuestions([]);
        setLoading(false);
        return;
      }

      // Process and validate questions
      const processedQuestions: Question[] = [];
      
      for (const item of assignedQuestions) {
        const question = item.appraisal_questions;
        
        // Comprehensive validation
        if (!question) {
          console.warn('⚠️ useAppraisalQuestions: Item missing question object:', item);
          continue;
        }

        if (!question.id || !question.question_text) {
          console.warn('⚠️ useAppraisalQuestions: Question missing required fields:', question);
          continue;
        }

        // Only filter out explicitly inactive questions
        if (question.is_active === false) {
          console.warn('⚠️ useAppraisalQuestions: Question explicitly inactive:', question.id);
          continue;
        }

        const processedQuestion: Question = {
          id: question.id,
          question_text: question.question_text,
          question_type: question.question_type || 'rating',
          weight: question.weight || 1.0,
          is_required: question.is_required !== false, // Default to true
          section_id: question.section_id || '',
          section_name: question.appraisal_question_sections?.name || 'General'
        };

        processedQuestions.push(processedQuestion);
        console.log('✅ useAppraisalQuestions: Processed question:', processedQuestion.id, processedQuestion.question_text.substring(0, 50));
      }

      console.log('✅ useAppraisalQuestions: Final processed questions:', processedQuestions.length);
      setQuestions(processedQuestions);

    } catch (error: any) {
      console.error('❌ useAppraisalQuestions: Error:', error);
      setError(error.message || 'Failed to load questions');
      toast({
        title: "Error Loading Questions",
        description: error.message || 'Failed to load appraisal questions',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Auto-assign questions if none found
  const autoAssignQuestions = async () => {
    try {
      console.log('🔧 useAppraisalQuestions: Auto-assigning questions...');
      
      // Get all active questions
      const { data: allQuestions, error: questionsError } = await supabase
        .from('appraisal_questions')
        .select('id')
        .eq('is_active', true)
        .limit(5);

      if (questionsError) {
        console.error('❌ useAppraisalQuestions: Error fetching questions for auto-assign:', questionsError);
        return;
      }

      if (!allQuestions || allQuestions.length === 0) {
        console.log('⚠️ useAppraisalQuestions: No questions available in system');
        return;
      }

      // Assign questions to employee
      const assignments = allQuestions.map(question => ({
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
        console.error('❌ useAppraisalQuestions: Error auto-assigning questions:', assignError);
        return;
      }

      console.log('✅ useAppraisalQuestions: Auto-assigned questions successfully');
      toast({
        title: "Questions Assigned",
        description: `${allQuestions.length} appraisal questions have been automatically assigned.`,
      });

      // Reload questions after assignment
      setTimeout(() => {
        loadQuestions();
      }, 1000);

    } catch (error) {
      console.error('❌ useAppraisalQuestions: Auto-assign error:', error);
    }
  };

  useEffect(() => {
    loadQuestions();
  }, [employeeId, cycleId]);

  return {
    questions,
    loading,
    error,
    refetch: loadQuestions,
    autoAssignQuestions
  };
}
