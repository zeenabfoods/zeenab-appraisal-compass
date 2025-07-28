
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { TrendingUp, TrendingDown, Award, BarChart3, Calendar, AlertCircle } from 'lucide-react';

interface PerformanceTrendData {
  month: string;
  avgScore: number;
  completedCount: number;
  totalAppraisals: number;
  completionRate: number;
}

interface CompanyStats {
  totalEmployees: number;
  avgCompanyScore: number;
  topPerformers: number;
  improvementTrend: number;
}

export function CompanyPerformanceTrend() {
  const { data: trendData, isLoading: trendLoading, error: trendError } = useQuery({
    queryKey: ['company-performance-trend'],
    queryFn: async (): Promise<PerformanceTrendData[]> => {
      console.log('🔍 Fetching company performance trend data...');
      
      const { data: appraisals, error } = await supabase
        .from('appraisals')
        .select('overall_score, completed_at, status, created_at')
        .order('created_at', { ascending: true });

      if (error) {
        console.error('❌ Error fetching appraisals:', error);
        throw error;
      }

      console.log('📊 Appraisals data:', appraisals);

      if (!appraisals || appraisals.length === 0) {
        console.log('⚠️ No appraisals found');
        return [];
      }

      // Group data by month
      const monthlyData = appraisals.reduce((acc, appraisal) => {
        const date = new Date(appraisal.created_at);
        const monthKey = date.toLocaleDateString('en-US', { 
          month: 'short', 
          year: 'numeric' 
        });
        
        if (!acc[monthKey]) {
          acc[monthKey] = {
            scores: [],
            completed: 0,
            total: 0
          };
        }
        
        acc[monthKey].total++;
        
        if (appraisal.status === 'completed' && appraisal.overall_score) {
          acc[monthKey].scores.push(appraisal.overall_score);
          acc[monthKey].completed++;
        }
        
        return acc;
      }, {} as Record<string, { scores: number[], completed: number, total: number }>);

      // Convert to array and calculate averages
      const result = Object.entries(monthlyData)
        .map(([month, data]) => ({
          month,
          avgScore: data.scores.length > 0 
            ? parseFloat((data.scores.reduce((sum, score) => sum + score, 0) / data.scores.length).toFixed(1))
            : 0,
          completedCount: data.completed,
          totalAppraisals: data.total,
          completionRate: data.total > 0 ? parseFloat(((data.completed / data.total) * 100).toFixed(1)) : 0
        }))
        .filter(item => item.totalAppraisals > 0)
        .slice(-6); // Show last 6 months

      console.log('📈 Processed trend data:', result);
      return result;
    }
  });

  const { data: companyStats, isLoading: statsLoading, error: statsError } = useQuery({
    queryKey: ['company-stats'],
    queryFn: async (): Promise<CompanyStats> => {
      console.log('🔍 Fetching company stats...');
      
      const [
        { data: employees, error: employeesError },
        { data: completedAppraisals, error: appraisalsError }
      ] = await Promise.all([
        supabase.from('profiles').select('id').eq('is_active', true),
        supabase.from('appraisals').select('overall_score').eq('status', 'completed').not('overall_score', 'is', null)
      ]);

      if (employeesError) {
        console.error('❌ Error fetching employees:', employeesError);
        throw employeesError;
      }
      
      if (appraisalsError) {
        console.error('❌ Error fetching completed appraisals:', appraisalsError);
        throw appraisalsError;
      }

      console.log('👥 Employees:', employees);
      console.log('✅ Completed appraisals:', completedAppraisals);

      const totalEmployees = employees?.length || 0;
      const scores = completedAppraisals?.map(a => a.overall_score) || [];
      const avgScore = scores.length > 0 
        ? scores.reduce((sum, score) => sum + score, 0) / scores.length 
        : 0;
      const topPerformers = scores.filter(score => score >= 85).length;
      
      // Calculate improvement trend (comparing last 3 months with previous 3 months)
      const recentScores = scores.slice(-Math.floor(scores.length / 2));
      const olderScores = scores.slice(0, Math.floor(scores.length / 2));
      const recentAvg = recentScores.length > 0 ? recentScores.reduce((sum, score) => sum + score, 0) / recentScores.length : 0;
      const olderAvg = olderScores.length > 0 ? olderScores.reduce((sum, score) => sum + score, 0) / olderScores.length : 0;
      const improvementTrend = olderAvg > 0 ? ((recentAvg - olderAvg) / olderAvg) * 100 : 0;

      const result = {
        totalEmployees,
        avgCompanyScore: parseFloat(avgScore.toFixed(1)),
        topPerformers,
        improvementTrend: parseFloat(improvementTrend.toFixed(1))
      };

      console.log('📊 Company stats:', result);
      return result;
    }
  });

  if (trendLoading || statsLoading) {
    return (
      <Card className="backdrop-blur-md bg-white/60 border-white/40 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Company Performance Trend
          </CardTitle>
          <CardDescription>Loading performance analytics...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
            <span className="ml-3 text-gray-600">Fetching data...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (trendError || statsError) {
    return (
      <Card className="backdrop-blur-md bg-white/60 border-white/40 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            Company Performance Trend
          </CardTitle>
          <CardDescription>Error loading performance data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12 text-center">
            <div className="text-red-500">
              <AlertCircle className="h-16 w-16 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Unable to Load Data</h3>
              <p className="text-sm text-gray-600">
                {trendError?.message || statsError?.message || 'Please check your database connection'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Company Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="backdrop-blur-md bg-white/60 border-white/40 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Employees</p>
                <p className="text-2xl font-bold text-gray-900">{companyStats?.totalEmployees || 0}</p>
              </div>
              <div className="p-2 bg-blue-100 rounded-full">
                <BarChart3 className="h-4 w-4 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="backdrop-blur-md bg-white/60 border-white/40 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Company Score</p>
                <p className="text-2xl font-bold text-gray-900">{companyStats?.avgCompanyScore || 0}</p>
              </div>
              <div className="p-2 bg-green-100 rounded-full">
                <Award className="h-4 w-4 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="backdrop-blur-md bg-white/60 border-white/40 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Top Performers</p>
                <p className="text-2xl font-bold text-gray-900">{companyStats?.topPerformers || 0}</p>
              </div>
              <div className="p-2 bg-purple-100 rounded-full">
                <TrendingUp className="h-4 w-4 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="backdrop-blur-md bg-white/60 border-white/40 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Trend</p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold text-gray-900">
                    {companyStats?.improvementTrend ? `${companyStats.improvementTrend > 0 ? '+' : ''}${companyStats.improvementTrend}%` : 'N/A'}
                  </p>
                  {companyStats?.improvementTrend !== undefined && (
                    companyStats.improvementTrend > 0 ? (
                      <TrendingUp className="h-4 w-4 text-green-600" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-600" />
                    )
                  )}
                </div>
              </div>
              <div className={`p-2 rounded-full ${companyStats?.improvementTrend && companyStats.improvementTrend > 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                <Calendar className={`h-4 w-4 ${companyStats?.improvementTrend && companyStats.improvementTrend > 0 ? 'text-green-600' : 'text-red-600'}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Trend Chart */}
      <Card className="backdrop-blur-md bg-white/60 border-white/40 shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Company Performance Trend
              </CardTitle>
              <CardDescription>
                {trendData && trendData.length > 0 
                  ? `Monthly performance scores and completion rates - ${trendData.length} months shown`
                  : 'No performance data available yet'
                }
              </CardDescription>
            </div>
            <Badge variant="outline" className="bg-gradient-to-r from-blue-100 to-purple-100 text-blue-800 border-blue-200">
              {trendData && trendData.length > 0 ? 'Live Data' : 'No Data'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {trendData && trendData.length > 0 ? (
            <div className="space-y-6">
              {/* Average Score Trend */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Average Performance Score</h4>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData}>
                      <defs>
                        <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#8884d8" stopOpacity={0.1}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
                      <XAxis 
                        dataKey="month" 
                        tick={{ fontSize: 12 }}
                        stroke="#6b7280"
                      />
                      <YAxis 
                        domain={[0, 100]}
                        tick={{ fontSize: 12 }}
                        stroke="#6b7280"
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'rgba(255, 255, 255, 0.95)',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                        }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="avgScore" 
                        stroke="#8884d8" 
                        strokeWidth={3}
                        fill="url(#scoreGradient)"
                        name="Average Score"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Completion Rate Trend */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Completion Rate</h4>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
                      <XAxis 
                        dataKey="month" 
                        tick={{ fontSize: 12 }}
                        stroke="#6b7280"
                      />
                      <YAxis 
                        domain={[0, 100]}
                        tick={{ fontSize: 12 }}
                        stroke="#6b7280"
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'rgba(255, 255, 255, 0.95)',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                        }}
                        formatter={(value) => [`${value}%`, 'Completion Rate']}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="completionRate" 
                        stroke="#10b981" 
                        strokeWidth={3}
                        dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, stroke: '#10b981', strokeWidth: 2 }}
                        name="Completion Rate"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <BarChart3 className="h-16 w-16 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Performance Data Available</h3>
              <p className="text-sm text-gray-500 max-w-md mb-4">
                Performance trends will appear here once appraisals are completed. 
                The system is ready to display data as soon as you have:
              </p>
              <div className="text-xs text-gray-400 space-y-1">
                <p>• Created appraisal cycles</p>
                <p>• Added employee appraisals</p>
                <p>• Completed performance reviews</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
