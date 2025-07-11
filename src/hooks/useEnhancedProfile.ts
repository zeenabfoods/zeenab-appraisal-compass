import { useState, useEffect, useCallback } from 'react';
import { useAuthContext } from '@/components/AuthProvider';
import { EmployeeProfileService, ExtendedProfile } from '@/services/employeeProfileService';

export function useEnhancedProfile() {
  const { profile, loading } = useAuthContext();
  const [enhancedProfile, setEnhancedProfile] = useState<ExtendedProfile | null>(null);
  const [enhancedLoading, setEnhancedLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);

  const loadEnhancedProfile = useCallback(async () => {
    if (!profile || hasLoaded) return;
    
    try {
      console.log('🔍 Loading enhanced profile for:', profile.id);
      setEnhancedLoading(true);
      const extended = await EmployeeProfileService.getEmployeeProfileWithNames(profile.id);
      setEnhancedProfile(extended);
      setHasLoaded(true);
      console.log('✅ Enhanced profile loaded successfully');
    } catch (error) {
      console.error('❌ Error loading enhanced profile:', error);
      // Fallback to basic profile
      setEnhancedProfile(profile as ExtendedProfile);
      setHasLoaded(true);
    } finally {
      setEnhancedLoading(false);
    }
  }, [profile, hasLoaded]);

  useEffect(() => {
    if (profile && !loading && !hasLoaded) {
      loadEnhancedProfile();
    }
  }, [profile, loading, hasLoaded, loadEnhancedProfile]);

  const refreshProfile = useCallback(() => {
    setHasLoaded(false);
    setEnhancedProfile(null);
  }, []);

  return {
    enhancedProfile,
    loading: enhancedLoading || loading,
    refreshProfile
  };
}