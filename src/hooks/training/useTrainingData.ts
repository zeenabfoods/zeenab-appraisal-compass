
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface TrainingStats {
  activeTrainings: number;
  activeAssignments: number;
  overdueAssignments: number;
  disciplinaryPanels: number;
  completionRate: number;
}

export function useTrainingData() {
  const { toast } = useToast();
  const [stats, setStats] = useState<TrainingStats>({
    activeTrainings: 0,
    activeAssignments: 0,
    overdueAssignments: 0,
    disciplinaryPanels: 0,
    completionRate: 0
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      setLoading(true);
      
      // Get active trainings count
      const { count: activeTrainings } = await supabase
        .from('trainings')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      // Get active assignments count
      const { count: activeAssignments } = await supabase
        .from('training_assignments')
        .select('*', { count: 'exact', head: true })
        .in('status', ['assigned', 'in_progress']);

      // Get overdue assignments
      const { count: overdueAssignments } = await supabase
        .from('training_assignments')
        .select('*', { count: 'exact', head: true })
        .in('status', ['assigned', 'in_progress'])
        .lt('due_date', new Date().toISOString());

      // Get disciplinary panels count
      const { count: disciplinaryPanels } = await supabase
        .from('disciplinary_panels')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      // Calculate completion rate
      const { count: totalAssignments } = await supabase
        .from('training_assignments')
        .select('*', { count: 'exact', head: true });

      const { count: completedAssignments } = await supabase
        .from('training_assignments')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed');

      const completionRate = totalAssignments ? 
        Math.round((completedAssignments / totalAssignments) * 100) : 0;

      setStats({
        activeTrainings: activeTrainings || 0,
        activeAssignments: activeAssignments || 0,
        overdueAssignments: overdueAssignments || 0,
        disciplinaryPanels: disciplinaryPanels || 0,
        completionRate
      });

    } catch (error) {
      console.error('Error fetching training stats:', error);
      toast({
        title: "Error",
        description: "Failed to load training statistics",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return {
    stats,
    loading,
    refetch: fetchStats
  };
}
