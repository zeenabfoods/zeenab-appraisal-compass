
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
        .select('employee_id, assigned_at, cycle_id')
        .eq('is_active', true);

      if (assignmentError) {
        console.error('❌ Assignment error:', assignmentError);
        throw assignmentError;
      }

      console.log('📋 Employee assignments found:', employeeAssignments?.length || 0);

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

      // Get unique employee IDs
      const employeeIds = [...new Set(employeeAssignments.map(a => a.employee_id))];
      console.log('👥 Unique employee IDs with assignments:', employeeIds);

      // Fetch employee profiles without complex joins
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, department_id, line_manager_id')
        .in('id', employeeIds);

      if (profilesError) {
        console.error('❌ Profiles error:', profilesError);
        throw profilesError;
      }

      console.log('👤 Profiles fetched:', profiles);

      // Fetch departments separately
      const departmentIds = profiles?.map(p => p.department_id).filter(Boolean) || [];
      const { data: departments } = await supabase
        .from('departments')
        .select('id, name')
        .in('id', departmentIds);

      // Fetch line managers separately
      const managerIds = profiles?.map(p => p.line_manager_id).filter(Boolean) || [];
      const { data: managers } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', managerIds);

      // Fetch appraisals data
      const { data: appraisals, error: appraisalsError } = await supabase
        .from('appraisals')
        .select('employee_id, status')
        .in('employee_id', employeeIds);

      if (appraisalsError) {
        console.error('❌ Appraisals error:', appraisalsError);
      }

      // Process the data to create assignments
      const employeeMap = new Map();
      
      employeeAssignments.forEach((assignment: any) => {
        const employeeId = assignment.employee_id;
        const profile = profiles?.find(p => p.id === employeeId);
        
        if (!profile) {
          console.warn('⚠️ No profile found for employee:', employeeId);
          return;
        }

        if (!employeeMap.has(employeeId)) {
          const employeeAppraisal = appraisals?.find(a => a.employee_id === employeeId);
          
          // Find department and manager info
          const department = departments?.find(d => d.id === profile.department_id);
          const manager = managers?.find(m => m.id === profile.line_manager_id);
          
          const departmentName = department?.name || 'Not assigned';
          const managerName = manager 
            ? `${manager.first_name || ''} ${manager.last_name || ''}`.trim()
            : 'Not assigned';
          
          console.log(`👤 Processing ${profile.first_name} ${profile.last_name}:`, {
            'department_id': profile.department_id,
            'department_name': departmentName,
            'line_manager_id': profile.line_manager_id,
            'manager_name': managerName
          });
          
          employeeMap.set(employeeId, {
            employee_id: employeeId,
            employee_name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim(),
            email: profile.email || 'No email',
            department: departmentName,
            line_manager: managerName,
            questions_assigned: 0,
            appraisal_status: employeeAppraisal?.status || 'not_started',
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
      const { data: allEmployees, error: employeesError } = await supabase
        .from('profiles')
        .select('id')
        .eq('is_active', true);

      if (employeesError) {
        console.error('❌ Error fetching employees:', employeesError);
      }

      const { data: totalQuestions, error: questionsError } = await supabase
        .from('employee_appraisal_questions')
        .select('id')
        .eq('is_active', true);

      if (questionsError) {
        console.error('❌ Error fetching total questions:', questionsError);
      }

      const { data: completedAppraisals, error: completedError } = await supabase
        .from('appraisals')
        .select('id')
        .eq('status', 'completed');

      if (completedError) {
        console.error('❌ Error fetching completed appraisals:', completedError);
      }

      setStats({
        totalEmployees: allEmployees?.length || 0,
        employeesWithQuestions: employeeMap.size,
        totalQuestionsAssigned: totalQuestions?.length || 0,
        completedAppraisals: completedAppraisals?.length || 0
      });

      console.log('📊 Stats updated:', {
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
