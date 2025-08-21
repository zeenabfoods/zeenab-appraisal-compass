
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus } from 'lucide-react';

interface TrainingContentManagerProps {
  onBack: () => void;
}

export function TrainingContentManager({ onBack }: TrainingContentManagerProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button onClick={onBack} variant="outline" size="sm">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Training Content Management</h2>
          <p className="text-gray-600">Create and manage training content</p>
        </div>
        <div className="ml-auto">
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create Training
          </Button>
        </div>
      </div>

      {/* Training content management will be implemented in next iteration */}
      <div className="text-center py-12 text-gray-500">
        Training Content Management - Coming Soon
      </div>
    </div>
  );
}
