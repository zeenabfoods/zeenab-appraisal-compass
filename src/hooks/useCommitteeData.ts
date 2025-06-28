
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
  manager_reviewed_by?: {
    first_name: string;
    last_name: string;
    department: string;
  };
}

interface ChartData {
  scoreHistory: Array<{
    cycle: string;
    score: number;
    date: string;
  }>;
  performanceBands: Array<{
    band: string;
    count: number;
    color: string;
  }>;
  completionTimeline: Array<{
    cycle: string;
    created: string;
    completed: string | null;
    duration: number | null;
  }>;
}

interface EmployeeAnalytics {
  employee: Employee;
  appraisals: AppraisalData[];
  averageScore: number | null;
  improvementAreas: string[];
  strengths: string[];
  totalAppraisals: number;
  completedAppraisals: number;
  chartData: ChartData;
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

  const calculatePerformanceScore = (responses: any[]) => {
    if (!responses || responses.length === 0) return null;

    // Filter responses with manager ratings
    const ratedResponses = responses.filter(r => r.mgr_rating && r.mgr_rating > 0);
    
    if (ratedResponses.length === 0) return null;

    // Calculate weighted average score
    const totalScore = ratedResponses.reduce((sum, response) => {
      // Convert 1-5 rating to percentage (20, 40, 60, 80, 100)
      const percentage = (response.mgr_rating / 5) * 100;
      return sum + percentage;
    }, 0);

    return Math.round(totalScore / ratedResponses.length);
  };

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
          cycle_id,
          manager_reviewed_by
        `)
        .eq('employee_id', employeeId)
        .order('created_at', { ascending: false });

      if (appraisalsError) throw appraisalsError;

      // Get appraisal responses for score calculation
      const { data: responses, error: responsesError } = await supabase
        .from('appraisal_responses')
        .select('*')
        .eq('employee_id', employeeId);

      if (responsesError) {
        console.error('Error fetching responses:', responsesError);
      }

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

      // Get manager details who reviewed appraisals
      const managerIds = appraisals?.map(app => app.manager_reviewed_by).filter(Boolean) || [];
      let managersData = [];
      if (managerIds.length > 0) {
        const { data: managers, error: managersError } = await supabase
          .from('profiles')
          .select(`
            id,
            first_name,
            last_name,
            department_id
          `)
          .in('id', managerIds);

        if (!managersError) {
          managersData = managers || [];
        }
      }

      // Get departments for managers
      const managerDeptIds = managersData.map(mgr => mgr.department_id).filter(Boolean);
      let managerDepartments = [];
      if (managerDeptIds.length > 0) {
        const { data: depts, error: deptsError } = await supabase
          .from('departments')
          .select('id, name')
          .in('id', managerDeptIds);

        if (!deptsError) {
          managerDepartments = depts || [];
        }
      }

      // Transform appraisal data and calculate scores
      const transformedAppraisals = (appraisals || []).map(appraisal => {
        const cycle = cyclesData.find(c => c.id === appraisal.cycle_id);
        const manager = managersData.find(m => m.id === appraisal.manager_reviewed_by);
        const managerDept = manager ? managerDepartments.find(d => d.id === manager.department_id) : null;
        
        // Calculate score from responses if overall_score is null
        let calculatedScore = appraisal.overall_score;
        if (!calculatedScore && responses) {
          const appraisalResponses = responses.filter(r => r.appraisal_id === appraisal.id);
          calculatedScore = calculatePerformanceScore(appraisalResponses);
        }
        
        return {
          id: appraisal.id,
          overall_score: calculatedScore,
          performance_band: appraisal.performance_band,
          status: appraisal.status,
          cycle_name: cycle?.name || 'Unknown Cycle',
          created_at: appraisal.created_at,
          completed_at: appraisal.completed_at,
          manager_reviewed_by: manager ? {
            first_name: manager.first_name,
            last_name: manager.last_name,
            department: managerDept?.name || 'Unknown Department'
          } : undefined
        };
      });

      // Calculate analytics
      const completedAppraisals = transformedAppraisals.filter(a => a.status === 'completed');
      const scoresWithValues = transformedAppraisals.filter(a => a.overall_score !== null);
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

      // Prepare chart data
      const scoreHistory = scoresWithValues.map(a => ({
        cycle: a.cycle_name,
        score: a.overall_score || 0,
        date: new Date(a.created_at).toLocaleDateString()
      })).reverse();

      const bandCounts = transformedAppraisals.reduce((acc, a) => {
        if (a.performance_band) {
          acc[a.performance_band] = (acc[a.performance_band] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      const performanceBands = Object.entries(bandCounts).map(([band, count]) => ({
        band,
        count,
        color: getBandColor(band)
      }));

      const completionTimeline = transformedAppraisals.map(a => ({
        cycle: a.cycle_name,
        created: new Date(a.created_at).toLocaleDateString(),
        completed: a.completed_at ? new Date(a.completed_at).toLocaleDateString() : null,
        duration: a.completed_at ? 
          Math.ceil((new Date(a.completed_at).getTime() - new Date(a.created_at).getTime()) / (1000 * 60 * 60 * 24)) 
          : null
      }));

      const chartData: ChartData = {
        scoreHistory,
        performanceBands,
        completionTimeline
      };

      const analytics: EmployeeAnalytics = {
        employee,
        appraisals: transformedAppraisals,
        averageScore,
        improvementAreas,
        strengths,
        totalAppraisals: transformedAppraisals.length,
        completedAppraisals: completedAppraisals.length,
        chartData
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

function getBandColor(band: string): string {
  switch (band.toLowerCase()) {
    case 'exceptional': return '#22c55e';
    case 'excellent': return '#3b82f6';
    case 'very good': return '#f59e0b';
    case 'good': return '#eab308';
    case 'fair': return '#ef4444';
    case 'poor': return '#dc2626';
    default: return '#6b7280';
  }
}
