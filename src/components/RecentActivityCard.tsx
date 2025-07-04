
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useRecentActivities, RecentActivity } from '@/hooks/useRecentActivities';
import { formatDistanceToNow } from 'date-fns';
import { CheckCircle, Clock, AlertTriangle, Activity } from 'lucide-react';

const getActivityIcon = (type: RecentActivity['type'], status?: RecentActivity['status']) => {
  switch (status) {
    case 'success':
      return <CheckCircle className="h-2 w-2 text-green-500" />;
    case 'pending':
      return <Clock className="h-2 w-2 text-orange-500" />;
    case 'info':
    default:
      return <Activity className="h-2 w-2 text-blue-500" />;
  }
};

const getTimeAgo = (timestamp: string) => {
  try {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
  } catch {
    return 'Recently';
  }
};

export function RecentActivityCard() {
  const { data: activities, isLoading, error } = useRecentActivities();

  if (isLoading) {
    return (
      <Card className="backdrop-blur-md bg-white/60 border-white/40 shadow-lg">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest appraisal activities</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="backdrop-blur-md bg-white/60 border-white/40 shadow-lg">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest appraisal activities</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <div className="flex items-center text-red-500">
              <AlertTriangle className="h-4 w-4 mr-2" />
              <span className="text-sm">Failed to load activities</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="backdrop-blur-md bg-white/60 border-white/40 shadow-lg">
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>Latest appraisal activities</CardDescription>
      </CardHeader>
      <CardContent>
        {activities && activities.length > 0 ? (
          <div className="space-y-4">
            {activities.map((activity) => (
              <div key={activity.id} className="flex items-start space-x-4">
                <div className="flex items-center justify-center w-6 h-6 mt-1">
                  {getActivityIcon(activity.type, activity.status)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {activity.message}
                  </p>
                  <p className="text-xs text-gray-500">
                    {getTimeAgo(activity.timestamp)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4">
            <Activity className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No recent activities</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
