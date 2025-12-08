import { useState } from 'react';
import { Bell, BellRing, Loader2, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useOneSignal } from '@/hooks/useOneSignal';
import { toast } from 'sonner';

export function EmployeeNotificationSubscribe() {
  const [isSubscribing, setIsSubscribing] = useState(false);
  const { isInitialized, isSubscribed, hasAppId, requestPermission } = useOneSignal();

  // Determine if we're still loading
  const isLoading = hasAppId === null || (hasAppId === true && !isInitialized);
  
  // Not configured = hasAppId is explicitly false
  const notConfigured = hasAppId === false;

  const handleSubscribe = async () => {
    setIsSubscribing(true);
    try {
      const granted = await requestPermission();
      if (granted) {
        toast.success('Successfully subscribed to push notifications!');
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

  return (
    <div className="space-y-6 p-4 max-w-lg mx-auto">
      <div className="text-center space-y-2">
        <div className="inline-flex p-4 bg-gradient-to-br from-orange-500 to-amber-500 rounded-full mb-4">
          <BellRing className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Push Notifications</h1>
        <p className="text-muted-foreground">
          Stay updated with clock-in reminders, break alerts, and important attendance updates.
        </p>
      </div>

      <Card className="p-6 space-y-4">
        {isSubscribed ? (
          <div className="text-center space-y-4">
            <div className="inline-flex p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
              <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-green-600 dark:text-green-400">
              You're Subscribed!
            </h3>
            <p className="text-sm text-muted-foreground">
              You will receive push notifications for attendance events even when the app is closed.
            </p>
          </div>
        ) : notConfigured ? (
          <div className="text-center space-y-4 py-4">
            <div className="inline-flex p-3 bg-orange-100 dark:bg-orange-900/30 rounded-full">
              <AlertCircle className="w-8 h-8 text-orange-600 dark:text-orange-400" />
            </div>
            <h3 className="text-lg font-semibold text-orange-600 dark:text-orange-400">
              Notifications Not Configured
            </h3>
            <p className="text-sm text-muted-foreground">
              Push notifications have not been set up by your HR administrator yet.
            </p>
            <p className="text-xs text-muted-foreground">
              Please contact HR to enable push notifications for your organization.
            </p>
          </div>
        ) : isLoading ? (
          <div className="text-center space-y-4 py-4">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-orange-500" />
            <p className="text-sm text-muted-foreground">
              Connecting to notification service...
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-orange-50 dark:bg-orange-950/30 rounded-lg p-4 space-y-2">
              <h3 className="font-medium text-orange-800 dark:text-orange-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Why Subscribe?
              </h3>
              <ul className="text-sm text-orange-700 dark:text-orange-300 space-y-1 ml-6 list-disc">
                <li>Get reminded to clock in on time</li>
                <li>Never miss break time alerts</li>
                <li>Receive clock-out reminders</li>
                <li>Stay informed about overtime opportunities</li>
              </ul>
            </div>

            <Button 
              onClick={handleSubscribe}
              disabled={isSubscribing}
              className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white py-6 text-lg"
            >
              {isSubscribing ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Enabling Notifications...
                </>
              ) : (
                <>
                  <Bell className="w-5 h-5 mr-2" />
                  Enable Push Notifications
                </>
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              You can disable notifications anytime from your browser settings.
            </p>
          </div>
        )}
      </Card>

      <Card className="p-4 bg-muted/50">
        <h4 className="font-medium text-sm mb-2">Notification Types</h4>
        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            Clock-in Reminders
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full" />
            Break Alerts
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-orange-500 rounded-full" />
            Clock-out Reminders
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-purple-500 rounded-full" />
            Overtime Alerts
          </div>
        </div>
      </Card>
    </div>
  );
}
