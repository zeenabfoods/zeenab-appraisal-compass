
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AppraisalAccessDialog } from '@/components/AppraisalAccessDialog';
import { EmployeeAssignedQuestions } from '@/components/EmployeeAssignedQuestions';
import { AppraisalHistoryCard } from '@/components/AppraisalHistoryCard';
import { EmployeeProfileCard } from '@/components/EmployeeProfileCard';
import { CompanyPerformanceTrend } from '@/components/CompanyPerformanceTrend';
import { PerformanceScoreCalculator } from '@/components/PerformanceScoreCalculator';
import { HRAnalytics } from '@/components/HRAnalytics';
import { RecentActivityCard } from '@/components/RecentActivityCard';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Profile } from '@/hooks/useAuth';
import { EmployeeProfileService, ExtendedProfile } from '@/services/employeeProfileService';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  TrendingUp, 
  Calendar, 
  Award, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  Target,
  Star,
  RefreshCw,
  Building2,
  UserCheck
} from 'lucide-react';

interface AppraisalCycle {
  id: string;
  name: string;
  status: string;
  start_date: string;
  end_date: string;
  quarter: number;
  year: number;
}

interface DashboardStats {
  totalAppraisals: number;
  pendingAppraisals: number;
  completedAppraisals: number;
  averageScore: number;
  teamMembers: number;
  completionRate: number;
}

