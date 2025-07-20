
import React from 'react';
import { AppraisalQuestionRenderer } from './AppraisalQuestionRenderer';

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

interface GroupedQuestionRendererProps {
  questions: Question[];
  values: Record<string, any>;
  onChange: (questionId: string, value: any) => void;
  disabled?: boolean;
  employeeName?: string;
  hideRatingsForTextSections?: boolean;
}

export function GroupedQuestionRenderer({
  questions,
  values,
  onChange,
  disabled = false,
  employeeName = '',
  hideRatingsForTextSections = false
}: GroupedQuestionRendererProps) {
  // Group questions by section
  const groupedQuestions = questions.reduce((acc, question) => {
    const sectionName = question.section?.name || 'Other';
    if (!acc[sectionName]) {
      acc[sectionName] = [];
    }
    acc[sectionName].push(question);
    return acc;
  }, {} as Record<string, Question[]>);

  // Sort sections to ensure consistent order
  const sectionOrder = [
    'FINANCIAL SECTION',
    'OPERATIONAL SECTION', 
    'BEHAVIOURAL SECTION',
    'GOALS FOR NEXT REVIEW',
    'TRAINING NEEDS',
    'EMPLOYEE\'S COMMENT'
  ];

  const sortedSections = Object.keys(groupedQuestions).sort((a, b) => {
    const aIndex = sectionOrder.findIndex(section => a.includes(section));
    const bIndex = sectionOrder.findIndex(section => b.includes(section));
    
    if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    
    return aIndex - bIndex;
  });

  // Check if section should not show ratings
  const isNonRatingSection = (sectionName: string) => {
    return hideRatingsForTextSections && (
      sectionName.includes('GOALS FOR NEXT REVIEW') ||
      sectionName.includes('TRAINING NEEDS') ||
      sectionName.includes('EMPLOYEE\'S COMMENT')
    );
  };

  // Global question counter for continuous numbering
  let globalQuestionNumber = 1;

  return (
    <div className="space-y-8">
      {sortedSections.map((sectionName) => {
        console.log('Section Data:', {
          name: sectionName,
          questionCount: groupedQuestions[sectionName].length,
          types: groupedQuestions[sectionName].map(q => q.question_type)
        });

        return (
          <div key={sectionName} className="space-y-6">
            {/* Enhanced Section Header */}
            <div className="border-l-4 border-l-orange-500 bg-gradient-to-r from-orange-50 to-transparent">
              <div className="px-6 py-4">
                <h2 className="text-xl font-bold text-gray-900 mb-2">
                  {sectionName} {employeeName}
                </h2>
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <span className="flex items-center">
                    <span className="font-medium">Questions:</span>
                    <span className="ml-1 bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs font-medium">
                      {groupedQuestions[sectionName].length}
                    </span>
                  </span>
                  {!isNonRatingSection(sectionName) && (
                    <span className="flex items-center">
                      <span className="font-medium">Type:</span>
                      <span className="ml-1 bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                        Scored
                      </span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Questions */}
            <div className="space-y-4 pl-4">
              {groupedQuestions[sectionName].map((question) => {
                const currentQuestionNumber = globalQuestionNumber++;
                return (
                  <AppraisalQuestionRenderer
                    key={question.id}
                    question={question}
                    value={values[question.id]}
                    onChange={onChange}
                    disabled={disabled || isNonRatingSection(sectionName)}
                    questionNumber={currentQuestionNumber}
                    showSectionHeader={false} // We handle section headers above
                    employeeName={employeeName}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
