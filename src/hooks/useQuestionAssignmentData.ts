
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
      console.log('🔄 Starting assignment data fetch...');

      // Get all employee assignments
      const { data: employeeAssignments, error: assignmentError } = await supabase
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
            line_manager_id,
            departments(name),
            line_manager:profiles!profiles_line_manager_id_fkey(first_name, last_name)
          )
        `)
        .eq('is_active', true);

      if (assignmentError) {
        console.error('❌ Assignment error:', assignmentError);
        throw assignmentError;
      }

      console.log('📋 Raw employee assignments:', employeeAssignments);

      if (!employeeAssignments || employeeAssignments.length === 0) {
        console.log('ℹ️ No assignments found');
        setAssignments([]);
        
        // Get total employees count
        const { data: allEmployees } = await supabase
          .from('profiles')
          .select('id')
          .eq('is_active', true);

        setStats({
          totalEmployees: allEmployees?.length || 0,
          employeesWithQuestions: 0,
          totalQuestionsAssigned: 0,
          completedAppraisals: 0
        });
        return;
      }

      // Process assignments by employee
      const employeeMap = new Map();
      
      employeeAssignments.forEach((assignment: any) => {
        const profile = assignment.profiles;
        if (!profile) return;

        const employeeId = profile.id;
        
        if (!employeeMap.has(employeeId)) {
          const departmentName = profile.departments?.name || 'Not assigned';
          const managerName = profile.line_manager 
            ? `${profile.line_manager.first_name || ''} ${profile.line_manager.last_name || ''}`.trim()
            : 'Not assigned';
          
          console.log(`👤 Processing ${profile.first_name} ${profile.last_name}:`, {
            'department': departmentName,
            'manager': managerName,
            'department_id': profile.department_id,
            'line_manager_id': profile.line_manager_id
          });
          
          employeeMap.set(employeeId, {
            employee_id: employeeId,
            employee_name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim(),
            email: profile.email || 'No email',
            department: departmentName,
            line_manager: managerName,
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

      // Calculate stats
      const { data: allEmployees } = await supabase
        .from('profiles')
        .select('id')
        .eq('is_active', true);

      const { data: totalQuestions } = await supabase
        .from('employee_appraisal_questions')
        .select('id')
        .eq('is_active', true);

      const { data: completedAppraisals } = await supabase
        .from('appraisals')
        .select('id')
        .eq('status', 'completed');

      setStats({
        totalEmployees: allEmployees?.length || 0,
        employeesWithQuestions: employeeMap.size,
        totalQuestionsAssigned: totalQuestions?.length || 0,
        completedAppraisals: completedAppraisals?.length || 0
      });

    } catch (error) {
      console.error('❌ Error fetching assignment data:', error);
      toast({
        title: "Error",
        description: "Failed to load assignment tracking data. Please check console for details.",
        variant: "destructive"
      });
      
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
