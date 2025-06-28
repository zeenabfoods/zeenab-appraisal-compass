
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Button } from '@/components/ui/button';
import { Star } from 'lucide-react';

interface Question {
  id: string;
  question_text: string;
  question_type: string;
  is_required: boolean;
  multiple_choice_options?: string[];
}

interface AppraisalQuestionRendererProps {
  question: Question;
  value?: any;
  onChange: (questionId: string, value: any) => void;
  disabled?: boolean;
}

export function AppraisalQuestionRenderer({ 
  question, 
  value, 
  onChange, 
  disabled = false 
}: AppraisalQuestionRendererProps) {
  const [localValue, setLocalValue] = useState(value || '');

  const handleValueChange = (newValue: any) => {
    setLocalValue(newValue);
    onChange(question.id, newValue);
  };

  const renderRatingQuestion = () => (
    <div className="space-y-2">
      <div className="flex items-center space-x-2">
        {[1, 2, 3, 4, 5].map((rating) => (
          <Button
            key={rating}
            type="button"
            variant={localValue === rating ? "default" : "outline"}
            size="sm"
            onClick={() => handleValueChange(rating)}
            disabled={disabled}
            className="w-12 h-10"
          >
            {rating}
          </Button>
        ))}
      </div>
      <div className="flex justify-between text-xs text-gray-500">
        <span>Poor</span>
        <span>Excellent</span>
      </div>
    </div>
  );

  const renderTextQuestion = () => (
    <Textarea
      value={localValue}
      onChange={(e) => handleValueChange(e.target.value)}
      placeholder="Enter your response..."
      disabled={disabled}
      rows={4}
    />
  );

  const renderYesNoQuestion = () => (
    <RadioGroup
      value={localValue}
      onValueChange={handleValueChange}
      disabled={disabled}
    >
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="yes" id={`${question.id}-yes`} />
        <Label htmlFor={`${question.id}-yes`}>Yes</Label>
      </div>
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="no" id={`${question.id}-no`} />
        <Label htmlFor={`${question.id}-no`}>No</Label>
      </div>
    </RadioGroup>
  );

  const renderMultipleChoiceQuestion = () => (
    <RadioGroup
      value={localValue}
      onValueChange={handleValueChange}
      disabled={disabled}
    >
      {question.multiple_choice_options?.map((option, index) => (
        <div key={index} className="flex items-center space-x-2">
          <RadioGroupItem value={option} id={`${question.id}-option-${index}`} />
          <Label htmlFor={`${question.id}-option-${index}`}>{option}</Label>
        </div>
      ))}
    </RadioGroup>
  );

  const renderQuestionInput = () => {
    switch (question.question_type) {
      case 'rating':
        return renderRatingQuestion();
      case 'text':
        return renderTextQuestion();
      case 'yes_no':
        return renderYesNoQuestion();
      case 'multiple_choice':
        return renderMultipleChoiceQuestion();
      default:
        return <div className="text-gray-500">Unsupported question type</div>;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium flex items-start justify-between">
          <span className="flex-1">
            {question.question_text}
            {question.is_required && (
              <span className="text-red-500 ml-1">*</span>
            )}
          </span>
          {question.question_type === 'rating' && (
            <div className="flex items-center text-sm text-gray-500 ml-4">
              <Star className="h-4 w-4 mr-1" />
              Scored
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {renderQuestionInput()}
      </CardContent>
    </Card>
  );
}
