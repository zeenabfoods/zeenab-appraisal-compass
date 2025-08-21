
import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, BookOpen, Users, Clock, AlertTriangle } from 'lucide-react';
import { TrainingContentManager } from './TrainingContentManager';
import { TrainingAssignmentManager } from './TrainingAssignmentManager';
import { TrainingStats } from './TrainingStats';
import { useTrainingData } from '@/hooks/training/useTrainingData';

export function TrainingManager() {
  const { profile } = useAuth();
  const [activeView, setActiveView] = useState<'overview' | 'content' | 'assignments'>('overview');
  const { stats, loading } = useTrainingData();

  if (!profile || (profile.role !== 'hr' && profile.role !== 'admin')) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-gray-500">Access denied. Only HR and Admin can manage training.</p>
        </CardContent>
      </Card>
    );
  }

  if (activeView === 'content') {
    return <TrainingContentManager onBack={() => setActiveView('overview')} />;
  }

  if (activeView === 'assignments') {
    return <TrainingAssignmentManager onBack={() => setActiveView('overview')} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Training Overview</h2>
          <p className="text-gray-600 mt-1">Manage training content and assignments</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setActiveView('content')} className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Manage Content
          </Button>
          <Button onClick={() => setActiveView('assignments')} variant="outline" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Manage Assignments
          </Button>
        </div>
      </div>

      <TrainingStats />

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Trainings</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : stats.activeTrainings}</div>
            <p className="text-xs text-muted-foreground">Training modules available</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Assignments</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : stats.activeAssignments}</div>
            <p className="text-xs text-muted-foreground">Employees with assignments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{loading ? '...' : stats.overdueAssignments}</div>
            <p className="text-xs text-muted-foreground">Past due date</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Disciplinary</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{loading ? '...' : stats.disciplinaryPanels}</div>
            <p className="text-xs text-muted-foreground">Requiring panel review</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Button onClick={() => setActiveView('content')} variant="outline" className="justify-start h-auto p-4">
              <div className="flex items-start gap-3">
                <BookOpen className="h-5 w-5 mt-1" />
                <div className="text-left">
                  <div className="font-medium">Create New Training</div>
                  <div className="text-sm text-gray-500">Add video, audio, or document-based training</div>
                </div>
              </div>
            </Button>

            <Button onClick={() => setActiveView('assignments')} variant="outline" className="justify-start h-auto p-4">
              <div className="flex items-start gap-3">
                <Users className="h-5 w-5 mt-1" />
                <div className="text-left">
                  <div className="font-medium">Bulk Assignment</div>
                  <div className="text-sm text-gray-500">Assign training to multiple employees</div>
                </div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
