
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
      console.log('Fetching assignment data...');

      // Get employee assignments with better query structure
      const { data: employeeAssignments, error: assignmentError } = await supabase
        .from('employee_appraisal_questions')
        .select(`
          employee_id,
          assigned_at,
          cycle_id,
          profiles!employee_appraisal_questions_employee_id_fkey (
            id,
            first_name,
            last_name,
            email,
            department_id,
            line_manager_id,
            departments (name),
            line_manager:profiles!profiles_line_manager_id_fkey (
              first_name,
              last_name
            )
          )
        `)
        .eq('is_active', true);

      if (assignmentError) {
        console.error('Assignment error:', assignmentError);
        throw assignmentError;
      }

      console.log('Raw assignment data:', employeeAssignments);

      // Get unique employee IDs
      const employeeIds = [...new Set(employeeAssignments?.map(a => a.employee_id) || [])];
      
      if (employeeIds.length === 0) {
        setAssignments([]);
        setStats({
          totalEmployees: 0,
          employeesWithQuestions: 0,
          totalQuestionsAssigned: 0,
          completedAppraisals: 0
        });
        return;
      }

      // Get appraisal status for each employee
      const { data: appraisals, error: appraisalError } = await supabase
        .from('appraisals')
        .select('employee_id, status')
        .in('employee_id', employeeIds);

      if (appraisalError) {
        console.error('Appraisal error:', appraisalError);
      }

      console.log('Appraisals data:', appraisals);

      // Process the data to create assignments
      const employeeMap = new Map();
      
      (employeeAssignments || []).forEach((assignment: any) => {
        const employeeId = assignment.employee_id;
        const profile = assignment.profiles;
        
        if (!profile) {
          console.warn('No profile found for employee:', employeeId);
          return;
        }

        if (!employeeMap.has(employeeId)) {
          const employeeAppraisal = appraisals?.find(a => a.employee_id === employeeId);
          
          employeeMap.set(employeeId, {
            employee_id: employeeId,
            employee_name: `${profile.first_name} ${profile.last_name}`,
            email: profile.email,
            department: profile.departments?.name || 'Not assigned',
            line_manager: profile.line_manager 
              ? `${profile.line_manager.first_name} ${profile.line_manager.last_name}` 
              : 'Not assigned',
            questions_assigned: 0,
            appraisal_status: employeeAppraisal?.status || 'not_started',
            assigned_date: assignment.assigned_at
          });
        }

        const employee = employeeMap.get(employeeId);
        employee.questions_assigned += 1;
      });

      const assignmentsList = Array.from(employeeMap.values());
      console.log('Processed assignments:', assignmentsList);
      setAssignments(assignmentsList);

      // Calculate stats
      try {
        const { data: allEmployees, error: employeesError } = await supabase
          .from('profiles')
          .select('id')
          .eq('is_active', true)
          .neq('role', 'admin')
          .neq('role', 'hr');

        const { data: totalQuestions, error: questionsError } = await supabase
          .from('employee_appraisal_questions')
          .select('id')
          .eq('is_active', true);

        const { data: completedAppraisals, error: completedError } = await supabase
          .from('appraisals')
          .select('id')
          .eq('status', 'completed');

        setStats({
          totalEmployees: allEmployees?.length || 0,
          employeesWithQuestions: employeeMap.size,
          totalQuestionsAssigned: totalQuestions?.length || 0,
          completedAppraisals: completedAppraisals?.length || 0
        });
      } catch (statsError) {
        console.error('Error fetching stats:', statsError);
        setStats({
          totalEmployees: 0,
          employeesWithQuestions: employeeMap.size,
          totalQuestionsAssigned: assignmentsList.reduce((sum, emp) => sum + emp.questions_assigned, 0),
          completedAppraisals: 0
        });
      }

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
