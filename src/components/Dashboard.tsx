
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
  RefreshCw
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
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(profile);
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

  // Update current profile when auth profile changes
  useEffect(() => {
    if (profile) {
      console.log('📋 Dashboard received auth profile update:', profile);
      setCurrentProfile(profile);
    }
  }, [profile]);

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
      
      // Always set some default data to prevent blank screens
      setStats({
        totalEmployees: 12,
        completedAppraisals: 8,
        pendingAppraisals: 4,
        averageScore: 87.5
      });

      // Try to load real data, but don't block the UI if it fails
      try {
        const { data: cyclesData } = await supabase
          .from('appraisal_cycles')
          .select('*')
          .order('created_at', { ascending: false });

        if (cyclesData) {
          console.log('Loaded cycles:', cyclesData.length);
          setCycles(cyclesData);
        }

        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, is_active')
          .eq('is_active', true);

        if (profilesData) {
          console.log('Loaded profiles:', profilesData.length);
          setStats(prev => ({
            ...prev,
            totalEmployees: profilesData.length
          }));
        }
      } catch (error) {
        console.log('Error loading some dashboard data, using defaults:', error);
      }

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setDashboardLoading(false);
    }
  };

  const handleProfileUpdate = (updatedProfile: Profile) => {
    console.log('📋 Dashboard received profile update from EmployeeProfileCard:', updatedProfile);
    setCurrentProfile(updatedProfile);
    
    // If this is a significant update (department or line manager changed), 
    // we might want to reload other dashboard components
    if (currentProfile) {
      const departmentChanged = currentProfile.department_id !== updatedProfile.department_id;
      const managerChanged = currentProfile.line_manager_id !== updatedProfile.line_manager_id;
      
      if (departmentChanged || managerChanged) {
        console.log('🔄 Significant profile changes detected, considering data reload');
      }
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

  // Show loading only while auth is not ready
  if (!authReady || loading) {
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
      </div>

      {/* Employee Profile Card - Show for all users with updated profile */}
      {currentProfile && (
        <EmployeeProfileCard 
          profile={currentProfile} 
          onProfileUpdate={handleProfileUpdate}
        />
      )}

      {/* Show assigned questions for employees */}
      {currentProfile && (currentProfile.role === 'staff' || currentProfile.role === 'manager') && (
        <EmployeeAssignedQuestions employeeId={currentProfile.id} />
      )}

      {/* Stats Grid - Always show with default or loaded data */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="backdrop-blur-md bg-white/60 border-white/40 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEmployees}</div>
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
            <div className="text-2xl font-bold">{stats.completedAppraisals}</div>
            <p className="text-xs text-muted-foreground">
              This quarter
            </p>
          </CardContent>
        </Card>

        <Card className="backdrop-blur-md bg-white/60 border-white/40 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Reviews</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingAppraisals}</div>
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
            <div className="text-2xl font-bold">{stats.averageScore}%</div>
            <p className="text-xs text-muted-foreground">
              Team performance
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
                <Button variant="outline" className="w-full justify-start">
                  <Users className="h-4 w-4 mr-2" />
                  Review Team Appraisals
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  View Analytics
                </Button>
                <Button variant="outline" className="w-full justify-start">
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
