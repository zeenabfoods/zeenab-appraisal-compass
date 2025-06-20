
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  role: string;
}

export function useEmployeeQuestions() {
  const { toast } = useToast();
  const [sections, setSections] = useState<Section[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [staff, setStaff] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStaff = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, role')
        .eq('role', 'staff')
        .eq('is_active', true)
        .order('first_name');
      
      if (error) throw error;
      setStaff(data || []);
    } catch (error) {
      console.error('Error fetching staff:', error);
      toast({
        title: "Error",
        description: "Failed to fetch staff members",
        variant: "destructive"
      });
    }
  };

  const fetchSections = async () => {
    try {
      const { data, error } = await supabase
        .from('appraisal_question_sections')
        .select('*')
        .order('sort_order');
      
      if (error) throw error;
      
      const transformedSections: Section[] = (data || []).map(section => ({
        id: section.id,
        name: section.name,
        description: section.description || '',
        sort_order: section.sort_order,
        max_score: section.max_score,
        weight: section.weight,
        is_active: section.is_active
      }));
      
      setSections(transformedSections);
    } catch (error) {
      console.error('Error fetching sections:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchQuestions = async (selectedStaff: string) => {
    if (!selectedStaff) return;
    
    try {
      const { data, error } = await supabase
        .from('employee_questions')
        .select('*')
        .eq('employee_id', selectedStaff)
        .order('sort_order');
      
      if (error) throw error;
      setQuestions(data || []);
    } catch (error) {
      console.error('Error fetching questions:', error);
    }
  };

  const deleteQuestion = async (questionId: string) => {
    try {
      const { error } = await supabase
        .from('employee_questions')
        .delete()
        .eq('id', questionId);
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Question deleted successfully"
      });
      
      return true;
    } catch (error: any) {
      console.error('Error deleting question:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
      return false;
    }
  };

  const toggleQuestionStatus = async (questionId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('employee_questions')
        .update({ is_active: isActive })
        .eq('id', questionId);
      
      if (error) throw error;
      
      return true;
    } catch (error: any) {
      console.error('Error updating question status:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
      return false;
    }
  };

  return {
    sections,
    questions,
    staff,
    loading,
    fetchStaff,
    fetchSections,
    fetchQuestions,
    deleteQuestion,
    toggleQuestionStatus
  };
}
