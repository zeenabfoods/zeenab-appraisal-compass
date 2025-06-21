
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AssignmentStats {
  totalEmployees: number;
  employeesWithQuestions: number;
  totalQuestionsAssigned: number;
  completedAppraisals: number;
}

export interface EmployeeAssignment {
  employee_id: string;
  employee_name: string;
  email: string;
  department: string;
  line_manager: string;
  questions_assigned: number;
  appraisal_status: string;
  assigned_date: string;
}

export function useQuestionAssignmentData() {
  const { toast } = useToast();
  const [stats, setStats] = useState<AssignmentStats>({
    totalEmployees: 0,
    employeesWithQuestions: 0,
    totalQuestionsAssigned: 0,
    completedAppraisals: 0
  });
  const [assignments, setAssignments] = useState<EmployeeAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAssignmentData = async () => {
    try {
      setLoading(true);

      // Fetch assignment statistics
      const { data: employeeAssignments, error: assignmentError } = await supabase
        .from('employee_appraisal_questions')
        .select(`
          employee_id,
          assigned_at,
          profiles!employee_appraisal_questions_employee_id_fkey (
            id,
            first_name,
            last_name,
            email,
            department:departments!profiles_department_id_fkey(name),
            line_manager:profiles!profiles_line_manager_id_fkey(
              first_name,
              last_name
            )
          ),
          appraisals!appraisals_employee_id_fkey (
            status
          )
        `)
        .eq('is_active', true);

      if (assignmentError) throw assignmentError;

      // Process the data to get stats and assignments
      const processedAssignments: EmployeeAssignment[] = [];
      const employeeMap = new Map();

      assignmentError || assignmentError;
      
      (employeeAssignments || []).forEach((assignment: any) => {
        const employeeId = assignment.employee_id;
        const profile = assignment.profiles;
        
        if (!profile) return;

        if (!employeeMap.has(employeeId)) {
          employeeMap.set(employeeId, {
            employee_id: employeeId,
            employee_name: `${profile.first_name} ${profile.last_name}`,
            email: profile.email,
            department: profile.department?.name || 'Not assigned',
            line_manager: profile.line_manager 
              ? `${profile.line_manager.first_name} ${profile.line_manager.last_name}` 
              : 'Not assigned',
            questions_assigned: 0,
            appraisal_status: assignment.appraisals?.[0]?.status || 'not_started',
            assigned_date: assignment.assigned_at
          });
        }

        const employee = employeeMap.get(employeeId);
        employee.questions_assigned += 1;
      });

      const assignmentsList = Array.from(employeeMap.values());
      setAssignments(assignmentsList);

      // Calculate stats
      const { data: allEmployees, error: employeesError } = await supabase
        .from('profiles')
        .select('id')
        .eq('is_active', true)
        .neq('role', 'admin')
        .neq('role', 'hr');

      if (employeesError) throw employeesError;

      const { data: totalQuestions, error: questionsError } = await supabase
        .from('employee_appraisal_questions')
        .select('id')
        .eq('is_active', true);

      if (questionsError) throw questionsError;

      const { data: completedAppraisals, error: completedError } = await supabase
        .from('appraisals')
        .select('id')
        .eq('status', 'completed');

      if (completedError) throw completedError;

      setStats({
        totalEmployees: allEmployees?.length || 0,
        employeesWithQuestions: employeeMap.size,
        totalQuestionsAssigned: totalQuestions?.length || 0,
        completedAppraisals: completedAppraisals?.length || 0
      });

    } catch (error) {
      console.error('Error fetching assignment data:', error);
      toast({
        title: "Error",
        description: "Failed to load assignment tracking data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignmentData();
  }, []);

  return {
    stats,
    assignments,
    loading,
    refetch: fetchAssignmentData
  };
}
