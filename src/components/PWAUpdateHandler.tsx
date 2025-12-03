import { useEffect } from 'react';
import { toast } from 'sonner';

export function PWAUpdateHandler() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      // Check for service worker updates on load and periodically
      const checkForUpdates = async () => {
        try {
          const registration = await navigator.serviceWorker.getRegistration();
          if (registration) {
            await registration.update();
          }
        } catch (error) {
          console.log('SW update check failed:', error);
        }
      };

      // Check immediately
      checkForUpdates();

      // Check every 60 seconds
      const interval = setInterval(checkForUpdates, 60 * 1000);

      // Listen for new service worker installation
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        toast.info('App updated! Refreshing...', { duration: 2000 });
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      });

      return () => clearInterval(interval);
    }
  }, []);

  return null;
}
