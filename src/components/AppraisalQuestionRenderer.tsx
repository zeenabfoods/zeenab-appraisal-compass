
import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Button } from '@/components/ui/button';

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
    <div className="flex items-center justify-end space-x-2">
      <div className="flex items-center space-x-1">
        <span className="text-sm text-gray-600 mr-2">rating</span>
        <span className="text-sm text-gray-600 mr-2">Weight: 1</span>
        <span className="text-sm text-gray-600 mr-4">Required</span>
        
        {/* Toggle switch for rating */}
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
        
        <div className="flex space-x-1 ml-4">
          <button className="p-1 hover:bg-gray-200 rounded">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button className="p-1 hover:bg-gray-200 rounded text-red-600">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );

  const renderTextQuestion = () => (
    <div className="flex items-center justify-end space-x-2">
      <span className="text-sm text-gray-600 mr-2">text</span>
      <span className="text-sm text-gray-600 mr-2">Weight: 1</span>
      <span className="text-sm text-gray-600 mr-4">Required</span>
      
      <div className="flex space-x-1">
        <button className="p-1 hover:bg-gray-200 rounded">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button className="p-1 hover:bg-gray-200 rounded text-red-600">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
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

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-start space-x-3">
            <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-sm font-medium flex-shrink-0">
              Q{questionNumber}
            </span>
            <div className="flex-1">
              <p className="text-gray-900 font-medium leading-relaxed">
                {question.question_text}
                {question.is_required && (
                  <span className="text-red-500 ml-1">*</span>
                )}
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex-shrink-0 ml-4">
          {question.question_type === 'rating' && renderRatingQuestion()}
          {question.question_type === 'text' && renderTextQuestion()}
        </div>
      </div>

      {/* Render input area for text questions or other non-rating types */}
      {question.question_type === 'text' && (
        <div className="mt-4">
          <Textarea
            value={localValue}
            onChange={(e) => handleValueChange(e.target.value)}
            placeholder="Enter your response..."
            disabled={disabled}
            rows={3}
            className="resize-none"
          />
        </div>
      )}

      {question.question_type === 'yes_no' && (
        <div className="mt-4">
          {renderYesNoQuestion()}
        </div>
      )}

      {question.question_type === 'multiple_choice' && (
        <div className="mt-4">
          {renderMultipleChoiceQuestion()}
        </div>
      )}
    </div>
  );
}
