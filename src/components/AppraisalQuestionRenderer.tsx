
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, Type, CheckCircle } from 'lucide-react';

interface Question {
  id: string;
  question_text: string;
  question_type: string;
  is_required: boolean;
  multiple_choice_options?: string[];
  section?: {
    name: string;
  };
}

interface AppraisalQuestionRendererProps {
  question: Question;
  value?: any;
  onChange: (questionId: string, value: any) => void;
  disabled?: boolean;
  questionNumber?: number;
  showSectionHeader?: boolean;
  employeeName?: string;
}

export function AppraisalQuestionRenderer({ 
  question, 
  value, 
  onChange, 
  disabled = false,
  questionNumber,
  showSectionHeader = false,
  employeeName = ''
}: AppraisalQuestionRendererProps) {
  const [localValue, setLocalValue] = useState(value || '');

  const handleValueChange = (newValue: any) => {
    setLocalValue(newValue);
    onChange(question.id, newValue);
  };

  const renderRatingQuestion = () => (
    <div className="space-y-3">
      <div className="flex items-center space-x-2">
        {[1, 2, 3, 4, 5].map((rating) => (
          <Button
            key={rating}
            type="button"
            variant={localValue === rating ? "default" : "outline"}
            size="sm"
            onClick={() => handleValueChange(rating)}
            disabled={disabled}
            className="w-12 h-10 font-semibold"
          >
            {rating}
          </Button>
        ))}
      </div>
      <div className="flex justify-between text-xs text-gray-500 px-2">
        <span className="font-medium">Poor</span>
        <span className="font-medium">Excellent</span>
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
      className="resize-none"
    />
  );

  const renderYesNoQuestion = () => (
    <RadioGroup
      value={localValue}
      onValueChange={handleValueChange}
      disabled={disabled}
      className="flex space-x-6"
    >
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="yes" id={`${question.id}-yes`} />
        <Label htmlFor={`${question.id}-yes`} className="font-medium">Yes</Label>
      </div>
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="no" id={`${question.id}-no`} />
        <Label htmlFor={`${question.id}-no`} className="font-medium">No</Label>
      </div>
    </RadioGroup>
  );

  const renderMultipleChoiceQuestion = () => (
    <RadioGroup
      value={localValue}
      onValueChange={handleValueChange}
      disabled={disabled}
      className="space-y-3"
    >
      {question.multiple_choice_options?.map((option, index) => (
        <div key={index} className="flex items-center space-x-3">
          <RadioGroupItem value={option} id={`${question.id}-option-${index}`} />
          <Label htmlFor={`${question.id}-option-${index}`} className="font-medium">
            {option}
          </Label>
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
        return <div className="text-gray-500 italic">Unsupported question type: {question.question_type}</div>;
    }
  };

  // Get question type icon and display name
  const getQuestionTypeInfo = () => {
    switch (question.question_type) {
      case 'rating':
        return { icon: Star, label: 'Rating', color: 'bg-blue-100 text-blue-800' };
      case 'text':
        return { icon: Type, label: 'Text', color: 'bg-green-100 text-green-800' };
      case 'yes_no':
        return { icon: CheckCircle, label: 'Yes/No', color: 'bg-purple-100 text-purple-800' };
      case 'multiple_choice':
        return { icon: CheckCircle, label: 'Multiple Choice', color: 'bg-orange-100 text-orange-800' };
      default:
        return { icon: Star, label: question.question_type, color: 'bg-gray-100 text-gray-800' };
    }
  };

  const typeInfo = getQuestionTypeInfo();
  const TypeIcon = typeInfo.icon;

  return (
    <div className="w-full">
      {/* Legacy section header support - now handled by GroupedQuestionRenderer */}
      {showSectionHeader && (
        <div className="mb-6 mt-8 first:mt-0">
          <h3 className="text-lg font-bold text-gray-900 bg-gray-50 px-4 py-3 rounded-lg border-l-4 border-orange-500">
            {question.section?.name?.toUpperCase()} {employeeName}
          </h3>
        </div>
      )}
      
      <Card className="w-full shadow-sm border-l-2 border-l-gray-200 hover:border-l-orange-300 transition-colors">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <CardTitle className="text-base font-semibold leading-6 flex-1">
              <div className="flex items-start space-x-3">
                <span className="bg-orange-500 text-white px-2 py-1 rounded-md text-sm font-bold flex-shrink-0">
                  Q{questionNumber}
                </span>
                <div className="flex-1">
                  <span className="text-gray-900">
                    {question.question_text}
                  </span>
                  {question.is_required && (
                    <span className="text-red-500 ml-1 text-lg">*</span>
                  )}
                </div>
              </div>
            </CardTitle>
          </div>
          
          {/* Question Metadata */}
          <div className="flex items-center space-x-3 mt-3 pt-3 border-t border-gray-100">
            <Badge variant="outline" className={`${typeInfo.color} border-0 font-medium`}>
              <TypeIcon className="h-3 w-3 mr-1" />
              {typeInfo.label}
            </Badge>
            
            <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200 font-medium">
              Weight: 1
            </Badge>
            
            {question.is_required && (
              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 font-medium">
                Required
              </Badge>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="pt-0">
          {renderQuestionInput()}
        </CardContent>
      </Card>
    </div>
  );
}
