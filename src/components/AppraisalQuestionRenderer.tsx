
import React, { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Question {
  id: string;
  question_text: string;
  question_type: string;
  is_required: boolean;
  multiple_choice_options?: string[];
  weight?: number;
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

  // Console verification check
  useEffect(() => {
    const questions = document.querySelectorAll('.question-item');
    console.assert(
      questions.length > 0, 
      'Questions not rendering'
    );
  }, []);

  const handleValueChange = (newValue: any) => {
    setLocalValue(newValue);
    onChange(question.id, newValue);
  };

  const renderRatingDisplay = (rating: number | null | undefined, label: string) => {
    if (!rating) {
      return <span className="text-sm text-gray-400">Not rated</span>;
    }
    
    return (
      <div className="flex items-center space-x-2">
        <Badge variant="outline" className="px-2 py-1">
          {rating}/5
        </Badge>
        <span className="text-sm text-gray-600">
          {getRatingLabel(rating)}
        </span>
      </div>
    );
  };

  const renderRatingInput = () => {
    if (question.question_type === 'rating') {
      return (
        <div className="flex items-center space-x-2">
          <div className="relative">
            <input 
              type="checkbox" 
              className="sr-only"
              checked={localValue > 0}
              onChange={() => handleValueChange(localValue > 0 ? 0 : 3)}
              disabled={disabled}
            />
            <div className={`w-12 h-6 rounded-full transition-colors ${
              localValue > 0 ? 'bg-gray-800' : 'bg-gray-300'
            }`}>
              <div className={`w-5 h-5 bg-white rounded-full transition-transform transform ${
                localValue > 0 ? 'translate-x-6' : 'translate-x-0.5'
              } mt-0.5`} />
            </div>
          </div>
          <span className="text-sm text-gray-600">
            {localValue > 0 ? `${localValue} - ${getRatingLabel(localValue)}` : 'Not rated'}
          </span>
        </div>
      );
    }

    if (question.question_type === 'yes_no') {
      return (
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
    }

    if (question.question_type === 'multiple_choice') {
      return (
        <RadioGroup
          value={localValue}
          onValueChange={handleValueChange}
          disabled={disabled}
          className="space-y-2"
        >
          {question.multiple_choice_options?.map((option, index) => (
            <div key={index} className="flex items-center space-x-2">
              <RadioGroupItem value={option} id={`${question.id}-option-${index}`} />
              <Label htmlFor={`${question.id}-option-${index}`} className="font-medium">
                {option}
              </Label>
            </div>
          ))}
        </RadioGroup>
      );
    }

    return <span className="text-sm text-gray-500">Text response</span>;
  };

  const getRatingLabel = (rating: number) => {
    const labels = {
      1: 'Poor',
      2: 'Fair', 
      3: 'Good',
      4: 'Very Good',
      5: 'Excellent'
    };
    return labels[rating as keyof typeof labels] || 'Unknown';
  };

  // Check if we're displaying committee review data (has employee and manager responses)
  const isCommitteeReview = disabled && value && typeof value === 'object' && 
    (value.emp_rating || value.mgr_rating || value.emp_comment || value.mgr_comment);

  return (
    <div className="question-item space-y-6">
      {/* Section Header */}
      {showSectionHeader && (
        <h2 className="text-lg font-bold mb-4">
          # {question.section?.name || 'GENERAL SECTION'} {employeeName}
        </h2>
      )}

      {/* Question Header */}
      <div className="mb-4">
        <h3 className="text-base font-semibold mb-3">
          Q{questionNumber}. {question.question_text}
          {question.is_required && <span className="text-red-500 ml-1">*</span>}
        </h3>
      </div>

      {/* Response Display for Committee Review */}
      {isCommitteeReview ? (
        <div className="grid gap-4 mt-4">
          {/* Employee Response */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-3">Employee Response</h4>
            <div className="space-y-3">
              <div>
                <Label className="font-medium text-sm text-blue-800">Rating:</Label>
                <div className="mt-1">
                  {renderRatingDisplay(value.emp_rating, 'Employee')}
                </div>
              </div>
              <div>
                <Label className="font-medium text-sm text-blue-800">Comment:</Label>
                <div className="mt-1 p-3 bg-white rounded border">
                  <p className="text-sm text-gray-700">
                    {value.emp_comment || 'No comment provided'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Manager Response */}
          <div className="bg-green-50 p-4 rounded-lg">
            <h4 className="font-semibold text-green-900 mb-3">Manager Response</h4>
            <div className="space-y-3">
              <div>
                <Label className="font-medium text-sm text-green-800">Rating:</Label>
                <div className="mt-1">
                  {renderRatingDisplay(value.mgr_rating, 'Manager')}
                </div>
              </div>
              <div>
                <Label className="font-medium text-sm text-green-800">Comment:</Label>
                <div className="mt-1 p-3 bg-white rounded border">
                  <p className="text-sm text-gray-700">
                    {value.mgr_comment || 'No comment provided'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Committee Response (if available) */}
          {(value.committee_rating || value.committee_comment) && (
            <div className="bg-purple-50 p-4 rounded-lg">
              <h4 className="font-semibold text-purple-900 mb-3">Committee Response</h4>
              <div className="space-y-3">
                <div>
                  <Label className="font-medium text-sm text-purple-800">Rating:</Label>
                  <div className="mt-1">
                    {renderRatingDisplay(value.committee_rating, 'Committee')}
                  </div>
                </div>
                <div>
                  <Label className="font-medium text-sm text-purple-800">Comment:</Label>
                  <div className="mt-1 p-3 bg-white rounded border">
                    <p className="text-sm text-gray-700">
                      {value.committee_comment || 'No comment provided'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Regular Rating and Comment Grid for active forms */
        <div className="grid gap-2 mt-4">
          {/* Your Rating */}
          <div className="mb-3">
            <Label className="font-bold text-sm mb-2 block">Your Rating:</Label>
            {renderRatingInput()}
          </div>

          {/* Your Comment */}
          <div className="mb-4">
            <Label className="font-bold text-sm mb-2 block">Your Comment:</Label>
            <Textarea
              value={localValue}
              onChange={(e) => handleValueChange(e.target.value)}
              placeholder="Enter your comment..."
              disabled={disabled}
              rows={3}
              className="resize-none p-3"
            />
          </div>

          {/* Manager Rating */}
          <div className="mb-3">
            <Label className="font-bold text-sm mb-2 block">Manager Rating:</Label>
            <span className="text-sm text-gray-500">To be completed by manager</span>
          </div>

          {/* Manager Comment */}
          <div className="mb-4">
            <Label className="font-bold text-sm mb-2 block">Manager Comment:</Label>
            <Textarea
              placeholder="Manager comment will appear here..."
              disabled={true}
              rows={3}
              className="resize-none p-3 bg-gray-50"
            />
          </div>
        </div>
      )}

      {/* Horizontal Divider */}
      <div className="border-t border-gray-300 my-6"></div>
    </div>
  );
}
