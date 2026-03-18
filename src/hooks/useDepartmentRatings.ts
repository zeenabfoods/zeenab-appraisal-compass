
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface RatingCycle {
  id: string;
  name: string;
  description: string | null;
  status: string;
  start_date: string;
  end_date: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface RatingQuestion {
  id: string;
  cycle_id: string;
  question_text: string;
  question_category: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface RatingAssignment {
  id: string;
  cycle_id: string;
  department_id: string;
  question_id: string;
  created_at: string;
}

export interface DepartmentRating {
  id: string;
  cycle_id: string;
  department_id: string;
  question_id: string;
  employee_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

export function useDepartmentRatingCycles() {
  return useQuery({
    queryKey: ['department-rating-cycles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('department_rating_cycles')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as RatingCycle[];
    }
  });
}

export function useActiveDepartmentRatingCycle() {
  return useQuery({
    queryKey: ['active-department-rating-cycle'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('department_rating_cycles')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as RatingCycle | null;
    }
  });
}

export function useRatingQuestions(cycleId: string | undefined) {
  return useQuery({
    queryKey: ['department-rating-questions', cycleId],
    queryFn: async () => {
      if (!cycleId) return [];
      const { data, error } = await supabase
        .from('department_rating_questions')
        .select('*')
        .eq('cycle_id', cycleId)
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return data as RatingQuestion[];
    },
    enabled: !!cycleId
  });
}

export function useRatingAssignments(cycleId: string | undefined) {
  return useQuery({
    queryKey: ['department-rating-assignments', cycleId],
    queryFn: async () => {
      if (!cycleId) return [];
      const { data, error } = await supabase
        .from('department_rating_assignments')
        .select('*')
        .eq('cycle_id', cycleId);
      if (error) throw error;
      return data as RatingAssignment[];
    },
    enabled: !!cycleId
  });
}

export function useEmployeeDepartmentRatings(cycleId: string | undefined, employeeId: string | undefined) {
  return useQuery({
    queryKey: ['employee-department-ratings', cycleId, employeeId],
    queryFn: async () => {
      if (!cycleId || !employeeId) return [];
      const { data, error } = await supabase
        .from('department_ratings')
        .select('*')
        .eq('cycle_id', cycleId)
        .eq('employee_id', employeeId);
      if (error) throw error;
      return data as DepartmentRating[];
    },
    enabled: !!cycleId && !!employeeId
  });
}

export function useAllDepartmentRatings(cycleId: string | undefined) {
  return useQuery({
    queryKey: ['all-department-ratings', cycleId],
    queryFn: async () => {
      if (!cycleId) return [];
      const { data, error } = await supabase
        .from('department_ratings')
        .select('*')
        .eq('cycle_id', cycleId);
      if (error) throw error;
      return data as DepartmentRating[];
    },
    enabled: !!cycleId
  });
}

export function useDepartmentRatingMutations() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createCycle = useMutation({
    mutationFn: async (cycle: { name: string; description?: string; start_date: string; end_date: string; created_by?: string }) => {
      const { data, error } = await supabase
        .from('department_rating_cycles')
        .insert(cycle)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['department-rating-cycles'] });
      toast({ title: 'Success', description: 'Rating cycle created' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' })
  });

  const updateCycleStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('department_rating_cycles')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['department-rating-cycles'] });
      queryClient.invalidateQueries({ queryKey: ['active-department-rating-cycle'] });
      toast({ title: 'Success', description: 'Cycle status updated' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' })
  });

  const createQuestion = useMutation({
    mutationFn: async (q: { cycle_id: string; question_text: string; question_category?: string; sort_order?: number; created_by?: string }) => {
      const { data, error } = await supabase
        .from('department_rating_questions')
        .insert(q)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['department-rating-questions', vars.cycle_id] });
      toast({ title: 'Success', description: 'Question added' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' })
  });

  const deleteQuestion = useMutation({
    mutationFn: async ({ id, cycleId }: { id: string; cycleId: string }) => {
      const { error } = await supabase
        .from('department_rating_questions')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return cycleId;
    },
    onSuccess: (cycleId) => {
      queryClient.invalidateQueries({ queryKey: ['department-rating-questions', cycleId] });
      toast({ title: 'Success', description: 'Question deleted' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' })
  });

  const assignQuestionsToDepartment = useMutation({
    mutationFn: async ({ cycleId, departmentId, questionIds }: { cycleId: string; departmentId: string; questionIds: string[] }) => {
      const rows = questionIds.map(qId => ({
        cycle_id: cycleId,
        department_id: departmentId,
        question_id: qId
      }));
      const { error } = await supabase
        .from('department_rating_assignments')
        .upsert(rows, { onConflict: 'cycle_id,department_id,question_id' });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['department-rating-assignments', vars.cycleId] });
      toast({ title: 'Success', description: 'Questions assigned to department' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' })
  });

  const removeAssignment = useMutation({
    mutationFn: async ({ id, cycleId }: { id: string; cycleId: string }) => {
      const { error } = await supabase
        .from('department_rating_assignments')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return cycleId;
    },
    onSuccess: (cycleId) => {
      queryClient.invalidateQueries({ queryKey: ['department-rating-assignments', cycleId] });
    }
  });

  const submitRating = useMutation({
    mutationFn: async (rating: { cycle_id: string; department_id: string; question_id: string; employee_id: string; rating: number; comment?: string }) => {
      const { data, error } = await supabase
        .from('department_ratings')
        .upsert(rating, { onConflict: 'cycle_id,department_id,question_id,employee_id' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['employee-department-ratings', vars.cycle_id, vars.employee_id] });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' })
  });

  return {
    createCycle,
    updateCycleStatus,
    createQuestion,
    deleteQuestion,
    assignQuestionsToDepartment,
    removeAssignment,
    submitRating
  };
}