export function Dashboard() {
  const { profile, user, loading, authReady } = useAuth();
  const navigate = useNavigate();
  const [currentProfile, setCurrentProfile] = useState<ExtendedProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [cycles, setCycles] = useState<AppraisalCycle[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalAppraisals: 0,
    pendingAppraisals: 0,
    completedAppraisals: 0,
    averageScore: 0,
    teamMembers: 0,
    completionRate: 0
  });
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [showAccessDialog, setShowAccessDialog] = useState(false);
  const [selectedAppraisal, setSelectedAppraisal] = useState<string>('');

  // Load the enhanced profile when auth profile is available
  useEffect(() => {
    if (profile && authReady) {
      console.log('📋 Dashboard loading enhanced profile for:', profile.id);
      loadEnhancedProfile(profile.id);
    }
  }, [profile, authReady]);

  const loadEnhancedProfile = async (profileId: string) => {
    setProfileLoading(true);
    try {
      console.log('🔄 Loading enhanced profile for dashboard...');
      const enhancedProfile = await EmployeeProfileService.getEmployeeProfileWithNames(profileId);
      console.log('✅ Enhanced profile loaded:', enhancedProfile);
      setCurrentProfile(enhancedProfile);
    } catch (error) {
      console.error('❌ Error loading enhanced profile:', error);
      // Fallback to basic profile if enhanced loading fails
      if (profile) {
        setCurrentProfile(profile as ExtendedProfile);
      }
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    // Only load dashboard data when auth is ready and user exists
    if (authReady && user && currentProfile) {
      console.log('Auth ready and user exists, loading dashboard data');
      loadDashboardData();
    } else if (authReady && !user) {
      console.log('Auth ready but no user, stopping dashboard loading');
      setDashboardLoading(false);
    }
  }, [authReady, user, currentProfile]);

  const loadDashboardData = async () => {
    try {
      console.log('Loading dashboard data...');
      setDashboardLoading(true);
      
      // Get current user's appraisals and stats
      let appraisalsQuery = supabase
        .from('appraisals')
        .select('id, status, overall_score, cycle_id');

      // If user is HR/Admin, get all appraisals, otherwise get only their own
      if (currentProfile?.role === 'hr' || currentProfile?.role === 'admin') {
        // HR/Admin can see all appraisals
      } else if (currentProfile?.role === 'manager' && currentProfile?.id) {
        // Managers can see their team's appraisals
        const { data: teamMembers } = await supabase
          .from('profiles')
          .select('id')
          .eq('line_manager_id', currentProfile.id);
        
        const teamIds = teamMembers ? teamMembers.map(t => t.id) : [];
        teamIds.push(currentProfile.id); // Include manager's own appraisals
        
        appraisalsQuery = appraisalsQuery.in('employee_id', teamIds);
      } else {
        // Regular employees see only their own appraisals
        appraisalsQuery = appraisalsQuery.eq('employee_id', currentProfile?.id);
      }

      const [
        { data: appraisalsData, error: appraisalsError },
        { data: cyclesData, error: cyclesError }
      ] = await Promise.all([
        appraisalsQuery,
        supabase
          .from('appraisal_cycles')
          .select('*')
          .order('created_at', { ascending: false })
      ]);

      if (appraisalsError) {
        console.error('Error fetching appraisals:', appraisalsError);
      }
      if (cyclesError) {
        console.error('Error fetching cycles:', cyclesError);
      }

      // Calculate team members count based on role
      let teamMembersCount = 0;
      if (currentProfile?.role === 'hr' || currentProfile?.role === 'admin') {
        const { data: allProfiles } = await supabase
          .from('profiles')
          .select('id')
          .eq('is_active', true);
        teamMembersCount = allProfiles?.length || 0;
      } else if (currentProfile?.role === 'manager' && currentProfile?.id) {
        const { data: teamMembers } = await supabase
          .from('profiles')
          .select('id')
          .eq('line_manager_id', currentProfile.id);
        teamMembersCount = teamMembers?.length || 0;
      } else {
        // Regular employees don't have team members
        teamMembersCount = 0;
      }

      // Calculate stats from actual data
      const totalAppraisals = appraisalsData?.length || 0;
      const completedAppraisals = appraisalsData?.filter(a => a.status === 'completed').length || 0;
      const pendingAppraisals = appraisalsData?.filter(a => ['submitted', 'manager_review', 'hr_review', 'committee_review'].includes(a.status)).length || 0;
      
      // Calculate average score from completed appraisals
      const completedWithScores = appraisalsData?.filter(a => a.status === 'completed' && a.overall_score) || [];
      const averageScore = completedWithScores.length > 0 
        ? completedWithScores.reduce((sum, a) => sum + (a.overall_score || 0), 0) / completedWithScores.length
        : 0;

      // Calculate completion rate
      const completionRate = totalAppraisals > 0 ? (completedAppraisals / totalAppraisals) * 100 : 0;

      console.log('📊 Dashboard stats calculated:', {
        totalAppraisals,
        completedAppraisals,
        pendingAppraisals,
        averageScore: averageScore.toFixed(1),
        teamMembersCount,
        completionRate: completionRate.toFixed(1)
      });

      setStats({
        totalAppraisals,
        pendingAppraisals,
        completedAppraisals,
        averageScore: parseFloat(averageScore.toFixed(1)),
        teamMembers: teamMembersCount,
        completionRate: parseFloat(completionRate.toFixed(1))
      });

      if (cyclesData) {
        console.log('Loaded cycles:', cyclesData.length);
        setCycles(cyclesData);
      }

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      // Set empty values if real data fails
      setStats({
        totalAppraisals: 0,
        pendingAppraisals: 0,
        completedAppraisals: 0,
        averageScore: 0,
        teamMembers: 0,
        completionRate: 0
      });
    } finally {
      setDashboardLoading(false);
    }
  };

  const handleProfileUpdate = async (updatedProfile: Profile) => {
    console.log('📋 Dashboard received profile update request:', updatedProfile);
    
    try {
      // Reload the enhanced profile from the database to get the latest data
      const freshProfile = await EmployeeProfileService.getEmployeeProfileWithNames(updatedProfile.id);
      console.log('✅ Fresh enhanced profile loaded:', freshProfile);
      setCurrentProfile(freshProfile);
    } catch (error) {
      console.error('❌ Error reloading enhanced profile:', error);
      // Fallback to the provided profile
      setCurrentProfile(updatedProfile as ExtendedProfile);
    }
  };

  const handleAppraisalClick = (cycle: AppraisalCycle) => {
    if (cycle.status === 'completed') {
      setSelectedAppraisal(cycle.name);
      setShowAccessDialog(true);
    } else {
      console.log('Navigate to appraisal:', cycle.id);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'archived': return 'bg-gray-100 text-gray-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <Clock className="h-4 w-4" />;
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'archived': return <Award className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  // Show loading only while auth is not ready or profile is loading
  if (!authReady || loading || profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Show error state if no user after auth is ready
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center backdrop-blur-md bg-white/60 border-white/40 rounded-xl p-8 shadow-lg">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-amber-500" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Authentication Required</h2>
          <p className="text-gray-600 mb-4">
            Please sign in to access your dashboard.
          </p>
          <Button 
            onClick={() => window.location.href = '/auth'} 
            className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
          >
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  // Get display name - always have a fallback
  const displayName = currentProfile?.first_name || user?.user_metadata?.first_name || user?.email?.split('@')[0] || 'User';

  return (
    <div className="space-y-6">
      {/* Welcome Section - Always show something */}
      <div className="backdrop-blur-md bg-white/60 border-white/40 rounded-xl p-6 shadow-lg">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Welcome back, {displayName}!
        </h1>
        <p className="text-gray-600">
          {dashboardLoading ? 'Loading your dashboard...' : 'Here\'s your performance dashboard overview'}
        </p>
        {dashboardLoading && (
          <div className="flex items-center mt-4">
            <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            <span className="text-sm text-gray-500">Fetching latest data...</span>
          </div>
        )}
      </div>

      {/* Enhanced Employee Information Card */}
      {currentProfile && (
        <div className="grid gap-6 md:grid-cols-2">
          <EmployeeProfileCard 
            profile={currentProfile} 
            onProfileUpdate={handleProfileUpdate}
          />
          
          {/* Department and Line Manager Info Card */}
          <div className="backdrop-blur-md bg-white/60 border-white/40 rounded-xl p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Users className="h-5 w-5" />
              Organizational Information
            </h2>
            <div className="space-y-4">
              {/* Department Information */}
              <div className="bg-white/50 rounded-lg p-4 border border-white/60">
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-gray-700">Department</span>
                </div>
                <p className="text-gray-900 font-semibold">
                  {currentProfile.department_name || 'No department assigned'}
                </p>
              </div>

              {/* Line Manager Information */}
              <div className="bg-white/50 rounded-lg p-4 border border-white/60">
                <div className="flex items-center gap-2 mb-2">
                  <UserCheck className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-gray-700">Line Manager</span>
                </div>
                <p className="text-gray-900 font-semibold">
                  {currentProfile.line_manager_name || 'No line manager assigned'}
                </p>
                {currentProfile.line_manager_name && (
                  <div className="mt-2 text-sm text-gray-600">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                      {currentProfile.role === 'staff' ? 'Direct Report' : 'Supervisor'}
                    </span>
                  </div>
                )}
              </div>

              {/* Position Information */}
              {currentProfile.position && (
                <div className="bg-white/50 rounded-lg p-4 border border-white/60">
                  <div className="flex items-center gap-2 mb-2">
                    <Award className="h-4 w-4 text-purple-600" />
                    <span className="text-sm font-medium text-gray-700">Position</span>
                  </div>
                  <p className="text-gray-900 font-semibold">
                    {currentProfile.position}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Show assigned questions for employees */}
      {currentProfile && (currentProfile.role === 'staff' || currentProfile.role === 'manager') && (
        <EmployeeAssignedQuestions employeeId={currentProfile.id} />
      )}

      {/* Beautiful 3D Stats Cards - Real data from database */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Appraisals Card */}
        <div className="group perspective-1000">
          <div className="relative preserve-3d transform transition-all duration-300 hover:rotate-y-12 hover:scale-105">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl transform translate-z-4 shadow-2xl"></div>
            <Card className="relative bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 shadow-xl hover:shadow-2xl transition-all duration-300 rounded-xl overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                <CardTitle className="text-sm font-medium text-orange-800">Total Appraisals</CardTitle>
                <div className="p-2 bg-orange-200 rounded-lg">
                  <TrendingUp className="h-4 w-4 text-orange-600" />
                </div>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="text-3xl font-bold text-orange-900 mb-1">
                  {dashboardLoading ? '...' : stats.totalAppraisals}
                </div>
                <p className="text-xs text-orange-600">
                  {stats.totalAppraisals === 0 ? 'No appraisals yet' : 'Your appraisals'}
                </p>
                <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-orange-200/30 to-transparent rounded-full transform translate-x-8 -translate-y-8"></div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Pending Reviews Card */}
        <div className="group perspective-1000">
          <div className="relative preserve-3d transform transition-all duration-300 hover:rotate-y-12 hover:scale-105">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl transform translate-z-4 shadow-2xl"></div>
            <Card className="relative bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200 shadow-xl hover:shadow-2xl transition-all duration-300 rounded-xl overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                <CardTitle className="text-sm font-medium text-amber-800">Pending Reviews</CardTitle>
                <div className="p-2 bg-amber-200 rounded-lg">
                  <Clock className="h-4 w-4 text-amber-600" />
                </div>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="text-3xl font-bold text-amber-900 mb-1">
                  {dashboardLoading ? '...' : stats.pendingAppraisals}
                </div>
                <p className="text-xs text-amber-600">
                  {stats.pendingAppraisals === 0 ? 'No pending reviews' : 'Awaiting completion'}
                </p>
                <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-amber-200/30 to-transparent rounded-full transform translate-x-8 -translate-y-8"></div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Team Members Card */}
        <div className="group perspective-1000">
          <div className="relative preserve-3d transform transition-all duration-300 hover:rotate-y-12 hover:scale-105">
            <div className="absolute inset-0 bg-gradient-to-br from-red-400 to-red-600 rounded-xl transform translate-z-4 shadow-2xl"></div>
            <Card className="relative bg-gradient-to-br from-red-50 to-red-100 border-red-200 shadow-xl hover:shadow-2xl transition-all duration-300 rounded-xl overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                <CardTitle className="text-sm font-medium text-red-800">
                  {currentProfile?.role === 'hr' || currentProfile?.role === 'admin' ? 'All Employees' : 'Team Members'}
                </CardTitle>
                <div className="p-2 bg-red-200 rounded-lg">
                  <Users className="h-4 w-4 text-red-600" />
                </div>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="text-3xl font-bold text-red-900 mb-1">
                  {dashboardLoading ? '...' : stats.teamMembers}
                </div>
                <p className="text-xs text-red-600">
                  {stats.teamMembers === 0 ? 'No team members' : 
                   currentProfile?.role === 'hr' || currentProfile?.role === 'admin' ? 'Total employees' : 'Your team'}
                </p>
                <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-red-200/30 to-transparent rounded-full transform translate-x-8 -translate-y-8"></div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Completion Rate Card */}
        <div className="group perspective-1000">
          <div className="relative preserve-3d transform transition-all duration-300 hover:rotate-y-12 hover:scale-105">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl transform translate-z-4 shadow-2xl"></div>
            <Card className="relative bg-gradient-to-br from-orange-50 to-red-50 border-orange-200 shadow-xl hover:shadow-2xl transition-all duration-300 rounded-xl overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                <CardTitle className="text-sm font-medium text-red-800">Completion Rate</CardTitle>
                <div className="p-2 bg-gradient-to-br from-orange-200 to-red-200 rounded-lg">
                  <CheckCircle className="h-4 w-4 text-red-600" />
                </div>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="text-3xl font-bold text-red-900 mb-1">
                  {dashboardLoading ? '...' : stats.completionRate > 0 ? `${stats.completionRate}%` : '0%'}
                </div>
                <p className="text-xs text-red-600">
                  {stats.totalAppraisals === 0 ? 'No appraisals to track' : 'Completed appraisals'}
                </p>
                <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-orange-200/30 to-red-200/30 rounded-full transform translate-x-8 -translate-y-8"></div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Recent Activity with Real Data */}
      <div className="grid gap-6 md:grid-cols-2">
        <RecentActivityCard />
        
        {/* Company Performance Trend */}
        <CompanyPerformanceTrend />
      </div>

      {/* HR Analytics for HR/Admin users */}
      {currentProfile && (currentProfile.role === 'hr' || currentProfile.role === 'admin') && (
        <HRAnalytics />
      )}

      {/* Performance Score Calculator */}
      {currentProfile && (
        <PerformanceScoreCalculator 
          employeeId={currentProfile.id}
          showAllEmployees={currentProfile.role === 'hr' || currentProfile.role === 'admin'}
        />
      )}

      {/* Appraisal History */}
      <AppraisalHistoryCard />

      {/* Access Restriction Dialog */}
      <AppraisalAccessDialog
        isOpen={showAccessDialog}
        onClose={() => setShowAccessDialog(false)}
        appraisalName={selectedAppraisal}
      />
    </div>
  );
}
