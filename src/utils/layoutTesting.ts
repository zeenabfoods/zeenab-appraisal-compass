
// Layout consistency testing utilities
export interface LayoutTestResults {
  passed: boolean;
  errors: string[];
  warnings: string[];
  elementCounts: {
    headers: number;
    searchBars: number;
    userProfiles: number;
  };
}

export const runLayoutConsistencyTest = (): LayoutTestResults => {
  const results: LayoutTestResults = {
    passed: true,
    errors: [],
    warnings: [],
    elementCounts: {
      headers: 0,
      searchBars: 0,
      userProfiles: 0
    }
  };

  // Count critical elements
  const headers = document.querySelectorAll('[data-testid="main-header"]');
  const searchBars = document.querySelectorAll('[data-testid="search-bar"]');
  const userProfiles = document.querySelectorAll('[data-testid="user-profile"]');

  results.elementCounts.headers = headers.length;
  results.elementCounts.searchBars = searchBars.length;
  results.elementCounts.userProfiles = userProfiles.length;

  // Check for violations
  if (headers.length > 1) {
    results.errors.push(`Multiple headers detected: ${headers.length} (expected: 1)`);
    results.passed = false;
  }

  if (headers.length === 0) {
    results.warnings.push('No header found - might be loading state');
  }

  if (searchBars.length > 1) {
    results.errors.push(`Multiple search bars detected: ${searchBars.length} (expected: 0-1)`);
    results.passed = false;
  }

  if (userProfiles.length > 1) {
    results.errors.push(`Multiple user profiles detected: ${userProfiles.length} (expected: 1)`);
    results.passed = false;
  }

  if (userProfiles.length === 0) {
    results.warnings.push('No user profile found - might be loading state');
  }

  // Check for duplicate IDs
  const allIds = Array.from(document.querySelectorAll('[id]')).map(el => el.id);
  const duplicateIds = allIds.filter((id, index) => allIds.indexOf(id) !== index);
  
  if (duplicateIds.length > 0) {
    results.errors.push(`Duplicate IDs found: ${duplicateIds.join(', ')}`);
    results.passed = false;
  }

  return results;
};

// Automated test runner for development
export const startLayoutWatcher = () => {
  if (process.env.NODE_ENV !== 'development') return;

  let lastResults: LayoutTestResults | null = null;

  const checkLayout = () => {
    const results = runLayoutConsistencyTest();
    
    // Only log if results changed
    if (!lastResults || JSON.stringify(results) !== JSON.stringify(lastResults)) {
      if (results.passed) {
        console.log('✅ Layout consistency check passed', results.elementCounts);
      } else {
        console.error('❌ Layout consistency check failed:', {
          errors: results.errors,
          warnings: results.warnings,
          counts: results.elementCounts
        });
        
        // Visual debugging
        markDuplicateElements();
      }
      
      lastResults = results;
    }
  };

  // Initial check
  setTimeout(checkLayout, 1000);
  
  // Periodic checks
  const intervalId = setInterval(checkLayout, 3000);
  
  return () => clearInterval(intervalId);
};

const markDuplicateElements = () => {
  // Mark duplicate headers
  const headers = document.querySelectorAll('[data-testid="main-header"]');
  headers.forEach((header, index) => {
    if (index > 0) {
      (header as HTMLElement).style.outline = '3px solid red';
      (header as HTMLElement).style.backgroundColor = 'rgba(255, 0, 0, 0.1)';
      (header as HTMLElement).setAttribute('data-debug', 'duplicate');
    }
  });

  // Mark duplicate search bars
  const searchBars = document.querySelectorAll('[data-testid="search-bar"]');
  searchBars.forEach((search, index) => {
    if (index > 0) {
      (search as HTMLElement).style.outline = '2px solid orange';
      (search as HTMLElement).setAttribute('data-debug', 'duplicate');
    }
  });

  // Mark duplicate user profiles
  const userProfiles = document.querySelectorAll('[data-testid="user-profile"]');
  userProfiles.forEach((profile, index) => {
    if (index > 0) {
      (profile as HTMLElement).style.outline = '2px solid purple';
      (profile as HTMLElement).setAttribute('data-debug', 'duplicate');
    }
  });
};

// Export for manual testing in console
if (typeof window !== 'undefined') {
  (window as any).testLayout = runLayoutConsistencyTest;
  (window as any).startLayoutWatcher = startLayoutWatcher;
}
