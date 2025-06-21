
import React, { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Scale, Clock, Users, CheckCircle, User, TrendingUp, Target, Award, AlertTriangle } from 'lucide-react';
import { useCommitteeData } from '@/hooks/useCommitteeData';

export default function Committee() {
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
      case 'exceptional': return 'bg-green-100 text-green-800';
      case 'excellent': return 'bg-blue-100 text-blue-800';
      case 'very good': return 'bg-orange-100 text-orange-800';
      case 'good': return 'bg-yellow-100 text-yellow-800';
      case 'fair': return 'bg-red-100 text-red-800';
      case 'poor': return 'bg-red-200 text-red-900';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getScoreColor = (score: number | null) => {
    if (!score) return 'text-gray-500';
    if (score >= 85) return 'text-green-600';
    if (score >= 70) return 'text-orange-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Committee Review</h1>
          <p className="text-muted-foreground">
            Comprehensive employee performance analysis and review
          </p>
        </div>
      </div>

      {/* Employee Selection */}
      <Card className="border-orange-200">
        <CardHeader>
          <CardTitle className="flex items-center text-orange-700">
            <User className="h-5 w-5 mr-2" />
            Employee Selection
          </CardTitle>
          <CardDescription>
            Select an employee to view detailed performance analytics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedEmployee} onValueChange={handleEmployeeSelect}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select an employee for analysis" />
            </SelectTrigger>
            <SelectContent>
              {employees.map((employee) => (
                <SelectItem key={employee.id} value={employee.id}>
                  <div className="flex flex-col">
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
        </CardContent>
      </Card>

      {loadingAnalytics && (
        <Card>
          <CardContent className="py-8">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600"></div>
              <span className="ml-2 text-gray-600">Loading analytics...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {analytics && (
        <>
          {/* Employee Profile Header */}
          <Card className="bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="py-6">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-orange-200 rounded-full flex items-center justify-center">
                  <User className="h-8 w-8 text-orange-700" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-orange-900">
                    {analytics.employee.first_name} {analytics.employee.last_name}
                  </h2>
                  <p className="text-orange-700">
                    {analytics.employee.position} • {analytics.employee.department?.name}
                  </p>
                  <p className="text-sm text-orange-600">
                    {analytics.employee.email}
                  </p>
                  {analytics.employee.line_manager && (
                    <p className="text-sm text-orange-600">
                      Line Manager: {analytics.employee.line_manager.first_name} {analytics.employee.line_manager.last_name}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Performance Overview */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="border-orange-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-orange-700">
                  Average Score
                </CardTitle>
                <Scale className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${getScoreColor(analytics.averageScore)}`}>
                  {analytics.averageScore ? `${analytics.averageScore.toFixed(1)}%` : '--'}
                </div>
                <p className="text-xs text-muted-foreground">
                  Overall performance rating
                </p>
              </CardContent>
            </Card>
            <Card className="border-orange-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-orange-700">
                  Total Appraisals
                </CardTitle>
                <Clock className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-700">{analytics.totalAppraisals}</div>
                <p className="text-xs text-muted-foreground">
                  Appraisals conducted
                </p>
              </CardContent>
            </Card>
            <Card className="border-orange-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-orange-700">
                  Completed
                </CardTitle>
                <CheckCircle className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{analytics.completedAppraisals}</div>
                <p className="text-xs text-muted-foreground">
                  Successfully completed
                </p>
              </CardContent>
            </Card>
            <Card className="border-orange-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-orange-700">
                  Completion Rate
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {analytics.totalAppraisals > 0 
                    ? `${Math.round((analytics.completedAppraisals / analytics.totalAppraisals) * 100)}%`
                    : '--'
                  }
                </div>
                <p className="text-xs text-muted-foreground">
                  Appraisal completion rate
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Performance Analysis */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Strengths */}
            <Card className="border-green-200">
              <CardHeader>
                <CardTitle className="flex items-center text-green-700">
                  <Award className="h-5 w-5 mr-2" />
                  Key Strengths
                </CardTitle>
                <CardDescription>
                  Areas where the employee excels
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {analytics.strengths.length > 0 ? (
                    analytics.strengths.map((strength, index) => (
                      <div key={index} className="flex items-center p-2 bg-green-50 rounded-lg">
                        <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                        <span className="text-green-800">{strength}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-sm">No specific strengths identified yet</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Improvement Areas */}
            <Card className="border-yellow-200">
              <CardHeader>
                <CardTitle className="flex items-center text-yellow-700">
                  <Target className="h-5 w-5 mr-2" />
                  Areas for Improvement
                </CardTitle>
                <CardDescription>
                  Focus areas for development
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {analytics.improvementAreas.length > 0 ? (
                    analytics.improvementAreas.map((area, index) => (
                      <div key={index} className="flex items-center p-2 bg-yellow-50 rounded-lg">
                        <AlertTriangle className="h-4 w-4 text-yellow-600 mr-2" />
                        <span className="text-yellow-800">{area}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-sm">No specific improvement areas identified</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Appraisal History */}
          <Card className="border-orange-200">
            <CardHeader>
              <CardTitle className="flex items-center text-orange-700">
                <Clock className="h-5 w-5 mr-2" />
                Appraisal History
              </CardTitle>
              <CardDescription>
                Complete performance evaluation timeline
              </CardDescription>
            </CardHeader>
            <CardContent>
              {analytics.appraisals.length > 0 ? (
                <div className="space-y-4">
                  {analytics.appraisals.map((appraisal) => (
                    <div key={appraisal.id} className="flex items-center justify-between p-4 bg-orange-50 rounded-lg border border-orange-200">
                      <div className="flex-1">
                        <div className="font-medium text-orange-900">
                          {appraisal.cycle_name}
                        </div>
                        <div className="text-sm text-orange-700">
                          Created: {new Date(appraisal.created_at).toLocaleDateString()}
                          {appraisal.completed_at && (
                            <span className="ml-4">
                              Completed: {new Date(appraisal.completed_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        {appraisal.overall_score && (
                          <div className={`text-lg font-bold ${getScoreColor(appraisal.overall_score)}`}>
                            {appraisal.overall_score}%
                          </div>
                        )}
                        {appraisal.performance_band && (
                          <Badge className={getPerformanceBandColor(appraisal.performance_band)}>
                            {appraisal.performance_band}
                          </Badge>
                        )}
                        <Badge variant={appraisal.status === 'completed' ? 'default' : 'secondary'}>
                          {appraisal.status.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Clock className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="mb-2">No appraisal history available</p>
                  <p className="text-sm text-gray-400">
                    This employee has not completed any appraisals yet
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {!selectedEmployee && !loadingAnalytics && (
        <Card className="border-orange-200">
          <CardContent className="py-12">
            <div className="text-center text-gray-500">
              <Users className="h-16 w-16 mx-auto mb-4 text-orange-300" />
              <h3 className="text-lg font-medium mb-2 text-orange-700">Select an Employee</h3>
              <p className="text-sm text-gray-400">
                Choose an employee from the dropdown above to view their detailed performance analytics
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
