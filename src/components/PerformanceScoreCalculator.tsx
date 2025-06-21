
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Calculator, Target, TrendingUp, MessageSquare, BookOpen, Target as Goals, Info } from 'lucide-react';

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

  // Performance calculation logic based on the template
  const calculateSectionScore = (score: ScoreData) => {
    // Use manager score as the final score (line manager's appraisal)
    // If manager hasn't scored yet, fall back to employee score
    const finalScore = score.mgrScore || score.empScore || 0;
    const maxPossible = score.maxScore * 5; // Assuming 5-point rating scale
    
    // Calculate percentage
    const percentage = maxPossible > 0 ? (finalScore / maxPossible) * 100 : 0;
    
    // Apply section-specific caps based on template constraints
    const sectionName = score.sectionName.toLowerCase();
    let cappedScore = percentage;
    
    if (sectionName.includes('financial') || sectionName.includes('sales')) {
      cappedScore = Math.min(percentage, 50); // Max 50% for Financial/Sales
    } else if (sectionName.includes('operational') || sectionName.includes('efficiency') || sectionName.includes('productivity')) {
      cappedScore = Math.min(percentage, 35); // Max 35% for Operational
    } else if (sectionName.includes('behavioral') || sectionName.includes('behaviour') || sectionName.includes('soft skill')) {
      cappedScore = Math.min(percentage, 15); // Max 15% for Behavioral
    }
    
    return Math.max(0, cappedScore); // Ensure no negative scores
  };

  const calculateOverallScore = () => {
    let totalWeightedScore = 0;
    let totalWeight = 0;
    let noteworthyBonus = 0;

    scores.forEach(score => {
      const sectionScore = calculateSectionScore(score);
      const sectionName = score.sectionName.toLowerCase();
      
      if (sectionName.includes('noteworthy') || sectionName.includes('note worthy') || sectionName.includes('exceptional')) {
        // Noteworthy achievements add bonus points (up to 10% of total)
        noteworthyBonus += Math.min(sectionScore * 0.1, 10);
      } else {
        // Regular sections contribute to weighted score
        const weightedScore = (sectionScore * score.weight) / 100;
        totalWeightedScore += weightedScore;
        totalWeight += score.weight;
      }
    });

    // Calculate base score from weighted sections
    const baseScore = totalWeight > 0 ? (totalWeightedScore / totalWeight) * 100 : 0;
    
    // Add noteworthy bonus but cap total at 100
    const finalScore = Math.min(baseScore + noteworthyBonus, 100);
    return Math.max(0, finalScore);
  };

  const getPerformanceBand = (score: number) => {
    // Performance bands based on standard HR practices
    if (score >= 91) return { 
      band: 'EXCEPTIONAL', 
      color: 'bg-green-600', 
      range: '91-100',
      description: 'Outstanding performance exceeding all expectations'
    };
    if (score >= 81) return { 
      band: 'EXCELLENT', 
      color: 'bg-green-500', 
      range: '81-90',
      description: 'Consistently exceeds expectations'
    };
    if (score >= 71) return { 
      band: 'VERY GOOD', 
      color: 'bg-blue-500', 
      range: '71-80',
      description: 'Regularly meets and often exceeds expectations'
    };
    if (score >= 61) return { 
      band: 'GOOD', 
      color: 'bg-yellow-500', 
      range: '61-70',
      description: 'Consistently meets expectations'
    };
    if (score >= 51) return { 
      band: 'FAIR', 
      color: 'bg-orange-500', 
      range: '51-60',
      description: 'Meets most expectations with room for improvement'
    };
    return { 
      band: 'POOR', 
      color: 'bg-red-500', 
      range: 'Below 50',
      description: 'Does not meet expectations, requires improvement plan'
    };
  };

  const overallScore = calculateOverallScore();
  const performanceBand = getPerformanceBand(overallScore);

  return (
    <div className="space-y-6">
      {/* Score Calculation Explanation */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center text-blue-800">
            <Info className="h-5 w-5 mr-2" />
            Performance Score Calculation Explained
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-blue-700">
          <div className="space-y-2">
            <p><strong>Step 1:</strong> Line Manager's scores are used as the final assessment for each section</p>
            <p><strong>Step 2:</strong> Each section score is calculated as a percentage of the maximum possible score</p>
            <p><strong>Step 3:</strong> Section caps are applied (Financial: 50%, Operational: 35%, Behavioral: 15%)</p>
            <p><strong>Step 4:</strong> Weighted average is calculated based on section weights</p>
            <p><strong>Step 5:</strong> Noteworthy achievements add bonus points (up to 10%)</p>
            <p><strong>Step 6:</strong> Final score determines performance band and recommendations</p>
          </div>
        </CardContent>
      </Card>

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
              <div className="text-4xl font-bold text-gray-900">
                {overallScore.toFixed(1)}%
              </div>
              <p className="text-sm text-gray-600">Final Score</p>
              <p className="text-xs text-gray-500 mt-1">
                (Based on Line Manager Assessment)
              </p>
            </div>
            
            <div className="text-center">
              <Badge 
                className={`${performanceBand.color} text-white px-4 py-2 text-sm mb-2`}
              >
                {performanceBand.band}
              </Badge>
              <p className="text-sm text-gray-600">
                Performance Band ({performanceBand.range})
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {performanceBand.description}
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
          
          <div className="mt-6">
            <Progress value={Math.min(overallScore, 100)} className="h-4" />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>0%</span>
              <span className="font-medium">Current: {overallScore.toFixed(1)}%</span>
              <span>100%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Target className="h-5 w-5 mr-2" />
            Detailed Section Performance Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {scores.map((score, index) => {
              const sectionScore = calculateSectionScore(score);
              const sectionBand = getPerformanceBand(sectionScore);
              const isNoteworthy = score.sectionName.toLowerCase().includes('noteworthy') || 
                                   score.sectionName.toLowerCase().includes('note worthy');
              const hasManagerScore = score.mgrScore > 0;
              
              return (
                <div key={index} className="border rounded-lg p-4 bg-white shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-gray-900">{score.sectionName}</h4>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          Weight: {score.weight}%
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          Max Questions: {score.maxScore}
                        </Badge>
                        {isNoteworthy && (
                          <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800">
                            Bonus Section
                          </Badge>
                        )}
                        {!hasManagerScore && (
                          <Badge variant="destructive" className="text-xs">
                            Manager Review Pending
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold">
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
                  
                  <Progress value={Math.min(sectionScore, 100)} className="h-3 mb-3" />
                  
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="text-center p-2 bg-blue-50 rounded">
                      <span className="text-gray-600 block">Employee Score</span>
                      <span className="font-bold text-blue-600">{score.empScore || 0}</span>
                    </div>
                    <div className="text-center p-2 bg-green-50 rounded">
                      <span className="text-gray-600 block">Manager Score</span>
                      <span className="font-bold text-green-600">
                        {score.mgrScore || 'Pending'}
                      </span>
                    </div>
                    <div className="text-center p-2 bg-purple-50 rounded">
                      <span className="text-gray-600 block">Committee Score</span>
                      <span className="font-bold text-purple-600">
                        {score.committeeScore || 'N/A'}
                      </span>
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
            Employee Self-Assessment Comments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Employee's self-reflection on performance, achievements, and challenges..."
            value={employeeComment}
            onChange={(e) => setEmployeeComment(e.target.value)}
            className="min-h-[120px]"
          />
          <p className="text-sm text-gray-500 mt-2">
            This section allows the employee to provide context and self-reflection on their performance.
          </p>
        </CardContent>
      </Card>

      {/* Training Needs Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BookOpen className="h-5 w-5 mr-2" />
            Training & Development Needs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Identify specific training needs, skill gaps, and professional development opportunities..."
            value={trainingNeeds}
            onChange={(e) => setTrainingNeeds(e.target.value)}
            className="min-h-[120px]"
          />
          <p className="text-sm text-gray-500 mt-2">
            Based on performance assessment, identify areas for improvement and growth opportunities.
          </p>
        </CardContent>
      </Card>

      {/* Goals for Next Review */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Goals className="h-5 w-5 mr-2" />
            Goals & Objectives for Next Review Period
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Set specific, measurable goals and objectives for the next performance review period..."
            value={goalsForNextReview}
            onChange={(e) => setGoalsForNextReview(e.target.value)}
            className="min-h-[120px]"
          />
          <p className="text-sm text-gray-500 mt-2">
            <strong>Line Manager:</strong> Define clear, achievable goals aligned with business objectives and employee development.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
