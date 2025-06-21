
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/components/AuthProvider';

interface NotificationState {
  hasUnread: boolean;
  unreadCount: number;
  hasNewNotification: boolean;
  notifications: any[];
}

let globalChannel: any = null;
let subscriberCount = 0;

export function useNotificationSystem() {
  const { profile } = useAuthContext();
  const [notificationState, setNotificationState] = useState<NotificationState>({
    hasUnread: false,
    unreadCount: 0,
    hasNewNotification: false,
    notifications: []
  });

  const playNotificationSound = useCallback(() => {
    try {
      const audio = new Audio('/lovable-uploads/notification-sound.mp3');
      audio.volume = 0.5;
      audio.play().catch(error => {
        console.log('Could not play notification sound:', error);
        // Fallback to system beep if audio file fails
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance('');
          utterance.volume = 0.1;
          speechSynthesis.speak(utterance);
        }
      });
    } catch (error) {
      console.log('Notification sound not available:', error);
    }
  }, []);

  const clearNewNotificationState = useCallback(() => {
    setNotificationState(prev => ({ ...prev, hasNewNotification: false }));
  }, []);

  const fetchNotifications = useCallback(async () => {
    if (!profile?.id) {
      setNotificationState({
        hasUnread: false,
        unreadCount: 0,
        hasNewNotification: false,
        notifications: []
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select(`
          *,
          employee:profiles!notifications_related_employee_id_fkey(
            first_name,
            last_name,
            position,
            department:departments!profiles_department_id_fkey(name)
          )
        `)
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const notifications = data || [];
      const unreadCount = notifications.filter(n => !n.is_read).length;
      
      setNotificationState(prev => ({
        ...prev,
        hasUnread: unreadCount > 0,
        unreadCount,
        notifications
      }));
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  }, [profile?.id]);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;

      setNotificationState(prev => ({
        ...prev,
        notifications: prev.notifications.map(notif => 
          notif.id === notificationId 
            ? { ...notif, is_read: true }
            : notif
        ),
        unreadCount: Math.max(0, prev.unreadCount - 1),
        hasUnread: prev.unreadCount > 1
      }));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      const unreadIds = notificationState.notifications.filter(n => !n.is_read).map(n => n.id);
      
      if (unreadIds.length === 0) return { success: true };

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .in('id', unreadIds);

      if (error) throw error;

      setNotificationState(prev => ({
        ...prev,
        notifications: prev.notifications.map(notif => ({ ...notif, is_read: true })),
        unreadCount: 0,
        hasUnread: false
      }));

      return { success: true };
    } catch (error) {
      console.error('Error marking all as read:', error);
      return { success: false, error };
    }
  }, [notificationState.notifications]);

  useEffect(() => {
    if (!profile?.id) return;

    // Initial fetch
    fetchNotifications();
    
    // Increment subscriber count
    subscriberCount++;
    console.log('Notification subscriber count:', subscriberCount);
    
    // Create or reuse global channel
    if (!globalChannel) {
      console.log('Creating new notification channel');
      globalChannel = supabase.channel(`notifications-${profile.id}`);
      
      globalChannel
        .on('postgres_changes', 
          { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'notifications',
            filter: `user_id=eq.${profile.id}`
          }, 
          (payload) => {
            console.log('New notification received:', payload);
            
            // Refresh notifications
            fetchNotifications();

            // Update state with new notification
            setNotificationState(prev => ({
              ...prev,
              hasUnread: true,
              unreadCount: prev.unreadCount + 1,
              hasNewNotification: true
            }));

            // Play notification sound
            playNotificationSound();

            // Clear the "new" state after 5 seconds
            setTimeout(() => {
              setNotificationState(prev => ({ ...prev, hasNewNotification: false }));
            }, 5000);
          }
        )
        .on('postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${profile.id}`
          },
          () => {
            fetchNotifications();
          }
        )
        .subscribe((status) => {
          console.log('Notification channel status:', status);
        });
    }

    return () => {
      subscriberCount--;
      console.log('Notification subscriber count after cleanup:', subscriberCount);
      
      // Only remove channel when no more subscribers
      if (subscriberCount <= 0 && globalChannel) {
        console.log('Removing notification channel');
        supabase.removeChannel(globalChannel);
        globalChannel = null;
        subscriberCount = 0;
      }
    };
  }, [profile?.id, fetchNotifications, playNotificationSound]);

  return {
    ...notificationState,
    clearNewNotificationState,
    refreshNotifications: fetchNotifications,
    markAsRead,
    markAllAsRead
  };
}
