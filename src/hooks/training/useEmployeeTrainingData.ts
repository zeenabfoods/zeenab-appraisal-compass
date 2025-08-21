
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface TrainingAssignment {
  id: string;
  employee_id: string;
  training_id: string;
  assigned_by: string;
  assigned_at: string;
  due_date: string;
  status: string;
  training: {
    id: string;
    title: string;
    description: string;
    content_type: string;
    content_url: string;
    file_path: string;
    duration_minutes: number;
    pass_mark: number;
  };
  progress?: {
    progress_percentage: number;
    time_spent_minutes: number;
    completed_at: string | null;
  };
}

export function useEmployeeTrainingData() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [assignments, setAssignments] = useState<TrainingAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAssignments = async () => {
    if (!profile?.id) return;

    try {
      setLoading(true);

      // Fetch training assignments with training details
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('training_assignments')
        .select(`
          *,
          trainings (
            id,
            title,
            description,
            content_type,
            content_url,
            file_path,
            duration_minutes,
            pass_mark
          )
        `)
        .eq('employee_id', profile.id)
        .order('assigned_at', { ascending: false });

      if (assignmentsError) throw assignmentsError;

      // Fetch progress for each assignment
      const assignmentsWithProgress = await Promise.all(
        (assignmentsData || []).map(async (assignment) => {
          const { data: progressData } = await supabase
            .from('training_progress')
            .select('*')
            .eq('assignment_id', assignment.id)
            .single();

          return {
            ...assignment,
            training: assignment.trainings,
            progress: progressData || undefined
          };
        })
      );

      setAssignments(assignmentsWithProgress);

    } catch (error) {
      console.error('Error fetching training assignments:', error);
      toast({
        title: "Error",
        description: "Failed to load training assignments",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, [profile?.id]);

  return {
    assignments,
    loading,
    refetch: fetchAssignments
  };
}
