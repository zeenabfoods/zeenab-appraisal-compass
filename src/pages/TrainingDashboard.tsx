
import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrainingManager } from '@/components/training/TrainingManager';
import { EmployeeTrainingDashboard } from '@/components/training/EmployeeTrainingDashboard';
import { TrainingRequestsManager } from '@/components/training/TrainingRequestsManager';
import { DisciplinaryPanelManager } from '@/components/training/DisciplinaryPanelManager';

export default function TrainingDashboard() {
  const { profile } = useAuth();

  if (!profile) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div>Loading...</div>
      </div>
    );
  }

  // Employee view
  if (profile.role === 'staff') {
    return <EmployeeTrainingDashboard />;
  }

  // HR and Admin view
  if (profile.role === 'hr' || profile.role === 'admin') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Training Management</h1>
          <p className="text-gray-600 mt-2">Manage training content, assignments, and monitor progress</p>
        </div>

        <Tabs defaultValue="assignments" className="w-full">
          <TabsList>
            <TabsTrigger value="assignments">Training Assignments</TabsTrigger>
            <TabsTrigger value="content">Training Content</TabsTrigger>
            <TabsTrigger value="requests">Committee Requests</TabsTrigger>
            <TabsTrigger value="disciplinary">Disciplinary Panels</TabsTrigger>
          </TabsList>
          
          <TabsContent value="assignments" className="space-y-6">
            <TrainingManager />
          </TabsContent>
          
          <TabsContent value="content" className="space-y-6">
            <TrainingManager />
          </TabsContent>
          
          <TabsContent value="requests" className="space-y-6">
            <TrainingRequestsManager />
          </TabsContent>
          
          <TabsContent value="disciplinary" className="space-y-6">
            <DisciplinaryPanelManager />
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  // Manager/Committee view
  if (profile.role === 'manager') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Training Overview</h1>
          <p className="text-gray-600 mt-2">Monitor team training progress and request training assignments</p>
        </div>

        <Tabs defaultValue="team" className="w-full">
          <TabsList>
            <TabsTrigger value="team">Team Training</TabsTrigger>
            <TabsTrigger value="requests">My Requests</TabsTrigger>
          </TabsList>
          
          <TabsContent value="team" className="space-y-6">
            <EmployeeTrainingDashboard />
          </TabsContent>
          
          <TabsContent value="requests" className="space-y-6">
            <TrainingRequestsManager />
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <p className="text-center text-gray-500">Access denied. Invalid role for training module.</p>
      </CardContent>
    </Card>
  );
}
