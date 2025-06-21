
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Staff {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  position: string | null;
  department?: {
    name: string;
  };
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

interface Question {
  id: string;
  question_text: string;
  section_id: string;
  question_type: string;
  weight: number;
  is_required: boolean;
  is_active: boolean;
  sort_order: number;
  employee_id?: string;
}

export function useEmployeeQuestions() {
  const { toast } = useToast();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchStaff = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          department:departments!profiles_department_id_fkey(name)
        `)
        .eq('is_active', true)
        .order('first_name');

      if (error) throw error;
      setStaff(data || []);
    } catch (error) {
      console.error('Error fetching staff:', error);
      toast({
        title: "Error",
        description: "Failed to load staff members",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchSections = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('appraisal_question_sections')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;
      setSections(data || []);
    } catch (error) {
      console.error('Error fetching sections:', error);
      toast({
        title: "Error",
        description: "Failed to load sections",
        variant: "destructive"
      });
    }
  }, [toast]);

  const fetchQuestions = useCallback(async (employeeId: string) => {
    try {
      // First get all questions assigned to this employee
      const { data: assignedQuestions, error: assignedError } = await supabase
        .from('employee_appraisal_questions')
        .select(`
          question_id,
          appraisal_questions (
            id,
            question_text,
            section_id,
            question_type,
            weight,
            is_required,
            is_active,
            sort_order
          )
        `)
        .eq('employee_id', employeeId)
        .eq('is_active', true);

      if (assignedError) throw assignedError;

      // Transform the data to match our Question interface
      const transformedQuestions = (assignedQuestions || []).map(item => ({
        ...item.appraisal_questions,
        employee_id: employeeId
      })) as Question[];

      setQuestions(transformedQuestions);
    } catch (error) {
      console.error('Error fetching employee questions:', error);
      toast({
        title: "Error",
        description: "Failed to load employee questions",
        variant: "destructive"
      });
    }
  }, [toast]);

  const deleteQuestion = useCallback(async (questionId: string) => {
    try {
      const { error } = await supabase
        .from('employee_appraisal_questions')
        .delete()
        .eq('question_id', questionId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Question removed from employee"
      });
      return true;
    } catch (error) {
      console.error('Error removing question:', error);
      toast({
        title: "Error",
        description: "Failed to remove question",
        variant: "destructive"
      });
      return false;
    }
  }, [toast]);

  const toggleQuestionStatus = useCallback(async (questionId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('employee_appraisal_questions')
        .update({ is_active: isActive })
        .eq('question_id', questionId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Question ${isActive ? 'activated' : 'deactivated'}`
      });
      return true;
    } catch (error) {
      console.error('Error updating question status:', error);
      toast({
        title: "Error",
        description: "Failed to update question status",
        variant: "destructive"
      });
      return false;
    }
  }, [toast]);

  return {
    staff,
    sections,
    questions,
    loading,
    fetchStaff,
    fetchSections,
    fetchQuestions,
    deleteQuestion,
    toggleQuestionStatus
  };
}
