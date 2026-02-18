
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

export interface AppraisalCycle {
  id: string;
  name: string;
  quarter: number;
  year: number;
  status: string;
}

export function useQuestionAssignmentData(selectedCycleId?: string) {
  const { toast } = useToast();
  const [stats, setStats] = useState<AssignmentStats>({
    totalEmployees: 0,
    employeesWithQuestions: 0,
    totalQuestionsAssigned: 0,
    completedAppraisals: 0
  });
  const [assignments, setAssignments] = useState<EmployeeAssignment[]>([]);
  const [cycles, setCycles] = useState<AppraisalCycle[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCycles = async () => {
    const { data, error } = await supabase
      .from('appraisal_cycles')
      .select('id, name, quarter, year, status')
      .order('year', { ascending: false })
      .order('quarter', { ascending: false });

    if (!error && data) {
      setCycles(data);
    }
  };

  const fetchAssignmentData = async () => {
    try {
      setLoading(true);

      // Get all active employees
      const { data: allEmployees, error: employeesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, department_id, line_manager_id, is_active')
        .eq('is_active', true);

      if (employeesError) throw new Error(`Failed to fetch employees: ${employeesError.message}`);

      // Get all departments
      const { data: departments } = await supabase
        .from('departments')
        .select('id, name');

      const departmentMap = new Map<string, string>();
      departments?.forEach(dept => departmentMap.set(dept.id, dept.name));

      // Get manager names
      const managerIds = Array.from(new Set(allEmployees?.map(emp => emp.line_manager_id).filter(Boolean) || []));
      const managerMap = new Map<string, string>();

      if (managerIds.length > 0) {
        const { data: managers } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .in('id', managerIds);

        managers?.forEach(manager => {
          managerMap.set(manager.id, `${manager.first_name || ''} ${manager.last_name || ''}`.trim());
        });
      }

      // Get question assignments, filtered by cycle if selected
      let assignmentsQuery = supabase
        .from('employee_appraisal_questions')
        .select('employee_id, question_id, assigned_at, is_active, cycle_id')
        .eq('is_active', true)
        .is('deleted_at', null);

      if (selectedCycleId) {
        assignmentsQuery = assignmentsQuery.eq('cycle_id', selectedCycleId);
      }

      const { data: allAssignments, error: assignmentsError } = await assignmentsQuery;

      if (assignmentsError) {
        console.error('Error fetching assignments:', assignmentsError);
      }

      // Get appraisals, filtered by cycle if selected
      let appraisalsQuery = supabase
        .from('appraisals')
        .select('id, employee_id, status, created_at, cycle_id');

      if (selectedCycleId) {
        appraisalsQuery = appraisalsQuery.eq('cycle_id', selectedCycleId);
      }

      const { data: appraisals } = await appraisalsQuery;

      // Count assignments per employee
      const assignmentCounts = new Map<string, number>();
      allAssignments?.forEach(assignment => {
        const count = assignmentCounts.get(assignment.employee_id) || 0;
        assignmentCounts.set(assignment.employee_id, count + 1);
      });

      // Get earliest assignment date per employee
      const assignmentDates = new Map<string, string>();
      allAssignments?.forEach(assignment => {
        const employeeId = assignment.employee_id;
        const currentDate = assignmentDates.get(employeeId);
        if (!currentDate || assignment.assigned_at < currentDate) {
          assignmentDates.set(employeeId, assignment.assigned_at);
        }
      });

      // Map appraisals per employee
      const employeeAppraisalMap = new Map<string, any>();
      appraisals?.forEach(appraisal => {
        employeeAppraisalMap.set(appraisal.employee_id, appraisal);
      });

      // Build assignment records
      // Only include employees who ACTUALLY have question assignments (questions_assigned > 0)
      // OR have an appraisal that is past the draft stage (meaning they've been actively engaged)
      const employeeAssignments = allEmployees
        ?.filter(emp => {
          const questionCount = assignmentCounts.get(emp.id) || 0;
          const appraisal = employeeAppraisalMap.get(emp.id);
          const appraisalStatus = appraisal?.status;
          
          // Show if they have questions assigned
          if (questionCount > 0) return true;
          
          // Show if they have an appraisal that's progressed beyond draft
          if (appraisal && appraisalStatus && appraisalStatus !== 'not_started' && appraisalStatus !== 'draft') return true;
          
          return false;
        })
        .map(emp => {
          const departmentName = emp.department_id ? departmentMap.get(emp.department_id) || 'Unknown Department' : 'No Department';
          const managerName = emp.line_manager_id ? managerMap.get(emp.line_manager_id) || 'Unknown Manager' : 'No Manager';
          const employeeAppraisal = employeeAppraisalMap.get(emp.id);
          const appraisalStatus = employeeAppraisal?.status || 'not_started';

          let assignedDate = assignmentDates.get(emp.id);
          if (!assignedDate && employeeAppraisal) assignedDate = employeeAppraisal.created_at;
          if (!assignedDate) assignedDate = new Date().toISOString();

          return {
            employee_id: emp.id,
            employee_name: `${emp.first_name || ''} ${emp.last_name || ''}`.trim(),
            email: emp.email || 'No email',
            department: departmentName,
            line_manager: managerName,
            questions_assigned: assignmentCounts.get(emp.id) || 0,
            appraisal_status: appraisalStatus,
            assigned_date: assignedDate
          };
        }) || [];

      setAssignments(employeeAssignments);

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

    } catch (error: any) {
      console.error('Error in fetchAssignmentData:', error);
      toast({
        title: "Error",
        description: `Failed to load assignment data: ${error.message}`,
        variant: "destructive"
      });
      setAssignments([]);
      setStats({ totalEmployees: 0, employeesWithQuestions: 0, totalQuestionsAssigned: 0, completedAppraisals: 0 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCycles();
  }, []);

  useEffect(() => {
    fetchAssignmentData();
  }, [selectedCycleId]);

  return {
    stats,
    assignments,
    cycles,
    loading,
    refetch: fetchAssignmentData
  };
}
