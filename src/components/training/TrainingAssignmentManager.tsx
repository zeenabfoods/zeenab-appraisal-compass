
import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Users } from 'lucide-react';

interface TrainingAssignmentManagerProps {
  onBack: () => void;
}

export function TrainingAssignmentManager({ onBack }: TrainingAssignmentManagerProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button onClick={onBack} variant="outline" size="sm">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Training Assignment Management</h2>
          <p className="text-gray-600">Assign training to employees and monitor progress</p>
        </div>
        <div className="ml-auto">
          <Button className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Bulk Assignment
          </Button>
        </div>
      </div>

      {/* Training assignment management will be implemented in next iteration */}
      <div className="text-center py-12 text-gray-500">
        Training Assignment Management - Coming Soon
      </div>
    </div>
  );
}
