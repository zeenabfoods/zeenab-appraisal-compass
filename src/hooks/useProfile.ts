
import { useAuthContext } from '@/components/AuthProvider';

export function useProfile() {
  const { profile } = useAuthContext();
  
  return {
    profile,
    isLoading: !profile
  };
}
