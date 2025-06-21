
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Users, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { AssignmentStats } from '@/hooks/useQuestionAssignmentData';

interface AssignmentStatsCardsProps {
  stats: AssignmentStats;
}

export function AssignmentStatsCards({ stats }: AssignmentStatsCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Employees</p>
              <p className="text-2xl font-bold">{stats.totalEmployees}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center">
            <CheckCircle className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">With Questions</p>
              <p className="text-2xl font-bold">{stats.employeesWithQuestions}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center">
            <AlertCircle className="h-8 w-8 text-orange-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Questions Assigned</p>
              <p className="text-2xl font-bold">{stats.totalQuestionsAssigned}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center">
            <Clock className="h-8 w-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <p className="text-2xl font-bold">{stats.completedAppraisals}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
