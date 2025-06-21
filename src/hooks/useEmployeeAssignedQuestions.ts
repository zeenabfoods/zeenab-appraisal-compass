
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AssignedQuestion {
  id: string;
  question_text: string;
  question_type: string;
  weight: number;
  is_required: boolean;
  section_name: string;
  assigned_at: string;
  cycle_name: string;
}

export function useEmployeeAssignedQuestions(employeeId: string) {
  const { toast } = useToast();
  const [questions, setQuestions] = useState<AssignedQuestion[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAssignedQuestions = async () => {
    if (!employeeId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('employee_appraisal_questions')
        .select(`
          id,
          assigned_at,
          appraisal_questions!inner (
            id,
            question_text,
            question_type,
            weight,
            is_required,
            appraisal_question_sections (
              name
            )
          ),
          appraisal_cycles (
            name
          )
        `)
        .eq('employee_id', employeeId)
        .eq('is_active', true);

      if (error) throw error;

      const processedQuestions: AssignedQuestion[] = (data || []).map((item: any) => ({
        id: item.appraisal_questions.id,
        question_text: item.appraisal_questions.question_text,
        question_type: item.appraisal_questions.question_type,
        weight: item.appraisal_questions.weight,
        is_required: item.appraisal_questions.is_required,
        section_name: item.appraisal_questions.appraisal_question_sections?.name || 'General',
        assigned_at: item.assigned_at,
        cycle_name: item.appraisal_cycles?.name || 'Current Cycle'
      }));

      setQuestions(processedQuestions);
    } catch (error) {
      console.error('Error fetching assigned questions:', error);
      toast({
        title: "Error",
        description: "Failed to load your assigned questions",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignedQuestions();
  }, [employeeId]);

  return {
    questions,
    loading,
    refetch: fetchAssignedQuestions
  };
}
