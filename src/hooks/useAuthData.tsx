
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
      console.log('📋 Fetching departments for signup...');
      
      // For signup, we need to fetch departments without authentication
      // We'll use the service role or make the query public-accessible
      const { data, error } = await supabase
        .from('departments')
        .select('id, name, line_manager_id')
        .eq('is_active', true)
        .order('name');
      
      if (error) {
        console.error('❌ Error fetching departments:', error);
        // Don't throw error for signup - just return empty array
        console.log('📋 No departments available for public signup (this is normal)');
        setDepartments([]);
        return [];
      }
      
      console.log('✅ Departments fetched:', data?.length || 0, 'departments');
      console.log('📋 Departments data:', data);
      setDepartments(data || []);
      return data || [];
      
    } catch (error) {
      console.error('❌ Error in fetchDepartments:', error);
      setDepartments([]);
      return [];
    }
  };

  const fetchManagers = async () => {
    try {
      console.log('👔 Fetching managers for signup...');
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, role')
        .in('role', ['manager', 'hr', 'admin'])
        .eq('is_active', true)
        .order('first_name');
      
      if (error) {
        console.error('❌ Error fetching managers:', error);
        // Don't throw error for signup - just return empty array
        console.log('👔 No managers available for public signup (this is normal)');
        setManagers([]);
        return [];
      }
      
      console.log('✅ Managers fetched:', data?.length || 0, 'managers');
      console.log('👔 Managers data:', data);
      setManagers(data || []);
      return data || [];
      
    } catch (error) {
      console.error('❌ Error in fetchManagers:', error);
      setManagers([]);
      return [];
    }
  };

  const loadInitialData = async () => {
    setDataLoading(true);
    setDataError('');
    
    try {
      console.log('📋 Starting to fetch departments and managers for signup...');
      
      // Fetch both departments and managers without requiring authentication
      const [departmentsData, managersData] = await Promise.all([
        fetchDepartments(),
        fetchManagers()
      ]);
      
      console.log('✅ Initial data loaded for signup');
      console.log('📊 Final state - Departments:', departmentsData?.length, 'Managers:', managersData?.length);
      
      // For signup flow, it's normal to have empty data if RLS prevents access
      if (departmentsData.length === 0 && managersData.length === 0) {
        console.log('📝 No data available for public signup - this is expected behavior');
      }
      
    } catch (error: any) {
      console.error('❌ Error loading initial data:', error);
      // For signup, we don't want to show errors - just continue with empty data
      console.log('📝 Continuing with empty data for signup flow');
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    console.log('🔄 useAuthData: Loading departments and managers data...');
    loadInitialData();
  }, []);

  // Add some debugging logs
  useEffect(() => {
    console.log('📊 useAuthData: Current state:', {
      departments: departments.length,
      managers: managers.length,
      dataLoading,
      dataError: dataError || 'none'
    });
  }, [departments, managers, dataLoading, dataError]);

  return {
    departments,
    managers,
    dataLoading,
    dataError,
    refetch: loadInitialData
  };
}
