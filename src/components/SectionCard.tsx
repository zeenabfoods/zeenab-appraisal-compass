
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, GripVertical } from 'lucide-react';
import { QuestionItem } from './QuestionItem';

interface Section {
  id: string;
  name: string;
  description: string;
  sort_order: number;
  max_score: number;
  weight: number;
  is_active: boolean;
}

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

interface SectionCardProps {
  section: Section;
  questions: Question[];
  onEditSection: (section: Section) => void;
  onEditQuestion: (question: Question) => void;
  onDeleteQuestion: (questionId: string) => void;
  onToggleQuestionStatus: (questionId: string, isActive: boolean) => void;
}

export function SectionCard({
  section,
  questions,
  onEditSection,
  onEditQuestion,
  onDeleteQuestion,
  onToggleQuestionStatus
}: SectionCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center">
              <GripVertical className="h-4 w-4 mr-2 text-gray-400" />
              {section.name}
            </CardTitle>
            <CardDescription>{section.description}</CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="outline">Weight: {section.weight}</Badge>
            <Badge variant="outline">Max: {section.max_score}</Badge>
            <Button size="sm" variant="ghost" onClick={() => onEditSection(section)}>
              <Edit className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {questions.map((question, index) => (
            <QuestionItem
              key={question.id}
              question={question}
              index={index}
              onEdit={onEditQuestion}
              onDelete={onDeleteQuestion}
              onToggleStatus={onToggleQuestionStatus}
            />
          ))}
          
          {questions.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-4">
              No questions in this section yet.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
