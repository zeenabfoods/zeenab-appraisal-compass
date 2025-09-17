import React, { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  compact?: boolean;
  mode?: 'employee' | 'manager';
}

export function AppraisalQuestionRenderer({ 
  question, 
  value, 
  onChange, 
  disabled = false,
  questionNumber = 1,
  showSectionHeader = true,
  employeeName = '',
  compact = false,
  mode = 'employee'
}: AppraisalQuestionRendererProps) {

  // Console verification check
  useEffect(() => {
    const questions = document.querySelectorAll('.question-item');
    console.assert(
      questions.length > 0, 
      'Questions not rendering'
    );
  }, []);

  const ratingKey = mode === 'manager' ? 'mgr_rating' : 'emp_rating';
  const commentKey = mode === 'manager' ? 'mgr_comment' : 'emp_comment';

  const handleRatingChange = (rating: string) => {
    const newValue: any = {
      ...value,
      [ratingKey]: parseInt(rating)
    };
    onChange(question.id, newValue);
  };

  const handleCommentChange = (comment: string) => {
    const newValue: any = {
      ...value,
      [commentKey]: comment
    };
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
    if (disabled) {
      return (
        <div className="p-2 bg-gray-100 rounded border">
          {value?.[ratingKey] 
            ? `${value[ratingKey]} - ${getRatingLabel(value[ratingKey])}`
            : 'Not Rated'
          }
        </div>
      );
    }

    return (
      <Select
        value={value?.[ratingKey] ? String(value[ratingKey]) : ''}
        onValueChange={handleRatingChange}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select a rating" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="1">1 - Poor</SelectItem>
          <SelectItem value="2">2 - Fair</SelectItem>
          <SelectItem value="3">3 - Good</SelectItem>
          <SelectItem value="4">4 - Very Good</SelectItem>
          <SelectItem value="5">5 - Excellent</SelectItem>
        </SelectContent>
      </Select>
    );
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
    <div className="question-item">
      {/* Section Header - only for non-compact mode */}
      {showSectionHeader && !compact && (
        <h2 className="text-lg font-bold mb-4">
          # {question.section?.name || 'GENERAL SECTION'} {employeeName}
        </h2>
      )}

      {/* Question Header - compact vs normal */}
      {!compact && (
        <div className="mb-4">
          <h3 className="text-base font-semibold mb-3">
            Q{questionNumber}. {question.question_text}
            {question.is_required && <span className="text-red-500 ml-1">*</span>}
          </h3>
        </div>
      )}

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
          {value.mgr_rating && (
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
          )}

          {/* Committee Response */}
          {value.committee_rating && (
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
        /* Active Form View */
        <div className={compact ? "grid grid-cols-2 gap-3" : "space-y-4"}>
          <div className="space-y-1">
            <Label className="text-sm font-medium">Your Rating</Label>
            {renderRatingInput()}
          </div>
          
          <div className="space-y-1">
            <Label className="text-sm font-medium">Your Comment</Label>
            {disabled ? (
              <div className="p-2 bg-gray-100 rounded border min-h-[60px]">
                {value?.emp_comment || 'No comment provided'}
              </div>
            ) : (
              <Textarea
                placeholder="Enter your comment"
                value={value?.emp_comment || ''}
                onChange={(e) => handleCommentChange(e.target.value)}
                className={compact ? "min-h-[60px] text-sm" : "min-h-[80px]"}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}