import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AttendanceSettings {
  id: string;
  api_demo_mode?: boolean;
}

export function useApiDemoMode() {
  const [apiDemoMode, setApiDemoMode] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchApiDemoMode = async () => {
    try {
      const { data, error } = await supabase
        .from('attendance_settings')
        .select('id, api_demo_mode')
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching API demo mode:', error);
        return;
      }

      const settings = data as AttendanceSettings | null;
      setApiDemoMode(settings?.api_demo_mode ?? false);
    } catch (error) {
      console.error('Error fetching API demo mode:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleApiDemoMode = async (enabled: boolean) => {
    try {
      // First check if settings row exists
      const { data: existing } = await supabase
        .from('attendance_settings')
        .select('id')
        .limit(1)
        .single();

      if (existing) {
        const { error } = await supabase
          .from('attendance_settings')
          .update({ api_demo_mode: enabled, updated_at: new Date().toISOString() } as any)
          .eq('id', existing.id);

        if (error) throw error;
      }

      setApiDemoMode(enabled);
      toast.success(enabled ? 'API Demo Mode enabled' : 'API Demo Mode disabled');
    } catch (error) {
      console.error('Error toggling API demo mode:', error);
      toast.error('Failed to update API demo mode');
    }
  };

  useEffect(() => {
    fetchApiDemoMode();
  }, []);

  return {
    apiDemoMode,
    loading,
    toggleApiDemoMode,
    refetch: fetchApiDemoMode
  };
}
