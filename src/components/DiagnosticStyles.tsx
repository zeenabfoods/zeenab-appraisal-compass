
import { useEffect } from 'react';

export function DiagnosticStyles() {
  useEffect(() => {
    // Add diagnostic styling for menu items
    const style = document.createElement('style');
    style.textContent = `
      .menu-item:active, .menu-item:focus {
        background: red !important;
        outline: 3px solid yellow !important;
        transition: all 0.1s ease !important;
      }
      
      .menu-item:hover {
        transform: translateX(2px);
        transition: transform 0.2s ease;
      }
      
      .side-menu {
        border: 2px solid green !important;
      }
      
      /* Animation lock indicator */
      .menu-locked .menu-item {
        pointer-events: none;
        opacity: 0.7;
      }
    `;
    
    document.head.appendChild(style);
    
    // Add event listeners for comprehensive debugging
    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach(item => {
      item.addEventListener('click', (e) => {
        console.log('Menu item clicked:', e.target);
        console.log('Event propagation test - stopPropagation called');
        // Temporary test - can be removed after debugging
        // e.stopPropagation();
      });
      
      item.addEventListener('focus', (e) => {
        console.log('Menu item focused:', e.target);
      });
      
      item.addEventListener('blur', (e) => {
        console.log('Menu item blurred:', e.target);
      });
    });
    
    // Monitor navigation events
    const originalPushState = window.history.pushState;
    window.history.pushState = function(...args) {
      console.log('Navigation occurred via pushState:', args);
      console.log('Performance navigation entries:', performance.getEntriesByType('navigation'));
      return originalPushState.apply(this, args);
    };
    
    return () => {
      document.head.removeChild(style);
      window.history.pushState = originalPushState;
    };
  }, []);
  
  return null;
}
