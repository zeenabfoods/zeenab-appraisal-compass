
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

      // Get employee assignments with a simpler approach
      const { data: employeeAssignments, error: assignmentError } = await supabase
        .from('employee_appraisal_questions')
        .select(`
          employee_id,
          assigned_at
        `)
        .eq('is_active', true);

      if (assignmentError) {
        console.error('Assignment error:', assignmentError);
        throw assignmentError;
      }

      // Get employee details separately
      const employeeIds = [...new Set(employeeAssignments?.map(a => a.employee_id) || [])];
      
      let employeeProfiles = [];
      if (employeeIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select(`
            id,
            first_name,
            last_name,
            email,
            department_id,
            line_manager_id
          `)
          .in('id', employeeIds);

        if (profilesError) {
          console.error('Profiles error:', profilesError);
        } else {
          employeeProfiles = profiles || [];
        }
      }

      // Get department names
      const departmentIds = [...new Set(employeeProfiles.map(p => p.department_id).filter(Boolean))];
      let departments = [];
      if (departmentIds.length > 0) {
        const { data: deptData, error: deptError } = await supabase
          .from('departments')
          .select('id, name')
          .in('id', departmentIds);

        if (!deptError) {
          departments = deptData || [];
        }
      }

      // Get line manager names
      const managerIds = [...new Set(employeeProfiles.map(p => p.line_manager_id).filter(Boolean))];
      let managers = [];
      if (managerIds.length > 0) {
        const { data: managerData, error: managerError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .in('id', managerIds);

        if (!managerError) {
          managers = managerData || [];
        }
      }

      // Get appraisal status separately
      const { data: appraisals, error: appraisalError } = await supabase
        .from('appraisals')
        .select('employee_id, status');

      if (appraisalError) {
        console.error('Appraisal error:', appraisalError);
      }

      // Process the data to get assignments
      const employeeMap = new Map();
      
      (employeeAssignments || []).forEach((assignment: any) => {
        const employeeId = assignment.employee_id;
        const profile = employeeProfiles.find(p => p.id === employeeId);
        
        if (!profile) return;

        if (!employeeMap.has(employeeId)) {
          const department = departments.find(d => d.id === profile.department_id);
          const lineManager = managers.find(m => m.id === profile.line_manager_id);
          const employeeAppraisal = appraisals?.find(a => a.employee_id === employeeId);
          
          employeeMap.set(employeeId, {
            employee_id: employeeId,
            employee_name: `${profile.first_name} ${profile.last_name}`,
            email: profile.email,
            department: department?.name || 'Not assigned',
            line_manager: lineManager 
              ? `${lineManager.first_name} ${lineManager.last_name}` 
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
