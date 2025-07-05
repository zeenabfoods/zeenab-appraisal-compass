
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, TrendingDown, Target, Award, AlertTriangle, CheckCircle } from 'lucide-react';

interface AnalyticsProps {
  appraisalData: any;
  appraisalHistory: any[];
  analytics: any;
  responses: any[];
}

export function CommitteeAnalytics({ 
  appraisalData, 
  appraisalHistory, 
  analytics, 
  responses 
}: AnalyticsProps) {
  // Calculate section performance
  const sectionPerformance = responses.reduce((acc, response) => {
    const sectionName = response.question?.section?.name || 'Other';
    if (!acc[sectionName]) {
      acc[sectionName] = { total: 0, count: 0, empTotal: 0, mgrTotal: 0 };
    }
    
    const empScore = response.emp_rating || 0;
    const mgrScore = response.mgr_rating || 0;
    const avgScore = (empScore + mgrScore) / 2;
    
    acc[sectionName].total += avgScore;
    acc[sectionName].empTotal += empScore;
    acc[sectionName].mgrTotal += mgrScore;
    acc[sectionName].count += 1;
    
    return acc;
  }, {} as Record<string, any>);

  const sectionData = Object.entries(sectionPerformance).map(([name, data]) => ({
    name,
    current: Number((data.total / data.count).toFixed(1)),
    employee: Number((data.empTotal / data.count).toFixed(1)),
    manager: Number((data.mgrTotal / data.count).toFixed(1)),
    variance: Math.abs(Number(((data.empTotal - data.mgrTotal) / data.count).toFixed(1)))
  }));

  // Historical trend data
  const trendData = appraisalHistory.map((appraisal, index) => ({
    cycle: appraisal.cycle?.name || `Cycle ${index + 1}`,
    score: appraisal.overall_score || 0,
    year: appraisal.cycle?.year || new Date().getFullYear()
  })).reverse();

  // Performance distribution
  const scoreDistribution = [
    { name: 'Exceptional (91-100)', value: 0, color: '#10B981' },
    { name: 'Excellent (81-90)', value: 0, color: '#3B82F6' },
    { name: 'Very Good (71-80)', value: 0, color: '#8B5CF6' },
    { name: 'Good (61-70)', value: 0, color: '#F59E0B' },
    { name: 'Fair (51-60)', value: 0, color: '#EF4444' },
    { name: 'Poor (0-50)', value: 0, color: '#6B7280' }
  ];

  const currentScore = appraisalData.overall_score || 0;
  if (currentScore >= 91) scoreDistribution[0].value = 1;
  else if (currentScore >= 81) scoreDistribution[1].value = 1;
  else if (currentScore >= 71) scoreDistribution[2].value = 1;
  else if (currentScore >= 61) scoreDistribution[3].value = 1;
  else if (currentScore >= 51) scoreDistribution[4].value = 1;
  else scoreDistribution[5].value = 1;

  // Risk assessment
  const assessRisk = () => {
    const scoreVariances = sectionData.map(s => s.variance);
    const avgVariance = scoreVariances.reduce((a, b) => a + b, 0) / scoreVariances.length;
    const lowPerformingSections = sectionData.filter(s => s.current < 3).length;
    
    if (avgVariance > 2 || lowPerformingSections > 1) return 'high';
    if (avgVariance > 1 || lowPerformingSections > 0) return 'medium';
    return 'low';
  };

  const riskLevel = assessRisk();
  
  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Overall Score</p>
                <p className="text-2xl font-bold">{currentScore}/100</p>
              </div>
              <Award className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Performance Band</p>
                <p className="text-lg font-semibold">{appraisalData.performance_band || 'TBD'}</p>
              </div>
              <Target className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Risk Level</p>
                <Badge className={
                  riskLevel === 'high' ? 'bg-red-100 text-red-800' :
                  riskLevel === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }>
                  {riskLevel.toUpperCase()}
                </Badge>
              </div>
              <AlertTriangle className={`h-8 w-8 ${
                riskLevel === 'high' ? 'text-red-500' :
                riskLevel === 'medium' ? 'text-yellow-500' :
                'text-green-500'
              }`} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completion</p>
                <p className="text-2xl font-bold">{Math.round((responses.length / responses.length) * 100)}%</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Section Performance Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Section Performance Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              current: { label: "Current Average", color: "#8B5CF6" },
              employee: { label: "Employee Rating", color: "#3B82F6" },
              manager: { label: "Manager Rating", color: "#10B981" }
            }}
            className="h-80"
          >
            <ResponsiveContainer>
              <BarChart data={sectionData}>
                <XAxis dataKey="name" />
                <YAxis domain={[0, 5]} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="employee" fill="#3B82F6" name="Employee" opacity={0.7} />
                <Bar dataKey="manager" fill="#10B981" name="Manager" opacity={0.7} />
                <Bar dataKey="current" fill="#8B5CF6" name="Average" />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Historical Trend */}
        {trendData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Performance Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  score: { label: "Score", color: "#F59E0B" }
                }}
                className="h-64"
              >
                <ResponsiveContainer>
                  <LineChart data={trendData}>
                    <XAxis dataKey="cycle" />
                    <YAxis domain={[0, 100]} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line 
                      type="monotone" 
                      dataKey="score" 
                      stroke="#F59E0B" 
                      strokeWidth={3}
                      dot={{ fill: "#F59E0B", strokeWidth: 2, r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        )}

        {/* Score Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Performance Category</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{}}
              className="h-64"
            >
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={scoreDistribution.filter(d => d.value > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {scoreDistribution.filter(d => d.value > 0).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white p-2 border rounded shadow">
                            <p className="font-medium">{data.name}</p>
                            <p className="text-sm">Current Performance Level</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
            <div className="mt-4 space-y-2">
              {scoreDistribution.filter(d => d.value > 0).map((item) => (
                <div key={item.name} className="flex items-center space-x-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm font-medium">{item.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Insights */}
      {analytics?.recommendations && (
        <Card>
          <CardHeader>
            <CardTitle>AI-Generated Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Recommendations</h4>
              <p className="text-sm text-blue-800">
                {typeof analytics.recommendations === 'string' 
                  ? analytics.recommendations 
                  : JSON.stringify(analytics.recommendations)
                }
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
