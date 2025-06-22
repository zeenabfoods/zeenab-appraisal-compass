
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
      
      console.log('🔧 Starting comprehensive employee profile fix...');
      
      // First, let's check what employees we have without proper departments/managers
      const { data: allEmployees, error: employeesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, department_id, line_manager_id, is_active')
        .eq('is_active', true);

      if (employeesError) {
        console.error('❌ Error checking employees:', employeesError);
        throw employeesError;
      }

      console.log('👥 All active employees:', allEmployees);

      // Find employees without departments or managers
      const employeesNeedingFix = allEmployees?.filter(emp => 
        !emp.department_id || !emp.line_manager_id
      ) || [];

      console.log('🔧 Employees needing fix:', employeesNeedingFix);

      if (employeesNeedingFix.length === 0) {
        console.log('✅ All employees already have departments and managers');
        setStatus('success');
        toast({
          title: "Success",
          description: "All employees already have proper department and manager assignments!",
        });
        if (onFixCompleted) onFixCompleted();
        return;
      }

      setStatus('fixing');

      // Get or create HR department
      const hrDept = await getOrCreateHRDepartment();
      console.log('🏢 HR Department:', hrDept);
      
      // Get or create HR manager
      const hrManager = await getOrCreateHRManager(hrDept.id);
      console.log('👔 HR Manager:', hrManager);
      
      // Update all employees that need fixing
      const updatePromises = employeesNeedingFix.map(async (employee) => {
        const updates: any = {};
        
        if (!employee.department_id) {
          updates.department_id = hrDept.id;
        }
        
        if (!employee.line_manager_id) {
          updates.line_manager_id = hrManager.id;
        }

        if (Object.keys(updates).length > 0) {
          console.log(`🔄 Updating employee ${employee.first_name} ${employee.last_name} with:`, updates);
          
          const { error: updateError } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', employee.id);

          if (updateError) {
            console.error(`❌ Error updating employee ${employee.id}:`, updateError);
            throw updateError;
          }
        }
      });

      await Promise.all(updatePromises);

      console.log('✅ Successfully updated all employee profiles');
      
      setStatus('success');
      toast({
        title: "Success",
        description: `Successfully updated ${employeesNeedingFix.length} employee profile(s) with department and manager assignments!`,
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
        description: `Failed to fix employee profiles: ${error.message}`,
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

  const getOrCreateHRManager = async (deptId: string) => {
    // First try to find existing HR manager
    let { data: hrManagerArray, error: managerError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, role, email')
      .eq('role', 'hr')
      .eq('is_active', true)
      .limit(1);

    if (managerError) {
      console.error('❌ Error finding HR manager:', managerError);
      throw managerError;
    }

    let hrManager = hrManagerArray?.[0];

    if (!hrManager) {
      console.log('👔 Creating HR manager profile...');
      // Create a new HR manager profile with a proper UUID
      const hrManagerId = crypto.randomUUID();
      
      const { data: newManager, error: createManagerError } = await supabase
        .from('profiles')
        .insert([{
          id: hrManagerId,
          email: 'hr.manager@company.com',
          first_name: 'HR',
          last_name: 'Manager',
          role: 'hr',
          department_id: deptId,
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
      
      // Make sure the HR manager has the correct department
      if (hrManager.department_id !== deptId) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ department_id: deptId })
          .eq('id', hrManager.id);
          
        if (updateError) {
          console.error('❌ Error updating HR manager department:', updateError);
        } else {
          console.log('✅ Updated HR manager department');
        }
      }
    }

    return hrManager;
  };

  return {
    fixing,
    status,
    fixEmployeeProfile
  };
}
