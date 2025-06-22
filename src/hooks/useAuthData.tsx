
import { useState, useEffect } from 'react';

// Simplified hook since we no longer need department/manager data for signup
export function useAuthData() {
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState<string>('');

  // No longer needed for signup process
  const departments: never[] = [];
  const managers: never[] = [];

  useEffect(() => {
    console.log('🔄 useAuthData: Simplified - no longer loading signup data');
    setDataLoading(false);
  }, []);

  return {
    departments,
    managers,
    dataLoading,
    dataError,
    refetch: () => Promise.resolve()
  };
}
