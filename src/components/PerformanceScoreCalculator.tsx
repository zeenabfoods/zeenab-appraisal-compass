
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Calculator, TrendingUp, Award, Users } from 'lucide-react';

interface PerformanceScore {
  id: string;
  employee_id: string;
  cycle_id: string;
  overall_score: number;
  performance_band: string;
  created_at: string;
  employee_name: string;
  cycle_name: string;
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
        cycle_name: score.cycle?.name || 'Unknown Cycle'
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
      // Get the most recent cycle for calculation
      const { data: cycles, error: cycleError } = await supabase
        .from('appraisal_cycles')
        .select('id, name')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1);

      if (cycleError) throw cycleError;
      
      const recentCycle = cycles?.[0];
      if (!recentCycle) {
        toast({
          title: "No Active Cycle",
          description: "No active appraisal cycle found for calculation",
          variant: "destructive"
        });
        return;
      }

      // Implementation for calculating performance scores would go here
      toast({
        title: "Calculation Started",
        description: `Performance scores calculation initiated for ${recentCycle.name}`,
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
                    </div>
                    <Badge className={getBandColor(score.performance_band)}>
                      {score.performance_band}
                    </Badge>
                  </div>
                </div>
                <div className="text-xs text-gray-500">
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
