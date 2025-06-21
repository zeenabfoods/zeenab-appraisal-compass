
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Users, FileText } from 'lucide-react';

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
    <Card className="backdrop-blur-md bg-white/60 border-white/40">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium">Sections</span>
              <Badge variant="outline">{sectionsCount}</Badge>
            </div>
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium">Questions</span>
              <Badge variant="outline">{questionsCount}</Badge>
            </div>
          </div>
          
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" onClick={onAddSection}>
              <Plus className="h-4 w-4 mr-2" />
              Add Section
            </Button>
            <Button size="sm" onClick={onAddQuestion}>
              <Plus className="h-4 w-4 mr-2" />
              Add Question
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
