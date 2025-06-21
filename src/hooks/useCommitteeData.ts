
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
      
      // First get all employees
      const { data: employeesData, error: employeesError } = await supabase
        .from('profiles')
        .select(`
          id,
          first_name,
          last_name,
          email,
          position,
          line_manager_id,
          department_id
        `)
        .eq('is_active', true)
        .order('first_name');

      if (employeesError) throw employeesError;

      // Get departments separately
      const { data: departmentsData, error: departmentsError } = await supabase
        .from('departments')
        .select('id, name');

      if (departmentsError) {
        console.error('Error fetching departments:', departmentsError);
      }

      // Get line managers separately
      const lineManagerIds = employeesData
        ?.filter(emp => emp.line_manager_id)
        .map(emp => emp.line_manager_id) || [];

      let lineManagersData = [];
      if (lineManagerIds.length > 0) {
        const { data: managers, error: managersError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email')
          .in('id', lineManagerIds);

        if (managersError) {
          console.error('Error fetching line managers:', managersError);
        } else {
          lineManagersData = managers || [];
        }
      }

      // Transform and combine the data
      const transformedData = (employeesData || []).map(employee => {
        const department = departmentsData?.find(dept => dept.id === employee.department_id);
        const lineManager = lineManagersData.find(mgr => mgr.id === employee.line_manager_id);
        
        return {
          ...employee,
          department: department ? { name: department.name } : undefined,
          line_manager: lineManager ? {
            first_name: lineManager.first_name,
            last_name: lineManager.last_name,
            email: lineManager.email
          } : undefined
        };
      });
      
      setEmployees(transformedData);
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
      const { data: employeeData, error: employeeError } = await supabase
        .from('profiles')
        .select(`
          id,
          first_name,
          last_name,
          email,
          position,
          department_id,
          line_manager_id
        `)
        .eq('id', employeeId)
        .single();

      if (employeeError) throw employeeError;

      // Get department info
      let department = undefined;
      if (employeeData.department_id) {
        const { data: deptData, error: deptError } = await supabase
          .from('departments')
          .select('name')
          .eq('id', employeeData.department_id)
          .single();

        if (!deptError && deptData) {
          department = { name: deptData.name };
        }
      }

      // Get line manager info
      let line_manager = undefined;
      if (employeeData.line_manager_id) {
        const { data: managerData, error: managerError } = await supabase
          .from('profiles')
          .select('first_name, last_name, email')
          .eq('id', employeeData.line_manager_id)
          .single();

        if (!managerError && managerData) {
          line_manager = managerData;
        }
      }

      const employee = {
        ...employeeData,
        department,
        line_manager
      };

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
          cycle_id
        `)
        .eq('employee_id', employeeId)
        .order('created_at', { ascending: false });

      if (appraisalsError) throw appraisalsError;

      // Get cycle names for appraisals
      const cycleIds = appraisals?.map(app => app.cycle_id).filter(Boolean) || [];
      let cyclesData = [];
      if (cycleIds.length > 0) {
        const { data: cycles, error: cyclesError } = await supabase
          .from('appraisal_cycles')
          .select('id, name')
          .in('id', cycleIds);

        if (!cyclesError) {
          cyclesData = cycles || [];
        }
      }

      // Transform appraisal data
      const transformedAppraisals = (appraisals || []).map(appraisal => {
        const cycle = cyclesData.find(c => c.id === appraisal.cycle_id);
        return {
          id: appraisal.id,
          overall_score: appraisal.overall_score,
          performance_band: appraisal.performance_band,
          status: appraisal.status,
          cycle_name: cycle?.name || 'Unknown Cycle',
          created_at: appraisal.created_at,
          completed_at: appraisal.completed_at
        };
      });

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
