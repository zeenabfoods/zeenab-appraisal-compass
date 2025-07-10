import { useState, useEffect } from 'react';
import { useAuthContext } from '@/components/AuthProvider';
import { EmployeeProfileService, ExtendedProfile } from '@/services/employeeProfileService';

export function useEnhancedProfile() {
  const { profile, loading } = useAuthContext();
  const [enhancedProfile, setEnhancedProfile] = useState<ExtendedProfile | null>(null);
  const [enhancedLoading, setEnhancedLoading] = useState(true);

  useEffect(() => {
    if (profile && !loading) {
      loadEnhancedProfile();
    }
  }, [profile, loading]);

  const loadEnhancedProfile = async () => {
    if (!profile) return;
    
    try {
      setEnhancedLoading(true);
      const extended = await EmployeeProfileService.getEmployeeProfileWithNames(profile.id);
      setEnhancedProfile(extended);
    } catch (error) {
      console.error('Error loading enhanced profile:', error);
      // Fallback to basic profile
      setEnhancedProfile(profile as ExtendedProfile);
    } finally {
      setEnhancedLoading(false);
    }
  };

  return {
    enhancedProfile,
    loading: enhancedLoading || loading,
    refreshProfile: loadEnhancedProfile
  };
}