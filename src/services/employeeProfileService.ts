
import { supabase } from '@/integrations/supabase/client';
import { Profile } from '@/hooks/useAuth';

export interface EmployeeUpdateData {
  first_name: string;
  last_name: string;
  email: string;
  role: 'staff' | 'manager' | 'hr' | 'admin';
  position?: string;
  department_id?: string | null;
  line_manager_id?: string | null;
}

export interface ExtendedProfile extends Profile {
  department_name?: string;
  line_manager_name?: string;
}

export class EmployeeProfileService {
  static async updateEmployee(employeeId: string, updateData: EmployeeUpdateData): Promise<ExtendedProfile> {
    console.log('🔄 EmployeeProfileService.updateEmployee called with:', { employeeId, updateData });
    
    // Prepare the data for database update with proper typing
    const dbUpdateData = {
      first_name: updateData.first_name.trim(),
      last_name: updateData.last_name.trim(),
      email: updateData.email.trim(),
      role: updateData.role as 'staff' | 'manager' | 'hr' | 'admin',
      position: updateData.position?.trim() || null,
      department_id: updateData.department_id === 'none' || updateData.department_id === '' ? null : updateData.department_id,
      line_manager_id: updateData.line_manager_id === 'none' || updateData.line_manager_id === '' ? null : updateData.line_manager_id
    };

    console.log('📋 Processed database update data:', dbUpdateData);

    // Perform the database update
    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update(dbUpdateData)
      .eq('id', employeeId)
      .select('*')
      .single();

    if (updateError) {
      console.error('❌ Database update failed:', updateError);
      throw new Error(`Failed to update employee: ${updateError.message}`);
    }

    if (!updatedProfile) {
      throw new Error('Update succeeded but no profile returned');
    }

    console.log('✅ Database update successful:', updatedProfile);

    // Now get the enhanced profile with names resolved
    return await this.getEmployeeProfileWithNames(employeeId);
  }

  static async getEmployeeProfileWithNames(employeeId: string): Promise<ExtendedProfile> {
    console.log('🔍 Getting employee profile with names for:', employeeId);

    // Get the base profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', employeeId)
      .single();

    if (profileError || !profile) {
      console.error('❌ Failed to get profile:', profileError);
      throw new Error('Failed to retrieve employee profile');
    }

    console.log('📋 Base profile retrieved:', profile);

    // Initialize extended profile with proper department handling
    const extendedProfile: ExtendedProfile = {
      ...profile,
      department: null, // Reset to ensure consistent structure
      department_name: undefined,
      line_manager_name: undefined
    };

    // Get department name if department_id exists
    if (profile.department_id) {
      console.log('🏢 Fetching department for ID:', profile.department_id);
      const { data: department, error: deptError } = await supabase
        .from('departments')
        .select('name')
        .eq('id', profile.department_id)
        .eq('is_active', true)
        .single();

      if (!deptError && department) {
        extendedProfile.department_name = department.name;
        extendedProfile.department = { name: department.name };
        console.log('✅ Department name resolved:', department.name);
      } else {
        console.log('⚠️ Department not found or inactive:', deptError);
      }
    }

    // Get line manager name if line_manager_id exists
    if (profile.line_manager_id) {
      console.log('👤 Fetching manager for ID:', profile.line_manager_id);
      const { data: manager, error: managerError } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', profile.line_manager_id)
        .eq('is_active', true)
        .single();

      if (!managerError && manager) {
        extendedProfile.line_manager_name = `${manager.first_name || ''} ${manager.last_name || ''}`.trim();
        console.log('✅ Manager name resolved:', extendedProfile.line_manager_name);
      } else {
        console.log('⚠️ Manager not found or inactive:', managerError);
      }
    }

    console.log('✅ Complete extended profile:', extendedProfile);
    return extendedProfile;
  }

  static async getAllEmployeesWithNames(): Promise<ExtendedProfile[]> {
    console.log('🔄 Getting all employees with names...');

    // Get all employees
    const { data: employees, error: employeesError } = await supabase
      .from('profiles')
      .select('*')
      .order('first_name');

    if (employeesError) {
      console.error('❌ Error loading employees:', employeesError);
      throw employeesError;
    }

    if (!employees) {
      return [];
    }

    // Get all departments for name resolution
    const { data: departments } = await supabase
      .from('departments')
      .select('id, name')
      .eq('is_active', true);

    // Process each employee to add names
    const processedEmployees = employees.map(employee => {
      const extendedEmployee: ExtendedProfile = {
        ...employee,
        department: null, // Reset to ensure consistent structure
        department_name: undefined,
        line_manager_name: undefined
      };

      // Resolve department name
      if (employee.department_id && departments) {
        const department = departments.find(d => d.id === employee.department_id);
        if (department) {
          extendedEmployee.department_name = department.name;
          extendedEmployee.department = { name: department.name };
        }
      }

      // Resolve manager name
      if (employee.line_manager_id) {
        const manager = employees.find(emp => emp.id === employee.line_manager_id);
        if (manager) {
          extendedEmployee.line_manager_name = `${manager.first_name || ''} ${manager.last_name || ''}`.trim();
        }
      }

      return extendedEmployee;
    });

    console.log('✅ All employees processed:', processedEmployees.length);
    return processedEmployees;
  }
}
