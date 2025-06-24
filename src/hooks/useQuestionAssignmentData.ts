
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
      console.log('🔄 Starting fixed assignment data fetch...');

      // First, get all active employees with basic info
      const { data: allEmployees, error: employeesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, department_id, line_manager_id, is_active')
        .eq('is_active', true);

      if (employeesError) {
        console.error('❌ Error fetching employees:', employeesError);
        throw new Error(`Failed to fetch employees: ${employeesError.message}`);
      }

      console.log(`👥 Found ${allEmployees?.length || 0} active employees`);

      // Get all departments separately
      const { data: departments, error: deptError } = await supabase
        .from('departments')
        .select('id, name');

      if (deptError) {
        console.error('❌ Error fetching departments:', deptError);
      }

      // Create department lookup map
      const departmentMap = new Map<string, string>();
      departments?.forEach(dept => {
        departmentMap.set(dept.id, dept.name);
      });

      // Create manager lookup map by getting all profiles that could be managers
      const managerIds = Array.from(new Set(allEmployees?.map(emp => emp.line_manager_id).filter(Boolean) || []));
      const managerMap = new Map<string, string>();
      
      if (managerIds.length > 0) {
        const { data: managers, error: managersError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .in('id', managerIds);

        if (managersError) {
          console.error('❌ Error fetching managers:', managersError);
        } else {
          managers?.forEach(manager => {
            managerMap.set(manager.id, `${manager.first_name || ''} ${manager.last_name || ''}`.trim());
          });
        }
      }

      // Get question assignments
      const { data: allAssignments, error: assignmentsError } = await supabase
        .from('employee_appraisal_questions')
        .select('employee_id, question_id, assigned_at, is_active')
        .eq('is_active', true);

      if (assignmentsError) {
        console.error('❌ Error fetching assignments:', assignmentsError);
      } else {
        console.log(`📝 Found ${allAssignments?.length || 0} active question assignments`);
      }

      // Get appraisals for status tracking
      const { data: appraisals, error: appraisalsError } = await supabase
        .from('appraisals')
        .select('id, employee_id, status');

      if (appraisalsError) {
        console.error('❌ Error fetching appraisals:', appraisalsError);
      } else {
        console.log(`📋 Found ${appraisals?.length || 0} appraisals`);
      }

      // Count assignments per employee
      const assignmentCounts = new Map<string, number>();
      allAssignments?.forEach(assignment => {
        const count = assignmentCounts.get(assignment.employee_id) || 0;
        assignmentCounts.set(assignment.employee_id, count + 1);
      });

      // Get the earliest assignment date per employee
      const assignmentDates = new Map<string, string>();
      allAssignments?.forEach(assignment => {
        const employeeId = assignment.employee_id;
        const currentDate = assignmentDates.get(employeeId);
        if (!currentDate || assignment.assigned_at < currentDate) {
          assignmentDates.set(employeeId, assignment.assigned_at);
        }
      });

      // Create assignment records for employees with questions
      const employeeAssignments = allEmployees
        ?.filter(emp => assignmentCounts.has(emp.id))
        .map(emp => {
          // Get department name from lookup map
          const departmentName = emp.department_id ? departmentMap.get(emp.department_id) || 'Unknown Department' : 'No Department';
          
          // Get line manager name from lookup map
          const managerName = emp.line_manager_id ? managerMap.get(emp.line_manager_id) || 'Unknown Manager' : 'No Manager';
          
          // Get appraisal status
          const employeeAppraisal = appraisals?.find(a => a.employee_id === emp.id);
          const appraisalStatus = employeeAppraisal?.status || 'not_started';
          
          console.log(`📋 Processing employee ${emp.first_name} ${emp.last_name}:`, {
            department: departmentName,
            manager: managerName,
            questions: assignmentCounts.get(emp.id),
            status: appraisalStatus
          });
          
          return {
            employee_id: emp.id,
            employee_name: `${emp.first_name || ''} ${emp.last_name || ''}`.trim(),
            email: emp.email || 'No email',
            department: departmentName,
            line_manager: managerName,
            questions_assigned: assignmentCounts.get(emp.id) || 0,
            appraisal_status: appraisalStatus,
            assigned_date: assignmentDates.get(emp.id) || new Date().toISOString()
          };
        }) || [];

      console.log('✅ Final processed assignments:', employeeAssignments);
      setAssignments(employeeAssignments);

      // Update stats
      setStats({
        totalEmployees: allEmployees?.length || 0,
        employeesWithQuestions: employeeAssignments.length,
        totalQuestionsAssigned: allAssignments?.length || 0,
        completedAppraisals: appraisals?.filter(a => a.status === 'completed').length || 0
      });

      console.log('📊 Updated stats:', {
        totalEmployees: allEmployees?.length || 0,
        employeesWithQuestions: employeeAssignments.length,
        totalQuestionsAssigned: allAssignments?.length || 0,
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
