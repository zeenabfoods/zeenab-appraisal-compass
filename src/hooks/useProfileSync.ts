
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Profile } from '@/hooks/useAuth';

export function useProfileSync(userId: string | undefined) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const syncProfile = async () => {
    if (!userId) return;
    
    try {
      console.log('🔄 Syncing profile for user:', userId);
      
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('❌ Error syncing profile:', error);
        throw error;
      }

      console.log('✅ Profile synced:', profileData);
      
      // Transform the data to match the Profile type
      const transformedProfile: Profile = {
        id: profileData.id,
        email: profileData.email,
        first_name: profileData.first_name,
        last_name: profileData.last_name,
        role: profileData.role,
        position: profileData.position,
        department_id: profileData.department_id,
        line_manager_id: profileData.line_manager_id,
        is_active: profileData.is_active,
        created_at: profileData.created_at,
        last_login: profileData.last_login,
        // Transform department string to object format if it exists
        department: profileData.department ? { name: profileData.department } : undefined
      };
      
      setProfile(transformedProfile);
    } catch (error) {
      console.error('❌ Failed to sync profile:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    syncProfile();
  }, [userId]);

  // Set up real-time subscription for profile changes
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('profile-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${userId}`
        },
        (payload) => {
          console.log('🔄 Real-time profile update received:', payload);
          if (payload.new) {
            // Transform the real-time data as well
            const transformedProfile: Profile = {
              id: payload.new.id,
              email: payload.new.email,
              first_name: payload.new.first_name,
              last_name: payload.new.last_name,
              role: payload.new.role,
              position: payload.new.position,
              department_id: payload.new.department_id,
              line_manager_id: payload.new.line_manager_id,
              is_active: payload.new.is_active,
              created_at: payload.new.created_at,
              last_login: payload.new.last_login,
              department: payload.new.department ? { name: payload.new.department } : undefined
            };
            setProfile(transformedProfile);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return {
    profile,
    loading,
    syncProfile
  };
}
