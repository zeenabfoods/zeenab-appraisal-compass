
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export function MenuDiagnostics() {
  const location = useLocation();
  
  useEffect(() => {
    // Comprehensive state monitoring
    const logMenuState = () => {
      console.log('=== Menu Diagnostics ===');
      console.log('Current menu state:', {
        localStorage: localStorage.getItem('sidebarState'),
        menuElement: document.querySelector('.side-menu')?.classList.value,
        currentPath: location.pathname,
        routerHistory: window.history.state,
        menuItemsCount: document.querySelectorAll('.menu-item').length,
        visibleMenuItems: Array.from(document.querySelectorAll('.menu-item')).filter(item => 
          window.getComputedStyle(item).display !== 'none'
        ).length
      });
      
      // Check for any errors in menu rendering
      const menuContainer = document.querySelector('.side-menu');
      if (menuContainer) {
        const computedStyle = window.getComputedStyle(menuContainer);
        console.log('Menu container styles:', {
          display: computedStyle.display,
          visibility: computedStyle.visibility,
          opacity: computedStyle.opacity,
          transform: computedStyle.transform,
          position: computedStyle.position
        });
      }
    };
    
    // Log state immediately and after a delay to catch async updates
    logMenuState();
    const timer = setTimeout(logMenuState, 100);
    
    return () => clearTimeout(timer);
  }, [location.pathname]);
  
  useEffect(() => {
    // Error boundary for menu interactions
    const handleGlobalError = (event: ErrorEvent) => {
      if (event.filename?.includes('sidebar') || event.filename?.includes('menu')) {
        console.error('Menu-related error detected:', {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          error: event.error
        });
      }
    };
    
    window.addEventListener('error', handleGlobalError);
    return () => window.removeEventListener('error', handleGlobalError);
  }, []);
  
  // Test keyboard interactions
  useEffect(() => {
    const handleKeyboardTest = (e: KeyboardEvent) => {
      if (e.key === 'Tab' || e.key === 'Enter' || e.key === ' ') {
        const activeElement = document.activeElement;
        if (activeElement?.classList.contains('menu-item')) {
          console.log('Keyboard interaction with menu item:', {
            key: e.key,
            element: activeElement,
            href: (activeElement as HTMLAnchorElement).href
          });
        }
      }
    };
    
    document.addEventListener('keydown', handleKeyboardTest);
    return () => document.removeEventListener('keydown', handleKeyboardTest);
  }, []);
  
  return null;
}
