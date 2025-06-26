
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

export interface UpdateResult {
  success: boolean;
  data?: ExtendedProfile;
  error?: string;
  changesDetected: boolean;
  originalData?: any;
  finalData?: any;
}

export class EmployeeProfileService {
  static async updateEmployee(employeeId: string, updateData: EmployeeUpdateData): Promise<ExtendedProfile> {
    console.log('🔄 EmployeeProfileService.updateEmployee called with:', { employeeId, updateData });
    
    try {
      // Get original employee data for comparison
      const originalResult = await this.getEmployeeWithCurrentState(employeeId);
      console.log('📊 Original employee state:', originalResult);

      // Process and validate the update data
      const processedData = await this.processUpdateData(updateData);
      console.log('📋 Processed update data:', processedData);

      // Perform the update with transaction logging
      const updateResult = await this.performDatabaseUpdate(employeeId, processedData);
      console.log('✅ Database update result:', updateResult);

      // Verify changes were applied
      const verificationResult = await this.verifyUpdateChanges(employeeId, originalResult, processedData);
      console.log('🔍 Change verification result:', verificationResult);

      if (!verificationResult.success) {
        throw new Error(`Update verification failed: ${verificationResult.error}`);
      }

      return verificationResult.data!;
      
    } catch (error) {
      console.error('❌ Complete error in updateEmployee:', error);
      throw error;
    }
  }

  private static async getEmployeeWithCurrentState(employeeId: string) {
    console.log('🔍 Getting current employee state for:', employeeId);
    
    const { data: employee, error } = await supabase
      .from('profiles')
      .select(`
        *,
        departments!profiles_department_id_fkey(id, name),
        line_manager:profiles!profiles_line_manager_id_fkey(id, first_name, last_name)
      `)
      .eq('id', employeeId)
      .maybeSingle();

    if (error) {
      console.error('❌ Error getting current employee state:', error);
      throw new Error(`Failed to get current employee: ${error.message}`);
    }

    if (!employee) {
      throw new Error(`Employee with ID ${employeeId} not found`);
    }

    console.log('✅ Current employee state retrieved:', employee);
    return employee;
  }

  private static async processUpdateData(updateData: EmployeeUpdateData) {
    console.log('🔄 Processing update data:', updateData);

    // Handle department ID resolution
    let processedDepartmentId = updateData.department_id;
    if (updateData.department_id && updateData.department_id !== 'none' && updateData.department_id !== '') {
      // Check if it's a department name instead of ID
      if (!updateData.department_id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)) {
        console.log('🔍 Resolving department name to ID:', updateData.department_id);
        const { data: dept } = await supabase
          .from('departments')
          .select('id')
          .ilike('name', updateData.department_id)
          .eq('is_active', true)
          .maybeSingle();
        
        if (dept) {
          processedDepartmentId = dept.id;
          console.log('✅ Department name resolved to ID:', processedDepartmentId);
        } else {
          console.log('⚠️ Department name not found:', updateData.department_id);
        }
      }
    }

