import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tables, TablesInsert } from '@/integrations/supabase/types';
import { toast } from 'sonner';

type Branch = Tables<'attendance_branches'>;
type BranchInsert = TablesInsert<'attendance_branches'>;

export function useBranches() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBranches = async () => {
    try {
      const { data, error } = await supabase
        .from('attendance_branches')
        .select('*')
        .order('name');

      if (error) throw error;
      setBranches(data || []);
    } catch (error) {
      console.error('Error fetching branches:', error);
      toast.error('Failed to load branches');
    } finally {
      setLoading(false);
    }
  };

  const createBranch = async (branch: BranchInsert) => {
    try {
      const { data, error } = await supabase
        .from('attendance_branches')
        .insert(branch)
        .select()
        .single();

      if (error) throw error;
      toast.success('Branch created successfully');
      await fetchBranches();
      return data;
    } catch (error) {
      console.error('Error creating branch:', error);
      toast.error('Failed to create branch');
      throw error;
    }
  };

  const updateBranch = async (id: string, updates: Partial<BranchInsert>) => {
    try {
      const { error } = await supabase
        .from('attendance_branches')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      toast.success('Branch updated successfully');
      await fetchBranches();
    } catch (error) {
      console.error('Error updating branch:', error);
      toast.error('Failed to update branch');
      throw error;
    }
  };

  const deleteBranch = async (id: string) => {
    try {
      const { error } = await supabase
        .from('attendance_branches')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Branch deleted successfully');
      await fetchBranches();
    } catch (error) {
      console.error('Error deleting branch:', error);
      toast.error('Failed to delete branch');
      throw error;
    }
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  return {
    branches,
    loading,
    createBranch,
    updateBranch,
    deleteBranch,
    refetch: fetchBranches,
  };
}
