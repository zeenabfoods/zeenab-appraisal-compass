import { useState, useEffect } from 'react';
import { Bell, X, BellRing, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useOneSignal } from '@/hooks/useOneSignal';
import { toast } from 'sonner';

export function PushNotificationPrompt() {
  const [dismissed, setDismissed] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const { isInitialized, isSubscribed, requestPermission } = useOneSignal();

  // Check if user has already dismissed the prompt today
  useEffect(() => {
    const dismissedDate = localStorage.getItem('push_prompt_dismissed');
    if (dismissedDate) {
      const today = new Date().toDateString();
      if (dismissedDate === today) {
        setDismissed(true);
      }
    }
  }, []);

  const handleDismiss = () => {
    const today = new Date().toDateString();
    localStorage.setItem('push_prompt_dismissed', today);
    setDismissed(true);
  };

  const handleSubscribe = async () => {
    setIsSubscribing(true);
    try {
      const granted = await requestPermission();
      if (granted) {
        toast.success('Successfully subscribed to push notifications!');
        setDismissed(true);
      } else {
        toast.error('Notification permission denied. Please enable in your browser settings.');
      }
    } catch (error: any) {
      console.error('Error subscribing:', error);
      toast.error('Failed to subscribe to notifications');
    } finally {
      setIsSubscribing(false);
    }
  };

  // Don't show if already subscribed, dismissed, or OneSignal not initialized
  if (isSubscribed || dismissed || !isInitialized) {
    return null;
  }

  return (
    <Card className="fixed bottom-20 left-4 right-4 md:left-auto md:right-6 md:w-96 z-50 p-4 bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-xl border-0 animate-in slide-in-from-bottom-4">
      <button 
        onClick={handleDismiss}
        className="absolute top-2 right-2 p-1 hover:bg-white/20 rounded-full transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
      
      <div className="flex items-start gap-3">
        <div className="p-2 bg-white/20 rounded-full">
          <BellRing className="h-6 w-6" />
        </div>
        <div className="flex-1 space-y-2">
          <h3 className="font-bold text-sm">Enable Push Notifications</h3>
          <p className="text-xs text-white/90">
            Get instant alerts for clock reminders, break times, and important updates even when the app is closed.
          </p>
          <div className="flex gap-2 pt-1">
            <Button 
              size="sm" 
              variant="secondary"
              onClick={handleSubscribe}
              disabled={isSubscribing}
              className="bg-white text-orange-600 hover:bg-white/90"
            >
              {isSubscribing ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Bell className="h-4 w-4 mr-1" />
              )}
              {isSubscribing ? 'Enabling...' : 'Enable'}
            </Button>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={handleDismiss}
              className="text-white hover:bg-white/20"
            >
              Later
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
