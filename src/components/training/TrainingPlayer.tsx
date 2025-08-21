
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';

interface TrainingPlayerProps {
  assignmentId: string;
  onComplete: () => void;
  onBack: () => void;
}

export function TrainingPlayer({ assignmentId, onComplete, onBack }: TrainingPlayerProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button onClick={onBack} variant="outline" size="sm">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Training Player</h2>
          <p className="text-gray-600">Complete your training content</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-8 text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Training Player</h3>
          <p className="text-gray-500">Training content player will be implemented here with progress tracking</p>
        </CardContent>
      </Card>
    </div>
  );
}
