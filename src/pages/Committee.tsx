
import React, { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Scale, Clock, Users, CheckCircle, User, TrendingUp, Target, Award, AlertTriangle, BarChart3, Eye, FileText, ArrowRight } from 'lucide-react';
import { useCommitteeData } from '@/hooks/useCommitteeData';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Area, AreaChart } from 'recharts';
import { useNavigate } from 'react-router-dom';

const chartConfig = {
  score: {
    label: "Score",
    color: "#f97316",
  },
  duration: {
    label: "Days",
    color: "#3b82f6",
  },
  average: {
    label: "Average",
    color: "#10b981",
  },
};

export default function Committee() {
  const navigate = useNavigate();
  const {
    employees,
    selectedEmployee,
    analytics,
    loading,
    loadingAnalytics,
    fetchEmployees,
    handleEmployeeSelect
  } = useCommitteeData();

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const getPerformanceBadgeColor = (band: string | null) => {
    if (!band) return 'bg-gray-100 text-gray-800';
    switch (band.toLowerCase()) {
      case 'exceptional': return 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg';
      case 'excellent': return 'bg-gradient-to-r from-blue-500 to-cyan-600 text-white shadow-lg';
      case 'very good': return 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-lg';
      case 'good': return 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-lg';
      case 'fair': return 'bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-lg';
      case 'poor': return 'bg-gradient-to-r from-red-600 to-red-800 text-white shadow-lg';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getScoreColor = (score: number | null) => {
    if (!score) return 'text-gray-500';
    if (score >= 85) return 'text-emerald-600';
    if (score >= 70) return 'text-blue-600';
    if (score >= 60) return 'text-amber-600';
    return 'text-red-600';
  };

  const handleViewQuestions = () => {
    if (selectedEmployee) {
      navigate(`/employee-questions/${selectedEmployee}`);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Futuristic Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8 text-white">
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: "url('data:image/svg+xml,%3Csvg width=\"60\" height=\"60\" viewBox=\"0 0 60 60\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cg fill=\"none\" fillRule=\"evenodd\"%3E%3Cg fill=\"%23ffffff\" fillOpacity=\"0.05\"%3E%3Ccircle cx=\"30\" cy=\"30\" r=\"2\"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')"
        }}></div>
        <div className="relative z-10">
          <div className="flex items-center space-x-4 mb-4">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg animate-pulse">
              <BarChart3 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">
                Committee Review
              </h1>
              <p className="text-slate-300 text-lg">
                Advanced employee performance analysis & decision support system
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Employee Selection with Enhanced Design */}
      <Card className="border-0 shadow-2xl bg-gradient-to-br from-white to-orange-50 overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-orange-500/10 to-red-500/10 rounded-full -translate-y-16 translate-x-16"></div>
        <CardHeader className="relative">
          <CardTitle className="flex items-center text-orange-700 text-xl">
            <User className="h-6 w-6 mr-3" />
            Employee Selection
          </CardTitle>
          <CardDescription className="text-base">
            Select an employee to view comprehensive performance analytics
          </CardDescription>
        </CardHeader>
        <CardContent className="relative">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <Select value={selectedEmployee} onValueChange={handleEmployeeSelect}>
                <SelectTrigger className="w-full h-12 border-2 border-orange-200 focus:border-orange-500 rounded-xl">
                  <SelectValue placeholder="Select an employee for comprehensive analysis" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      <div className="flex flex-col py-1">
                        <span className="font-medium">
                          {employee.first_name} {employee.last_name}
                        </span>
                        <span className="text-sm text-gray-500">
                          {employee.position} • {employee.department?.name}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedEmployee && (
              <Button 
                onClick={handleViewQuestions}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold px-6 h-12 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 animate-scale-in"
              >
                <Eye className="h-4 w-4 mr-2" />
                View Questions & Responses
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {loadingAnalytics && (
        <Card className="border-0 shadow-xl">
          <CardContent className="py-12">
            <div className="flex items-center justify-center space-x-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
              <div className="text-center">
                <div className="text-lg font-semibold text-gray-700 mb-2">Processing Analytics</div>
                <div className="text-sm text-gray-500">Analyzing performance data...</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {analytics && (
        <>
          {/* Enhanced Employee Profile Header */}
          <Card className="border-0 shadow-2xl bg-gradient-to-br from-orange-50 to-red-50 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-red-500/5"></div>
            <CardContent className="py-8 relative">
              <div className="flex items-center space-x-6">
                <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center shadow-xl animate-pulse">
                  <User className="h-10 w-10 text-white" />
                </div>
                <div className="flex-1">
                  <h2 className="text-3xl font-bold bg-gradient-to-r from-orange-700 to-red-700 bg-clip-text text-transparent">
                    {analytics.employee.first_name} {analytics.employee.last_name}
                  </h2>
                  <p className="text-xl text-orange-600 font-semibold">
                    {analytics.employee.position} • {analytics.employee.department?.name}
                  </p>
                  <p className="text-orange-500 mt-1">
                    {analytics.employee.email}
                  </p>
                  {analytics.employee.line_manager && (
                    <p className="text-sm text-orange-600 mt-2 flex items-center">
                      <User className="h-4 w-4 mr-2" />
                      Line Manager: {analytics.employee.line_manager.first_name} {analytics.employee.line_manager.last_name}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Enhanced Performance Overview Cards */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card className="border-0 shadow-xl bg-gradient-to-br from-blue-50 to-cyan-50 hover:shadow-2xl transition-all duration-300 hover-scale">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-blue-700">
                  Performance Score
                </CardTitle>
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg flex items-center justify-center">
                  <Scale className="h-5 w-5 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold ${getScoreColor(analytics.averageScore)} mb-2`}>
                  {analytics.averageScore ? `${analytics.averageScore.toFixed(1)}%` : '--'}
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-cyan-600 h-2 rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${analytics.averageScore || 0}%` }}
                  ></div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-xl bg-gradient-to-br from-green-50 to-emerald-50 hover:shadow-2xl transition-all duration-300 hover-scale">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-green-700">
                  Total Appraisals
                </CardTitle>
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                  <FileText className="h-5 w-5 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-700 mb-2">{analytics.totalAppraisals}</div>
                <p className="text-xs text-green-600">
                  Appraisals conducted
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-xl bg-gradient-to-br from-purple-50 to-indigo-50 hover:shadow-2xl transition-all duration-300 hover-scale">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-purple-700">
                  Completion Rate
                </CardTitle>
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-700 mb-2">
                  {analytics.totalAppraisals > 0 
                    ? `${Math.round((analytics.completedAppraisals / analytics.totalAppraisals) * 100)}%`
                    : '--'
                  }
                </div>
                <p className="text-xs text-purple-600">
                  Success rate
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-xl bg-gradient-to-br from-amber-50 to-orange-50 hover:shadow-2xl transition-all duration-300 hover-scale">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-amber-700">
                  Trend Analysis
                </CardTitle>
                <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-amber-700 mb-2">
                  {analytics.chartData.scoreHistory.length > 1 ? '📈' : '📊'}
                </div>
                <p className="text-xs text-amber-600">
                  Performance trend
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Enhanced Charts Section */}
          <div className="grid gap-8 lg:grid-cols-2">
            {/* Performance Score Trend - Enhanced */}
            <Card className="border-0 shadow-2xl bg-gradient-to-br from-white to-blue-50">
              <CardHeader>
                <CardTitle className="flex items-center text-blue-700 text-xl">
                  <BarChart3 className="h-6 w-6 mr-3" />
                  Performance Score Evolution
                </CardTitle>
                <CardDescription className="text-base">
                  Track performance improvements over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                {analytics.chartData.scoreHistory.length > 0 ? (
                  <ChartContainer config={chartConfig} className="h-[300px]">
                    <AreaChart data={analytics.chartData.scoreHistory}>
                      <defs>
                        <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#f97316" stopOpacity={0.05}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="cycle" tick={{ fontSize: 12 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Area 
                        type="monotone" 
                        dataKey="score" 
                        stroke="var(--color-score)" 
                        strokeWidth={3}
                        fill="url(#scoreGradient)"
                        dot={{ fill: "var(--color-score)", strokeWidth: 2, r: 6 }}
                      />
                    </AreaChart>
                  </ChartContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-gray-500 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl">
                    <div className="text-center">
                      <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                      <p className="font-medium">Insufficient Data</p>
                      <p className="text-sm">More appraisals needed for trend analysis</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Performance Bands - Enhanced */}
            <Card className="border-0 shadow-2xl bg-gradient-to-br from-white to-purple-50">
              <CardHeader>
                <CardTitle className="flex items-center text-purple-700 text-xl">
                  <Scale className="h-6 w-6 mr-3" />
                  Performance Distribution
                </CardTitle>
                <CardDescription className="text-base">
                  Breakdown of performance ratings
                </CardDescription>
              </CardHeader>
              <CardContent>
                {analytics.chartData.performanceBands.length > 0 ? (
                  <ChartContainer config={chartConfig} className="h-[300px]">
                    <PieChart>
                      <Pie
                        data={analytics.chartData.performanceBands}
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={120}
                        paddingAngle={2}
                        dataKey="count"
                      >
                        {analytics.chartData.performanceBands.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </PieChart>
                  </ChartContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-gray-500 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl">
                    <div className="text-center">
                      <Scale className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                      <p className="font-medium">No Performance Data</p>
                      <p className="text-sm">Performance bands will appear after evaluations</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Completion Timeline - Enhanced */}
          <Card className="border-0 shadow-2xl bg-gradient-to-br from-white to-indigo-50">
            <CardHeader>
              <CardTitle className="flex items-center text-indigo-700 text-xl">
                <Clock className="h-6 w-6 mr-3" />
                Appraisal Completion Efficiency
              </CardTitle>
              <CardDescription className="text-base">
                Timeline analysis for process optimization
              </CardDescription>
            </CardHeader>
            <CardContent>
              {analytics.chartData.completionTimeline.length > 0 ? (
                <ChartContainer config={chartConfig} className="h-[250px]">
                  <BarChart data={analytics.chartData.completionTimeline.filter(item => item.duration !== null)}>
                    <defs>
                      <linearGradient id="durationGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="cycle" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="duration" fill="url(#durationGradient)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-gray-500 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl">
                  <div className="text-center">
                    <Clock className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p className="font-medium">No Timeline Data</p>
                    <p className="text-sm">Completion metrics will appear with completed appraisals</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Enhanced Performance Analysis */}
          <div className="grid gap-8 lg:grid-cols-2">
            {/* Key Strengths - Enhanced */}
            <Card className="border-0 shadow-2xl bg-gradient-to-br from-green-50 to-emerald-50 overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-full -translate-y-12 translate-x-12"></div>
              <CardHeader className="relative">
                <CardTitle className="flex items-center text-green-700 text-xl">
                  <Award className="h-6 w-6 mr-3" />
                  Core Strengths
                </CardTitle>
                <CardDescription className="text-base">
                  Key areas of excellence and competitive advantage
                </CardDescription>
              </CardHeader>
              <CardContent className="relative">
                <div className="space-y-3">
                  {analytics.strengths.length > 0 ? (
                    analytics.strengths.map((strength, index) => (
                      <div key={index} className="flex items-center p-4 bg-gradient-to-r from-green-100 to-emerald-100 rounded-xl border border-green-200 animate-fade-in hover:shadow-lg transition-all duration-300" style={{ animationDelay: `${index * 0.1}s` }}>
                        <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center mr-3">
                          <CheckCircle className="h-4 w-4 text-white" />
                        </div>
                        <span className="text-green-800 font-medium">{strength}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <Award className="h-12 w-12 mx-auto mb-4 text-green-400" />
                      <p className="text-green-600 font-medium">Strengths Analysis Pending</p>
                      <p className="text-sm text-green-500">Complete more appraisals to identify key strengths</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Improvement Areas - Enhanced */}
            <Card className="border-0 shadow-2xl bg-gradient-to-br from-amber-50 to-orange-50 overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-full -translate-y-12 translate-x-12"></div>
              <CardHeader className="relative">
                <CardTitle className="flex items-center text-amber-700 text-xl">
                  <Target className="h-6 w-6 mr-3" />
                  Development Opportunities
                </CardTitle>
                <CardDescription className="text-base">
                  Strategic areas for growth and improvement
                </CardDescription>
              </CardHeader>
              <CardContent className="relative">
                <div className="space-y-3">
                  {analytics.improvementAreas.length > 0 ? (
                    analytics.improvementAreas.map((area, index) => (
                      <div key={index} className="flex items-center p-4 bg-gradient-to-r from-amber-100 to-orange-100 rounded-xl border border-amber-200 animate-fade-in hover:shadow-lg transition-all duration-300" style={{ animationDelay: `${index * 0.1}s` }}>
                        <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center mr-3">
                          <Target className="h-4 w-4 text-white" />
                        </div>
                        <span className="text-amber-800 font-medium">{area}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <Target className="h-12 w-12 mx-auto mb-4 text-amber-400" />
                      <p className="text-amber-600 font-medium">Development Analysis Pending</p>
                      <p className="text-sm text-amber-500">Assessment data will reveal improvement opportunities</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Enhanced Appraisal History */}
          <Card className="border-0 shadow-2xl bg-gradient-to-br from-white to-slate-50">
            <CardHeader>
              <CardTitle className="flex items-center text-slate-700 text-xl">
                <Clock className="h-6 w-6 mr-3" />
                Comprehensive Appraisal Timeline
              </CardTitle>
              <CardDescription className="text-base">
                Complete evaluation history with reviewer insights
              </CardDescription>
            </CardHeader>
            <CardContent>
              {analytics.appraisals.length > 0 ? (
                <div className="space-y-4">
                  {analytics.appraisals.map((appraisal, index) => (
                    <div key={appraisal.id} className="p-6 bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl border border-slate-200 hover:shadow-xl transition-all duration-300 animate-fade-in" style={{ animationDelay: `${index * 0.1}s` }}>
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-slate-600 to-slate-800 rounded-lg flex items-center justify-center">
                              <FileText className="h-5 w-5 text-white" />
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 text-lg">
                                {appraisal.cycle_name}
                              </div>
                              <div className="text-sm text-slate-600">
                                Created: {new Date(appraisal.created_at).toLocaleDateString('en-US', { 
                                  year: 'numeric', 
                                  month: 'long', 
                                  day: 'numeric' 
                                })}
                                {appraisal.completed_at && (
                                  <span className="ml-4">
                                    Completed: {new Date(appraisal.completed_at).toLocaleDateString('en-US', { 
                                      year: 'numeric', 
                                      month: 'long', 
                                      day: 'numeric' 
                                    })}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          {appraisal.manager_reviewed_by && (
                            <div className="bg-blue-50 p-3 rounded-lg mb-3">
                              <div className="text-sm text-blue-700 font-medium">
                                Reviewed by: {appraisal.manager_reviewed_by.first_name} {appraisal.manager_reviewed_by.last_name}
                              </div>
                              <div className="text-xs text-blue-600">
                                Department: {appraisal.manager_reviewed_by.department}
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center space-x-4">
                          {appraisal.overall_score && (
                            <div className="text-center">
                              <div className={`text-2xl font-bold ${getScoreColor(appraisal.overall_score)}`}>
                                {appraisal.overall_score}%
                              </div>
                              <div className="text-xs text-gray-500">Score</div>
                            </div>
                          )}
                          {appraisal.performance_band && (
                            <Badge className={`${getPerformanceBadgeColor(appraisal.performance_band)} px-4 py-2 text-sm font-semibold`}>
                              {appraisal.performance_band}
                            </Badge>
                          )}
                          <Badge 
                            variant={appraisal.status === 'completed' ? 'default' : 'secondary'}
                            className="px-3 py-1"
                          >
                            {appraisal.status.replace('_', ' ').toUpperCase()}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl">
                  <Clock className="h-16 w-16 mx-auto mb-6 text-gray-400" />
                  <h3 className="text-xl font-medium mb-3 text-gray-700">No Appraisal History</h3>
                  <p className="text-gray-500 max-w-md mx-auto">
                    This employee hasn't completed any performance appraisals yet. 
                    Historical data will appear here once evaluations are conducted.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {!selectedEmployee && !loadingAnalytics && (
        <Card className="border-0 shadow-2xl bg-gradient-to-br from-slate-50 to-blue-50">
          <CardContent className="py-16">
            <div className="text-center">
              <div className="w-24 h-24 bg-gradient-to-br from-slate-600 to-blue-600 rounded-2xl mx-auto mb-6 flex items-center justify-center">
                <Users className="h-12 w-12 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-slate-700">Select Employee for Analysis</h3>
              <p className="text-slate-500 text-lg max-w-md mx-auto">
                Choose an employee from the selection above to unlock comprehensive performance insights, 
                advanced analytics, and detailed evaluation history.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
