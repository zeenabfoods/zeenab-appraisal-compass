
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Calculator, TrendingUp, Award, Users, CheckCircle, AlertCircle } from 'lucide-react';
import { PerformanceCalculationService } from '@/services/performanceCalculationService';

interface PerformanceScore {
  id: string;
  employee_id: string;
  cycle_id: string;
  overall_score: number;
  performance_band: string;
  created_at: string;
  employee_name: string;
  cycle_name: string;
  section_scores?: any;
}

interface PerformanceScoreCalculatorProps {
  employeeId?: string;
  showAllEmployees?: boolean;
}

export function PerformanceScoreCalculator({ 
  employeeId, 
  showAllEmployees = false 
}: PerformanceScoreCalculatorProps) {
  const [scores, setScores] = useState<PerformanceScore[]>([]);
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadPerformanceScores();
  }, [employeeId, showAllEmployees]);

  const loadPerformanceScores = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('performance_analytics')
        .select(`
          id,
          employee_id,
          cycle_id,
          overall_score,
          performance_band,
          created_at,
          section_scores,
          employee:profiles!employee_id(first_name, last_name),
          cycle:appraisal_cycles!cycle_id(name)
        `)
        .order('created_at', { ascending: false });

      if (!showAllEmployees && employeeId) {
        query = query.eq('employee_id', employeeId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const formattedScores = data?.map(score => ({
        id: score.id,
        employee_id: score.employee_id,
        cycle_id: score.cycle_id,
        overall_score: score.overall_score || 0,
        performance_band: score.performance_band || 'Not Calculated',
        created_at: score.created_at,
        employee_name: score.employee 
          ? `${score.employee.first_name} ${score.employee.last_name}`
          : 'Unknown Employee',
        cycle_name: score.cycle?.name || 'Unknown Cycle',
        section_scores: score.section_scores
      })) || [];

      setScores(formattedScores);
    } catch (error) {
      console.error('Error loading performance scores:', error);
      toast({
        title: "Error",
        description: "Failed to load performance scores",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const calculatePerformanceScores = async () => {
    setCalculating(true);
    try {
      // Get active cycles for calculation
      const { data: cycles, error: cycleError } = await supabase
        .from('appraisal_cycles')
        .select('id, name')
        .in('status', ['active', 'completed'])
        .order('created_at', { ascending: false });

      if (cycleError) throw cycleError;
      
      if (!cycles || cycles.length === 0) {
        toast({
          title: "No Cycles Available",
          description: "No appraisal cycles found for calculation",
          variant: "destructive"
        });
        return;
      }

      // Get employees to calculate for
      let employeesToCalculate = [];
      if (showAllEmployees) {
        const { data: employees, error: empError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .eq('is_active', true);
        
        if (empError) throw empError;
        employeesToCalculate = employees || [];
      } else if (employeeId) {
        employeesToCalculate = [{ id: employeeId }];
      }

      let calculatedCount = 0;
      
      // Calculate scores for each employee and cycle combination
      for (const cycle of cycles) {
        for (const employee of employeesToCalculate) {
          try {
            const calculation = await PerformanceCalculationService.calculatePerformanceScore(
              employee.id,
              cycle.id
            );
            
            if (calculation) {
              await PerformanceCalculationService.savePerformanceAnalytics(
                employee.id,
                cycle.id,
                calculation
              );
              calculatedCount++;
            }
          } catch (error) {
            console.error(`Error calculating for employee ${employee.id}:`, error);
          }
        }
      }

      toast({
        title: "Calculation Complete",
        description: `Successfully calculated ${calculatedCount} performance scores`,
      });

      // Reload scores after calculation
      await loadPerformanceScores();
    } catch (error) {
      console.error('Error calculating performance scores:', error);
      toast({
        title: "Error",
        description: "Failed to calculate performance scores",
        variant: "destructive"
      });
    } finally {
      setCalculating(false);
    }
  };

  const recalculateAllScores = async () => {
    setRecalculating(true);
    try {
      const result = await PerformanceCalculationService.recalculateAllScores();
      
      if (result.success > 0) {
        toast({
          title: "Recalculation Complete",
          description: `Successfully recalculated ${result.success} scores. ${result.failed > 0 ? `Failed: ${result.failed}` : ''}`,
        });
        await loadPerformanceScores();
      } else {
        toast({
          title: "No Scores Recalculated",
          description: "No appraisals found to recalculate",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error recalculating scores:', error);
      toast({
        title: "Error",
        description: "Failed to recalculate scores",
        variant: "destructive"
      });
    } finally {
      setRecalculating(false);
    }
  };

  const getBandColor = (band: string) => {
    switch (band) {
      case 'Exceptional': return 'bg-gradient-to-r from-purple-100 to-purple-200 text-purple-800 border-purple-300';
      case 'Excellent': return 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 border-green-300';
      case 'Very Good': return 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border-blue-300';
      case 'Good': return 'bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 border-yellow-300';
      case 'Fair': return 'bg-gradient-to-r from-orange-100 to-orange-200 text-orange-800 border-orange-300';
      case 'Poor': return 'bg-gradient-to-r from-red-100 to-red-200 text-red-800 border-red-300';
      default: return 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border-gray-300';
    }
  };

  if (loading) {
    return (
      <Card className="backdrop-blur-md bg-white/60 border-white/40 shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
            <span className="ml-2">Loading performance scores...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="backdrop-blur-md bg-white/60 border-white/40 shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            <CardTitle>
              {showAllEmployees ? 'Performance Scores - All Employees' : 'Your Performance Scores'}
            </CardTitle>
          </div>
          {showAllEmployees && (
            <div className="flex gap-2">
              <Button
                onClick={recalculateAllScores}
                disabled={recalculating}
                variant="outline"
                className="border-orange-500 text-orange-600 hover:bg-orange-50"
              >
                {recalculating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-600 mr-2"></div>
                    Recalculating...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Recalculate All Scores
                  </>
                )}
              </Button>
              <Button
                onClick={calculatePerformanceScores}
                disabled={calculating}
                className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
              >
                {calculating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Calculating...
                  </>
                ) : (
                  <>
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Calculate Scores
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {scores.length === 0 ? (
          <div className="text-center py-8">
            <Award className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">No performance scores available yet</p>
            <p className="text-sm text-gray-500 mt-2">
              Scores will appear after appraisal cycles are completed and calculated
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {scores.map((score) => (
              <div key={score.id} className="p-4 bg-white/50 rounded-lg border border-white/60">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    {showAllEmployees && (
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-gray-500" />
                        <span className="font-medium">{score.employee_name}</span>
                      </div>
                    )}
                    <span className="text-sm text-gray-600">{score.cycle_name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-2xl font-bold text-orange-600">
                        {score.overall_score}%
                      </div>
                      {score.section_scores && (
                        <div className="text-xs text-gray-500">
                          Base: {score.section_scores.baseScore}% 
                          {score.section_scores.noteworthyBonus > 0 && 
                            ` + ${score.section_scores.noteworthyBonus}% bonus`
                          }
                        </div>
                      )}
                    </div>
                    <Badge className={getBandColor(score.performance_band)}>
                      {score.performance_band}
                    </Badge>
                  </div>
                </div>
                
                {/* Section breakdown if available */}
                {score.section_scores?.sections && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                      {score.section_scores.sections.map((section: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between">
                          <span className="text-gray-600 truncate">
                            {section.sectionName}
                            {section.isNoteworthy && <span className="text-amber-500 ml-1">★</span>}
                          </span>
                          <span className="font-medium">{section.score.toFixed(1)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="text-xs text-gray-500 mt-2">
                  Calculated: {new Date(score.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
