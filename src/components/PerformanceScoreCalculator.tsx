
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ScoreData {
  sectionName: string;
  weight: number;
  maxScore: number;
  empScore: number;
  mgrScore: number;
  committeeScore: number;
}

interface PerformanceScoreCalculatorProps {
  employeeName: string;
  employeeId: string;
}

export function PerformanceScoreCalculator({ employeeName, employeeId }: PerformanceScoreCalculatorProps) {
  const { toast } = useToast();
  const [scores, setScores] = useState<ScoreData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAppraisalScores();
  }, [employeeId]);

  const fetchAppraisalScores = async () => {
    try {
      setLoading(true);

      // Get the active cycle
      const { data: activeCycle, error: cycleError } = await supabase
        .from('appraisal_cycles')
        .select('*')
        .eq('status', 'active')
        .single();

      if (cycleError) {
        console.error('No active cycle found:', cycleError);
        setScores([]);
        return;
      }

      // Get sections and their responses for this employee
      const { data: sectionsData, error: sectionsError } = await supabase
        .from('appraisal_question_sections')
        .select(`
          id,
          name,
          weight,
          max_score,
          appraisal_questions!inner (
            id,
            appraisal_responses (
              emp_rating,
              mgr_rating,
              committee_rating,
              employee_id,
              cycle_id
            )
          )
        `)
        .eq('is_active', true)
        .eq('appraisal_questions.appraisal_responses.employee_id', employeeId)
        .eq('appraisal_questions.appraisal_responses.cycle_id', activeCycle.id);

      if (sectionsError) throw sectionsError;

      // Process the data to calculate scores
      const processedScores: ScoreData[] = (sectionsData || []).map(section => {
        let empTotal = 0;
        let mgrTotal = 0;
        let committeeTotal = 0;
        let questionCount = 0;

        section.appraisal_questions.forEach((question: any) => {
          if (question.appraisal_responses && question.appraisal_responses.length > 0) {
            const response = question.appraisal_responses[0];
            empTotal += response.emp_rating || 0;
            mgrTotal += response.mgr_rating || 0;
            committeeTotal += response.committee_rating || 0;
            questionCount++;
          }
        });

        return {
          sectionName: section.name,
          weight: section.weight,
          maxScore: section.max_score,
          empScore: questionCount > 0 ? empTotal : 0,
          mgrScore: questionCount > 0 ? mgrTotal : 0,
          committeeScore: questionCount > 0 ? committeeTotal : 0,
        };
      });

      setScores(processedScores);

    } catch (error) {
      console.error('Error fetching appraisal scores:', error);
      toast({
        title: "Error",
        description: "Failed to load performance scores",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateOverallScore = (scoreType: 'emp' | 'mgr' | 'committee') => {
    if (scores.length === 0) return 0;
    
    let totalWeightedScore = 0;
    let totalWeight = 0;
    
    scores.forEach(section => {
      const score = scoreType === 'emp' ? section.empScore : 
                   scoreType === 'mgr' ? section.mgrScore : 
                   section.committeeScore;
      
      const maxPossible = section.maxScore * 5; // Assuming 5 is max rating per question
      const percentage = maxPossible > 0 ? (score / maxPossible) * 100 : 0;
      
      totalWeightedScore += percentage * section.weight;
      totalWeight += section.weight;
    });
    
    return totalWeight > 0 ? totalWeightedScore / totalWeight : 0;
  };

  const getPerformanceBand = (score: number) => {
    if (score >= 91) return { band: 'Exceptional', color: 'bg-green-600' };
    if (score >= 81) return { band: 'Excellent', color: 'bg-green-500' };
    if (score >= 71) return { band: 'Very Good', color: 'bg-blue-500' };
    if (score >= 61) return { band: 'Good', color: 'bg-yellow-500' };
    if (score >= 51) return { band: 'Fair', color: 'bg-orange-500' };
    return { band: 'Poor', color: 'bg-red-500' };
  };

  const empOverallScore = calculateOverallScore('emp');
  const mgrOverallScore = calculateOverallScore('mgr');
  const committeeOverallScore = calculateOverallScore('committee');

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Performance Score Calculator for {employeeName}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Overall Scores Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <h3 className="font-semibold text-blue-600">Employee Score</h3>
                <p className="text-2xl font-bold">{empOverallScore.toFixed(1)}%</p>
                <Badge className={getPerformanceBand(empOverallScore).color}>
                  {getPerformanceBand(empOverallScore).band}
                </Badge>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 text-center">
                <h3 className="font-semibold text-green-600">Manager Score</h3>
                <p className="text-2xl font-bold">{mgrOverallScore.toFixed(1)}%</p>
                <Badge className={getPerformanceBand(mgrOverallScore).color}>
                  {getPerformanceBand(mgrOverallScore).band}
                </Badge>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 text-center">
                <h3 className="font-semibold text-purple-600">Committee Score</h3>
                <p className="text-2xl font-bold">{committeeOverallScore.toFixed(1)}%</p>
                <Badge className={getPerformanceBand(committeeOverallScore).color}>
                  {getPerformanceBand(committeeOverallScore).band}
                </Badge>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Section Performance */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Detailed Section Performance Breakdown</h3>
            {scores.map((section, index) => {
              const sectionMaxScore = section.maxScore * 5; // Assuming 5 questions max per section
              const empPercentage = sectionMaxScore > 0 ? (section.empScore / sectionMaxScore) * 100 : 0;
              const mgrPercentage = sectionMaxScore > 0 ? (section.mgrScore / sectionMaxScore) * 100 : 0;
              const committeePercentage = sectionMaxScore > 0 ? (section.committeeScore / sectionMaxScore) * 100 : 0;

              return (
                <Card key={index}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <h4 className="font-semibold">{section.sectionName}</h4>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <span>Weight: {section.weight}%</span>
                          <span>Max Questions: {section.maxScore}</span>
                        </div>
                      </div>
                      <Badge className={getPerformanceBand(empPercentage).color}>
                        {getPerformanceBand(empPercentage).band}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-blue-50 p-3 rounded">
                        <p className="text-sm text-gray-600">Employee Score</p>
                        <p className="text-xl font-bold text-blue-600">{section.empScore}</p>
                        <Progress value={empPercentage} className="mt-2" />
                      </div>
                      
                      <div className="bg-green-50 p-3 rounded">
                        <p className="text-sm text-gray-600">Manager Score</p>
                        <p className="text-xl font-bold text-green-600">{section.mgrScore}</p>
                        <Progress value={mgrPercentage} className="mt-2" />
                      </div>
                      
                      <div className="bg-purple-50 p-3 rounded">
                        <p className="text-sm text-gray-600">Committee Score</p>
                        <p className="text-xl font-bold text-purple-600">{section.committeeScore}</p>
                        <Progress value={committeePercentage} className="mt-2" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {scores.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">No appraisal data found for this employee in the current cycle.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
