
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, CartesianGrid, Legend } from 'recharts';
import { TrendingUp, TrendingDown, Target, Award, AlertTriangle, CheckCircle } from 'lucide-react';

interface AnalyticsProps {
  appraisalData: any;
  appraisalHistory: any[];
  analytics: any;
  responses: any[];
}

interface SectionPerformanceData {
  total: number;
  count: number;
  empTotal: number;
  mgrTotal: number;
}

export function CommitteeAnalytics({ 
  appraisalData, 
  appraisalHistory, 
  analytics, 
  responses 
}: AnalyticsProps) {
  // Define the main sections we want to track
  const mainSections = ['FINANCIAL SECTION', 'OPERATIONAL SECTION', 'BEHAVIOURAL SECTION'];
  
  // Calculate section performance for main sections only
  const sectionPerformance = responses.reduce((acc, response) => {
    if (!response.question?.section?.name) return acc;
    
    const sectionName = response.question.section.name.toUpperCase();
    // More flexible matching for section names
    let mainSection = mainSections.find(section => 
      sectionName.includes(section) || 
      sectionName.includes(section.replace(' SECTION', ''))
    );
    
    // Handle variations in section names
    if (!mainSection) {
      if (sectionName.includes('FINANCIAL') || sectionName.includes('FINANCE')) {
        mainSection = 'FINANCIAL SECTION';
      } else if (sectionName.includes('OPERATIONAL') || sectionName.includes('OPERATION') || sectionName.includes('EFFICIENCY')) {
        mainSection = 'OPERATIONAL SECTION';
      } else if (sectionName.includes('BEHAVIOURAL') || sectionName.includes('BEHAVIORAL') || sectionName.includes('BEHAVIOUR') || sectionName.includes('BEHAVIOR')) {
        mainSection = 'BEHAVIOURAL SECTION';
      }
    }
    
    if (!mainSection) return acc;
    
    if (!acc[mainSection]) {
      acc[mainSection] = { total: 0, count: 0, empTotal: 0, mgrTotal: 0 };
    }
    
    const empScore = response.emp_rating || 0;
    const mgrScore = response.mgr_rating || 0;
    const avgScore = (empScore + mgrScore) / 2;
    
    const sectionData = acc[mainSection] as SectionPerformanceData;
    sectionData.total += avgScore;
    sectionData.empTotal += empScore;
    sectionData.mgrTotal += mgrScore;
    sectionData.count += 1;
    
    return acc;
  }, {} as Record<string, SectionPerformanceData>);

  const sectionData = Object.entries(sectionPerformance).map(([name, data]: [string, SectionPerformanceData]) => ({
    name: name.replace(' SECTION', ''),
    current: Number((data.total / data.count).toFixed(1)),
    employee: Number((data.empTotal / data.count).toFixed(1)),
    manager: Number((data.mgrTotal / data.count).toFixed(1)),
    variance: Math.abs(Number(((data.empTotal - data.mgrTotal) / data.count).toFixed(1)))
  }));

  // Ensure all three main sections are represented in the chart
  const allSectionsData = mainSections.map(sectionName => {
    const sectionKey = sectionName.replace(' SECTION', '');
    const existingSection = sectionData.find(s => s.name === sectionKey);
    
    if (existingSection) {
      return {
        name: sectionKey,
        score: existingSection.current,
        target: 4.0, // Target performance level
        gap: Math.max(0, 4.0 - existingSection.current)
      };
    } else {
      // If no data exists for this section, show as not evaluated
      return {
        name: sectionKey,
        score: 0,
        target: 4.0,
        gap: 4.0,
        noData: true
      };
    }
  });

  const weaknessData = allSectionsData;

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

  // Employee Gap Analysis Logic
  const calculateEmployeeGaps = () => {
    const gaps = sectionData.map(section => {
      const empScore = section.employee;
      const mgrScore = section.manager;
      const avgScore = (empScore + mgrScore) / 2;
      
      // Performance gap: Both scores below target
      const performanceGap = avgScore < 3.5 ? (4.0 - avgScore) : 0;
      
      // Self-assessment gap: Employee overrating significantly
      const selfAssessmentGap = Math.max(0, empScore - mgrScore - 0.5);
      
      // Confidence gap: Manager rating significantly higher
      const confidenceGap = Math.max(0, mgrScore - empScore - 0.5);
      
      // Overall gap severity
      const severity = performanceGap * 2 + selfAssessmentGap + confidenceGap;
      
      return {
        section: section.name,
        empScore,
        mgrScore,
        avgScore,
        performanceGap,
        selfAssessmentGap,
        confidenceGap,
        severity,
        gapType: performanceGap > 0 ? 'performance' : 
                 selfAssessmentGap > confidenceGap ? 'overconfidence' : 
                 confidenceGap > 0 ? 'underconfidence' : 'aligned'
      };
    }).filter(gap => gap.severity > 0);
    
    return gaps.sort((a, b) => b.severity - a.severity);
  };

  const employeeGaps = calculateEmployeeGaps();
  
  const getGapRiskLevel = () => {
    const totalSeverity = employeeGaps.reduce((sum, gap) => sum + gap.severity, 0);
    const criticalGaps = employeeGaps.filter(gap => gap.performanceGap > 1).length;
    
    if (totalSeverity > 6 || criticalGaps > 2) return { level: 'HIGH', color: 'text-red-600', bgColor: 'bg-red-50 border-red-200' };
    if (totalSeverity > 3 || criticalGaps > 1) return { level: 'MEDIUM', color: 'text-orange-600', bgColor: 'bg-orange-50 border-orange-200' };
    if (totalSeverity > 0) return { level: 'LOW', color: 'text-yellow-600', bgColor: 'bg-yellow-50 border-yellow-200' };
    return { level: 'MINIMAL', color: 'text-green-600', bgColor: 'bg-green-50 border-green-200' };
  };

  const gapRisk = getGapRiskLevel();

  const getGapTypeIcon = (type: string) => {
    switch (type) {
      case 'performance': return '🔴';
      case 'overconfidence': return '🟡';
      case 'underconfidence': return '🔵';
      default: return '✅';
    }
  };

  const getGapTypeLabel = (type: string) => {
    switch (type) {
      case 'performance': return 'Performance Gap';
      case 'overconfidence': return 'Self-Assessment Gap';
      case 'underconfidence': return 'Confidence Gap';
      default: return 'Well Aligned';
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600 font-medium">Overall Score</p>
                <p className="text-2xl font-bold text-orange-800">{currentScore}/100</p>
              </div>
              <Award className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Performance Band</p>
                <p className="text-lg font-semibold text-blue-800">{appraisalData.performance_band || 'TBD'}</p>
              </div>
              <Target className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 font-medium">Risk Level</p>
                <Badge className={
                  riskLevel === 'high' ? 'bg-red-100 text-red-800 border-red-200' :
                  riskLevel === 'medium' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                  'bg-green-100 text-green-800 border-green-200'
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

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">Completion</p>
                <p className="text-2xl font-bold text-green-800">{Math.round((responses.length / responses.length) * 100)}%</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Section Performance Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart className="h-5 w-5 text-blue-600" />
              Section Performance Breakdown
            </CardTitle>
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
                <BarChart data={sectionData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis domain={[0, 5]} tick={{ fontSize: 12 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend />
                  <Bar 
                    dataKey="employee" 
                    fill="#3B82F6" 
                    name="Employee" 
                    opacity={0.8}
                    radius={[2, 2, 0, 0]}
                  />
                  <Bar 
                    dataKey="manager" 
                    fill="#10B981" 
                    name="Manager" 
                    opacity={0.8}
                    radius={[2, 2, 0, 0]}
                  />
                  <Bar 
                    dataKey="current" 
                    fill="#8B5CF6" 
                    name="Average"
                    radius={[2, 2, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Performance vs Target Analysis */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {weaknessData.some(d => d.score > d.target) ? (
                <TrendingUp className="h-5 w-5 text-green-600" />
              ) : (
                <TrendingDown className="h-5 w-5 text-red-600" />
              )}
              {weaknessData.some(d => d.score > d.target) 
                ? "Performance Excellence Analysis" 
                : "Performance Gap Analysis"
              }
            </CardTitle>
            {weaknessData.some(d => d.score > d.target) && (
              <p className="text-sm text-green-600 mt-1">
                🎉 Exceeding performance targets - Great work!
              </p>
            )}
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                score: { label: "Current Score", color: "#F59E0B" },
                target: { label: "Target", color: "#10B981" },
                gap: { label: "Gap", color: "#EF4444" }
              }}
              className="h-80"
            >
              <ResponsiveContainer>
                <LineChart data={weaknessData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis domain={[0, 5]} tick={{ fontSize: 12 }} />
                  <ChartTooltip 
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white p-3 border rounded shadow-lg">
                            <p className="font-semibold">{label}</p>
                            <div className="space-y-1 text-sm">
                              <div className="flex justify-between gap-4">
                                <span className="text-green-600">Target:</span>
                                <span className="font-medium">{data.target}/5</span>
                              </div>
                              <div className="flex justify-between gap-4">
                                <span className="text-orange-600">Current:</span>
                                <span className="font-medium">
                                  {data.noData ? 'Not Evaluated' : `${data.score}/5`}
                                </span>
                              </div>
                              {!data.noData && (
                                <div className="flex justify-between gap-4">
                                  <span className={data.score >= data.target ? "text-green-600" : "text-red-600"}>
                                    {data.score >= data.target ? 'Exceeding by:' : 'Gap:'}
                                  </span>
                                  <span className="font-medium">
                                    {Math.abs(data.score - data.target).toFixed(1)}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="target" 
                    stroke="#10B981" 
                    strokeWidth={3}
                    strokeDasharray="5 5"
                    dot={{ fill: "#10B981", strokeWidth: 2, r: 6 }}
                    name="Target Performance"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="score" 
                    stroke="#F59E0B" 
                    strokeWidth={4}
                    dot={(props) => {
                      const { payload } = props;
                      if (payload?.noData) {
                        return <circle 
                          {...props} 
                          fill="#9CA3AF" 
                          stroke="#6B7280" 
                          strokeWidth={2} 
                          r={6}
                          strokeDasharray="2,2"
                        />;
                      }
                      return <circle {...props} fill="#F59E0B" strokeWidth={2} r={8} />;
                    }}
                    name="Current Performance"
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Historical Trend */}
        {trendData.length > 0 && (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                Performance Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  score: { label: "Score", color: "#F59E0B" }
                }}
                className="h-64"
              >
                <ResponsiveContainer>
                  <LineChart data={trendData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="cycle" tick={{ fontSize: 12 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line 
                      type="monotone" 
                      dataKey="score" 
                      stroke="#F59E0B" 
                      strokeWidth={3}
                      dot={{ fill: "#F59E0B", strokeWidth: 2, r: 6 }}
                      name="Performance Score"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        )}

        {/* Score Distribution */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-purple-600" />
              Performance Category
            </CardTitle>
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
                          <div className="bg-white p-3 border rounded-lg shadow-lg">
                            <p className="font-medium text-gray-800">{data.name}</p>
                            <p className="text-sm text-gray-600">Current Performance Level</p>
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
                  <span className="text-sm font-medium text-gray-700">{item.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Employee Gap Analysis */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Employee Gap Analysis
            </CardTitle>
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${gapRisk.bgColor} ${gapRisk.color}`}>
              Gap Risk Level: {gapRisk.level}
            </div>
          </CardHeader>
          <CardContent>
            {employeeGaps.length > 0 ? (
              <div className="space-y-4">
                {/* Top 3 Problem Areas */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Top Performance Issues</h4>
                  <div className="space-y-3">
                    {employeeGaps.slice(0, 3).map((gap, index) => (
                      <div key={gap.section} className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{getGapTypeIcon(gap.gapType)}</span>
                            <span className="text-sm font-medium text-gray-800">
                              {index + 1}. {gap.section}
                            </span>
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {getGapTypeLabel(gap.gapType)}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="flex justify-between">
                            <span className="text-blue-600">Employee:</span>
                            <span className="font-medium">{gap.empScore.toFixed(1)}/5</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-green-600">Manager:</span>
                            <span className="font-medium">{gap.mgrScore.toFixed(1)}/5</span>
                          </div>
                        </div>
                        
                        {/* Gap Severity Bar */}
                        <div className="mt-2">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs text-gray-600">Gap Severity</span>
                            <span className="text-xs font-medium text-red-600">
                              {gap.severity.toFixed(1)}
                            </span>
                          </div>
                          <Progress 
                            value={Math.min(gap.severity * 20, 100)} 
                            className="h-2"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Gap Type Distribution */}
                <div className="border-t pt-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Gap Types</h4>
                  <div className="space-y-2">
                    {['performance', 'overconfidence', 'underconfidence'].map(type => {
                      const count = employeeGaps.filter(gap => gap.gapType === type).length;
                      if (count === 0) return null;
                      
                      return (
                        <div key={type} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span>{getGapTypeIcon(type)}</span>
                            <span className="text-sm text-gray-700">{getGapTypeLabel(type)}</span>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {count} area{count !== 1 ? 's' : ''}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Action Items */}
                <div className="border-t pt-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Recommended Actions</h4>
                  <div className="text-xs text-gray-600 space-y-1">
                    {employeeGaps.slice(0, 3).map((gap, index) => (
                      <div key={gap.section} className="flex items-start gap-2">
                        <span className="text-red-500 mt-0.5">•</span>
                        <span>
                          {gap.gapType === 'performance' && `Focus on improving ${gap.section.toLowerCase()} skills`}
                          {gap.gapType === 'overconfidence' && `Align self-assessment in ${gap.section.toLowerCase()}`}
                          {gap.gapType === 'underconfidence' && `Build confidence in ${gap.section.toLowerCase()}`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                <p className="text-sm font-medium text-green-700">No Significant Gaps Detected</p>
                <p className="text-xs text-gray-600 mt-1">
                  Employee and manager assessments are well-aligned across all areas
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* AI Insights */}
      {analytics?.recommendations && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-blue-600" />
              AI-Generated Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-200">
              <h4 className="font-medium text-blue-900 mb-3 flex items-center gap-2">
                <Target className="h-4 w-4" />
                Recommendations
              </h4>
              <p className="text-sm text-blue-800 leading-relaxed">
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
