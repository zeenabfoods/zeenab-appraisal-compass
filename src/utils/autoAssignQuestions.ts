
import { supabase } from '@/integrations/supabase/client';

export async function autoAssignQuestionsToEmployee(employeeId: string, cycleId: string) {
  try {
    console.log('Auto-assigning questions for employee:', employeeId, 'cycle:', cycleId);

    // Check if employee already has questions assigned for this cycle
    const { data: existingAssignments } = await supabase
      .from('employee_appraisal_questions')
      .select('id')
      .eq('employee_id', employeeId)
      .eq('cycle_id', cycleId)
      .eq('is_active', true);

    if (existingAssignments && existingAssignments.length > 0) {
      console.log('Employee already has questions assigned');
      return { success: true, message: 'Questions already assigned' };
    }

    // Get all active questions that should be assigned to this employee
    const { data: questions, error: questionsError } = await supabase
      .from('appraisal_questions')
      .select('id, applies_to_roles, applies_to_departments')
      .eq('is_active', true);

    if (questionsError) {
      console.error('Error fetching questions:', questionsError);
      throw questionsError;
    }

    if (!questions || questions.length === 0) {
      console.log('No questions available to assign');
      return { success: false, message: 'No questions available' };
    }

    // Get employee details
    const { data: employee, error: employeeError } = await supabase
      .from('profiles')
      .select('role, department_id')
      .eq('id', employeeId)
      .single();

    if (employeeError) {
      console.error('Error fetching employee:', employeeError);
      throw employeeError;
    }

    // Filter questions that apply to this employee
    const applicableQuestions = questions.filter(question => {
      // If no specific roles/departments are set, the question applies to everyone
      const hasRoleRestrictions = question.applies_to_roles && question.applies_to_roles.length > 0;
      const hasDeptRestrictions = question.applies_to_departments && question.applies_to_departments.length > 0;

      if (!hasRoleRestrictions && !hasDeptRestrictions) {
        return true; // Question applies to everyone
      }

      // Check role restrictions
      const roleMatches = !hasRoleRestrictions || question.applies_to_roles.includes(employee.role);
      
      // Check department restrictions
      const deptMatches = !hasDeptRestrictions || 
        (employee.department_id && question.applies_to_departments.includes(employee.department_id));

      return roleMatches && deptMatches;
    });

    if (applicableQuestions.length === 0) {
      console.log('No applicable questions found for this employee');
      return { success: false, message: 'No applicable questions found' };
    }

    // Assign questions to employee
    const assignments = applicableQuestions.map(question => ({
      employee_id: employeeId,
      question_id: question.id,
      cycle_id: cycleId,
      is_active: true,
      assigned_at: new Date().toISOString()
    }));

    const { error: assignError } = await supabase
      .from('employee_appraisal_questions')
      .insert(assignments);

    if (assignError) {
      console.error('Error assigning questions:', assignError);
      throw assignError;
    }

    console.log(`Successfully assigned ${assignments.length} questions to employee`);
    return { 
      success: true, 
      message: `Assigned ${assignments.length} questions`,
      questionsAssigned: assignments.length
    };

  } catch (error) {
    console.error('Error in autoAssignQuestionsToEmployee:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}
