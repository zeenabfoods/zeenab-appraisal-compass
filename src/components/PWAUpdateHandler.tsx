import { useEffect } from 'react';
import { toast } from 'sonner';

export function PWAUpdateHandler() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      const checkForUpdates = async () => {
        try {
          const registration = await navigator.serviceWorker.getRegistration();
          if (registration) {
            // Force check for updates
            await registration.update();
            
            // If there's a waiting service worker, activate it immediately
            if (registration.waiting) {
              registration.waiting.postMessage({ type: 'SKIP_WAITING' });
            }
          }
        } catch (error) {
          console.log('SW update check failed:', error);
        }
      };

      // Check immediately on load
      checkForUpdates();
      
      // Check every 30 seconds for more responsive updates
      const interval = setInterval(checkForUpdates, 30 * 1000);

      // Listen for new service worker installation
      navigator.serviceWorker.ready.then((registration) => {
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New content available, trigger skip waiting
                newWorker.postMessage({ type: 'SKIP_WAITING' });
              }
            });
          }
        });
      });

      // Listen for controller change (new SW activated)
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        toast.success('🎉 App Just Updated!', {
          description: 'New features, improvements & bug fixes have been applied.',
          duration: 5000,
        });
        
        // Auto-refresh after 3 seconds
        setTimeout(() => {
          window.location.reload();
        }, 3000);
      });

      return () => clearInterval(interval);
    }
  }, []);

  return null;
}
