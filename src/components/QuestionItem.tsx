
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Edit, Trash2 } from 'lucide-react';

interface Question {
  id: string;
  question_text: string;
  section_id: string;
  question_type: string;
  weight: number;
  is_required: boolean;
  is_active: boolean;
  sort_order: number;
  cycle_id?: string;
}

interface QuestionItemProps {
  question: Question;
  index: number;
  onEdit: (question: Question) => void;
  onDelete: (questionId: string) => void;
  onToggleStatus: (questionId: string, isActive: boolean) => void;
}

export function QuestionItem({
  question,
  index,
  onEdit,
  onDelete,
  onToggleStatus
}: QuestionItemProps) {
  return (
    <div className="flex items-start justify-between p-3 border rounded-lg">
      <div className="flex-1">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-500">Q{index + 1}</span>
          <span className="text-sm text-gray-900">{question.question_text}</span>
        </div>
        <div className="flex items-center space-x-2 mt-1">
          <Badge variant="outline" className="text-xs">
            {question.question_type}
          </Badge>
          <Badge variant="outline" className="text-xs">
            Weight: {question.weight}
          </Badge>
          {question.is_required && (
            <Badge variant="outline" className="text-xs">Required</Badge>
          )}
          {!question.is_active && (
            <Badge variant="destructive" className="text-xs">Inactive</Badge>
          )}
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <Switch
          checked={question.is_active}
          onCheckedChange={(checked) => onToggleStatus(question.id, checked)}
        />
        <Button size="sm" variant="ghost" onClick={() => onEdit(question)}>
          <Edit className="h-4 w-4" />
        </Button>
        <Button 
          size="sm" 
          variant="ghost" 
          onClick={() => onDelete(question.id)}
          className="text-red-600 hover:text-red-800"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
