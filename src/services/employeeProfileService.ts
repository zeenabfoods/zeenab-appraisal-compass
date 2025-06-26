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
    
    // FIRST: Verify the employee exists before attempting any update
    console.log('🔍 Verifying employee exists:', employeeId);
    const { data: existingEmployee, error: employeeCheckError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email')
      .eq('id', employeeId)
      .maybeSingle();

    if (employeeCheckError) {
      console.error('❌ Error checking employee existence:', employeeCheckError);
      throw new Error(`Failed to verify employee: ${employeeCheckError.message}`);
    }

    if (!existingEmployee) {
      console.error('❌ Employee not found with ID:', employeeId);
      throw new Error(`Employee with ID ${employeeId} not found in the database`);
    }

    console.log('✅ Employee exists:', `${existingEmployee.first_name} ${existingEmployee.last_name}`);

    // Prepare the data for database update with better null handling
    const processedDepartmentId = (!updateData.department_id || updateData.department_id === 'none' || updateData.department_id === '') 
      ? null 
      : updateData.department_id;
    
    const processedLineManagerId = (!updateData.line_manager_id || updateData.line_manager_id === 'none' || updateData.line_manager_id === '') 
      ? null 
      : updateData.line_manager_id;

    console.log('🔍 Processed IDs:', { 
      processedDepartmentId, 
      processedLineManagerId 
    });

    // VALIDATION: Check if department exists if department_id is provided
    if (processedDepartmentId) {
      console.log('🔍 Validating department ID:', processedDepartmentId);
      const { data: department, error: deptCheckError } = await supabase
        .from('departments')
        .select('id, name, is_active')
        .eq('id', processedDepartmentId)
        .maybeSingle();

      if (deptCheckError) {
        console.error('❌ Department validation error:', deptCheckError);
        throw new Error(`Department validation failed: ${deptCheckError.message}`);
      }

      if (!department) {
        console.error('❌ Department not found:', processedDepartmentId);
        throw new Error(`Invalid department ID: ${processedDepartmentId}. Department does not exist.`);
      }

      if (!department.is_active) {
        console.error('❌ Department is inactive:', department);
        throw new Error(`Department "${department.name}" is not active and cannot be assigned.`);
      }

      console.log('✅ Department validation passed:', department.name);
    }

    // VALIDATION: Check if line manager exists if line_manager_id is provided
    if (processedLineManagerId) {
      console.log('🔍 Validating line manager ID:', processedLineManagerId);
      const { data: manager, error: managerCheckError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, is_active, role')
        .eq('id', processedLineManagerId)
        .maybeSingle();

      if (managerCheckError) {
        console.error('❌ Line manager validation error:', managerCheckError);
        throw new Error(`Manager validation failed: ${managerCheckError.message}`);
      }

      if (!manager) {
        console.error('❌ Line manager not found:', processedLineManagerId);
        throw new Error(`Invalid line manager ID: ${processedLineManagerId}. Manager does not exist.`);
      }

      if (!manager.is_active) {
        console.error('❌ Line manager is inactive:', manager);
        throw new Error(`Manager "${manager.first_name} ${manager.last_name}" is not active and cannot be assigned.`);
      }

      // Check if manager has appropriate role
      if (!['manager', 'hr', 'admin'].includes(manager.role)) {
        console.error('❌ Invalid manager role:', manager);
        throw new Error(`User "${manager.first_name} ${manager.last_name}" does not have manager privileges.`);
      }

      console.log('✅ Line manager validation passed:', `${manager.first_name} ${manager.last_name}`);
    }

    const dbUpdateData = {
      first_name: updateData.first_name.trim(),
      last_name: updateData.last_name.trim(),
      email: updateData.email.trim(),
      role: updateData.role as 'staff' | 'manager' | 'hr' | 'admin',
      position: updateData.position?.trim() || null,
      department_id: processedDepartmentId,
      line_manager_id: processedLineManagerId
    };

    console.log('📋 Final database update data:', dbUpdateData);
    console.log('📋 Updating employee ID:', employeeId);

    // Perform the database update with improved error handling
    const { data: updateResult, error: updateError, count } = await supabase
      .from('profiles')
      .update(dbUpdateData)
      .eq('id', employeeId)
      .select('*');

    console.log('📊 Update operation result:', { updateResult, updateError, count });

    if (updateError) {
      console.error('❌ Database update failed:', updateError);
      console.error('❌ Update error details:', {
        message: updateError.message,
        details: updateError.details,
        hint: updateError.hint,
        code: updateError.code
      });
      throw new Error(`Failed to update employee: ${updateError.message}`);
    }

    if (!updateResult || updateResult.length === 0) {
      console.error('❌ Update returned no data - employee may not exist or no changes were made');
      console.error('❌ Expected employee ID:', employeeId);
      
      // Double-check if employee still exists
      const { data: doubleCheck } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', employeeId)
        .maybeSingle();
      
      if (!doubleCheck) {
        throw new Error(`Employee with ID ${employeeId} was not found during update. The employee may have been deleted.`);
      }
      
      throw new Error('Update operation completed but returned no data. No changes may have been made.');
    }

    if (updateResult.length > 1) {
      console.error('❌ Update affected multiple rows:', updateResult.length);
      throw new Error(`Update operation affected ${updateResult.length} rows instead of 1. This indicates a data integrity issue.`);
    }

    const updatedProfile = updateResult[0];
    console.log('✅ Database update successful:', updatedProfile);

    // Verify the update was applied correctly
    if (processedDepartmentId && updatedProfile.department_id !== processedDepartmentId) {
      console.error('❌ Department ID mismatch after update:', {
        expected: processedDepartmentId,
        actual: updatedProfile.department_id
      });
      throw new Error('Department assignment failed - database update did not persist');
    }

    if (processedLineManagerId && updatedProfile.line_manager_id !== processedLineManagerId) {
      console.error('❌ Line manager ID mismatch after update:', {
        expected: processedLineManagerId,
        actual: updatedProfile.line_manager_id
      });
      throw new Error('Line manager assignment failed - database update did not persist');
    }

    // Now get the enhanced profile with names resolved
    const enhancedProfile = await this.getEmployeeProfileWithNames(employeeId);
    
    console.log('🔍 Final enhanced profile:', enhancedProfile);
    
    return enhancedProfile;
  }

  static async getEmployeeProfileWithNames(employeeId: string): Promise<ExtendedProfile> {
    console.log('🔍 Getting employee profile with names for:', employeeId);

    // Get the base profile with a fresh query
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', employeeId)
      .maybeSingle();

    if (profileError) {
      console.error('❌ Failed to get profile:', profileError);
      throw new Error(`Failed to retrieve employee profile: ${profileError.message}`);
    }

    if (!profile) {
      console.error('❌ Profile not found for ID:', employeeId);
      throw new Error(`Employee profile not found for ID: ${employeeId}`);
    }

    console.log('📋 Base profile retrieved:', profile);

    // Initialize extended profile with proper department handling
    const extendedProfile: ExtendedProfile = {
      ...profile,
      department: null, // Reset to ensure consistent structure
      department_name: undefined,
      line_manager_name: undefined
    };

    // Get department name if department_id exists and is not null
    if (profile.department_id && profile.department_id !== 'none') {
      console.log('🏢 Fetching department for ID:', profile.department_id);
      const { data: department, error: deptError } = await supabase
        .from('departments')
        .select('name')
        .eq('id', profile.department_id)
        .eq('is_active', true)
        .maybeSingle();

      if (!deptError && department) {
        extendedProfile.department_name = department.name;
        extendedProfile.department = { name: department.name };
        console.log('✅ Department name resolved:', department.name);
      } else {
        console.log('⚠️ Department not found or inactive:', deptError);
        // If department_id exists but we can't find the department, it might be inactive
        extendedProfile.department_name = 'Department Not Found';
      }
    } else {
      console.log('📝 No department_id found or it is null/none');
    }

    // Get line manager name if line_manager_id exists and is not null
    if (profile.line_manager_id && profile.line_manager_id !== 'none') {
      console.log('👤 Fetching manager for ID:', profile.line_manager_id);
      const { data: manager, error: managerError } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', profile.line_manager_id)
        .eq('is_active', true)
        .maybeSingle();

      if (!managerError && manager) {
        extendedProfile.line_manager_name = `${manager.first_name || ''} ${manager.last_name || ''}`.trim();
        console.log('✅ Manager name resolved:', extendedProfile.line_manager_name);
      } else {
        console.log('⚠️ Manager not found or inactive:', managerError);
        // If line_manager_id exists but we can't find the manager, it might be inactive
        extendedProfile.line_manager_name = 'Manager Not Found';
      }
    } else {
      console.log('📝 No line_manager_id found or it is null/none');
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
