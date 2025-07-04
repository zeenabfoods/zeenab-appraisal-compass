
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface RecentActivity {
  id: string;
  type: 'appraisal_submitted' | 'appraisal_completed' | 'cycle_started' | 'manager_review' | 'questions_assigned';
  message: string;
  timestamp: string;
  relatedUser?: string;
  status?: 'success' | 'pending' | 'info';
}

export function useRecentActivities() {
  return useQuery({
    queryKey: ['recent-activities'],
    queryFn: async (): Promise<RecentActivity[]> => {
      const activities: RecentActivity[] = [];

      // Get recent appraisal submissions
      const { data: recentAppraisals } = await supabase
        .from('appraisals')
        .select(`
          id,
          status,
          employee_submitted_at,
          manager_reviewed_at,
          completed_at,
          profiles!appraisals_employee_id_fkey(first_name, last_name),
          appraisal_cycles(name)
        `)
        .not('employee_submitted_at', 'is', null)
        .order('employee_submitted_at', { ascending: false })
        .limit(5);

      if (recentAppraisals) {
        recentAppraisals.forEach(appraisal => {
          const employeeName = `${appraisal.profiles?.first_name} ${appraisal.profiles?.last_name}`;
          const cycleName = appraisal.appraisal_cycles?.name;
          
          if (appraisal.status === 'completed' && appraisal.completed_at) {
            activities.push({
              id: `${appraisal.id}-completed`,
              type: 'appraisal_completed',
              message: `${employeeName} completed appraisal for ${cycleName}`,
              timestamp: appraisal.completed_at,
              relatedUser: employeeName,
              status: 'success'
            });
          } else if (appraisal.status === 'manager_review' && appraisal.manager_reviewed_at) {
            activities.push({
              id: `${appraisal.id}-manager-review`,
              type: 'manager_review',
              message: `Manager review pending for ${employeeName} (${cycleName})`,
              timestamp: appraisal.manager_reviewed_at,
              relatedUser: employeeName,
              status: 'pending'
            });
          } else if (appraisal.employee_submitted_at) {
            activities.push({
              id: `${appraisal.id}-submitted`,
              type: 'appraisal_submitted',
              message: `${employeeName} submitted appraisal for ${cycleName}`,
              timestamp: appraisal.employee_submitted_at,
              relatedUser: employeeName,
              status: 'info'
            });
          }
        });
      }

      // Get recent cycle activities
      const { data: recentCycles } = await supabase
        .from('appraisal_cycles')
        .select('id, name, status, start_date, created_at')
        .order('created_at', { ascending: false })
        .limit(3);

      if (recentCycles) {
        recentCycles.forEach(cycle => {
          if (cycle.status === 'active') {
            activities.push({
              id: `${cycle.id}-started`,
              type: 'cycle_started',
              message: `${cycle.name} appraisal cycle started`,
              timestamp: cycle.start_date || cycle.created_at,
              status: 'info'
            });
          }
        });
      }

      // Get recent notifications (as a proxy for other activities)
      const { data: recentNotifications } = await supabase
        .from('notifications')
        .select(`
          id,
          type,
          title,
          message,
          created_at,
          profiles!notifications_related_employee_id_fkey(first_name, last_name)
        `)
        .eq('type', 'questions_assigned')
        .order('created_at', { ascending: false })
        .limit(3);

      if (recentNotifications) {
        recentNotifications.forEach(notification => {
          const employeeName = notification.profiles 
            ? `${notification.profiles.first_name} ${notification.profiles.last_name}`
            : 'Unknown Employee';
          
          activities.push({
            id: `${notification.id}-questions`,
            type: 'questions_assigned',
            message: `Questions assigned to ${employeeName}`,
            timestamp: notification.created_at || new Date().toISOString(),
            relatedUser: employeeName,
            status: 'info'
          });
        });
      }

      // Sort all activities by timestamp (most recent first)
      return activities
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 5);
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}
