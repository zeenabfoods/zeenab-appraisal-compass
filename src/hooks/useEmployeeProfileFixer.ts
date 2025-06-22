
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export type FixStatus = 'idle' | 'checking' | 'fixing' | 'success' | 'error';

export function useEmployeeProfileFixer() {
  const { toast } = useToast();
  const [fixing, setFixing] = useState(false);
  const [status, setStatus] = useState<FixStatus>('idle');

  const fixEmployeeProfile = async (onFixCompleted?: () => void) => {
    try {
      setFixing(true);
      setStatus('checking');
      
      console.log('🔧 Starting employee profile fix...');
      
      // Check current profile state
      const { data: currentProfile, error: profileCheckError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, department_id, line_manager_id')
        .eq('id', '14085962-62dd-4d01-a9ed-d4dc43cfc7e5')
        .single();

      if (profileCheckError) {
        console.error('❌ Error checking current profile:', profileCheckError);
        throw profileCheckError;
      }

      console.log('👤 Current profile state:', currentProfile);

      // Get or create HR department
      const hrDept = await getOrCreateHRDepartment();
      console.log('🏢 HR Department:', hrDept);
      
      // Get or create HR manager
      const hrManager = await getOrCreateHRManager();
      console.log('👔 HR Manager:', hrManager);
      
      setStatus('fixing');

      // Update employee profile
      const { data: updatedProfile, error: updateError } = await supabase
        .from('profiles')
        .update({
          department_id: hrDept.id,
          line_manager_id: hrManager.id
        })
        .eq('id', '14085962-62dd-4d01-a9ed-d4dc43cfc7e5')
        .select('id, first_name, last_name, department_id, line_manager_id')
        .single();

      if (updateError) {
        console.error('❌ Error updating employee profile:', updateError);
        throw updateError;
      }

      console.log('✅ Successfully updated employee profile:', updatedProfile);
      
      setStatus('success');
      toast({
        title: "Success",
        description: "Employee profile updated successfully! Department and line manager have been assigned.",
      });

      // Trigger refresh callback
      if (onFixCompleted) {
        setTimeout(() => {
          console.log('🔄 Triggering data refresh after profile fix...');
          onFixCompleted();
        }, 1000);
      }

    } catch (error) {
      console.error('❌ Error in fixEmployeeProfile:', error);
      setStatus('error');
      toast({
        title: "Error",
        description: `Failed to fix employee profile: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setFixing(false);
    }
  };

  const getOrCreateHRDepartment = async () => {
    // First try to find existing HR department
    let { data: hrDeptArray, error: deptError } = await supabase
      .from('departments')
      .select('id, name')
      .or('name.ilike.%human%resource%,name.ilike.%hr%')
      .limit(1);

    if (deptError) {
      console.error('❌ Error checking HR department:', deptError);
      throw deptError;
    }

    let hrDept = hrDeptArray?.[0];

    if (!hrDept) {
      console.log('🏢 Creating HR department...');
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
        console.error('❌ Error creating HR department:', createDeptError);
        throw createDeptError;
      }
      
      hrDept = newDept;
      console.log('✅ Created HR department:', hrDept);
    } else {
      console.log('✅ HR department found:', hrDept);
    }

    return hrDept;
  };

  const getOrCreateHRManager = async () => {
    // First try to find existing HR manager
    let { data: hrManagerArray, error: managerError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, role')
      .eq('role', 'hr')
      .limit(1);

    if (managerError) {
      console.error('❌ Error finding HR manager:', managerError);
      throw managerError;
    }

    let hrManager = hrManagerArray?.[0];

    if (!hrManager) {
      console.log('👔 Creating HR manager profile...');
      // Create a new HR manager profile
      const { data: newManager, error: createManagerError } = await supabase
        .from('profiles')
        .insert([{
          id: '00000000-0000-0000-0000-000000000001', // Use a fixed UUID for HR manager
          email: 'hr.manager@company.com',
          first_name: 'HR',
          last_name: 'Manager',
          role: 'hr',
          is_active: true
        }])
        .select()
        .single();

      if (createManagerError) {
        console.error('❌ Error creating HR manager:', createManagerError);
        throw createManagerError;
      }
      
      hrManager = newManager;
      console.log('✅ Created HR manager:', hrManager);
    } else {
      console.log('✅ HR manager found:', hrManager);
    }

    return hrManager;
  };

  return {
    fixing,
    status,
    fixEmployeeProfile
  };
}
