import { useState } from 'react';
import { useAuthContext } from '@/components/AuthProvider';
import { DashboardLayout } from '@/components/DashboardLayout';
import { TrainingDashboard } from '@/components/TrainingDashboard';
import { TrainingManagement } from '@/components/TrainingManagement';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, Settings } from 'lucide-react';

export default function Training() {
  const { profile } = useAuthContext();
  const isHR = profile?.role === 'hr' || profile?.role === 'admin';

  return (
    <DashboardLayout pageTitle="Training">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Training Center</h1>
            <p className="text-gray-600">
              {isHR 
                ? "Manage training requests and create training programs" 
                : "Access your assigned training programs and track progress"
              }
            </p>
          </div>
        </div>

        {isHR ? (
          <Tabs defaultValue="dashboard" className="space-y-4">
            <TabsList>
              <TabsTrigger value="dashboard" className="flex items-center space-x-2">
                <BookOpen className="h-4 w-4" />
                <span>Employee Training</span>
              </TabsTrigger>
              <TabsTrigger value="management" className="flex items-center space-x-2">
                <Settings className="h-4 w-4" />
                <span>Training Management</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard">
              <TrainingDashboard />
            </TabsContent>

            <TabsContent value="management">
              <TrainingManagement />
            </TabsContent>
          </Tabs>
        ) : (
          <TrainingDashboard />
        )}
      </div>
    </DashboardLayout>
  );
}