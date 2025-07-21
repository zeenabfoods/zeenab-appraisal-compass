
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

  // Global question counter for continuous numbering
  let globalQuestionNumber = 1;

  return (
    <div className="space-y-8">
      {sortedSections.map((sectionName) => {
        const sectionQuestions = groupedQuestions[sectionName];
        
        return (
          <div key={sectionName} className="space-y-6">
            {/* Section Header */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                {sectionName} {employeeName ? `- ${employeeName}` : ''}
              </h2>
              
              {/* Questions under this section */}
              <div className="space-y-4">
                {sectionQuestions.map((question) => {
                  const currentQuestionNumber = globalQuestionNumber++;
                  return (
                    <AppraisalQuestionRenderer
                      key={question.id}
                      question={question}
                      value={values[question.id]}
                      onChange={onChange}
                      disabled={disabled || isNonRatingSection(sectionName)}
                      questionNumber={currentQuestionNumber}
                      showSectionHeader={false}
                      employeeName=""
                    />
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
