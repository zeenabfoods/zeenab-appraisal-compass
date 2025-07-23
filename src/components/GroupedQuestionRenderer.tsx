
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
    // Normalize section names for comparison
    const normalizeSection = (section: string) => section.toUpperCase().trim();
    const aNormalized = normalizeSection(a);
    const bNormalized = normalizeSection(b);
    
    const aIndex = sectionOrder.findIndex(section => 
      aNormalized.includes(section) || section.includes(aNormalized)
    );
    const bIndex = sectionOrder.findIndex(section => 
      bNormalized.includes(section) || section.includes(bNormalized)
    );
    
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

  return (
    <div className="space-y-8">
      {sortedSections.map((sectionName) => {
        const sectionQuestions = groupedQuestions[sectionName];
        
        return (
          <div key={sectionName} className="border border-gray-200 rounded-lg">
            {/* Section Header */}
            <div className="bg-gray-50 border-b border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-5 h-5 flex-shrink-0">
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  </div>
                  <h2 className="text-lg font-bold text-gray-900">
                    {sectionName} {employeeName ? `- ${employeeName}` : ''}
                  </h2>
                </div>
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <span>Weight: 1</span>
                  <span>Max: 5</span>
                  <div className="flex space-x-1">
                    <button className="p-1 hover:bg-gray-200 rounded" type="button">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button className="p-1 hover:bg-gray-200 rounded text-red-600" type="button">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Questions List */}
            <div className="p-4 space-y-4">
              {sectionQuestions.map((question, index) => (
                <AppraisalQuestionRenderer
                  key={question.id}
                  question={question}
                  value={values[question.id]}
                  onChange={onChange}
                  disabled={disabled || isNonRatingSection(sectionName)}
                  questionNumber={index + 1}
                  showSectionHeader={false}
                  employeeName=""
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
