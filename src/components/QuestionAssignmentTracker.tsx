
import React, { useState } from 'react';
import { AssignmentStatsCards } from '@/components/AssignmentStatsCards';
import { AssignmentTable } from '@/components/AssignmentTable';
import { useQuestionAssignmentData } from '@/hooks/useQuestionAssignmentData';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Filter } from 'lucide-react';

export function QuestionAssignmentTracker() {
  const [selectedCycleId, setSelectedCycleId] = useState<string>('all');

  const { stats, assignments, cycles, loading, refetch } = useQuestionAssignmentData(
    selectedCycleId === 'all' ? undefined : selectedCycleId
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const selectedCycle = cycles.find(c => c.id === selectedCycleId);

  return (
    <div className="space-y-6">
      {/* Cycle Filter */}
      <div className="flex items-center gap-3">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium text-muted-foreground">Filter by Quarter:</span>
        <Select value={selectedCycleId} onValueChange={setSelectedCycleId}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Select a quarter..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Quarters</SelectItem>
            {cycles.map(cycle => (
              <SelectItem key={cycle.id} value={cycle.id}>
                {cycle.name} — Q{cycle.quarter} {cycle.year}
                {cycle.status === 'active' && ' (Active)'}
                {cycle.status === 'completed' && ' (Completed)'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedCycle && (
          <span className="text-sm text-muted-foreground">
            Showing assignments for <span className="font-semibold text-foreground">{selectedCycle.name} (Q{selectedCycle.quarter} {selectedCycle.year})</span>
          </span>
        )}
      </div>

      <AssignmentStatsCards stats={stats} />
      <AssignmentTable assignments={assignments} onRefresh={refetch} />
    </div>
  );
}
