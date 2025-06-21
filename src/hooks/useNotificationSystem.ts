import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface NotificationState {
  hasUnread: boolean;
  unreadCount: number;
  hasNewNotification: boolean;
}

export function useNotificationSystem() {
  const { profile } = useAuth();
  const [notificationState, setNotificationState] = useState<NotificationState>({
    hasUnread: false,
    unreadCount: 0,
    hasNewNotification: false
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

  const fetchNotificationCount = async () => {
    if (!profile?.id) return;

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('id, is_read')
        .eq('user_id', profile.id);

      if (error) throw error;

      const unreadCount = data?.filter(n => !n.is_read).length || 0;
      
      setNotificationState(prev => ({
        ...prev,
        hasUnread: unreadCount > 0,
        unreadCount
      }));
    } catch (error) {
      console.error('Error fetching notification count:', error);
    }
  };

  useEffect(() => {
    fetchNotificationCount();
    
    // Set up real-time subscription for new notifications
    const channel = supabase
      .channel('notification-system')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'notifications',
          filter: `user_id=eq.${profile?.id}`
        }, 
        (payload) => {
          console.log('New notification received:', payload);
          
          // Update state with new notification
          setNotificationState(prev => ({
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
          filter: `user_id=eq.${profile?.id}`
        },
        () => {
          fetchNotificationCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, playNotificationSound]);

  return {
    ...notificationState,
    clearNewNotificationState,
    refreshNotifications: fetchNotificationCount
  };
}
