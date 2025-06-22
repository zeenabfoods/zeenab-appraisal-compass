
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

      // First, let's check what data we actually have
      console.log('📊 Checking basic data availability...');
      
      // Check total employees
      const { data: allEmployees, error: employeesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, department_id, line_manager_id, is_active')
        .eq('is_active', true);

      if (employeesError) {
        console.error('❌ Error checking employees:', employeesError);
        throw new Error(`Failed to fetch employees: ${employeesError.message}`);
      }

      console.log(`👥 Found ${allEmployees?.length || 0} active employees:`, allEmployees);

      // Check departments
      const { data: departments, error: deptError } = await supabase
        .from('departments')
        .select('id, name');

      if (deptError) {
        console.error('❌ Error checking departments:', deptError);
      } else {
        console.log(`🏢 Found ${departments?.length || 0} departments:`, departments);
      }

      // Check employee appraisal questions
      const { data: allAssignments, error: assignmentsError } = await supabase
        .from('employee_appraisal_questions')
        .select('employee_id, question_id, cycle_id, assigned_at, is_active');

      if (assignmentsError) {
        console.error('❌ Error checking assignments:', assignmentsError);
      } else {
        console.log(`📝 Found ${allAssignments?.length || 0} question assignments:`, allAssignments);
      }

      // Check appraisals
      const { data: appraisals, error: appraisalsError } = await supabase
        .from('appraisals')
        .select('id, employee_id, status');

      if (appraisalsError) {
        console.error('❌ Error checking appraisals:', appraisalsError);
      } else {
        console.log(`📋 Found ${appraisals?.length || 0} appraisals:`, appraisals);
      }

      // Now try the complex query with better error handling
      console.log('🔍 Attempting complex assignment query...');
      
      const { data: employeeAssignments, error: complexError } = await supabase
        .from('employee_appraisal_questions')
        .select(`
          employee_id, 
          assigned_at, 
          cycle_id,
          profiles!inner(
            id,
            first_name,
            last_name,
            email,
            department_id,
            line_manager_id
          )
        `)
        .eq('is_active', true);

      if (complexError) {
        console.error('❌ Complex query error:', complexError);
        console.log('🔄 Falling back to simpler approach...');
        
        // Fallback: Build assignments manually
        return await buildAssignmentsManually(allEmployees, allAssignments, departments);
      }

      console.log('✅ Complex query successful:', employeeAssignments);

      if (!employeeAssignments || employeeAssignments.length === 0) {
        console.log('ℹ️ No complex assignments found, trying manual approach...');
        return await buildAssignmentsManually(allEmployees, allAssignments, departments);
      }

      // Process the successful complex query results
      const employeeMap = new Map();
      
      employeeAssignments.forEach((assignment: any) => {
        const profile = assignment.profiles;
        if (!profile) return;

        const employeeId = profile.id;
        
        if (!employeeMap.has(employeeId)) {
          employeeMap.set(employeeId, {
            employee_id: employeeId,
            employee_name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim(),
            email: profile.email || 'No email',
            department: 'Department needed',
            line_manager: 'Manager needed', 
            questions_assigned: 0,
            appraisal_status: 'not_started',
            assigned_date: assignment.assigned_at || new Date().toISOString()
          });
        }

        const employee = employeeMap.get(employeeId);
        employee.questions_assigned += 1;
      });

      const assignmentsList = Array.from(employeeMap.values());
      console.log('✅ Final processed assignments:', assignmentsList);
      setAssignments(assignmentsList);

      // Set stats
      setStats({
        totalEmployees: allEmployees?.length || 0,
        employeesWithQuestions: employeeMap.size,
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

  const buildAssignmentsManually = async (employees: any[], assignments: any[], departments: any[]) => {
    console.log('🔧 Building assignments manually...');
    
    if (!employees || employees.length === 0) {
      console.log('⚠️ No employees found for manual building');
      setAssignments([]);
      setStats({
        totalEmployees: 0,
        employeesWithQuestions: 0,
        totalQuestionsAssigned: 0,
        completedAppraisals: 0
      });
      return;
    }

    // Create a map of department names
    const deptMap = new Map();
    departments?.forEach(dept => {
      deptMap.set(dept.id, dept.name);
    });

    // Create assignment map
    const assignmentMap = new Map();
    assignments?.forEach(assignment => {
      const employeeId = assignment.employee_id;
      if (!assignmentMap.has(employeeId)) {
        assignmentMap.set(employeeId, []);
      }
      assignmentMap.get(employeeId).push(assignment);
    });

    // Build final assignment list
    const manualAssignments = employees
      .filter(emp => assignmentMap.has(emp.id))
      .map(emp => {
        const empAssignments = assignmentMap.get(emp.id) || [];
        const departmentName = emp.department_id ? deptMap.get(emp.department_id) || 'Unknown Department' : 'No Department';
        
        return {
          employee_id: emp.id,
          employee_name: `${emp.first_name || ''} ${emp.last_name || ''}`.trim(),
          email: emp.email || 'No email',
          department: departmentName,
          line_manager: emp.line_manager_id ? 'Manager assigned' : 'No Manager',
          questions_assigned: empAssignments.length,
          appraisal_status: 'not_started',
          assigned_date: empAssignments[0]?.assigned_at || new Date().toISOString()
        };
      });

    console.log('🔧 Manual assignments built:', manualAssignments);
    setAssignments(manualAssignments);

    // Update stats
    setStats({
      totalEmployees: employees.length,
      employeesWithQuestions: manualAssignments.length,
      totalQuestionsAssigned: assignments?.length || 0,
      completedAppraisals: 0 // We'll get this separately if needed
    });
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
