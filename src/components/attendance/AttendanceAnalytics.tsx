import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/components/AuthProvider';
import { 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  AlertTriangle, 
  CheckCircle,
  Calendar,
  Users,
  BarChart3
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, startOfMonth, endOfMonth, subMonths, eachDayOfInterval } from 'date-fns';
import { toast } from 'sonner';

interface AttendanceStats {
  totalDays: number;
  onTimeDays: number;
  lateDays: number;
  absentDays: number;
  averageClockIn: string;
  totalLateMinutes: number;
  breakCompliance: number;
}

interface DailyPattern {
  date: string;
  clockInTime: string;
  isLate: boolean;
  lateMinutes: number;
}

interface BehavioralInsight {
  metric: string;
  score: number;
  status: 'good' | 'warning' | 'poor';
  description: string;
}

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#6b7280'];

export function AttendanceAnalytics() {
  const { profile } = useAuthContext();
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(0); // 0 = current month
  const [selectedEmployee, setSelectedEmployee] = useState<string>(profile?.id || 'all');
  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [dailyPatterns, setDailyPatterns] = useState<DailyPattern[]>([]);
  const [behavioralInsights, setBehavioralInsights] = useState<BehavioralInsight[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);

  const isHRorAdmin = profile?.role === 'hr' || profile?.role === 'admin';

  useEffect(() => {
    if (isHRorAdmin) {
      fetchEmployees();
    }
  }, [isHRorAdmin]);

  useEffect(() => {
    fetchAnalytics();
  }, [selectedMonth, selectedEmployee, profile?.id]);

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, department')
        .eq('is_active', true)
        .order('first_name');

      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      
      const startDate = startOfMonth(subMonths(new Date(), selectedMonth));
      const endDate = endOfMonth(subMonths(new Date(), selectedMonth));
      
      const employeeId = isHRorAdmin && selectedEmployee !== 'all' 
        ? selectedEmployee 
        : profile?.id;

      let query = supabase
        .from('attendance_logs')
        .select('*')
        .gte('clock_in_time', startDate.toISOString())
        .lte('clock_in_time', endDate.toISOString());

      if (employeeId) {
        query = query.eq('employee_id', employeeId);
      }

      const { data: logs, error } = await query.order('clock_in_time');

      if (error) throw error;

      // Calculate statistics
      const totalDays = logs?.length || 0;
      const lateDays = logs?.filter(log => log.is_late).length || 0;
      const onTimeDays = totalDays - lateDays;
      const totalLateMinutes = logs?.reduce((sum, log) => sum + (log.late_by_minutes || 0), 0) || 0;

      // Calculate average clock-in time
      const clockInTimes = logs?.map(log => new Date(log.clock_in_time).getHours() * 60 + new Date(log.clock_in_time).getMinutes()) || [];
      const avgMinutes = clockInTimes.length > 0 
        ? Math.round(clockInTimes.reduce((a, b) => a + b, 0) / clockInTimes.length)
        : 0;
      const avgHours = Math.floor(avgMinutes / 60);
      const avgMins = avgMinutes % 60;

      // Fetch break compliance
      const { data: breaks } = await supabase
        .from('attendance_breaks')
        .select('*')
        .gte('break_start', startDate.toISOString())
        .lte('break_start', endDate.toISOString());

      const breaksWithSchedule = breaks?.filter(b => b.schedule_id) || [];
      const onTimeBreaks = breaksWithSchedule.filter(b => b.was_on_time).length;
      const breakCompliance = breaksWithSchedule.length > 0 
        ? Math.round((onTimeBreaks / breaksWithSchedule.length) * 100)
        : 100;

      setStats({
        totalDays,
        onTimeDays,
        lateDays,
        absentDays: 0, // Would need work schedule to calculate
        averageClockIn: `${String(avgHours).padStart(2, '0')}:${String(avgMins).padStart(2, '0')}`,
        totalLateMinutes,
        breakCompliance
      });

      // Daily patterns
      const patterns: DailyPattern[] = logs?.map(log => ({
        date: format(new Date(log.clock_in_time), 'MMM dd'),
        clockInTime: format(new Date(log.clock_in_time), 'HH:mm'),
        isLate: log.is_late || false,
        lateMinutes: log.late_by_minutes || 0
      })) || [];
      setDailyPatterns(patterns);

      // Behavioral insights
      calculateBehavioralInsights(logs || [], breaks || []);

    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const calculateBehavioralInsights = (logs: any[], breaks: any[]) => {
    const insights: BehavioralInsight[] = [];

    // Punctuality consistency
    const lateRate = logs.length > 0 ? (logs.filter(l => l.is_late).length / logs.length) * 100 : 0;
    insights.push({
      metric: 'Punctuality Score',
      score: Math.round(100 - lateRate),
      status: lateRate < 10 ? 'good' : lateRate < 25 ? 'warning' : 'poor',
      description: lateRate < 10 
        ? 'Excellent punctuality record' 
        : lateRate < 25 
        ? 'Occasional lateness detected'
        : 'Frequent lateness - needs attention'
    });

    // Clock-in consistency (variance)
    const clockInMinutes = logs.map(log => {
      const time = new Date(log.clock_in_time);
      return time.getHours() * 60 + time.getMinutes();
    });
    const avg = clockInMinutes.reduce((a, b) => a + b, 0) / (clockInMinutes.length || 1);
    const variance = clockInMinutes.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / (clockInMinutes.length || 1);
    const stdDev = Math.sqrt(variance);
    
    insights.push({
      metric: 'Consistency Score',
      score: Math.max(0, Math.round(100 - (stdDev / 3))),
      status: stdDev < 15 ? 'good' : stdDev < 30 ? 'warning' : 'poor',
      description: stdDev < 15
        ? 'Very consistent arrival pattern'
        : stdDev < 30
        ? 'Moderate variation in arrival times'
        : 'Highly irregular schedule'
    });

    // Break compliance
    const breaksWithSchedule = breaks.filter(b => b.schedule_id);
    const breakCompliance = breaksWithSchedule.length > 0
      ? (breaksWithSchedule.filter(b => b.was_on_time).length / breaksWithSchedule.length) * 100
      : 100;

    insights.push({
      metric: 'Break Compliance',
      score: Math.round(breakCompliance),
      status: breakCompliance >= 80 ? 'good' : breakCompliance >= 60 ? 'warning' : 'poor',
      description: breakCompliance >= 80
        ? 'Follows break schedules consistently'
        : breakCompliance >= 60
        ? 'Sometimes misses scheduled breaks'
        : 'Frequent break schedule violations'
    });

    // Weekly pattern detection
    const weekdayLateRates = logs.reduce((acc, log) => {
      const day = new Date(log.clock_in_time).getDay();
      if (!acc[day]) acc[day] = { total: 0, late: 0 };
      acc[day].total++;
      if (log.is_late) acc[day].late++;
      return acc;
    }, {} as Record<number, { total: number; late: number }>);

    const mondayRate = weekdayLateRates[1] 
      ? (weekdayLateRates[1].late / weekdayLateRates[1].total) * 100 
      : 0;
    const fridayRate = weekdayLateRates[5]
      ? (weekdayLateRates[5].late / weekdayLateRates[5].total) * 100
      : 0;

    if (mondayRate > fridayRate + 20) {
      insights.push({
        metric: 'Monday Challenge',
        score: Math.round(100 - mondayRate),
        status: 'warning',
        description: 'Higher lateness on Mondays detected - consider scheduling adjustments'
      });
    }

    setBehavioralInsights(insights);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'poor': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const pieChartData = stats ? [
    { name: 'On Time', value: stats.onTimeDays },
    { name: 'Late', value: stats.lateDays },
    { name: 'Absent', value: stats.absentDays },
  ] : [];

  const lateMinutesData = dailyPatterns.filter(d => d.isLate).map(d => ({
    date: d.date,
    minutes: d.lateMinutes
  }));

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Attendance Analytics
          </CardTitle>
          <CardDescription>
            Comprehensive insights into attendance patterns and behavior
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Current Month</SelectItem>
                <SelectItem value="1">Last Month</SelectItem>
                <SelectItem value="2">2 Months Ago</SelectItem>
                <SelectItem value="3">3 Months Ago</SelectItem>
              </SelectContent>
            </Select>

            {isHRorAdmin && (
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger className="w-[250px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Employees</SelectItem>
                  {employees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.last_name} - {emp.department}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="patterns">Patterns</TabsTrigger>
          <TabsTrigger value="behavioral">Behavioral Insights</TabsTrigger>
          <TabsTrigger value="reports">Monthly Report</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Days</p>
                    <p className="text-3xl font-bold">{stats?.totalDays || 0}</p>
                  </div>
                  <Calendar className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">On Time</p>
                    <p className="text-3xl font-bold text-green-500">{stats?.onTimeDays || 0}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Late Arrivals</p>
                    <p className="text-3xl font-bold text-orange-500">{stats?.lateDays || 0}</p>
                  </div>
                  <Clock className="h-8 w-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Clock-In</p>
                    <p className="text-3xl font-bold">{stats?.averageClockIn || '--:--'}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Attendance Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Late Minutes Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={lateMinutesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="minutes" fill="#f59e0b" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="patterns" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Daily Clock-In Pattern</CardTitle>
              <CardDescription>Your arrival time consistency over the selected period</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={dailyPatterns}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="lateMinutes" 
                    stroke="#ef4444" 
                    name="Late Minutes"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Detailed Daily Records</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {dailyPatterns.map((pattern, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${pattern.isLate ? 'bg-red-500' : 'bg-green-500'}`} />
                      <span className="font-medium">{pattern.date}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-muted-foreground">{pattern.clockInTime}</span>
                      {pattern.isLate ? (
                        <Badge variant="destructive">+{pattern.lateMinutes} min</Badge>
                      ) : (
                        <Badge variant="default" className="bg-green-500">On Time</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="behavioral" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {behavioralInsights.map((insight, index) => (
              <Card key={index}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{insight.metric}</CardTitle>
                    <Badge className={getStatusColor(insight.status)}>
                      {insight.score}%
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${getStatusColor(insight.status)}`}
                        style={{ width: `${insight.score}%` }}
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">{insight.description}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                Key Insights & Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats && stats.lateDays > stats.totalDays * 0.2 && (
                  <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="font-semibold text-red-900 dark:text-red-100">High Lateness Rate</p>
                    <p className="text-sm text-red-700 dark:text-red-300">
                      You've been late {Math.round((stats.lateDays / stats.totalDays) * 100)}% of the time. 
                      Consider adjusting your morning routine or discussing flexible hours with HR.
                    </p>
                  </div>
                )}

                {stats && stats.breakCompliance < 80 && (
                  <div className="p-4 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <p className="font-semibold text-yellow-900 dark:text-yellow-100">Break Schedule Compliance</p>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                      Your break compliance is {stats.breakCompliance}%. Regular breaks improve productivity and well-being.
                    </p>
                  </div>
                )}

                {stats && stats.lateDays === 0 && stats.totalDays > 5 && (
                  <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <p className="font-semibold text-green-900 dark:text-green-100">Perfect Attendance! 🎉</p>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      Excellent punctuality this month. Keep up the great work!
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Summary Report</CardTitle>
              <CardDescription>
                {format(subMonths(new Date(), selectedMonth), 'MMMM yyyy')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Attendance Rate</p>
                    <p className="text-2xl font-bold">
                      {stats?.totalDays ? Math.round((stats.onTimeDays / stats.totalDays) * 100) : 0}%
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Total Late Minutes</p>
                    <p className="text-2xl font-bold text-orange-500">{stats?.totalLateMinutes || 0}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Break Compliance</p>
                    <p className="text-2xl font-bold text-blue-500">{stats?.breakCompliance || 0}%</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Average Clock-In</p>
                    <p className="text-2xl font-bold">{stats?.averageClockIn || '--:--'}</p>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-3">Performance Summary</h4>
                  <div className="space-y-2">
                    {behavioralInsights.map((insight, index) => (
                      <div key={index} className="flex items-center justify-between py-2">
                        <span className="text-sm">{insight.metric}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${getStatusColor(insight.status)}`}
                              style={{ width: `${insight.score}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium w-12 text-right">{insight.score}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
