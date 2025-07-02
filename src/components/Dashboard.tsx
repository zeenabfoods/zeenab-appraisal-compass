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
  totalEmployees: number;
  completedAppraisals: number;
  pendingAppraisals: number;
  averageScore: number;
}

const performanceData = [
  { name: 'Q1', score: 85 },
  { name: 'Q2', score: 88 },
  { name: 'Q3', score: 92 },
  { name: 'Q4', score: 89 },
];

const statusData = [
  { name: 'Completed', value: 65, color: '#10b981' },
  { name: 'In Progress', value: 25, color: '#f59e0b' },
  { name: 'Not Started', value: 10, color: '#ef4444' },
];

export function Dashboard() {
  const { profile, user, loading, authReady } = useAuth();
  const navigate = useNavigate();
  const [currentProfile, setCurrentProfile] = useState<ExtendedProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [cycles, setCycles] = useState<AppraisalCycle[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalEmployees: 0,
    completedAppraisals: 0,
    pendingAppraisals: 0,
    averageScore: 0
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
    if (authReady && user) {
      console.log('Auth ready and user exists, loading dashboard data');
      loadDashboardData();
    } else if (authReady && !user) {
      console.log('Auth ready but no user, stopping dashboard loading');
      setDashboardLoading(false);
    }
  }, [authReady, user]);

  const loadDashboardData = async () => {
    try {
      console.log('Loading dashboard data...');
      setDashboardLoading(true);
      
      // Load real data from database
      const [
        { data: profilesData, error: profilesError },
        { data: appraisalsData, error: appraisalsError },
        { data: cyclesData, error: cyclesError }
      ] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, is_active')
          .eq('is_active', true),
        supabase
          .from('appraisals')
          .select('id, status, overall_score'),
        supabase
          .from('appraisal_cycles')
          .select('*')
          .order('created_at', { ascending: false })
      ]);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
      }
      if (appraisalsError) {
        console.error('Error fetching appraisals:', appraisalsError);
      }
      if (cyclesError) {
        console.error('Error fetching cycles:', cyclesError);
      }

      // Calculate actual stats
      const totalEmployees = profilesData?.length || 0;
      const completedAppraisals = appraisalsData?.filter(a => a.status === 'completed').length || 0;
      const pendingAppraisals = appraisalsData?.filter(a => a.status === 'submitted' || a.status === 'manager_review').length || 0;
      
      // Calculate average score from completed appraisals
      const completedWithScores = appraisalsData?.filter(a => a.status === 'completed' && a.overall_score) || [];
      const averageScore = completedWithScores.length > 0 
        ? completedWithScores.reduce((sum, a) => sum + (a.overall_score || 0), 0) / completedWithScores.length
        : 0;

      console.log('📊 Dashboard stats calculated:', {
        totalEmployees,
        completedAppraisals,
        pendingAppraisals,
        averageScore: averageScore.toFixed(1)
      });

      setStats({
        totalEmployees,
        completedAppraisals,
        pendingAppraisals,
        averageScore: parseFloat(averageScore.toFixed(1))
      });

      if (cyclesData) {
        console.log('Loaded cycles:', cyclesData.length);
        setCycles(cyclesData);
      }

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      // Set fallback values if real data fails
      setStats({
        totalEmployees: 0,
        completedAppraisals: 0,
        pendingAppraisals: 0,
        averageScore: 0
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

  // Quick Actions handlers
  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'review-team':
        navigate('/manager-appraisals');
        break;
      case 'view-analytics':
        navigate('/company-reports');
        break;
      case 'manage-cycles':
        navigate('/appraisal-cycles');
        break;
      default:
        console.log('Unknown action:', action);
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

      {/* Stats Grid - Show real data from database */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="backdrop-blur-md bg-white/60 border-white/40 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardLoading ? '...' : stats.totalEmployees}</div>
            <p className="text-xs text-muted-foreground">
              Active team members
            </p>
          </CardContent>
        </Card>

        <Card className="backdrop-blur-md bg-white/60 border-white/40 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Appraisals</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardLoading ? '...' : stats.completedAppraisals}</div>
            <p className="text-xs text-muted-foreground">
              Finalized appraisals
            </p>
          </CardContent>
        </Card>

        <Card className="backdrop-blur-md bg-white/60 border-white/40 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Reviews</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardLoading ? '...' : stats.pendingAppraisals}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting completion
            </p>
          </CardContent>
        </Card>

        <Card className="backdrop-blur-md bg-white/60 border-white/40 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
            <Star className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboardLoading ? '...' : stats.averageScore > 0 ? `${stats.averageScore}%` : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.averageScore > 0 ? 'Team performance' : 'No completed appraisals'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Appraisal History and Performance Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <AppraisalHistoryCard />

        <Card className="backdrop-blur-md bg-white/60 border-white/40 shadow-lg">
          <CardHeader>
            <CardTitle>Performance Trends</CardTitle>
            <CardDescription>
              Your quarterly performance scores
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="score" fill="#fb923c" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Team Overview (for managers) */}
      {(currentProfile?.role === 'manager' || currentProfile?.role === 'hr' || currentProfile?.role === 'admin') && (
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="backdrop-blur-md bg-white/60 border-white/40 shadow-lg">
            <CardHeader>
              <CardTitle>Team Status Overview</CardTitle>
              <CardDescription>
                Appraisal completion status across your team
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="backdrop-blur-md bg-white/60 border-white/40 shadow-lg">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Common management tasks
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => handleQuickAction('review-team')}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Review Team Appraisals
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => handleQuickAction('view-analytics')}
                >
                  <TrendingUp className="h-4 w-4 mr-2" />
                  View Analytics
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => handleQuickAction('manage-cycles')}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Manage Cycles
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Access Restriction Dialog */}
      <AppraisalAccessDialog
        isOpen={showAccessDialog}
        onClose={() => setShowAccessDialog(false)}
        appraisalName={selectedAppraisal}
      />
    </div>
  );
}
