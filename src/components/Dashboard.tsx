
import { useAuthContext } from '@/components/AuthProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BarChart3, Users, Shield, Clock, TrendingUp, Calendar, Award, AlertCircle } from 'lucide-react';
import { RecentActivityCard } from '@/components/RecentActivityCard';
import { QuickActionsCard } from '@/components/QuickActionsCard';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

export function Dashboard() {
  const { profile } = useAuthContext();
  const navigate = useNavigate();

  // Fetch dashboard statistics
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats', profile?.id],
    queryFn: async () => {
      console.log('Fetching dashboard stats...');
      
      // Get total appraisals for the user
      const { data: appraisals, error: appraisalsError } = await supabase
        .from('appraisals')
        .select('id')
        .eq('employee_id', profile?.id);

      if (appraisalsError) {
        console.error('Error fetching appraisals:', appraisalsError);
      }

      // Get pending reviews (appraisals that are not completed or draft)
      const { data: pendingReviews, error: pendingError } = await supabase
        .from('appraisals')
        .select('id')
        .eq('employee_id', profile?.id)
        .in('status', ['submitted', 'manager_review', 'hr_review', 'committee_review']);

      if (pendingError) {
        console.error('Error fetching pending reviews:', pendingError);
      }

      // Get team members if user is a manager
      let teamMembers = [];
      if (profile?.role === 'manager' || profile?.role === 'hr' || profile?.role === 'admin') {
        const { data: team, error: teamError } = await supabase
          .from('profiles')
          .select('id')
          .eq('line_manager_id', profile?.id);

        if (teamError) {
          console.error('Error fetching team members:', teamError);
        } else {
          teamMembers = team || [];
        }
      }

      // Calculate completion rate
      const { data: completedAppraisals, error: completedError } = await supabase
        .from('appraisals')
        .select('id')
        .eq('employee_id', profile?.id)
        .eq('status', 'completed');

      if (completedError) {
        console.error('Error fetching completed appraisals:', completedError);
      }

      const totalCount = appraisals?.length || 0;
      const completedCount = completedAppraisals?.length || 0;
      const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

      return {
        totalAppraisals: totalCount,
        pendingReviews: pendingReviews?.length || 0,
        teamMembers: teamMembers.length,
        completionRate
      };
    },
    enabled: !!profile?.id,
  });

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const statsData = stats || {
    totalAppraisals: 0,
    pendingReviews: 0,
    teamMembers: 0,
    completionRate: 0
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Welcome back, {profile.first_name}! Here's your performance overview.</p>
        </div>
      </div>

      {/* 3D Statistics Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Appraisals Card */}
        <div className="stats-card-3d group cursor-pointer" onClick={() => navigate('/my-appraisals')}>
          <div className="stats-card-inner">
            <div className="stats-card-front bg-gradient-to-br from-orange-500 to-orange-600">
              <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                <h3 className="text-sm font-medium text-white/90">Total Appraisals</h3>
                <BarChart3 className="h-5 w-5 text-white/80" />
              </div>
              <div className="text-3xl font-bold text-white">{isLoading ? '...' : statsData.totalAppraisals}</div>
              <p className="text-xs text-white/70 mt-1">
                {statsData.totalAppraisals === 0 ? 'No appraisals yet' : 'Click to view details'}
              </p>
            </div>
            <div className="stats-card-back bg-gradient-to-br from-orange-600 to-orange-700">
              <div className="text-center text-white">
                <Award className="h-8 w-8 mx-auto mb-2 text-white/90" />
                <p className="text-sm">Performance Reviews</p>
                <p className="text-xs text-white/70 mt-1">Track your progress</p>
              </div>
            </div>
          </div>
        </div>

        {/* Pending Reviews Card */}
        <div className="stats-card-3d group cursor-pointer" onClick={() => navigate('/my-appraisals')}>
          <div className="stats-card-inner">
            <div className="stats-card-front bg-gradient-to-br from-amber-500 to-orange-500">
              <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                <h3 className="text-sm font-medium text-white/90">Pending Reviews</h3>
                <Clock className="h-5 w-5 text-white/80" />
              </div>
              <div className="text-3xl font-bold text-white">{isLoading ? '...' : statsData.pendingReviews}</div>
              <p className="text-xs text-white/70 mt-1">
                {statsData.pendingReviews === 0 ? 'All caught up!' : 'Need attention'}
              </p>
            </div>
            <div className="stats-card-back bg-gradient-to-br from-orange-500 to-red-500">
              <div className="text-center text-white">
                <AlertCircle className="h-8 w-8 mx-auto mb-2 text-white/90" />
                <p className="text-sm">In Review</p>
                <p className="text-xs text-white/70 mt-1">Awaiting feedback</p>
              </div>
            </div>
          </div>
        </div>

        {/* Team Members Card */}
        <div className="stats-card-3d group cursor-pointer" onClick={() => navigate('/employee-management')}>
          <div className="stats-card-inner">
            <div className="stats-card-front bg-gradient-to-br from-red-500 to-orange-500">
              <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                <h3 className="text-sm font-medium text-white/90">Team Members</h3>
                <Users className="h-5 w-5 text-white/80" />
              </div>
              <div className="text-3xl font-bold text-white">{isLoading ? '...' : statsData.teamMembers}</div>
              <p className="text-xs text-white/70 mt-1">
                {profile.role === 'staff' ? 'Not a manager' : statsData.teamMembers === 0 ? 'No direct reports' : 'Direct reports'}
              </p>
            </div>
            <div className="stats-card-back bg-gradient-to-br from-orange-600 to-red-600">
              <div className="text-center text-white">
                <Users className="h-8 w-8 mx-auto mb-2 text-white/90" />
                <p className="text-sm">Your Team</p>
                <p className="text-xs text-white/70 mt-1">Manage performance</p>
              </div>
            </div>
          </div>
        </div>

        {/* Completion Rate Card */}
        <div className="stats-card-3d group cursor-pointer" onClick={() => navigate('/my-appraisals')}>
          <div className="stats-card-inner">
            <div className="stats-card-front bg-gradient-to-br from-orange-600 to-red-600">
              <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                <h3 className="text-sm font-medium text-white/90">Completion Rate</h3>
                <TrendingUp className="h-5 w-5 text-white/80" />
              </div>
              <div className="text-3xl font-bold text-white">{isLoading ? '...' : `${statsData.completionRate}%`}</div>
              <p className="text-xs text-white/70 mt-1">
                {statsData.completionRate === 0 ? 'No data yet' : 'Performance score'}
              </p>
            </div>
            <div className="stats-card-back bg-gradient-to-br from-red-500 to-orange-600">
              <div className="text-center text-white">
                <Shield className="h-8 w-8 mx-auto mb-2 text-white/90" />
                <p className="text-sm">Progress</p>
                <p className="text-xs text-white/70 mt-1">Keep improving</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        <RecentActivityCard />
        <QuickActionsCard />
      </div>
    </div>
  );
}
