
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  position: string | null;
  department?: {
    name: string;
  };
  line_manager?: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

interface AppraisalData {
  id: string;
  overall_score: number | null;
  performance_band: string | null;
  status: string;
  cycle_name: string;
  created_at: string;
  completed_at: string | null;
}

interface EmployeeAnalytics {
  employee: Employee;
  appraisals: AppraisalData[];
  averageScore: number | null;
  improvementAreas: string[];
  strengths: string[];
  totalAppraisals: number;
  completedAppraisals: number;
}

export function useCommitteeData() {
  const { toast } = useToast();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [analytics, setAnalytics] = useState<EmployeeAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  const fetchEmployees = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          first_name,
          last_name,
          email,
          position,
          department:departments!profiles_department_id_fkey(name),
          line_manager:profiles!profiles_line_manager_id_fkey(first_name, last_name, email)
        `)
        .eq('is_active', true)
        .order('first_name');

      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast({
        title: "Error",
        description: "Failed to load employees",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchEmployeeAnalytics = useCallback(async (employeeId: string) => {
    try {
      setLoadingAnalytics(true);
      
      // Get employee details
      const { data: employee, error: employeeError } = await supabase
        .from('profiles')
        .select(`
          id,
          first_name,
          last_name,
          email,
          position,
          department:departments!profiles_department_id_fkey(name),
          line_manager:profiles!profiles_line_manager_id_fkey(first_name, last_name, email)
        `)
        .eq('id', employeeId)
        .single();

      if (employeeError) throw employeeError;

      // Get appraisal history
      const { data: appraisals, error: appraisalsError } = await supabase
        .from('appraisals')
        .select(`
          id,
          overall_score,
          performance_band,
          status,
          created_at,
          completed_at,
          appraisal_cycles(name)
        `)
        .eq('employee_id', employeeId)
        .order('created_at', { ascending: false });

      if (appraisalsError) throw appraisalsError;

      // Transform appraisal data
      const transformedAppraisals = (appraisals || []).map(appraisal => ({
        id: appraisal.id,
        overall_score: appraisal.overall_score,
        performance_band: appraisal.performance_band,
        status: appraisal.status,
        cycle_name: appraisal.appraisal_cycles?.name || 'Unknown Cycle',
        created_at: appraisal.created_at,
        completed_at: appraisal.completed_at
      }));

      // Calculate analytics
      const completedAppraisals = transformedAppraisals.filter(a => a.status === 'completed');
      const scoresWithValues = completedAppraisals.filter(a => a.overall_score !== null);
      const averageScore = scoresWithValues.length > 0 
        ? scoresWithValues.reduce((sum, a) => sum + (a.overall_score || 0), 0) / scoresWithValues.length 
        : null;

      // Generate improvement areas and strengths based on performance
      const improvementAreas = [];
      const strengths = [];

      if (averageScore !== null) {
        if (averageScore < 60) {
          improvementAreas.push('Overall Performance', 'Goal Achievement', 'Professional Development');
        } else if (averageScore < 75) {
          improvementAreas.push('Leadership Skills', 'Communication', 'Time Management');
        } else if (averageScore < 85) {
          improvementAreas.push('Strategic Thinking', 'Innovation', 'Mentoring');
        }

        if (averageScore >= 85) {
          strengths.push('Exceptional Performance', 'Leadership Excellence', 'Strategic Vision');
        } else if (averageScore >= 70) {
          strengths.push('Consistent Performance', 'Team Collaboration', 'Problem Solving');
        } else if (averageScore >= 60) {
          strengths.push('Meeting Expectations', 'Reliability', 'Learning Attitude');
        }
      }

      const analytics: EmployeeAnalytics = {
        employee,
        appraisals: transformedAppraisals,
        averageScore,
        improvementAreas,
        strengths,
        totalAppraisals: transformedAppraisals.length,
        completedAppraisals: completedAppraisals.length
      };

      setAnalytics(analytics);
    } catch (error) {
      console.error('Error fetching employee analytics:', error);
      toast({
        title: "Error",
        description: "Failed to load employee analytics",
        variant: "destructive"
      });
    } finally {
      setLoadingAnalytics(false);
    }
  }, [toast]);

  const handleEmployeeSelect = useCallback((employeeId: string) => {
    setSelectedEmployee(employeeId);
    if (employeeId) {
      fetchEmployeeAnalytics(employeeId);
    } else {
      setAnalytics(null);
    }
  }, [fetchEmployeeAnalytics]);

  return {
    employees,
    selectedEmployee,
    analytics,
    loading,
    loadingAnalytics,
    fetchEmployees,
    handleEmployeeSelect
  };
}
