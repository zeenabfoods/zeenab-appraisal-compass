
import { supabase } from '@/integrations/supabase/client';

export async function updateEmployeeAssignments() {
  try {
    console.log('Starting employee assignment update...');
    
    // First, let's get the HR department ID and HR manager ID
    const { data: hrDept, error: deptError } = await supabase
      .from('departments')
      .select('id, name')
      .ilike('name', '%human%resource%')
      .single();

    let hrDepartmentId: string;

    if (deptError || !hrDept) {
      console.error('HR department not found:', deptError);
      // If HR department doesn't exist, create it
      const { data: newDept, error: createDeptError } = await supabase
        .from('departments')
        .insert([{
          name: 'Human Resources',
          description: 'Human Resources Department',
          is_active: true
        }])
        .select()
        .single();

      if (createDeptError) {
        console.error('Error creating HR department:', createDeptError);
        return { success: false, error: createDeptError };
      }
      
      console.log('Created HR department:', newDept);
      hrDepartmentId = newDept.id;
    } else {
      hrDepartmentId = hrDept.id;
    }

    // Get the HR manager (Human Resource user)
    const { data: hrManager, error: managerError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, role')
      .eq('role', 'hr')
      .eq('first_name', 'Human')
      .eq('last_name', 'Resource')
      .single();

    if (managerError || !hrManager) {
      console.error('HR manager not found:', managerError);
      return { success: false, error: 'HR manager not found' };
    }

    console.log('Found HR manager:', hrManager);

    // Now update Ebenezer Ise's profile
    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update({
        department_id: hrDepartmentId,
        line_manager_id: hrManager.id
      })
      .eq('id', '14085962-62dd-4d01-a9ed-d4dc43cfc7e5')
      .select();

    if (updateError) {
      console.error('Error updating employee profile:', updateError);
      return { success: false, error: updateError };
    }

    console.log('Successfully updated employee profile:', updatedProfile);
    return { success: true, data: updatedProfile };

  } catch (error) {
    console.error('Unexpected error in updateEmployeeAssignments:', error);
    return { success: false, error };
  }
}
