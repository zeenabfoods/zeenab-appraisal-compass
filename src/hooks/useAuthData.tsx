
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Department {
  id: string;
  name: string;
  line_manager_id?: string;
}

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  role: string;
}

export function useAuthData() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [managers, setManagers] = useState<Profile[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState<string>('');

  const fetchDepartments = async () => {
    try {
      console.log('📋 Fetching departments...');
      const { data, error } = await supabase
        .from('departments')
        .select('id, name, line_manager_id')
        .eq('is_active', true)
        .order('name');
      
      if (error) {
        console.error('❌ Error fetching departments:', error);
        throw error;
      }
      
      console.log('✅ Departments fetched:', data?.length || 0, 'departments');
      console.log('Departments data:', data);
      setDepartments(data || []);
      return data || [];
      
    } catch (error) {
      console.error('❌ Error in fetchDepartments:', error);
      throw error;
    }
  };

  const fetchManagers = async () => {
    try {
      console.log('👔 Fetching managers...');
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, role')
        .in('role', ['manager', 'hr', 'admin'])
        .eq('is_active', true)
        .order('first_name');
      
      if (error) {
        console.error('❌ Error fetching managers:', error);
        throw error;
      }
      
      console.log('✅ Managers fetched:', data?.length || 0, 'managers');
      console.log('Managers data:', data);
      setManagers(data || []);
      return data || [];
      
    } catch (error) {
      console.error('❌ Error in fetchManagers:', error);
      throw error;
    }
  };

  const loadInitialData = async () => {
    setDataLoading(true);
    setDataError('');
    
    try {
      console.log('📋 Starting to fetch departments and managers...');
      
      // Fetch both departments and managers
      const [departmentsData, managersData] = await Promise.all([
        fetchDepartments(),
        fetchManagers()
      ]);
      
      console.log('✅ Initial data loaded successfully');
      console.log('Final state - Departments:', departmentsData?.length, 'Managers:', managersData?.length);
      
    } catch (error: any) {
      console.error('❌ Error loading initial data:', error);
      setDataError(`Failed to load system data: ${error.message || 'Unknown error'}. Please refresh the page or contact support.`);
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    console.log('🔄 Loading departments and managers data...');
    loadInitialData();
  }, []);

  // Add some debugging logs
  useEffect(() => {
    console.log('📊 Current state:', {
      departments: departments.length,
      managers: managers.length,
      dataLoading,
      dataError
    });
  }, [departments, managers, dataLoading, dataError]);

  return {
    departments,
    managers,
    dataLoading,
    dataError,
    refetch: loadInitialData // Add a refetch function in case user wants to retry
  };
}
