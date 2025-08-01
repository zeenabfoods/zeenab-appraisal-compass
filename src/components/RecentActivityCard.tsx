
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Clock, User, FileText, CheckCircle, AlertCircle, Calendar } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface RecentActivity {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: string;
  status?: string;
  employee_name?: string;
  cycle_name?: string;
}

export function RecentActivityCard() {
  const { data: activities, isLoading } = useQuery({
    queryKey: ['recent-activities'],
    queryFn: async () => {
      // Get recent appraisal submissions and updates
      const { data: appraisals, error: appraisalsError } = await supabase
        .from('appraisals')
        .select(`
          id,
          status,
          employee_submitted_at,
          manager_reviewed_at,
          committee_reviewed_at,
          created_at,
          employee:profiles!appraisals_employee_id_fkey(first_name, last_name),
          cycle:appraisal_cycles(name)
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      if (appraisalsError) {
        console.error('Error fetching appraisals:', appraisalsError);
        return [];
      }

      // Transform appraisal data into activity items
      const activities: RecentActivity[] = [];

      appraisals?.forEach(appraisal => {
        const employeeName = appraisal.employee 
          ? `${appraisal.employee.first_name} ${appraisal.employee.last_name}`
          : 'Unknown Employee';
        const cycleName = appraisal.cycle?.name || 'Unknown Cycle';

        // Add activity for appraisal creation
        activities.push({
          id: `${appraisal.id}-created`,
          type: 'appraisal_created',
          title: 'New Appraisal Created',
          description: `Appraisal created for ${employeeName} - ${cycleName}`,
          timestamp: appraisal.created_at,
          status: appraisal.status,
          employee_name: employeeName,
          cycle_name: cycleName
        });

        // Add activity for employee submission
        if (appraisal.employee_submitted_at) {
          activities.push({
            id: `${appraisal.id}-submitted`,
            type: 'appraisal_submitted',
            title: 'Employee Submission',
            description: `${employeeName} submitted their appraisal for ${cycleName}`,
            timestamp: appraisal.employee_submitted_at,
            status: 'submitted',
            employee_name: employeeName,
            cycle_name: cycleName
          });
        }

        // Add activity for manager review
        if (appraisal.manager_reviewed_at) {
          activities.push({
            id: `${appraisal.id}-manager-reviewed`,
            type: 'manager_review',
            title: 'Manager Review Completed',
            description: `Manager completed review for ${employeeName} - ${cycleName}`,
            timestamp: appraisal.manager_reviewed_at,
            status: 'manager_reviewed',
            employee_name: employeeName,
            cycle_name: cycleName
          });
        }

        // Add activity for committee review
        if (appraisal.committee_reviewed_at) {
          activities.push({
            id: `${appraisal.id}-committee-reviewed`,
            type: 'committee_review',
            title: 'Committee Review Completed',
            description: `Committee completed review for ${employeeName} - ${cycleName}`,
            timestamp: appraisal.committee_reviewed_at,
            status: 'committee_reviewed',
            employee_name: employeeName,
            cycle_name: cycleName
          });
        }
      });

      // Sort by timestamp and return the most recent 5
      return activities
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 5);
    },
    refetchInterval: 30000 // Refresh every 30 seconds for real-time updates
  });

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'appraisal_created':
        return <FileText className="h-4 w-4" />;
      case 'appraisal_submitted':
        return <CheckCircle className="h-4 w-4" />;
      case 'manager_review':
        return <User className="h-4 w-4" />;
      case 'committee_review':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Calendar className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'submitted':
        return 'bg-blue-100 text-blue-800';
      case 'manager_reviewed':
        return 'bg-green-100 text-green-800';
      case 'committee_reviewed':
        return 'bg-purple-100 text-purple-800';
      case 'completed':
        return 'bg-emerald-100 text-emerald-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <Card className="backdrop-blur-md bg-white/60 border-white/40 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600"></div>
            <span className="ml-2 text-sm text-gray-600">Loading activities...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="backdrop-blur-md bg-white/60 border-white/40 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!activities || activities.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">No recent activities</p>
            <p className="text-sm text-gray-500 mt-2">
              Activity will appear here as appraisals are created and reviewed
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => (
              <div key={activity.id} className="flex items-start space-x-3 p-3 bg-white/50 rounded-lg">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center text-orange-600">
                    {getActivityIcon(activity.type)}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {activity.title}
                    </p>
                    {activity.status && (
                      <Badge className={`text-xs px-2 py-1 ${getStatusColor(activity.status)}`}>
                        {activity.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-2">
                    {activity.description}
                  </p>
                  <div className="flex items-center text-xs text-gray-500">
                    <Clock className="h-3 w-3 mr-1" />
                    {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
