
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
  mode?: 'employee' | 'manager';
}

export function GroupedQuestionRenderer({
  questions,
  values,
  onChange,
  disabled = false,
  employeeName = '',
  hideRatingsForTextSections = false,
  mode = 'employee'
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
    'OPERATIONAL EFFICIENCY SECTION', 
    'BEHAVIOURAL PERFORMANCE SECTION',
    'Noteworthy Achievements',
    'Training Needs',
    'Goals',
    'Additional Comments'
  ];

  const sortedSections = Object.keys(groupedQuestions).sort((a, b) => {
    const aIndex = sectionOrder.findIndex(section => {
      // Exact match first
      if (a === section) return true;
      // Then check if section contains keywords
      const sectionUpper = section.toUpperCase();
      const aUpper = a.toUpperCase();
      if (sectionUpper.includes('FINANCIAL') && aUpper.includes('FINANCIAL')) return true;
      if (sectionUpper.includes('OPERATIONAL') && aUpper.includes('OPERATIONAL')) return true;
      if (sectionUpper.includes('BEHAVIOURAL') && aUpper.includes('BEHAVIOURAL')) return true;
      if (sectionUpper.includes('NOTEWORTHY') && aUpper.includes('NOTEWORTHY')) return true;
      if (sectionUpper.includes('TRAINING') && aUpper.includes('TRAINING')) return true;
      if (sectionUpper.includes('GOALS') && aUpper.includes('GOALS')) return true;
      if (sectionUpper.includes('ADDITIONAL') && aUpper.includes('ADDITIONAL')) return true;
      return false;
    });
    const bIndex = sectionOrder.findIndex(section => {
      // Exact match first
      if (b === section) return true;
      // Then check if section contains keywords
      const sectionUpper = section.toUpperCase();
      const bUpper = b.toUpperCase();
      if (sectionUpper.includes('FINANCIAL') && bUpper.includes('FINANCIAL')) return true;
      if (sectionUpper.includes('OPERATIONAL') && bUpper.includes('OPERATIONAL')) return true;
      if (sectionUpper.includes('BEHAVIOURAL') && bUpper.includes('BEHAVIOURAL')) return true;
      if (sectionUpper.includes('NOTEWORTHY') && bUpper.includes('NOTEWORTHY')) return true;
      if (sectionUpper.includes('TRAINING') && bUpper.includes('TRAINING')) return true;
      if (sectionUpper.includes('GOALS') && bUpper.includes('GOALS')) return true;
      if (sectionUpper.includes('ADDITIONAL') && bUpper.includes('ADDITIONAL')) return true;
      return false;
    });
    
    if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    
    return aIndex - bIndex;
  });

  // Check if section should not show ratings
  const isNonRatingSection = (sectionName: string) => {
    const sectionUpper = sectionName.toUpperCase();
    return hideRatingsForTextSections && (
      sectionUpper.includes('GOALS') ||
      sectionUpper.includes('TRAINING') ||
      sectionUpper.includes('NOTEWORTHY') ||
      sectionUpper.includes('ADDITIONAL') ||
      sectionUpper.includes('COMMENT')
    );
  };

  const getSectionIcon = (sectionName: string) => {
    const normalizedName = sectionName.toUpperCase();
    if (normalizedName.includes('FINANCIAL')) return '💰';
    if (normalizedName.includes('OPERATIONAL')) return '⚙️';
    if (normalizedName.includes('BEHAVIOURAL')) return '🧠';
    if (normalizedName.includes('NOTEWORTHY')) return '🏆';
    if (normalizedName.includes('TRAINING')) return '📚';
    if (normalizedName.includes('GOALS')) return '🎯';
    if (normalizedName.includes('ADDITIONAL') || normalizedName.includes('COMMENT')) return '💬';
    return '📋';
  };

  const getSectionColor = (sectionName: string) => {
    const normalizedName = sectionName.toUpperCase();
    if (normalizedName.includes('FINANCIAL')) return 'from-green-100 to-emerald-100 border-green-200';
    if (normalizedName.includes('OPERATIONAL')) return 'from-blue-100 to-cyan-100 border-blue-200';
    if (normalizedName.includes('BEHAVIOURAL')) return 'from-purple-100 to-indigo-100 border-purple-200';
    if (normalizedName.includes('NOTEWORTHY')) return 'from-yellow-100 to-amber-100 border-yellow-200';
    if (normalizedName.includes('TRAINING')) return 'from-pink-100 to-rose-100 border-pink-200';
    if (normalizedName.includes('GOALS')) return 'from-orange-100 to-amber-100 border-orange-200';
    if (normalizedName.includes('ADDITIONAL') || normalizedName.includes('COMMENT')) return 'from-gray-100 to-slate-100 border-gray-200';
    return 'from-gray-100 to-slate-100 border-gray-200';
  };

  return (
    <div className="space-y-4">
      {sortedSections.map((sectionName) => {
        const sectionQuestions = groupedQuestions[sectionName];
        const sectionIcon = getSectionIcon(sectionName);
        const sectionColorClass = getSectionColor(sectionName);
        
        return (
          <div key={sectionName} className={`border rounded-lg ${sectionColorClass.split(' ')[2]}`}>
            {/* Compact Section Header */}
            <div className={`bg-gradient-to-r ${sectionColorClass.split(' ')[0]} ${sectionColorClass.split(' ')[1]} p-3`}>
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 flex-shrink-0 flex items-center justify-center bg-white rounded-full shadow-sm">
                  <span className="text-sm">{sectionIcon}</span>
                </div>
                <div>
                  <h2 className="text-base font-semibold text-gray-900">
                    {sectionName} {employeeName}
                  </h2>
                </div>
              </div>
            </div>

            {/* Compact Questions List */}
            <div className="p-4 space-y-3 bg-white">
              {sectionQuestions.map((question, index) => (
                <div key={question.id} className="space-y-2">
                  <div className="text-sm font-medium text-gray-700">
                    Q{index + 1}: {question.question_text}
                  </div>
                  <AppraisalQuestionRenderer
                    question={question}
                    value={values[question.id]}
                    onChange={onChange}
                    disabled={disabled || isNonRatingSection(sectionName)}
                    questionNumber={index + 1}
                    showSectionHeader={false}
                    employeeName=""
                    compact={true}
                    mode={mode}
                  />
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
