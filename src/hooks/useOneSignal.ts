import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/components/AuthProvider';

declare global {
  interface Window {
    OneSignalDeferred?: Array<(OneSignal: any) => void>;
    OneSignal?: any;
  }
}

export function useOneSignal() {
  const { user } = useAuthContext();
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [hasAppId, setHasAppId] = useState<boolean | null>(null);
  const initAttempted = useRef(false);

  useEffect(() => {
    if (!initAttempted.current) {
      initAttempted.current = true;
      initOneSignal();
    }
  }, []);

  useEffect(() => {
    if (isInitialized && user?.id) {
      setExternalUserId(user.id);
    }
  }, [isInitialized, user?.id]);

  const initOneSignal = async () => {
    try {
      console.log('[OneSignal] Starting initialization...');
      
      // Fetch app ID from settings
      const { data, error } = await supabase
        .from('attendance_settings')
        .select('onesignal_app_id')
        .maybeSingle();

      if (error) {
        console.error('[OneSignal] Error fetching settings:', error);
        setHasAppId(false);
        setIsInitialized(true); // Mark as initialized even on error
        return;
      }

      const onesignalAppId = data?.onesignal_app_id;
      
      if (!onesignalAppId) {
        console.log('[OneSignal] App ID not configured in settings');
        setHasAppId(false);
        setIsInitialized(true); // Mark as initialized even without app ID
        return;
      }

      console.log('[OneSignal] App ID found:', onesignalAppId.substring(0, 8) + '...');
      setHasAppId(true);

      // Check if native browser notifications are supported
      if (!('Notification' in window)) {
        console.log('[OneSignal] Browser does not support notifications');
        setIsInitialized(true);
        return;
      }

      // Check current permission status
      const currentPermission = Notification.permission;
      console.log('[OneSignal] Current browser permission:', currentPermission);
      
      if (currentPermission === 'granted') {
        setIsSubscribed(true);
      }

      // Set a timeout to ensure we don't stay in loading state forever
      const initTimeout = setTimeout(() => {
        console.log('[OneSignal] Init timeout reached, marking as initialized');
        setIsInitialized(true);
      }, 5000);

      // Check if OneSignal is already initialized
      if (window.OneSignal?.Notifications) {
        console.log('[OneSignal] SDK already initialized, checking status...');
        try {
          const permission = await window.OneSignal.Notifications.permission;
          setIsSubscribed(permission);
          setIsInitialized(true);
          clearTimeout(initTimeout);
          console.log('[OneSignal] Already initialized, permission:', permission);
          return;
        } catch (e) {
          console.log('[OneSignal] SDK exists but not fully ready, continuing init...');
        }
      }

      // Load OneSignal SDK if not present
      if (!window.OneSignal) {
        console.log('[OneSignal] Loading SDK script...');
        window.OneSignalDeferred = window.OneSignalDeferred || [];
        
        const existingScript = document.querySelector('script[src*="OneSignalSDK"]');
        if (!existingScript) {
          const script = document.createElement('script');
          script.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
          script.defer = true;
          document.head.appendChild(script);

          await new Promise<void>((resolve, reject) => {
            script.onload = () => {
              console.log('[OneSignal] SDK script loaded');
              resolve();
            };
            script.onerror = () => {
              console.error('[OneSignal] Failed to load SDK script');
              setIsInitialized(true);
              clearTimeout(initTimeout);
              reject(new Error('Failed to load OneSignal SDK'));
            };
          });
        } else {
          console.log('[OneSignal] SDK script already in DOM');
        }
      }

      // Initialize OneSignal
      console.log('[OneSignal] Initializing SDK...');
      window.OneSignalDeferred = window.OneSignalDeferred || [];
      
      window.OneSignalDeferred.push(async (OneSignal: any) => {
        try {
          console.log('[OneSignal] Running init callback...');
          
          await OneSignal.init({
            appId: onesignalAppId,
            safari_web_id: undefined,
            notifyButton: {
              enable: false,
            },
            allowLocalhostAsSecureOrigin: true,
          });

          console.log('[OneSignal] SDK initialized successfully');
          setIsInitialized(true);
          clearTimeout(initTimeout);

          // Check subscription status
          const permission = await OneSignal.Notifications.permission;
          console.log('[OneSignal] Permission status:', permission);
          setIsSubscribed(permission);

          // Listen for subscription changes
          OneSignal.Notifications.addEventListener('permissionChange', (granted: boolean) => {
            console.log('[OneSignal] Permission changed:', granted);
            setIsSubscribed(granted);
          });
        } catch (initError) {
          console.error('[OneSignal] Error in init callback:', initError);
          setIsInitialized(true);
          clearTimeout(initTimeout);
        }
      });
      
    } catch (error) {
      console.error('[OneSignal] Error initializing:', error);
      setHasAppId(false);
      setIsInitialized(true); // Always mark as initialized even on error
    }
  };

  const setExternalUserId = async (userId: string) => {
    if (!window.OneSignal || !isInitialized) return;

    try {
      window.OneSignalDeferred?.push(async (OneSignal: any) => {
        await OneSignal.login(userId);
        console.log('[OneSignal] External user ID set:', userId);
      });
    } catch (error) {
      console.error('[OneSignal] Error setting external user ID:', error);
    }
  };

  const requestPermission = async (): Promise<boolean> => {
    console.log('[OneSignal] requestPermission called');
    
    // Check if browser supports notifications
    if (!('Notification' in window)) {
      console.log('[OneSignal] Browser does not support notifications');
      throw new Error('Your browser does not support push notifications');
    }

    const nativePermission = Notification.permission;
    console.log('[OneSignal] Native browser permission:', nativePermission);
    
    if (nativePermission === 'denied') {
      console.log('[OneSignal] Browser notifications are blocked');
      throw new Error('Notifications are blocked. Please enable them in your browser settings and try again.');
    }
    
    try {
      // Request native browser permission
      if (nativePermission === 'default') {
        console.log('[OneSignal] Requesting native browser permission...');
        const result = await Notification.requestPermission();
        console.log('[OneSignal] Native permission result:', result);
        
        if (result === 'denied') {
          throw new Error('Permission denied. Please enable notifications in browser settings.');
        }
        
        if (result === 'granted') {
          setIsSubscribed(true);
          return true;
        }
        
        // User dismissed the dialog
        return false;
      }
      
      // Already granted
      if (nativePermission === 'granted') {
        setIsSubscribed(true);
        return true;
      }
      
      return false;
    } catch (error: any) {
      console.error('[OneSignal] Error requesting permission:', error);
      // Provide user-friendly error message
      if (error?.message) {
        throw error;
      }
      throw new Error('Could not enable notifications. Please check your browser settings.');
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
      console.error('[OneSignal] Error sending notification:', error);
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
      console.error('[OneSignal] Error sending notification:', error);
      return false;
    }
  };

  return {
    isInitialized,
    isSubscribed,
    hasAppId,
    requestPermission,
    sendNotificationToUser,
    sendNotificationToAll,
  };
}
