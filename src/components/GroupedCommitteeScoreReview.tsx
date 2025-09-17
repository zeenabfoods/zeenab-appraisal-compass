import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Star, TrendingUp, TrendingDown, Minus, User, Target, Award, MessageSquare } from 'lucide-react';

interface GroupedCommitteeScoreReviewProps {
  responses: any[];
  appraisalData: any;
  committeeScores: Record<string, number>;
  onScoreChange: (responseId: string, score: number) => void;
  employeeName: string;
}

export function GroupedCommitteeScoreReview({ 
  responses, 
  appraisalData,
  committeeScores, 
  onScoreChange,
  employeeName 
}: GroupedCommitteeScoreReviewProps) {
  
  const getScoreDifference = (empScore: number, mgrScore: number, committeeScore?: number) => {
    if (!committeeScore) return null;
    
    const avgOriginal = (empScore + mgrScore) / 2;
    const difference = committeeScore - avgOriginal;
    
    if (Math.abs(difference) < 0.1) return { type: 'neutral', value: 0 };
    if (difference > 0) return { type: 'increase', value: difference };
    return { type: 'decrease', value: Math.abs(difference) };
  };

  const getVarianceLevel = (empScore: number, mgrScore: number) => {
    const difference = Math.abs(empScore - mgrScore);
    if (difference <= 1) return { level: 'low', color: 'green' };
    if (difference <= 2) return { level: 'medium', color: 'yellow' };
    return { level: 'high', color: 'red' };
  };

  const getSectionIcon = (sectionName: string) => {
    const name = sectionName?.toLowerCase() || '';
    if (name.includes('financial')) return '💰';
    if (name.includes('operational') || name.includes('efficiency')) return '⚙️';
    if (name.includes('behavioral') || name.includes('behaviour')) return '👤';
    if (name.includes('leadership')) return '👑';
    if (name.includes('communication')) return '💬';
    return '📋';
  };

  const getSectionColor = (sectionName: string) => {
    const name = sectionName?.toLowerCase() || '';
    if (name.includes('financial')) return 'border-l-green-500 bg-green-50';
    if (name.includes('operational')) return 'border-l-blue-500 bg-blue-50';
    if (name.includes('behavioral')) return 'border-l-purple-500 bg-purple-50';
    if (name.includes('leadership')) return 'border-l-yellow-500 bg-yellow-50';
    return 'border-l-gray-500 bg-gray-50';
  };

  // Group responses by section
  const groupedResponses = responses.reduce((groups, response) => {
    const sectionName = response.question?.section?.name || 'Other';
    if (!groups[sectionName]) {
      groups[sectionName] = [];
    }
    groups[sectionName].push(response);
    return groups;
  }, {} as Record<string, any[]>);

  // Sort sections in a logical order
  const sectionOrder = ['FINANCIAL', 'OPERATIONAL', 'BEHAVIORAL', 'LEADERSHIP', 'COMMUNICATION'];
  const sortedSections = Object.keys(groupedResponses).sort((a, b) => {
    const aIndex = sectionOrder.findIndex(order => a.toUpperCase().includes(order));
    const bIndex = sectionOrder.findIndex(order => b.toUpperCase().includes(order));
    
    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
    return a.localeCompare(b);
  });

  const renderQuestionCard = (response: any, questionIndex: number) => {
    const variance = getVarianceLevel(
      response.emp_rating || 0, 
      response.mgr_rating || 0
    );
    const scoreDiff = getScoreDifference(
      response.emp_rating || 0,
      response.mgr_rating || 0,
      committeeScores[response.id]
    );

    return (
      <Card key={response.id} className="border-l-4 border-l-purple-400 mb-4">
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <CardTitle className="text-sm font-medium mb-2 text-gray-800">
                Q{questionIndex + 1}: {response.question?.question_text}
              </CardTitle>
              <div className="flex items-center space-x-2">
                <Badge 
                  className={`text-xs ${
                    variance.color === 'green' 
                      ? 'bg-green-100 text-green-800' 
                      : variance.color === 'yellow'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {variance.level.toUpperCase()} Variance
                </Badge>
              </div>
            </div>
            {scoreDiff && (
              <div className={`flex items-center space-x-1 text-sm ${
                scoreDiff.type === 'increase' 
                  ? 'text-green-600' 
                  : scoreDiff.type === 'decrease'
                  ? 'text-red-600'
                  : 'text-gray-600'
              }`}>
                {scoreDiff.type === 'increase' && <TrendingUp className="h-4 w-4" />}
                {scoreDiff.type === 'decrease' && <TrendingDown className="h-4 w-4" />}
                {scoreDiff.type === 'neutral' && <Minus className="h-4 w-4" />}
                <span>
                  {scoreDiff.type === 'neutral' ? 'No Change' : `${scoreDiff.value.toFixed(1)}`}
                </span>
              </div>
            )}
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {/* Employee Score */}
            <div className="bg-blue-50 p-3 rounded-lg">
              <Label className="text-xs font-medium text-blue-700">Employee Self-Rating</Label>
              <div className="flex items-center space-x-2 mt-1">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-3 w-3 ${
                        star <= (response.emp_rating || 0)
                          ? 'text-blue-500 fill-current'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-sm font-bold text-blue-600">
                  {response.emp_rating || 0}/5
                </span>
              </div>
              {response.emp_comment && (
                <p className="text-xs text-gray-600 mt-1 italic line-clamp-2">
                  "{response.emp_comment}"
                </p>
              )}
            </div>

            {/* Manager Score */}
            <div className="bg-green-50 p-3 rounded-lg">
              <Label className="text-xs font-medium text-green-700">Manager Rating</Label>
              <div className="flex items-center space-x-2 mt-1">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-3 w-3 ${
                        star <= (response.mgr_rating || 0)
                          ? 'text-green-500 fill-current'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-sm font-bold text-green-600">
                  {response.mgr_rating || 0}/5
                </span>
              </div>
              {response.mgr_comment && (
                <p className="text-xs text-gray-600 mt-1 italic line-clamp-2">
                  "{response.mgr_comment}"
                </p>
              )}
            </div>

            {/* Average Score */}
            <div className="bg-gray-50 p-3 rounded-lg">
              <Label className="text-xs font-medium text-gray-700">Current Average</Label>
              <div className="flex items-center space-x-2 mt-1">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const avgScore = ((response.emp_rating || 0) + (response.mgr_rating || 0)) / 2;
                    return (
                      <Star
                        key={star}
                        className={`h-3 w-3 ${
                          star <= avgScore
                            ? 'text-gray-500 fill-current'
                            : 'text-gray-300'
                        }`}
                      />
                    );
                  })}
                </div>
                <span className="text-sm font-bold text-gray-600">
                  {(((response.emp_rating || 0) + (response.mgr_rating || 0)) / 2).toFixed(1)}/5
                </span>
              </div>
            </div>

            {/* Committee Score */}
            <div className="bg-purple-50 p-3 rounded-lg">
              <Label className="text-xs font-medium text-purple-700">Your Rating</Label>
              <div className="flex items-center space-x-2 mt-1">
                <Select
                  value={committeeScores[response.id]?.toString() || ''}
                  onValueChange={(value) => onScoreChange(response.id, parseInt(value))}
                >
                  <SelectTrigger className="w-16 h-7 text-xs">
                    <SelectValue placeholder="Rate" />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map((score) => (
                      <SelectItem key={score} value={score.toString()}>
                        {score}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-xs text-gray-500">/5</span>
                {committeeScores[response.id] && (
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-3 w-3 ${
                          star <= committeeScores[response.id]
                            ? 'text-purple-500 fill-current'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>
              <div className="mt-1">
                <textarea
                  placeholder="Your comment..."
                  className="w-full text-xs p-1 border rounded resize-none"
                  rows={2}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Rating Sections */}
      {sortedSections.map((sectionName) => (
        <Card key={sectionName} className={`border-l-4 ${getSectionColor(sectionName)}`}>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center space-x-2 text-lg">
              <span className="text-xl">{getSectionIcon(sectionName)}</span>
              <span>Section: {sectionName.toUpperCase()} - {employeeName}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {groupedResponses[sectionName].map((response, index) => 
              renderQuestionCard(response, index)
            )}
          </CardContent>
        </Card>
      ))}

      {/* Additional Information Sections */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Additional Information</h3>
        
        {/* Noteworthy Achievements */}
        <Card className="border-l-4 border-l-yellow-500 bg-yellow-50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2 text-base">
              <Award className="h-5 w-5 text-yellow-600" />
              <span>Section: Noteworthy Achievements</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-white p-4 rounded-lg">
              <p className="text-sm text-gray-700">
                {appraisalData?.noteworthy || 'No noteworthy achievements provided.'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Training Needs */}
        <Card className="border-l-4 border-l-blue-500 bg-blue-50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2 text-base">
              <Target className="h-5 w-5 text-blue-600" />
              <span>Section: Training Needs</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-white p-4 rounded-lg">
              <p className="text-sm text-gray-700">
                {appraisalData?.training_needs || 'No training needs specified.'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Goals */}
        <Card className="border-l-4 border-l-green-500 bg-green-50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2 text-base">
              <Target className="h-5 w-5 text-green-600" />
              <span>Section: Goals</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-white p-4 rounded-lg">
              <p className="text-sm text-gray-700">
                {appraisalData?.goals || 'No goals specified.'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Employee Additional Comments */}
        <Card className="border-l-4 border-l-purple-500 bg-purple-50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2 text-base">
              <MessageSquare className="h-5 w-5 text-purple-600" />
              <span>Section: Additional Comments</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-white p-4 rounded-lg">
              <p className="text-sm text-gray-700">
                {appraisalData?.emp_comments || 'No additional comments provided.'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}