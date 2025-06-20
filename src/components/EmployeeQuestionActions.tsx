
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus } from 'lucide-react';

interface EmployeeQuestionActionsProps {
  questionsCount: number;
  sectionsCount: number;
  onAddSection: () => void;
  onAddQuestion: () => void;
}

export function EmployeeQuestionActions({
  questionsCount,
  sectionsCount,
  onAddSection,
  onAddQuestion
}: EmployeeQuestionActionsProps) {
  return (
    <div className="flex justify-between items-center">
      <div className="flex items-center space-x-4">
        <Badge variant="outline" className="text-sm">
          {questionsCount} Questions
        </Badge>
        <Badge variant="outline" className="text-sm">
          {sectionsCount} Sections
        </Badge>
      </div>
      <div className="flex space-x-2">
        <Button onClick={onAddSection} variant="outline">
          <Plus className="h-4 w-4 mr-2" />
          Add Section
        </Button>
        <Button onClick={onAddQuestion}>
          <Plus className="h-4 w-4 mr-2" />
          Add Question
        </Button>
      </div>
    </div>
  );
}
