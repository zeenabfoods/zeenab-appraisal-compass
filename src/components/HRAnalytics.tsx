
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { TrendingUp, Users, Award, Clock, Building2 } from 'lucide-react';

interface DepartmentStats {
  name: string;
  total_employees: number;
  completed_appraisals: number;
  avg_score: number;
  completion_rate: number;
}

interface StatusDistribution {
  status: string;
  count: number;
  percentage: number;
}

interface PerformanceTrend {
  month: string;
  avg_score: number;
  completed_count: number;
}

export function HRAnalytics() {
  const { data: departmentStats, isLoading: deptLoading } = useQuery({
    queryKey: ['department-analytics'],
    queryFn: async (): Promise<DepartmentStats[]> => {
      const { data: departments } = await supabase
        .from('departments')
        .select('id, name')
        .eq('is_active', true);

      if (!departments) return [];

      const stats = await Promise.all(
        departments.map(async (dept) => {
          // Get total employees in department
          const { data: employees } = await supabase
            .from('profiles')
            .select('id')
            .eq('department_id', dept.id)
            .eq('is_active', true);

          // Get appraisals for department employees
          const employeeIds = employees?.map(e => e.id) || [];
          const { data: appraisals } = await supabase
            .from('appraisals')
            .select('status, overall_score')
            .in('employee_id', employeeIds);

          const completed = appraisals?.filter(a => a.status === 'completed') || [];
          const avgScore = completed.length > 0 
            ? completed.reduce((sum, a) => sum + (a.overall_score || 0), 0) / completed.length
            : 0;

          return {
            name: dept.name,
            total_employees: employees?.length || 0,
            completed_appraisals: completed.length,
            avg_score: parseFloat(avgScore.toFixed(1)),
            completion_rate: employees?.length ? (completed.length / employees.length) * 100 : 0
          };
        })
      );

      return stats;
    }
  });

  const { data: statusDistribution, isLoading: statusLoading } = useQuery({
    queryKey: ['appraisal-status-distribution'],
    queryFn: async (): Promise<StatusDistribution[]> => {
      const { data: appraisals } = await supabase
        .from('appraisals')
        .select('status');

      if (!appraisals) return [];

      const statusCounts = appraisals.reduce((acc, appraisal) => {
        acc[appraisal.status] = (acc[appraisal.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const total = appraisals.length;
      return Object.entries(statusCounts).map(([status, count]) => ({
        status: status.replace('_', ' ').toUpperCase(),
        count,
        percentage: parseFloat(((count / total) * 100).toFixed(1))
      }));
    }
  });

  const { data: performanceTrend, isLoading: trendLoading } = useQuery({
    queryKey: ['performance-trend'],
    queryFn: async (): Promise<PerformanceTrend[]> => {
      const { data: appraisals } = await supabase
        .from('appraisals')
        .select('overall_score, completed_at')
        .eq('status', 'completed')
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: true });

      if (!appraisals) return [];

      // Group by month
      const monthlyData = appraisals.reduce((acc, appraisal) => {
        const month = new Date(appraisal.completed_at!).toLocaleDateString('en-US', { 
          month: 'short', 
          year: 'numeric' 
        });
        
        if (!acc[month]) {
          acc[month] = { scores: [], count: 0 };
        }
        
        acc[month].scores.push(appraisal.overall_score || 0);
        acc[month].count++;
        
        return acc;
      }, {} as Record<string, { scores: number[], count: number }>);

      return Object.entries(monthlyData).map(([month, data]) => ({
        month,
        avg_score: parseFloat((data.scores.reduce((sum, score) => sum + score, 0) / data.scores.length).toFixed(1)),
        completed_count: data.count
      }));
    }
  });

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  if (deptLoading || statusLoading || trendLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="backdrop-blur-md bg-white/60 border-white/40 shadow-lg">
            <CardHeader>
              <div className="animate-pulse">
                <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-300 rounded w-1/2"></div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="animate-pulse">
                <div className="h-32 bg-gray-300 rounded"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">HR Analytics Dashboard</h2>
        <Badge variant="outline" className="bg-blue-100 text-blue-800">
          Real-time Data
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Department Performance */}
        <Card className="backdrop-blur-md bg-white/60 border-white/40 shadow-lg lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Department Performance
            </CardTitle>
            <CardDescription>
              Completion rates and average scores by department
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={departmentStats}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="completion_rate" fill="#8884d8" name="Completion Rate %" />
                  <Bar dataKey="avg_score" fill="#82ca9d" name="Average Score" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card className="backdrop-blur-md bg-white/60 border-white/40 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Appraisal Status
            </CardTitle>
            <CardDescription>
              Current status distribution
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ percentage }) => `${percentage}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {statusDistribution?.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2">
              {statusDistribution?.map((item, index) => (
                <div key={item.status} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span>{item.status}</span>
                  </div>
                  <span className="font-medium">{item.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Performance Trend */}
        <Card className="backdrop-blur-md bg-white/60 border-white/40 shadow-lg lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Performance Trend
            </CardTitle>
            <CardDescription>
              Monthly performance trends and completion rates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={performanceTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="avg_score" 
                    stroke="#8884d8" 
                    strokeWidth={2}
                    name="Average Score"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="completed_count" 
                    stroke="#82ca9d" 
                    strokeWidth={2}
                    name="Completed Count"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
