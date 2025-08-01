
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useRecentActivities } from '@/hooks/useRecentActivities';
import { formatDistanceToNow } from 'date-fns';
import { Activity, Clock, AlertTriangle } from 'lucide-react';

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
          <div className="flex items-center justify-center py-8">
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
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center text-red-500">
              <AlertTriangle className="h-4 w-4 mr-2" />
              <span className="text-sm">Unable to load activities</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // If no activities, show empty state
  if (!activities || activities.length === 0) {
    return (
      <Card className="backdrop-blur-md bg-white/60 border-white/40 shadow-lg">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest appraisal activities</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Activity className="h-12 w-12 text-gray-400 mb-3" />
            <p className="text-sm text-gray-500 mb-1">No recent activities</p>
            <p className="text-xs text-gray-400">Activities will appear here once appraisals are submitted</p>
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
        <div className="space-y-4">
          {activities.map((activity) => (
            <div key={activity.id} className="flex items-start space-x-3 p-3 rounded-lg bg-white/40 border border-white/60">
              <div className="flex-shrink-0 mt-1">
                <div className={`w-2 h-2 rounded-full ${
                  activity.status === 'success' ? 'bg-green-500' : 
                  activity.status === 'pending' ? 'bg-orange-500' : 
                  'bg-blue-500'
                }`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {activity.message}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
