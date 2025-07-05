
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Star, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface ScoreComparisonProps {
  responses: any[];
  committeeScores: Record<string, number>;
  onScoreChange: (responseId: string, score: number) => void;
}

export function CommitteeScoreComparison({ 
  responses, 
  committeeScores, 
  onScoreChange 
}: ScoreComparisonProps) {
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

  return (
    <div className="space-y-6">
      {responses.map((response) => {
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
          <Card key={response.id} className="border-l-4 border-l-purple-500">
            <CardHeader className="pb-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <CardTitle className="text-base font-medium mb-2">
                    {response.question?.question_text}
                  </CardTitle>
                  <div className="flex items-center space-x-4">
                    <Badge variant="outline" className="text-xs">
                      {response.question?.section?.name}
                    </Badge>
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
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Employee Score */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <Label className="text-sm font-medium text-blue-700">Employee Self-Rating</Label>
                  <div className="flex items-center space-x-2 mt-2">
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-4 w-4 ${
                            star <= (response.emp_rating || 0)
                              ? 'text-blue-500 fill-current'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-lg font-bold text-blue-600">
                      {response.emp_rating || 0}/5
                    </span>
                  </div>
                  {response.emp_comment && (
                    <p className="text-xs text-gray-600 mt-2 italic">
                      "{response.emp_comment}"
                    </p>
                  )}
                </div>

                {/* Manager Score */}
                <div className="bg-green-50 p-4 rounded-lg">
                  <Label className="text-sm font-medium text-green-700">Manager Rating</Label>
                  <div className="flex items-center space-x-2 mt-2">
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-4 w-4 ${
                            star <= (response.mgr_rating || 0)
                              ? 'text-green-500 fill-current'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-lg font-bold text-green-600">
                      {response.mgr_rating || 0}/5
                    </span>
                  </div>
                  {response.mgr_comment && (
                    <p className="text-xs text-gray-600 mt-2 italic">
                      "{response.mgr_comment}"
                    </p>
                  )}
                </div>

                {/* Average Score */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <Label className="text-sm font-medium text-gray-700">Current Average</Label>
                  <div className="flex items-center space-x-2 mt-2">
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((star) => {
                        const avgScore = ((response.emp_rating || 0) + (response.mgr_rating || 0)) / 2;
                        return (
                          <Star
                            key={star}
                            className={`h-4 w-4 ${
                              star <= avgScore
                                ? 'text-gray-500 fill-current'
                                : 'text-gray-300'
                            }`}
                          />
                        );
                      })}
                    </div>
                    <span className="text-lg font-bold text-gray-600">
                      {(((response.emp_rating || 0) + (response.mgr_rating || 0)) / 2).toFixed(1)}/5
                    </span>
                  </div>
                </div>

                {/* Committee Score */}
                <div className="bg-purple-50 p-4 rounded-lg">
                  <Label className="text-sm font-medium text-purple-700">Committee Rating</Label>
                  <div className="flex items-center space-x-2 mt-2">
                    <Select
                      value={committeeScores[response.id]?.toString() || ''}
                      onValueChange={(value) => onScoreChange(response.id, parseInt(value))}
                    >
                      <SelectTrigger className="w-20 h-8">
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
                    <span className="text-sm text-gray-500">/5</span>
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
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
