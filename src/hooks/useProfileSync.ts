
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
      setProfile(profileData);
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
            setProfile(payload.new as Profile);
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
