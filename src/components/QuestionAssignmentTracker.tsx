
import React from 'react';
import { AssignmentStatsCards } from '@/components/AssignmentStatsCards';
import { AssignmentTable } from '@/components/AssignmentTable';
import { EmployeeProfileFixer } from '@/components/EmployeeProfileFixer';
import { useQuestionAssignmentData } from '@/hooks/useQuestionAssignmentData';

export function QuestionAssignmentTracker() {
  const { stats, assignments, loading, refetch } = useQuestionAssignmentData();

  const handleFixCompleted = () => {
    console.log('Fix completed, refreshing assignment data...');
    refetch();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <EmployeeProfileFixer onFixCompleted={handleFixCompleted} />
      <AssignmentStatsCards stats={stats} />
      <AssignmentTable assignments={assignments} />
    </div>
  );
}
