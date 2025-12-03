import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/components/AuthProvider';

declare global {
  interface Window {
    OneSignalDeferred?: Array<(OneSignal: any) => void>;
    OneSignal?: any;
  }
}

export function useOneSignal() {
  const { user, profile } = useAuthContext();
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    initOneSignal();
  }, []);

  useEffect(() => {
    if (isInitialized && user?.id) {
      setExternalUserId(user.id);
    }
  }, [isInitialized, user?.id]);

  const initOneSignal = async () => {
    try {
      // Fetch app ID from settings
      const { data } = await supabase
        .from('attendance_settings')
        .select('*')
        .maybeSingle();

      const settings = data as Record<string, unknown> | null;
      const onesignalAppId = settings?.onesignal_app_id as string | undefined;
      if (!onesignalAppId) {
        console.log('OneSignal App ID not configured');
        return;
      }

      // Load OneSignal SDK
      if (!window.OneSignal) {
        window.OneSignalDeferred = window.OneSignalDeferred || [];
        
        const script = document.createElement('script');
        script.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
        script.defer = true;
        document.head.appendChild(script);

        await new Promise<void>((resolve) => {
          script.onload = () => resolve();
        });
      }

      window.OneSignalDeferred = window.OneSignalDeferred || [];
      window.OneSignalDeferred.push(async (OneSignal: any) => {
        await OneSignal.init({
          appId: onesignalAppId,
          safari_web_id: undefined,
          notifyButton: {
            enable: false,
          },
          allowLocalhostAsSecureOrigin: true,
        });

        setIsInitialized(true);

        // Check subscription status
        const permission = await OneSignal.Notifications.permission;
        setIsSubscribed(permission);

        // Listen for subscription changes
        OneSignal.Notifications.addEventListener('permissionChange', (granted: boolean) => {
          setIsSubscribed(granted);
        });
      });
    } catch (error) {
      console.error('Error initializing OneSignal:', error);
    }
  };

  const setExternalUserId = async (userId: string) => {
    if (!window.OneSignal || !isInitialized) return;

    try {
      window.OneSignalDeferred?.push(async (OneSignal: any) => {
        await OneSignal.login(userId);
        console.log('OneSignal external user ID set:', userId);
      });
    } catch (error) {
      console.error('Error setting OneSignal external user ID:', error);
    }
  };

  const requestPermission = async () => {
    if (!window.OneSignal || !isInitialized) {
      console.log('OneSignal not initialized');
      return false;
    }

    try {
      return new Promise<boolean>((resolve) => {
        window.OneSignalDeferred?.push(async (OneSignal: any) => {
          const permission = await OneSignal.Notifications.requestPermission();
          setIsSubscribed(permission);
          resolve(permission);
        });
      });
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  };

  const sendNotificationToUser = async (userId: string, title: string, message: string, data?: Record<string, string>) => {
    try {
      const { error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          title,
          message,
          userIds: [userId],
          data,
        },
      });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error sending notification:', error);
      return false;
    }
  };

  const sendNotificationToAll = async (title: string, message: string, data?: Record<string, string>) => {
    try {
      const { error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          title,
          message,
          segments: ['All'],
          data,
        },
      });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error sending notification:', error);
      return false;
    }
  };

  return {
    isInitialized,
    isSubscribed,
    requestPermission,
    sendNotificationToUser,
    sendNotificationToAll,
  };
}
