
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AppraisalAccessDialog } from '@/components/AppraisalAccessDialog';
import { EmployeeAssignedQuestions } from '@/components/EmployeeAssignedQuestions';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
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
  const { profile, user, loading } = useAuth();
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

  useEffect(() => {
    // Only wait for auth loading to complete
    if (!loading) {
      console.log('Auth loading completed, loading dashboard data');
      loadDashboardData();
    }
  }, [loading]); // Only depend on loading, not user or profile

  const loadDashboardData = async () => {
    try {
      console.log('Loading dashboard data...');
      
      // Load appraisal cycles
      const { data: cyclesData, error: cyclesError } = await supabase
        .from('appraisal_cycles')
        .select('*')
        .order('created_at', { ascending: false });

      if (cyclesError) {
        console.error('Error loading cycles:', cyclesError);
      } else {
        console.log('Loaded cycles:', cyclesData?.length || 0);
        setCycles(cyclesData || []);
      }

      // Load basic stats
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, is_active')
        .eq('is_active', true);

      if (profilesError) {
        console.error('Error loading profiles:', profilesError);
      } else {
        console.log('Loaded profiles:', profilesData?.length || 0);
        setStats({
          totalEmployees: profilesData?.length || 0,
          completedAppraisals: 45, // Mock data - replace with actual query
          pendingAppraisals: 23, // Mock data - replace with actual query
          averageScore: 87.5 // Mock data - replace with actual query
        });
      }

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setDashboardLoading(false);
    }
  };

  const handleAppraisalClick = (cycle: AppraisalCycle) => {
    if (cycle.status === 'completed') {
      setSelectedAppraisal(cycle.name);
      setShowAccessDialog(true);
    } else {
      // Navigate to appraisal form (implement based on your routing)
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

  // Show loading spinner while auth is loading
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show error state if no user after auth loading
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center backdrop-blur-md bg-white/60 border-white/40 rounded-xl p-8 shadow-lg">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-amber-500" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Authentication Error</h2>
          <p className="text-gray-600 mb-4">
            You are not properly authenticated. Please sign in again.
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

  // Get display name from profile or user (fallback)
  const displayName = profile?.first_name || user?.user_metadata?.first_name || user?.email?.split('@')[0] || 'User';

  // Show dashboard data loading only if dashboard is actually loading
  if (dashboardLoading) {
    return (
      <div className="space-y-6">
        <div className="backdrop-blur-md bg-white/60 border-white/40 rounded-xl p-6 shadow-lg">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome back, {displayName}!
          </h1>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
        <div className="flex items-center justify-center min-h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="backdrop-blur-md bg-white/60 border-white/40 rounded-xl p-6 shadow-lg">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Welcome back, {displayName}!
        </h1>
        <p className="text-gray-600">
          Here's your performance dashboard overview
        </p>
        {!profile && (
          <div className="mt-2 text-sm text-amber-600">
            Note: Running with limited profile information. Some features may be restricted.
          </div>
        )}
      </div>

      {/* Show assigned questions for employees */}
      {profile && (profile.role === 'staff' || profile.role === 'manager') && (
        <EmployeeAssignedQuestions employeeId={profile.id} />
      )}

      {/* Stats Grid */}
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

      {/* Current Appraisals */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="backdrop-blur-md bg-white/60 border-white/40 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Target className="h-5 w-5 mr-2 text-orange-600" />
              My Appraisals
            </CardTitle>
            <CardDescription>
              Current and completed appraisal cycles
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {cycles.slice(0, 3).map((cycle) => (
                <div 
                  key={cycle.id} 
                  className={`flex items-center justify-between p-3 rounded-lg border transition-all hover:shadow-md ${
                    cycle.status === 'completed' 
                      ? 'bg-gray-50 border-gray-200 cursor-not-allowed opacity-75' 
                      : 'bg-white border-orange-200 cursor-pointer hover:bg-orange-50'
                  }`}
                  onClick={() => handleAppraisalClick(cycle)}
                >
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(cycle.status)}
                    <div>
                      <div className="font-medium text-sm">{cycle.name}</div>
                      <div className="text-xs text-gray-500">
                        {new Date(cycle.start_date).toLocaleDateString()} - {new Date(cycle.end_date).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={getStatusColor(cycle.status)}>
                      {cycle.status}
                    </Badge>
                    {cycle.status === 'completed' && (
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                    )}
                  </div>
                </div>
              ))}
              
              {cycles.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p>No appraisal cycles available</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

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
      {(profile?.role === 'manager' || profile?.role === 'hr' || profile?.role === 'admin') && (
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
