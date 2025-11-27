import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, X } from 'lucide-react';
import { toast } from 'sonner';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      console.log('App is already installed');
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      console.log('beforeinstallprompt event fired');
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // For iOS, show a custom prompt since beforeinstallprompt doesn't fire
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    
    if (isIOS && !isStandalone) {
      // Show iOS install instructions after a delay
      setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      // For iOS or if prompt not available, show instructions
      toast.info(
        <div className="space-y-2">
          <p className="font-semibold">Install this app:</p>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>Tap the Share button</li>
            <li>Scroll down and tap "Add to Home Screen"</li>
            <li>Tap "Add" to confirm</li>
          </ol>
        </div>,
        { duration: 10000 }
      );
      setShowPrompt(false);
      return;
    }

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
        toast.success('App installed successfully!');
      } else {
        console.log('User dismissed the install prompt');
      }
      
      setDeferredPrompt(null);
      setShowPrompt(false);
    } catch (error) {
      console.error('Error showing install prompt:', error);
      toast.error('Could not install app');
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Store dismissal in localStorage to not show again for a while
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  // Check if user dismissed recently (within 7 days)
  useEffect(() => {
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed) {
      const dismissedTime = parseInt(dismissed);
      const daysSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed < 7) {
        setShowPrompt(false);
      }
    }
  }, []);

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 lg:left-auto lg:right-8 lg:w-96">
      <Card className="shadow-2xl border-primary/20 bg-gradient-to-br from-orange-50/95 to-white/95 dark:from-gray-900/95 dark:to-gray-800/95 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Download className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Install App</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 -mt-1 -mr-1"
              onClick={handleDismiss}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription>
            Install Zeenab Attendance for quick access and offline support
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Button 
              onClick={handleInstallClick}
              className="flex-1 bg-primary hover:bg-primary/90"
            >
              <Download className="h-4 w-4 mr-2" />
              Install Now
            </Button>
            <Button 
              variant="outline"
              onClick={handleDismiss}
            >
              Later
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
