
import { DashboardLayout } from '@/components/DashboardLayout';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { BarChart3, Users, TrendingUp, Award } from 'lucide-react';

const PERFORMANCE_COLORS = ['#10B981', '#F59E0B', '#EF4444', '#6B7280'];

export default function CompanyReports() {
  const { data: reportData, isLoading } = useQuery({
    queryKey: ['company-reports'],
    queryFn: async () => {
      // Get appraisal statistics
      const { data: appraisals, error: appraisalsError } = await supabase
        .from('appraisals')
        .select(`
          *,
          employee:profiles!appraisals_employee_id_fkey(first_name, last_name, department_id),
          cycle:appraisal_cycles(name, year, quarter)
        `);

      if (appraisalsError) throw appraisalsError;

      // Get department statistics
      const { data: departments, error: departmentsError } = await supabase
        .from('departments')
        .select('*')
        .eq('is_active', true);

      if (departmentsError) throw departmentsError;

      return { appraisals, departments };
    }
  });

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  const appraisals = reportData?.appraisals || [];
  const departments = reportData?.departments || [];

  // Calculate statistics
  const totalAppraisals = appraisals.length;
  const completedAppraisals = appraisals.filter(a => a.status === 'completed').length;
  const averageScore = appraisals
    .filter(a => a.overall_score)
    .reduce((sum, a) => sum + (a.overall_score || 0), 0) / 
    appraisals.filter(a => a.overall_score).length || 0;

  // Performance distribution
  const performanceBands = appraisals.reduce((acc: any, appraisal) => {
    const band = appraisal.performance_band || 'Not Rated';
    acc[band] = (acc[band] || 0) + 1;
    return acc;
  }, {});

  const performanceData = Object.entries(performanceBands).map(([band, count]) => ({
    name: band,
    value: count
  }));

  // Department statistics
  const departmentStats = departments.map(dept => {
    const deptAppraisals = appraisals.filter(a => a.employee?.department_id === dept.id);
    const appraisalsWithScores = deptAppraisals.filter(a => a.overall_score);
    const avgScore = appraisalsWithScores.length > 0 
      ? appraisalsWithScores.reduce((sum, a) => sum + (a.overall_score || 0), 0) / appraisalsWithScores.length 
      : 0;
    
    return {
      name: dept.name,
      total: deptAppraisals.length,
      completed: deptAppraisals.filter(a => a.status === 'completed').length,
      avgScore: Math.round(avgScore * 10) / 10
    };
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Company Reports</h1>
          <p className="text-gray-600">Overview of company-wide appraisal performance and statistics</p>
        </div>

        {/* Key Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Appraisals</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalAppraisals}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completedAppraisals}</div>
              <p className="text-xs text-muted-foreground">
                {totalAppraisals > 0 ? Math.round((completedAppraisals / totalAppraisals) * 100) : 0}% completion rate
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Score</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Math.round(averageScore * 10) / 10}</div>
              <p className="text-xs text-muted-foreground">Out of 100</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Departments</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{departments.length}</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Performance Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Performance Band Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={performanceData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {performanceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PERFORMANCE_COLORS[index % PERFORMANCE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Department Performance */}
          <Card>
            <CardHeader>
              <CardTitle>Department Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={departmentStats} margin={{ bottom: 120 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="name" 
                      angle={-45}
                      textAnchor="end"
                      height={120}
                      interval={0}
                      fontSize={12}
                    />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="avgScore" fill="#F97316" name="Avg Score" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Department Details Table */}
        <Card>
          <CardHeader>
            <CardTitle>Department Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Department</th>
                    <th className="text-left p-2">Total Appraisals</th>
                    <th className="text-left p-2">Completed</th>
                    <th className="text-left p-2">Completion Rate</th>
                    <th className="text-left p-2">Average Score</th>
                  </tr>
                </thead>
                <tbody>
                  {departmentStats.map((dept) => (
                    <tr key={dept.name} className="border-b">
                      <td className="p-2">{dept.name}</td>
                      <td className="p-2">{dept.total}</td>
                      <td className="p-2">{dept.completed}</td>
                      <td className="p-2">
                        {dept.total > 0 ? Math.round((dept.completed / dept.total) * 100) : 0}%
                      </td>
                      <td className="p-2">{dept.avgScore || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