    // Handle line manager ID resolution
    let processedLineManagerId = updateData.line_manager_id;
    if (updateData.line_manager_id && updateData.line_manager_id !== 'none' && updateData.line_manager_id !== '') {
      // Check if it's a manager name instead of ID
      if (!updateData.line_manager_id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)) {
        console.log('🔍 Resolving manager name to ID:', updateData.line_manager_id);
        const nameSearch = updateData.line_manager_id.split(' ');
        const { data: manager } = await supabase
          .from('profiles')
          .select('id')
          .or(`first_name.ilike.%${nameSearch[0]}%,last_name.ilike.%${nameSearch[nameSearch.length - 1]}%`)
          .in('role', ['manager', 'hr', 'admin'])
          .eq('is_active', true)
          .maybeSingle();
        
        if (manager) {
          processedLineManagerId = manager.id;
          console.log('✅ Manager name resolved to ID:', processedLineManagerId);
        } else {
          console.log('⚠️ Manager name not found:', updateData.line_manager_id);
        }
      }
    }

    // Clean null values
    const cleanDepartmentId = (!processedDepartmentId || processedDepartmentId === 'none' || processedDepartmentId === '') ? null : processedDepartmentId;
    const cleanLineManagerId = (!processedLineManagerId || processedLineManagerId === 'none' || processedLineManagerId === '') ? null : processedLineManagerId;

    const processedData = {
      first_name: updateData.first_name.trim(),
      last_name: updateData.last_name.trim(),
      email: updateData.email.trim(),
      role: updateData.role,
      position: updateData.position?.trim() || null,
      department_id: cleanDepartmentId,
      line_manager_id: cleanLineManagerId
    };

    console.log('✅ Final processed data:', processedData);
    return processedData;
  }

  private static async performDatabaseUpdate(employeeId: string, processedData: any) {
    console.log('💾 Performing database update for:', employeeId);
    console.log('📋 Update payload:', processedData);

    const { data: updateResult, error: updateError } = await supabase
      .from('profiles')
      .update(processedData)
      .eq('id', employeeId)
      .select('*')
      .single();

    console.log('📊 Raw database update response:', { updateResult, updateError });

    if (updateError) {
      console.error('❌ Database update failed:', updateError);
      throw new Error(`Database update failed: ${updateError.message}`);
    }

    if (!updateResult) {
      throw new Error('Update completed but no data returned from database');
    }

    console.log('✅ Database update successful:', updateResult);
    return updateResult;
  }

  private static async verifyUpdateChanges(employeeId: string, originalData: any, expectedData: any): Promise<{ success: boolean; data?: ExtendedProfile; error?: string }> {
    console.log('🔍 Verifying update changes...');
    
    // Get fresh data from database
    const freshData = await this.getEmployeeProfileWithNames(employeeId);
    console.log('📊 Fresh data after update:', freshData);
    
    // Compare key fields
    const changes = {
      first_name: originalData.first_name !== freshData.first_name,
      last_name: originalData.last_name !== freshData.last_name,
      email: originalData.email !== freshData.email,
      role: originalData.role !== freshData.role,
      position: originalData.position !== freshData.position,
      department_id: originalData.department_id !== freshData.department_id,
      line_manager_id: originalData.line_manager_id !== freshData.line_manager_id
    };

    console.log('📊 Detected changes:', changes);

    // Verify specific fields that were updated
    const verificationResults = {
      department_match: expectedData.department_id === freshData.department_id,
      manager_match: expectedData.line_manager_id === freshData.line_manager_id,
      basic_fields_match: (
        expectedData.first_name === freshData.first_name &&
        expectedData.last_name === freshData.last_name &&
        expectedData.email === freshData.email &&
        expectedData.role === freshData.role
      )
    };

    console.log('✅ Verification results:', verificationResults);

    if (!verificationResults.basic_fields_match) {
      return { success: false, error: 'Basic field updates were not saved properly' };
    }

    if (!verificationResults.department_match) {
      console.warn('⚠️ Department assignment mismatch:', {
        expected: expectedData.department_id,
        actual: freshData.department_id
      });
    }

    if (!verificationResults.manager_match) {
      console.warn('⚠️ Manager assignment mismatch:', {
        expected: expectedData.line_manager_id,
        actual: freshData.line_manager_id
      });
    }

    return { success: true, data: freshData };
  }

  static async getEmployeeProfileWithNames(employeeId: string): Promise<ExtendedProfile> {
    console.log('🔍 Getting employee profile with names for:', employeeId);

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', employeeId)
      .single();

    if (profileError || !profile) {
      console.error('❌ Failed to get profile:', profileError);
      throw new Error(`Failed to retrieve employee profile: ${profileError?.message || 'Profile not found'}`);
    }

    console.log('📋 Base profile retrieved:', profile);

    const extendedProfile: ExtendedProfile = {
      ...profile,
      department: null,
      department_name: undefined,
      line_manager_name: undefined
    };

    // Get department name if department_id exists
    if (profile.department_id) {
      console.log('🏢 Fetching department for ID:', profile.department_id);
      const { data: department } = await supabase
        .from('departments')
        .select('name')
        .eq('id', profile.department_id)
        .eq('is_active', true)
        .maybeSingle();

      if (department) {
        extendedProfile.department_name = department.name;
        extendedProfile.department = { name: department.name };
        console.log('✅ Department name resolved:', department.name);
      } else {
        console.log('⚠️ Department not found or inactive for ID:', profile.department_id);
        extendedProfile.department_name = 'Department Not Found';
      }
    }

    // Get line manager name if line_manager_id exists
    if (profile.line_manager_id) {
      console.log('👤 Fetching manager for ID:', profile.line_manager_id);
      const { data: manager } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', profile.line_manager_id)
        .eq('is_active', true)
        .maybeSingle();

      if (manager) {
        extendedProfile.line_manager_name = `${manager.first_name || ''} ${manager.last_name || ''}`.trim();
        console.log('✅ Manager name resolved:', extendedProfile.line_manager_name);
      } else {
        console.log('⚠️ Manager not found or inactive for ID:', profile.line_manager_id);
        extendedProfile.line_manager_name = 'Manager Not Found';
      }
    }

    console.log('✅ Complete extended profile:', extendedProfile);
    return extendedProfile;
  }

  static async getAllEmployeesWithNames(): Promise<ExtendedProfile[]> {
    console.log('🔄 Getting all employees with names...');

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
        department: null,
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
