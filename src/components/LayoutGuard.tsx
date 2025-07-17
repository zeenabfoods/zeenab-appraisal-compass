
import { useEffect } from 'react';

interface LayoutGuardProps {
  children: React.ReactNode;
}

export function LayoutGuard({ children }: LayoutGuardProps) {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      // Auto-check for layout violations every 2 seconds
      const intervalId = setInterval(() => {
        const headers = document.querySelectorAll('[data-testid="main-header"]');
        const searchBars = document.querySelectorAll('[data-testid="search-bar"]');
        const userProfiles = document.querySelectorAll('[data-testid="user-profile"]');

        const violations = [];
        
        if (headers.length > 1) {
          violations.push(`Multiple headers detected: ${headers.length}`);
        }
        
        if (searchBars.length > 1) {
          violations.push(`Multiple search bars detected: ${searchBars.length}`);
        }
        
        if (userProfiles.length > 1) {
          violations.push(`Multiple user profiles detected: ${userProfiles.length}`);
        }

        if (violations.length > 0) {
          console.error('🚨 LAYOUT VIOLATIONS DETECTED:', violations);
          
          // Visual debug indicators
          headers.forEach((h, i) => {
            if (i > 0) (h as HTMLElement).style.outline = '3px solid red';
          });
          
          searchBars.forEach((s, i) => {
            if (i > 0) (s as HTMLElement).style.outline = '2px solid orange';
          });
          
          userProfiles.forEach((u, i) => {
            if (i > 0) (u as HTMLElement).style.outline = '2px solid purple';
          });
        }
      }, 2000);

      return () => clearInterval(intervalId);
    }
  }, []);

  return <>{children}</>;
}

// Layout consistency test utility
export const testLayoutConsistency = () => {
  const results = {
    headers: document.querySelectorAll('[data-testid="main-header"]').length,
    searchBars: document.querySelectorAll('[data-testid="search-bar"]').length,
    userProfiles: document.querySelectorAll('[data-testid="user-profile"]').length,
    violations: [] as string[]
  };

  if (results.headers > 1) {
    results.violations.push(`${results.headers} headers found (expected: 1)`);
  }
  
  if (results.searchBars > 1) {
    results.violations.push(`${results.searchBars} search bars found (expected: 0-1)`);
  }
  
  if (results.userProfiles > 1) {
    results.violations.push(`${results.userProfiles} user profiles found (expected: 1)`);
  }

  return results;
};
