import { useEffect } from 'react';
import { toast } from 'sonner';

export function PWAUpdateHandler() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
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

      checkForUpdates();
      const interval = setInterval(checkForUpdates, 60 * 1000);

      navigator.serviceWorker.addEventListener('controllerchange', () => {
        toast.success('🎉 App Just Updated!', {
          description: 'New features, improvements & bug fixes have been applied.',
          duration: 5000,
          action: {
            label: 'Refresh',
            onClick: () => window.location.reload(),
          },
        });
        
        // Auto-refresh after 5 seconds
        setTimeout(() => {
          window.location.reload();
        }, 5000);
      });

      return () => clearInterval(interval);
    }
  }, []);

  return null;
}
