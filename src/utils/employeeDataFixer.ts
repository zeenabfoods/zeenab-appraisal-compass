
import { supabase } from '@/integrations/supabase/client';

export async function updateEmployeeAssignments() {
  // Update Ebenezer Ise's profile with department and line manager
  const { data, error } = await supabase
    .from('profiles')
    .update({
      department_id: '2a3ba0d9-030f-4eb1-a943-f83467431cef', // Human Resources department
      line_manager_id: 'a013689a-917d-42aa-9270-3b83c844bb5d' // Human Resource manager
    })
    .eq('id', '14085962-62dd-4d01-a9ed-d4dc43cfc7e5')
    .select();

  if (error) {
    console.error('Error updating employee assignments:', error);
    return { success: false, error };
  }

  console.log('Employee assignments updated:', data);
  return { success: true, data };
}
