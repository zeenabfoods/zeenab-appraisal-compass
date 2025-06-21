
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

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
  questions_assigned: number;
  appraisal_status: string;
  assigned_date: string;
  line_manager: string;
}

export function useQuestionAssignmentData() {
  const [stats, setStats] = useState<AssignmentStats>({
    totalEmployees: 0,
    employeesWithQuestions: 0,
    totalQuestionsAssigned: 0,
    completedAppraisals: 0
  });
  const [assignments, setAssignments] = useState<EmployeeAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAssignmentData();
  }, []);

  const fetchAssignmentData = async () => {
    try {
      setLoading(true);

      // Get assignment statistics
      const { data: employeeCount } = await supabase
        .from('profiles')
        .select('id')
        .eq('is_active', true);

      const { data: assignmentData } = await supabase
        .from('employee_appraisal_questions')
        .select(`
          employee_id,
          question_id,
          assigned_at,
          profiles!employee_appraisal_questions_employee_id_fkey (
            first_name,
            last_name,
            email,
            department,
            line_manager_id,
            line_manager:profiles!profiles_line_manager_id_fkey (
              first_name,
              last_name
            )
          )
        `)
        .eq('is_active', true);

      const { data: appraisalData } = await supabase
        .from('appraisals')
        .select('employee_id, status')
        .neq('status', 'draft');

      // Calculate stats
      const totalEmployees = employeeCount?.length || 0;
      const employeesWithQuestions = new Set(assignmentData?.map(a => a.employee_id)).size;
      const totalQuestionsAssigned = assignmentData?.length || 0;
      const completedAppraisals = appraisalData?.filter(a => a.status === 'completed').length || 0;

      setStats({
        totalEmployees,
        employeesWithQuestions,
        totalQuestionsAssigned,
        completedAppraisals
      });

      // Group assignments by employee
      const employeeAssignments = new Map();
      
      assignmentData?.forEach(assignment => {
        const empId = assignment.employee_id;
        const profile = assignment.profiles;
        
        if (!employeeAssignments.has(empId)) {
          // Handle line_manager which could be an object or null
          const lineManagerData = Array.isArray(profile.line_manager) 
            ? profile.line_manager[0] 
            : profile.line_manager;
          
          employeeAssignments.set(empId, {
            employee_id: empId,
            employee_name: `${profile.first_name} ${profile.last_name}`,
            email: profile.email,
            department: profile.department || 'N/A',
            questions_assigned: 0,
            appraisal_status: 'draft',
            assigned_date: assignment.assigned_at,
            line_manager: lineManagerData 
              ? `${lineManagerData.first_name} ${lineManagerData.last_name}`
              : 'N/A'
          });
        }
        
        employeeAssignments.get(empId).questions_assigned++;
      });

      // Add appraisal status
      appraisalData?.forEach(appraisal => {
        if (employeeAssignments.has(appraisal.employee_id)) {
          employeeAssignments.get(appraisal.employee_id).appraisal_status = appraisal.status;
        }
      });

      setAssignments(Array.from(employeeAssignments.values()));
    } catch (error) {
      console.error('Error fetching assignment data:', error);
    } finally {
      setLoading(false);
    }
  };

  return {
    stats,
    assignments,
    loading,
    refetch: fetchAssignmentData
  };
}
