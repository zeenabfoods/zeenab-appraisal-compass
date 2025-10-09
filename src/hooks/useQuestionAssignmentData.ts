
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
      console.log('🔄 Starting enhanced assignment data fetch...');

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

      // Create manager lookup map
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

      // Get the active cycle first
      const { data: activeCycle, error: cycleError } = await supabase
        .from('appraisal_cycles')
        .select('id, name, status')
        .eq('status', 'active')
        .maybeSingle();

      if (cycleError) {
        console.error('❌ Error fetching active cycle:', cycleError);
      } else if (!activeCycle) {
        console.warn('⚠️ No active cycle found');
      } else {
        console.log('🔄 Active cycle:', activeCycle.name);
      }

      // Get question assignments (excluding deleted ones) - filter by active cycle if available
      let assignmentsQuery = supabase
        .from('employee_appraisal_questions')
        .select('employee_id, question_id, assigned_at, is_active, cycle_id')
        .eq('is_active', true)
        .is('deleted_at', null);

      // Filter by active cycle if one exists
      if (activeCycle) {
        assignmentsQuery = assignmentsQuery.eq('cycle_id', activeCycle.id);
      }

      const { data: allAssignments, error: assignmentsError } = await assignmentsQuery;

      if (assignmentsError) {
        console.error('❌ Error fetching assignments:', assignmentsError);
      } else {
        console.log(`📝 Found ${allAssignments?.length || 0} active question assignments for active cycle`);
        
        // Debug: Check for Gideon Luka specifically
        const gideonAssignments = allAssignments?.filter(a => {
          const emp = allEmployees?.find(e => e.id === a.employee_id);
          return emp?.email === 'gluka@zeenabgroup.com';
        });
        console.log(`🔍 Gideon Luka assignments found:`, gideonAssignments?.length || 0);
      }

      // Get appraisals for status tracking
      const { data: appraisals, error: appraisalsError } = await supabase
        .from('appraisals')
        .select('id, employee_id, status, created_at');

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

      // Create a map of employees with appraisals
      const employeeAppraisalMap = new Map<string, any>();
      appraisals?.forEach(appraisal => {
        employeeAppraisalMap.set(appraisal.employee_id, appraisal);
      });

      // Create assignment records for employees with either questions OR appraisals
      const employeeAssignments = allEmployees
        ?.filter(emp => assignmentCounts.has(emp.id) || employeeAppraisalMap.has(emp.id))
        .map(emp => {
          // Get department name from lookup map
          const departmentName = emp.department_id ? departmentMap.get(emp.department_id) || 'Unknown Department' : 'No Department';
          
          // Get line manager name from lookup map
          const managerName = emp.line_manager_id ? managerMap.get(emp.line_manager_id) || 'Unknown Manager' : 'No Manager';
          
          // Get appraisal status
          const employeeAppraisal = employeeAppraisalMap.get(emp.id);
          const appraisalStatus = employeeAppraisal?.status || 'not_started';
          
          // Get assignment date - use appraisal created date if no assignment date
          let assignedDate = assignmentDates.get(emp.id);
          if (!assignedDate && employeeAppraisal) {
            assignedDate = employeeAppraisal.created_at;
          }
          if (!assignedDate) {
            assignedDate = new Date().toISOString();
          }
          
          const questionsCount = assignmentCounts.get(emp.id) || 0;
          
          console.log(`📋 Processing employee ${emp.first_name} ${emp.last_name}:`, {
            department: departmentName,
            manager: managerName,
            questions: questionsCount,
            status: appraisalStatus,
            hasAppraisal: !!employeeAppraisal
          });
          
          return {
            employee_id: emp.id,
            employee_name: `${emp.first_name || ''} ${emp.last_name || ''}`.trim(),
            email: emp.email || 'No email',
            department: departmentName,
            line_manager: managerName,
            questions_assigned: questionsCount,
            appraisal_status: appraisalStatus,
            assigned_date: assignedDate
          };
        }) || [];

      console.log('✅ Final processed assignments:', employeeAssignments);
      setAssignments(employeeAssignments);

      // Update stats - count employees with either questions or appraisals
      const employeesWithActivity = new Set([
        ...Array.from(assignmentCounts.keys()),
        ...Array.from(employeeAppraisalMap.keys())
      ]).size;

      setStats({
        totalEmployees: allEmployees?.length || 0,
        employeesWithQuestions: employeesWithActivity,
        totalQuestionsAssigned: allAssignments?.length || 0,
        completedAppraisals: appraisals?.filter(a => a.status === 'completed').length || 0
      });

      console.log('📊 Updated stats:', {
        totalEmployees: allEmployees?.length || 0,
        employeesWithQuestions: employeesWithActivity,
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
