
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
    if (employeeId) {
      fetchAppraisalScores();
    }
  }, [employeeId]);

  const fetchAppraisalScores = async () => {
    try {
      setLoading(true);
      console.log('Fetching scores for employee:', employeeId, employeeName);

      // Get the active cycle
      const { data: activeCycle, error: cycleError } = await supabase
        .from('appraisal_cycles')
        .select('*')
        .eq('status', 'active')
        .single();

      if (cycleError) {
        console.error('No active cycle found:', cycleError);
        // Try to get the most recent cycle if no active one exists
        const { data: recentCycle, error: recentError } = await supabase
          .from('appraisal_cycles')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        
        if (recentError) {
          console.error('No cycles found:', recentError);
          setScores([]);
          return;
        }
        
        console.log('Using most recent cycle:', recentCycle);
      }

      const cycleToUse = activeCycle || recentCycle;

      // Get sections with their assigned questions for this specific employee
      const { data: employeeQuestions, error: questionsError } = await supabase
        .from('employee_appraisal_questions')
        .select(`
          question_id,
          appraisal_questions!inner (
            id,
            section_id,
            appraisal_question_sections!inner (
              id,
              name,
              weight,
              max_score
            )
          )
        `)
        .eq('employee_id', employeeId)
        .eq('is_active', true);

      if (questionsError) {
        console.error('Error fetching employee questions:', questionsError);
        throw questionsError;
      }

      console.log('Employee questions found:', employeeQuestions);

      if (!employeeQuestions || employeeQuestions.length === 0) {
        console.log('No questions assigned to this employee');
        setScores([]);
        return;
      }

      // Get responses for these specific questions and employee
      const questionIds = employeeQuestions.map(eq => eq.question_id);
      
      const { data: responses, error: responsesError } = await supabase
        .from('appraisal_responses')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('cycle_id', cycleToUse.id)
        .in('question_id', questionIds);

      if (responsesError) {
        console.error('Error fetching responses:', responsesError);
        throw responsesError;
      }

      console.log('Responses found:', responses);

      // Group questions by section and calculate scores
      const sectionMap = new Map();
      
      employeeQuestions.forEach(eq => {
        const section = eq.appraisal_questions.appraisal_question_sections;
        const sectionId = section.id;
        
        if (!sectionMap.has(sectionId)) {
          sectionMap.set(sectionId, {
            id: sectionId,
            name: section.name,
            weight: section.weight,
            max_score: section.max_score,
            questions: [],
            responses: []
          });
        }
        
        sectionMap.get(sectionId).questions.push(eq.question_id);
      });

      // Add responses to sections
      if (responses) {
        responses.forEach(response => {
          for (let [sectionId, sectionData] of sectionMap) {
            if (sectionData.questions.includes(response.question_id)) {
              sectionData.responses.push(response);
              break;
            }
          }
        });
      }

      // Calculate scores for each section
      const processedScores: ScoreData[] = Array.from(sectionMap.values()).map(section => {
        let empTotal = 0;
        let mgrTotal = 0;
        let committeeTotal = 0;
        let responseCount = section.responses.length;

        section.responses.forEach((response: any) => {
          empTotal += response.emp_rating || 0;
          mgrTotal += response.mgr_rating || 0;
          committeeTotal += response.committee_rating || 0;
        });

        return {
          sectionName: section.name,
          weight: section.weight,
          maxScore: section.max_score,
          empScore: empTotal,
          mgrScore: mgrTotal,
          committeeScore: committeeTotal,
        };
      });

      console.log('Processed scores for employee:', employeeName, processedScores);
      setScores(processedScores);

    } catch (error) {
      console.error('Error fetching appraisal scores:', error);
      toast({
        title: "Error",
        description: "Failed to load performance scores for the selected employee",
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
            <span className="ml-2">Loading performance scores for {employeeName}...</span>
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
            <h3 className="text-lg font-semibold">Detailed Section Performance Breakdown for {employeeName}</h3>
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
              <p className="text-gray-500">No appraisal data found for {employeeName} in the current cycle.</p>
              <p className="text-sm text-gray-400 mt-1">Please ensure questions have been assigned and responses have been submitted.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
