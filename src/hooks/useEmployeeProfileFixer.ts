
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
      
      // Get HR manager
      const hrManager = await getHRManager();
      
      if (!hrManager) {
        toast({
          title: "Error",
          description: "HR manager (Human Resource) not found. Please ensure this user exists.",
          variant: "destructive"
        });
        setStatus('error');
        return;
      }

      console.log('👔 HR manager found:', hrManager);
      setStatus('fixing');

      // Update employee profile
      await updateEmployeeProfile(hrDept.id, hrManager.id);
      
      // Verify update
      await verifyProfileUpdate();
      
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
        }, 2000);
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
    let { data: hrDeptArray, error: deptError } = await supabase
      .from('departments')
      .select('id, name')
      .ilike('name', '%human%resource%')
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

  const getHRManager = async () => {
    const { data: hrManagerArray, error: managerError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, role')
      .eq('role', 'hr')
      .eq('first_name', 'Human')
      .eq('last_name', 'Resource')
      .limit(1);

    if (managerError) {
      console.error('❌ Error finding HR manager:', managerError);
      throw managerError;
    }

    return hrManagerArray?.[0];
  };

  const updateEmployeeProfile = async (departmentId: string, managerId: string) => {
    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update({
        department_id: departmentId,
        line_manager_id: managerId
      })
      .eq('id', '14085962-62dd-4d01-a9ed-d4dc43cfc7e5')
      .select('id, first_name, last_name, department_id, line_manager_id')
      .single();

    if (updateError) {
      console.error('❌ Error updating employee profile:', updateError);
      throw updateError;
    }

    console.log('✅ Successfully updated employee profile:', updatedProfile);
    return updatedProfile;
  };

  const verifyProfileUpdate = async () => {
    const { data: verificationProfile, error: verifyError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, department_id, line_manager_id')
      .eq('id', '14085962-62dd-4d01-a9ed-d4dc43cfc7e5')
      .single();

    if (verifyError) {
      console.error('❌ Error verifying profile update:', verifyError);
    } else {
      console.log('🔍 Verification - Updated profile:', verificationProfile);
    }
  };

  return {
    fixing,
    status,
    fixEmployeeProfile
  };
}
