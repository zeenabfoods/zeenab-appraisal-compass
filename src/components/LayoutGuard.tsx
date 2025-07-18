
import { useEffect } from 'react';

interface LayoutGuardProps {
  children: React.ReactNode;
}

export function LayoutGuard({ children }: LayoutGuardProps) {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      // CRITICAL: Enhanced layout enforcement - auto-check every 1 second
      const intervalId = setInterval(() => {
        const headers = document.querySelectorAll('[data-testid="app-header"]');
        const allHeaders = document.querySelectorAll('header');
        const searchBars = document.querySelectorAll('[data-testid="integrated-search"]');
        const userProfiles = document.querySelectorAll('[data-testid="user-profile"]');

        const violations = [];
        
        if (headers.length > 1) {
          violations.push(`Multiple app headers detected: ${headers.length}`);
        }
        
        if (allHeaders.length > 1) {
          violations.push(`Multiple header elements detected: ${allHeaders.length}`);
        }
        
        if (searchBars.length > 1) {
          violations.push(`Multiple search bars detected: ${searchBars.length}`);
        }
        
        if (userProfiles.length > 1) {
          violations.push(`Multiple user profiles detected: ${userProfiles.length}`);
        }

        if (violations.length > 0) {
          console.error('🚨 CRITICAL LAYOUT VIOLATIONS DETECTED:', violations);
          
          // Nuclear option - remove duplicates automatically
          if (allHeaders.length > 1) {
            console.warn('🔧 ACTIVATING NUCLEAR OPTION - Removing duplicate headers');
            allHeaders.forEach((h, i) => {
              if (i > 0) {
                console.warn(`🗑️ Removing duplicate header ${i + 1}:`, h);
                (h as HTMLElement).remove();
              }
            });
          }
          
          // Visual debug indicators for remaining violations
          headers.forEach((h, i) => {
            if (i > 0) {
              (h as HTMLElement).style.outline = '5px solid red';
              (h as HTMLElement).style.backgroundColor = 'rgba(255, 0, 0, 0.5)';
              (h as HTMLElement).setAttribute('data-debug', 'DUPLICATE-HEADER');
            }
          });
          
          searchBars.forEach((s, i) => {
            if (i > 0) {
              (s as HTMLElement).style.outline = '3px solid orange';
              (s as HTMLElement).setAttribute('data-debug', 'DUPLICATE-SEARCH');
            }
          });
          
          userProfiles.forEach((u, i) => {
            if (i > 0) {
              (u as HTMLElement).style.outline = '3px solid purple';
              (u as HTMLElement).setAttribute('data-debug', 'DUPLICATE-PROFILE');
            }
          });

          // Throw error to force attention
          throw new Error(`Layout violations detected: ${violations.join(', ')}`);
        } else {
          // Success logging
          console.log('✅ LAYOUT CLEAN:', {
            'Header Count': allHeaders.length,
            'App Headers': headers.length,
            'Search Bars': searchBars.length,
            'User Profiles': userProfiles.length,
            'Status': '✅ SINGLE HEADER CONFIRMED'
          });
        }
      }, 1000);

      return () => clearInterval(intervalId);
    }
  }, []);

  return <>{children}</>;
}

// Enhanced layout consistency test utility
export const testLayoutConsistency = () => {
  const results = {
    appHeaders: document.querySelectorAll('[data-testid="app-header"]').length,
    allHeaders: document.querySelectorAll('header').length,
    searchBars: document.querySelectorAll('[data-testid="integrated-search"]').length,
    userProfiles: document.querySelectorAll('[data-testid="user-profile"]').length,
    violations: [] as string[],
    status: 'UNKNOWN'
  };

  if (results.appHeaders > 1) {
    results.violations.push(`${results.appHeaders} app headers found (expected: 1)`);
  }
  
  if (results.allHeaders > 1) {
    results.violations.push(`${results.allHeaders} total headers found (expected: 1)`);
  }
  
  if (results.searchBars > 1) {
    results.violations.push(`${results.searchBars} search bars found (expected: 0-1)`);
  }
  
  if (results.userProfiles > 1) {
    results.violations.push(`${results.userProfiles} user profiles found (expected: 1)`);
  }

  results.status = results.violations.length === 0 ? '✅ CLEAN' : '🚨 VIOLATIONS DETECTED';

  console.table(results);
  return results;
};

// Fallback nuclear option function
export const nuclearHeaderCleanup = () => {
  console.warn('🔧 NUCLEAR OPTION ACTIVATED - Removing all duplicate headers');
  const allHeaders = document.querySelectorAll('header');
  allHeaders.forEach((h, i) => {
    if (i > 0) {
      console.warn(`🗑️ Removing header ${i + 1}:`, h);
      (h as HTMLElement).remove();
    }
  });
  
  const remainingHeaders = document.querySelectorAll('header');
  console.log(`✅ Nuclear cleanup complete. Remaining headers: ${remainingHeaders.length}`);
  return remainingHeaders.length;
};
