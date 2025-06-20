
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart3, FileText, Download, TrendingUp, Users, Target } from 'lucide-react';

export default function CompanyReports() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Company Reports</h1>
          <p className="text-gray-600 mt-2">Generate comprehensive reports and analytics for organizational insights</p>
        </div>
        
        <Button className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600">
          <FileText className="h-4 w-4 mr-2" />
          Generate Report
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="backdrop-blur-md bg-white/60 border-white/40 shadow-lg hover:shadow-xl transition-all">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-6 w-6 text-orange-600" />
              <CardTitle>Performance Analytics</CardTitle>
            </div>
            <CardDescription>
              Comprehensive performance analysis across all departments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">
              <Download className="h-4 w-4 mr-2" />
              Generate Report
            </Button>
          </CardContent>
        </Card>

        <Card className="backdrop-blur-md bg-white/60 border-white/40 shadow-lg hover:shadow-xl transition-all">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-6 w-6 text-blue-600" />
              <CardTitle>Trend Analysis</CardTitle>
            </div>
            <CardDescription>
              Track performance trends over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">
              <Download className="h-4 w-4 mr-2" />
              View Trends
            </Button>
          </CardContent>
        </Card>

        <Card className="backdrop-blur-md bg-white/60 border-white/40 shadow-lg hover:shadow-xl transition-all">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Users className="h-6 w-6 text-green-600" />
              <CardTitle>Department Reports</CardTitle>
            </div>
            <CardDescription>
              Department-wise performance breakdowns
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </CardContent>
        </Card>

        <Card className="backdrop-blur-md bg-white/60 border-white/40 shadow-lg hover:shadow-xl transition-all">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Target className="h-6 w-6 text-purple-600" />
              <CardTitle>Goal Achievement</CardTitle>
            </div>
            <CardDescription>
              Track organizational goal completion rates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">
              <Download className="h-4 w-4 mr-2" />
              View Goals
            </Button>
          </CardContent>
        </Card>

        <Card className="backdrop-blur-md bg-white/60 border-white/40 shadow-lg hover:shadow-xl transition-all">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <FileText className="h-6 w-6 text-indigo-600" />
              <CardTitle>Custom Reports</CardTitle>
            </div>
            <CardDescription>
              Build custom reports with specific metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">
              Create Custom
            </Button>
          </CardContent>
        </Card>

        <Card className="backdrop-blur-md bg-white/60 border-white/40 shadow-lg hover:shadow-xl transition-all">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-6 w-6 text-red-600" />
              <CardTitle>Executive Summary</CardTitle>
            </div>
            <CardDescription>
              High-level organizational performance overview
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">
              <Download className="h-4 w-4 mr-2" />
              Generate
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="backdrop-blur-md bg-white/60 border-white/40">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <BarChart3 className="h-16 w-16 text-gray-400 mb-4" />
          <h3 className="text-xl font-medium text-gray-900 mb-2">Advanced Reporting System</h3>
          <p className="text-gray-600 text-center max-w-md">
            Our comprehensive reporting system provides deep insights into organizational performance, 
            helping you make data-driven decisions for better outcomes.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
