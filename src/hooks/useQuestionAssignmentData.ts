
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
      console.log('🔄 Starting comprehensive assignment data fetch...');

      // Get all employees with their department and manager info
      const { data: allEmployees, error: employeesError } = await supabase
        .from('profiles')
        .select(`
          id, 
          first_name, 
          last_name, 
          email, 
          department_id, 
          line_manager_id, 
          is_active,
          departments!profiles_department_id_fkey(name),
          manager:profiles!profiles_line_manager_id_fkey(first_name, last_name)
        `)
        .eq('is_active', true);

      if (employeesError) {
        console.error('❌ Error fetching employees:', employeesError);
        throw new Error(`Failed to fetch employees: ${employeesError.message}`);
      }

      console.log(`👥 Found ${allEmployees?.length || 0} active employees with details:`, allEmployees);

      // Get question assignments
      const { data: allAssignments, error: assignmentsError } = await supabase
        .from('employee_appraisal_questions')
        .select('employee_id, question_id, cycle_id, assigned_at, is_active');

      if (assignmentsError) {
        console.error('❌ Error fetching assignments:', assignmentsError);
      } else {
        console.log(`📝 Found ${allAssignments?.length || 0} question assignments:`, allAssignments);
      }

      // Get appraisals
      const { data: appraisals, error: appraisalsError } = await supabase
        .from('appraisals')
        .select('id, employee_id, status');

      if (appraisalsError) {
        console.error('❌ Error fetching appraisals:', appraisalsError);
      } else {
        console.log(`📋 Found ${appraisals?.length || 0} appraisals:`, appraisals);
      }

      // Build assignments manually with proper department and manager info
      const assignmentMap = new Map();
      allAssignments?.forEach(assignment => {
        const employeeId = assignment.employee_id;
        if (!assignmentMap.has(employeeId)) {
          assignmentMap.set(employeeId, []);
        }
        assignmentMap.get(employeeId).push(assignment);
      });

      // Create final assignment list with updated employee info
      const manualAssignments = allEmployees
        ?.filter(emp => assignmentMap.has(emp.id))
        .map(emp => {
          const empAssignments = assignmentMap.get(emp.id) || [];
          
          // Get department name
          const departmentName = emp.departments?.name || 'No Department';
          
          // Get manager name
          const managerName = emp.manager 
            ? `${emp.manager.first_name} ${emp.manager.last_name}`.trim()
            : 'No Manager';
          
          return {
            employee_id: emp.id,
            employee_name: `${emp.first_name || ''} ${emp.last_name || ''}`.trim(),
            email: emp.email || 'No email',
            department: departmentName,
            line_manager: managerName,
            questions_assigned: empAssignments.filter(a => a.is_active).length,
            appraisal_status: 'not_started',
            assigned_date: empAssignments[0]?.assigned_at || new Date().toISOString()
          };
        }) || [];

      console.log('🔧 Manual assignments built with proper department/manager info:', manualAssignments);
      setAssignments(manualAssignments);

      // Update stats
      setStats({
        totalEmployees: allEmployees?.length || 0,
        employeesWithQuestions: manualAssignments.length,
        totalQuestionsAssigned: allAssignments?.filter(a => a.is_active).length || 0,
        completedAppraisals: appraisals?.filter(a => a.status === 'completed').length || 0
      });

    } catch (error) {
      console.error('❌ Critical error in fetchAssignmentData:', error);
      toast({
        title: "Error",
        description: `Failed to load assignment data: ${error.message}. Check console for details.`,
        variant: "destructive"
      });
      
      // Set empty state
      setAssignments([]);
      setStats({
        totalEmployees: 0,
        employeesWithQuestions: 0,
        totalQuestionsAssigned: 0,
        completedAppraisals: 0
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
