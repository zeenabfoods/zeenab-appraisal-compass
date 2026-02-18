
import { useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { BarChart3, Users, TrendingUp, Award, Calendar } from 'lucide-react';

const PERFORMANCE_COLORS = ['#10B981', '#F59E0B', '#EF4444', '#6B7280', '#8B5CF6'];

export default function CompanyReports() {
  const [selectedCycleId, setSelectedCycleId] = useState<string>('all');

  // Fetch all cycles for the selector
  const { data: cycles = [] } = useQuery({
    queryKey: ['appraisal-cycles-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('appraisal_cycles')
        .select('id, name, quarter, year, status')
        .order('year', { ascending: false })
        .order('quarter', { ascending: false });
      if (error) throw error;
      return data || [];
    }
  });

  const { data: reportData, isLoading } = useQuery({
    queryKey: ['company-reports', selectedCycleId],
    queryFn: async () => {
      // Build appraisals query - filter by cycle if selected
      let appraisalsQuery = supabase
        .from('appraisals')
        .select(`
          *,
          employee:profiles!appraisals_employee_id_fkey(first_name, last_name, department_id),
          cycle:appraisal_cycles(name, year, quarter)
        `);

      if (selectedCycleId !== 'all') {
        appraisalsQuery = appraisalsQuery.eq('cycle_id', selectedCycleId);
      }

      const { data: appraisals, error: appraisalsError } = await appraisalsQuery;
      if (appraisalsError) throw appraisalsError;

      const { data: departments, error: departmentsError } = await supabase
        .from('departments')
        .select('*')
        .eq('is_active', true);
      if (departmentsError) throw departmentsError;

      return { appraisals: appraisals || [], departments: departments || [] };
    }
  });

  const appraisals = reportData?.appraisals || [];
  const departments = reportData?.departments || [];

  // Metrics
  const totalAppraisals = appraisals.length;
  const completedAppraisals = appraisals.filter(a => a.status === 'completed').length;
  const appraisalsWithScore = appraisals.filter(a => a.overall_score);
  const averageScore = appraisalsWithScore.length > 0
    ? appraisalsWithScore.reduce((sum, a) => sum + (a.overall_score || 0), 0) / appraisalsWithScore.length
    : 0;

  // Performance band distribution
  const performanceBands = appraisals.reduce((acc: any, appraisal) => {
    const band = appraisal.performance_band || 'Not Rated';
    acc[band] = (acc[band] || 0) + 1;
    return acc;
  }, {});
  const performanceData = Object.entries(performanceBands).map(([band, count]) => ({
    name: band,
    value: count as number
  }));

  // Status breakdown
  const statusCounts = appraisals.reduce((acc: any, a) => {
    acc[a.status] = (acc[a.status] || 0) + 1;
    return acc;
  }, {});
  const statusData = Object.entries(statusCounts).map(([status, count]) => ({
    name: status.replace(/_/g, ' ').toUpperCase(),
    count: count as number
  }));

  // Department stats
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
  }).filter(d => d.total > 0);

  const selectedCycle = cycles.find(c => c.id === selectedCycleId);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Company Reports</h1>
            <p className="text-gray-600">Overview of company-wide appraisal performance and statistics</p>
          </div>

          {/* Quarter / Cycle Selector */}
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-gray-500" />
            <Select value={selectedCycleId} onValueChange={setSelectedCycleId}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select appraisal cycle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Quarters (Combined)</SelectItem>
                {cycles.map(cycle => (
                  <SelectItem key={cycle.id} value={cycle.id}>
                    Q{cycle.quarter} {cycle.year} — {cycle.name}
                    {cycle.status === 'active' && ' ✓ Active'}
                    {cycle.status === 'completed' && ' ✓ Completed'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedCycleId !== 'all' && selectedCycle && (
              <Badge
                variant="outline"
                className={selectedCycle.status === 'active' ? 'border-green-500 text-green-700' : 'border-blue-500 text-blue-700'}
              >
                Q{selectedCycle.quarter} {selectedCycle.year}
              </Badge>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
          </div>
        ) : (
          <>
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
                  <div className="text-2xl font-bold">{Math.round(averageScore * 10) / 10 || 'N/A'}</div>
                  <p className="text-xs text-muted-foreground">Out of 100</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Departments</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{departmentStats.length}</div>
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
                  {performanceData.length > 0 ? (
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
                            {performanceData.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={PERFORMANCE_COLORS[index % PERFORMANCE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-gray-400">
                      No completed appraisals for this cycle yet
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Status Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>Appraisal Status Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  {statusData.length > 0 ? (
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={statusData} margin={{ bottom: 60 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" angle={-30} textAnchor="end" height={80} fontSize={11} />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="count" fill="#F97316" name="Count" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-gray-400">
                      No appraisals found for this cycle
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Department Performance Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Department Performance</CardTitle>
              </CardHeader>
              <CardContent>
                {departmentStats.length > 0 ? (
                  <div className="h-[350px]">
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
                        <Bar dataKey="completed" fill="#10B981" name="Completed" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-gray-400">
                    No department data for this cycle
                  </div>
                )}
              </CardContent>
            </Card>

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
                      {departmentStats.length > 0 ? departmentStats.map((dept) => (
                        <tr key={dept.name} className="border-b">
                          <td className="p-2">{dept.name}</td>
                          <td className="p-2">{dept.total}</td>
                          <td className="p-2">{dept.completed}</td>
                          <td className="p-2">
                            {dept.total > 0 ? Math.round((dept.completed / dept.total) * 100) : 0}%
                          </td>
                          <td className="p-2">{dept.avgScore || 'N/A'}</td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={5} className="p-4 text-center text-gray-400">
                            No data available for the selected quarter
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
