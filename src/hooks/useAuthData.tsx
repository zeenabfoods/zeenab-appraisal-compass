
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
      console.log('🔐 Current auth state:', await supabase.auth.getUser());
      
      const { data, error } = await supabase
        .from('departments')
        .select('id, name, line_manager_id')
        .eq('is_active', true)
        .order('name');
      
      if (error) {
        console.error('❌ Error fetching departments:', error);
        console.error('❌ Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        throw error;
      }
      
      console.log('✅ Departments fetched:', data?.length || 0, 'departments');
      console.log('📋 Departments data:', data);
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
        console.error('❌ Manager error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        throw error;
      }
      
      console.log('✅ Managers fetched:', data?.length || 0, 'managers');
      console.log('👔 Managers data:', data);
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
      console.log('🔐 Auth ready state check...');
      
      // Check if we have a session
      const { data: session } = await supabase.auth.getSession();
      console.log('📋 Session status:', session?.session ? 'Active' : 'No session');
      
      // Fetch both departments and managers
      const [departmentsData, managersData] = await Promise.all([
        fetchDepartments(),
        fetchManagers()
      ]);
      
      console.log('✅ Initial data loaded successfully');
      console.log('📊 Final state - Departments:', departmentsData?.length, 'Managers:', managersData?.length);
      
    } catch (error: any) {
      console.error('❌ Error loading initial data:', error);
      let errorMessage = 'Failed to load system data.';
      
      if (error.message?.includes('JWT')) {
        errorMessage = 'Authentication required. Please sign in to access departments.';
      } else if (error.code === 'PGRST116') {
        errorMessage = 'Database access denied. Please check your permissions.';
      } else {
        errorMessage = `Failed to load system data: ${error.message || 'Unknown error'}. Please refresh the page or contact support.`;
      }
      
      setDataError(errorMessage);
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    console.log('🔄 useAuthData: Loading departments and managers data...');
    
    // Add a small delay to ensure auth is ready
    const timer = setTimeout(() => {
      loadInitialData();
    }, 100);
    
    return () => clearTimeout(timer);
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
    refetch: loadInitialData // Add a refetch function in case user wants to retry
  };
}
