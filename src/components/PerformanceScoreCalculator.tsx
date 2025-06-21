
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Calculator, Target, TrendingUp, MessageSquare, BookOpen, Target as Goals } from 'lucide-react';

interface ScoreData {
  sectionName: string;
  weight: number;
  maxScore: number;
  empScore: number;
  mgrScore: number;
  committeeScore: number;
}

interface PerformanceScoreCalculatorProps {
  scores: ScoreData[];
  employeeName: string;
}

export function PerformanceScoreCalculator({ 
  scores, 
  employeeName 
}: PerformanceScoreCalculatorProps) {
  
  const [employeeComment, setEmployeeComment] = useState('');
  const [trainingNeeds, setTrainingNeeds] = useState('');
  const [goalsForNextReview, setGoalsForNextReview] = useState('');

  const getSectionMaxScore = (sectionName: string) => {
    const lowerName = sectionName.toLowerCase();
    if (lowerName.includes('financial')) return 50;
    if (lowerName.includes('operational') || lowerName.includes('efficiency')) return 35;
    if (lowerName.includes('behavioral') || lowerName.includes('behaviour')) return 15;
    return 100; // Default for other sections
  };

  const calculateSectionScore = (score: ScoreData) => {
    // Use manager score if available, otherwise employee score
    const baseScore = score.mgrScore || score.empScore || 0;
    const maxPossible = score.maxScore * 5; // Assuming 5-point scale
    const percentage = (baseScore / maxPossible) * 100;
    
    // Apply section-specific caps
    const maxAllowed = getSectionMaxScore(score.sectionName);
    const cappedScore = Math.min(percentage, maxAllowed);
    
    return cappedScore;
  };

  const calculateOverallScore = () => {
    let totalScore = 0;
    let noteworthyBonus = 0;

    scores.forEach(score => {
      const sectionScore = calculateSectionScore(score);
      const lowerName = score.sectionName.toLowerCase();
      
      if (lowerName.includes('noteworthy') || lowerName.includes('note worthy')) {
        // Noteworthy section adds bonus points
        noteworthyBonus = sectionScore * 0.1; // 10% of noteworthy score as bonus
      } else {
        totalScore += sectionScore;
      }
    });

    // Add noteworthy bonus but cap total at 100
    const finalScore = Math.min(totalScore + noteworthyBonus, 100);
    return finalScore;
  };

  const getPerformanceBand = (score: number) => {
    if (score >= 91) return { band: 'EXCEPTIONAL', color: 'bg-green-600', range: '91-100' };
    if (score >= 81) return { band: 'EXCELLENT', color: 'bg-green-500', range: '81-90' };
    if (score >= 71) return { band: 'VERY GOOD', color: 'bg-blue-500', range: '71-80' };
    if (score >= 61) return { band: 'GOOD', color: 'bg-yellow-500', range: '61-70' };
    if (score >= 51) return { band: 'FAIR', color: 'bg-orange-500', range: '51-60' };
    return { band: 'POOR', color: 'bg-red-500', range: 'Below 50' };
  };

  const overallScore = calculateOverallScore();
  const performanceBand = getPerformanceBand(overallScore);

  return (
    <div className="space-y-6">
      {/* Employee Score Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calculator className="h-5 w-5 mr-2" />
            Performance Score for {employeeName}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900">
                {overallScore.toFixed(1)}%
              </div>
              <p className="text-sm text-gray-600">Overall Score</p>
            </div>
            
            <div className="text-center">
              <Badge 
                className={`${performanceBand.color} text-white px-3 py-1 text-sm`}
              >
                {performanceBand.band}
              </Badge>
              <p className="text-sm text-gray-600 mt-1">
                Performance Band ({performanceBand.range})
              </p>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center">
                <TrendingUp className="h-5 w-5 mr-1 text-blue-500" />
                <span className="text-lg font-semibold">
                  {scores.length}
                </span>
              </div>
              <p className="text-sm text-gray-600">Sections Evaluated</p>
            </div>
          </div>
          
          <div className="mt-4">
            <Progress value={overallScore} className="h-3" />
          </div>
        </CardContent>
      </Card>

      {/* Section Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Target className="h-5 w-5 mr-2" />
            Section Performance Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {scores.map((score, index) => {
              const sectionScore = calculateSectionScore(score);
              const sectionBand = getPerformanceBand(sectionScore);
              const maxAllowed = getSectionMaxScore(score.sectionName);
              const isNoteworthy = score.sectionName.toLowerCase().includes('noteworthy') || 
                                   score.sectionName.toLowerCase().includes('note worthy');
              
              return (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-gray-900">{score.sectionName}</h4>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          Weight: {score.weight}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          Max: {score.maxScore}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          Cap: {maxAllowed}%
                        </Badge>
                        {isNoteworthy && (
                          <Badge variant="secondary" className="text-xs">
                            Bonus Section
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold">
                        {sectionScore.toFixed(1)}%
                      </div>
                      <Badge 
                        variant="secondary" 
                        className={`text-xs ${sectionBand.color} text-white`}
                      >
                        {sectionBand.band}
                      </Badge>
                    </div>
                  </div>
                  
                  <Progress value={Math.min(sectionScore, 100)} className="h-2" />
                  
                  <div className="grid grid-cols-3 gap-4 mt-2 text-sm">
                    <div>
                      <span className="text-gray-600">Employee: </span>
                      <span className="font-medium">{score.empScore || 0}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Manager: </span>
                      <span className="font-medium">{score.mgrScore || 0}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Committee: </span>
                      <span className="font-medium">{score.committeeScore || 0}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Employee Comment Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <MessageSquare className="h-5 w-5 mr-2" />
            Employee Comment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Employee can add their comments here..."
            value={employeeComment}
            onChange={(e) => setEmployeeComment(e.target.value)}
            className="min-h-[100px]"
          />
        </CardContent>
      </Card>

      {/* Training Needs Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BookOpen className="h-5 w-5 mr-2" />
            Training Needs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Identify training needs and development areas..."
            value={trainingNeeds}
            onChange={(e) => setTrainingNeeds(e.target.value)}
            className="min-h-[100px]"
          />
        </CardContent>
      </Card>

      {/* Goals for Next Review - Line Manager Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Goals className="h-5 w-5 mr-2" />
            Goals for Next Review (Line Manager)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Line manager to set goals and objectives for the next review period..."
            value={goalsForNextReview}
            onChange={(e) => setGoalsForNextReview(e.target.value)}
            className="min-h-[100px]"
          />
          <p className="text-sm text-gray-500 mt-2">
            This section is to be completed by the line manager
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
