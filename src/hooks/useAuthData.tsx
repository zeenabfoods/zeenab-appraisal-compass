
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
        setDepartments([]);
        return;
      }
      
      console.log('✅ Departments fetched:', data?.length || 0, 'departments');
      setDepartments(data || []);
      
    } catch (error) {
      console.error('❌ Error in fetchDepartments:', error);
      setDepartments([]);
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
        setManagers([]);
        return;
      }
      
      console.log('✅ Managers fetched:', data?.length || 0, 'managers');
      setManagers(data || []);
      
    } catch (error) {
      console.error('❌ Error in fetchManagers:', error);
      setManagers([]);
    }
  };

  const loadInitialData = async () => {
    setDataLoading(true);
    setDataError('');
    try {
      console.log('📋 Starting to fetch departments and managers...');
      await Promise.all([fetchDepartments(), fetchManagers()]);
      console.log('✅ Initial data loaded successfully');
    } catch (error) {
      console.error('❌ Error loading initial data:', error);
      setDataError('Failed to load system data. Some features may not be available.');
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    console.log('🔄 Loading departments and managers data...');
    loadInitialData();
  }, []);

  return {
    departments,
    managers,
    dataLoading,
    dataError
  };
}
