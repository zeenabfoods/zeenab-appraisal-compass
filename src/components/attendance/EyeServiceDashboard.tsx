import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/components/AuthProvider';
import { 
  Eye, 
  AlertTriangle, 
  TrendingUp, 
  Users,
  Calendar,
  Clock,
  Target,
  Shield
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { 
  analyzeEyeService, 
  EyeServiceMetrics, 
  DetectionFlag,
  AttendanceLog,
  ManagerPresence 
} from '@/utils/eyeServiceDetection';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface EmployeeMetrics {
  employeeId: string;
  employeeName: string;
  department: string;
  metrics: EyeServiceMetrics;
}

export function EyeServiceDashboard() {
  const { profile } = useAuthContext();
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [employees, setEmployees] = useState<any[]>([]);
  const [employeeMetrics, setEmployeeMetrics] = useState<EmployeeMetrics[]>([]);

  const isHRorAdmin = profile?.role === 'hr' || profile?.role === 'admin';

  useEffect(() => {
    if (isHRorAdmin) {
      fetchData();
    }
  }, [isHRorAdmin]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch all active employees
      const { data: employeesData, error: empError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, department, line_manager_id')
        .eq('is_active', true)
        .order('first_name');

      if (empError) throw empError;
      setEmployees(employeesData || []);

      // Analyze eye service metrics for each employee
      const metricsPromises = (employeesData || []).map(async (emp) => {
        const metrics = await analyzeEmployeeEyeService(emp.id, emp.line_manager_id);
        return {
          employeeId: emp.id,
          employeeName: `${emp.first_name} ${emp.last_name}`,
          department: emp.department || 'N/A',
          metrics
        };
      });

      const metricsResults = await Promise.all(metricsPromises);
      setEmployeeMetrics(metricsResults);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load eye service analytics');
    } finally {
      setLoading(false);
    }
  };

  const analyzeEmployeeEyeService = async (
    employeeId: string,
    managerId: string | null
  ): Promise<EyeServiceMetrics> => {
    try {
      // Fetch employee's attendance logs (last 60 days)
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

      const { data: logs, error: logsError } = await supabase
        .from('attendance_logs')
        .select('*')
        .eq('employee_id', employeeId)
        .gte('clock_in_time', sixtyDaysAgo.toISOString())
        .order('clock_in_time', { ascending: false });

      if (logsError) throw logsError;

      // Fetch manager's attendance logs if manager exists
      let managerPresence: ManagerPresence[] = [];
      if (managerId) {
        const { data: managerLogs } = await supabase
          .from('attendance_logs')
          .select('clock_in_time')
          .eq('employee_id', managerId)
          .gte('clock_in_time', sixtyDaysAgo.toISOString());

        managerPresence = (managerLogs || []).map(log => ({
          date: new Date(log.clock_in_time).toISOString().split('T')[0],
          wasPresent: true,
          clockInTime: log.clock_in_time
        }));
      }

      // For meeting detection, we could integrate with calendar systems
      // For now, use empty array (future enhancement)
      const meetingDates: string[] = [];

      return analyzeEyeService(logs as AttendanceLog[], managerPresence, meetingDates);
    } catch (error) {
      console.error('Error analyzing employee:', error);
      return {
        consistencyScore: 0,
        riskLevel: 'low',
        detectionFlags: [],
        patterns: [],
        recommendations: []
      };
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low': return 'bg-green-500';
      case 'medium': return 'bg-yellow-500';
      case 'high': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getRiskIcon = (level: string) => {
    switch (level) {
      case 'low': return '✅';
      case 'medium': return '🟡';
      case 'high': return '🔴';
      default: return '⚪';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200';
      case 'medium': return 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200';
      case 'high': return 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredMetrics = selectedEmployee === 'all' 
    ? employeeMetrics 
    : employeeMetrics.filter(m => m.employeeId === selectedEmployee);

  // Calculate summary statistics
  const summary = {
    total: employeeMetrics.length,
    lowRisk: employeeMetrics.filter(m => m.metrics.riskLevel === 'low').length,
    mediumRisk: employeeMetrics.filter(m => m.metrics.riskLevel === 'medium').length,
    highRisk: employeeMetrics.filter(m => m.metrics.riskLevel === 'high').length,
    avgConsistency: Math.round(
      employeeMetrics.reduce((sum, m) => sum + m.metrics.consistencyScore, 0) / 
      (employeeMetrics.length || 1)
    )
  };

  if (!isHRorAdmin) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-center">
            This feature is only available to HR and Admin users.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Ethical Notice */}
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          <div className="font-semibold mb-2">Ethical Use Guidelines</div>
          <ul className="text-sm space-y-1">
            <li>• This tool is designed for <strong>coaching and development only</strong>, not punishment</li>
            <li>• Analysis focuses on <strong>patterns over time</strong>, not individual instances</li>
            <li>• Metrics should be combined with <strong>output-based evaluation</strong></li>
            <li>• All employees are <strong>transparently informed</strong> about metrics being tracked</li>
          </ul>
        </AlertDescription>
      </Alert>

      {/* Filters and Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Behavioral Consistency Analytics
              </CardTitle>
              <CardDescription>
                Pattern-based attendance analysis for coaching and development
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
            <SelectTrigger className="w-[300px]">
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
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Analyzed</p>
                <p className="text-3xl font-bold">{summary.total}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Low Risk ✅</p>
                <p className="text-3xl font-bold text-green-500">{summary.lowRisk}</p>
              </div>
              <Shield className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Medium Risk 🟡</p>
                <p className="text-3xl font-bold text-yellow-500">{summary.mediumRisk}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">High Risk 🔴</p>
                <p className="text-3xl font-bold text-red-500">{summary.highRisk}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Consistency</p>
                <p className="text-3xl font-bold">{summary.avgConsistency}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Employee Details */}
      <div className="space-y-4">
        {loading ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-muted-foreground">Analyzing behavioral patterns...</p>
            </CardContent>
          </Card>
        ) : filteredMetrics.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-muted-foreground">No data available</p>
            </CardContent>
          </Card>
        ) : (
          filteredMetrics.map((empMetric) => (
            <Card key={empMetric.employeeId}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{empMetric.employeeName}</CardTitle>
                    <CardDescription>{empMetric.department}</CardDescription>
                  </div>
                  <Badge className={`${getRiskColor(empMetric.metrics.riskLevel)} text-white`}>
                    {getRiskIcon(empMetric.metrics.riskLevel)} {empMetric.metrics.riskLevel.toUpperCase()} RISK
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="overview">
                  <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="patterns">Detection Flags</TabsTrigger>
                    <TabsTrigger value="coaching">Coaching</TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="space-y-4">
                    {/* Consistency Score */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Consistency Score</span>
                        <span className="text-2xl font-bold">{empMetric.metrics.consistencyScore}%</span>
                      </div>
                      <Progress value={empMetric.metrics.consistencyScore} className="h-2" />
                      <p className="text-xs text-muted-foreground mt-1">
                        Measures behavior consistency when manager is present vs. absent
                      </p>
                    </div>

                    {/* Patterns Summary */}
                    {empMetric.metrics.patterns.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold">Behavioral Patterns</h4>
                        {empMetric.metrics.patterns.map((pattern, idx) => (
                          <div key={idx} className="p-3 bg-muted rounded-lg">
                            <div className="font-medium text-sm">{pattern.type}</div>
                            <div className="text-sm text-muted-foreground">{pattern.description}</div>
                            <div className="text-xs text-muted-foreground mt-1">
                              Variance: {Math.round(pattern.variance)} min • Occurrences: {pattern.occurrences}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="patterns" className="space-y-3">
                    {empMetric.metrics.detectionFlags.length === 0 ? (
                      <div className="text-center py-6 text-muted-foreground">
                        <Target className="h-10 w-10 mx-auto mb-2 opacity-50" />
                        <p>No concerning patterns detected</p>
                        <p className="text-sm">Behavior is consistent across all scenarios</p>
                      </div>
                    ) : (
                      empMetric.metrics.detectionFlags.map((flag, idx) => (
                        <div key={idx} className="p-4 border rounded-lg">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <Badge className={getSeverityColor(flag.severity)}>
                                {flag.severity.toUpperCase()}
                              </Badge>
                              <div className="font-semibold mt-2">
                                {flag.rule.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                              </div>
                            </div>
                            <AlertTriangle className="h-5 w-5 text-orange-500" />
                          </div>
                          <p className="text-sm text-muted-foreground">{flag.description}</p>
                        </div>
                      ))
                    )}
                  </TabsContent>

                  <TabsContent value="coaching" className="space-y-3">
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold flex items-center gap-2">
                        <Target className="h-4 w-4" />
                        Coaching Recommendations
                      </h4>
                      {empMetric.metrics.recommendations.map((rec, idx) => (
                        <div key={idx} className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                          <div className="min-w-[20px] text-blue-600 font-semibold">{idx + 1}.</div>
                          <p className="text-sm text-blue-900 dark:text-blue-100">{rec}</p>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
