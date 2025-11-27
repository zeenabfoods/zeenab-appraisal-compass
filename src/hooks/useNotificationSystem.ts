
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

  const playNotificationSound = useCallback(async () => {
    try {
      // Fetch alert settings
      const { data: settings } = await supabase
        .from('attendance_settings')
        .select('*')
        .single();

      let soundUrl: string;
      
      if (settings?.alert_sound_url) {
        // Use uploaded custom sound
        const { data } = supabase.storage
          .from('alert-sounds')
          .getPublicUrl(settings.alert_sound_url);
        soundUrl = data.publicUrl;
      } else {
        // Generate default beep sound
        soundUrl = generateDefaultBeep();
      }
      
      const audio = new Audio(soundUrl);
      audio.volume = settings?.alert_volume || 0.8;
      await audio.play();
    } catch (error) {
      console.error('Error playing notification sound:', error);
    }
  }, []);

  const generateDefaultBeep = (): string => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const sampleRate = audioContext.sampleRate;
    const duration = 0.5;
    const frequency = 880;
    
    const length = sampleRate * duration;
    const buffer = audioContext.createBuffer(1, length, sampleRate);
    const channelData = buffer.getChannelData(0);
    
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const envelope = Math.exp(-t * 4);
      channelData[i] = Math.sin(2 * Math.PI * frequency * t) * envelope;
    }
    
    const wavData = encodeWAV(buffer);
    const blob = new Blob([wavData], { type: 'audio/wav' });
    return URL.createObjectURL(blob);
  };

  const encodeWAV = (buffer: AudioBuffer): ArrayBuffer => {
    const length = buffer.length * buffer.numberOfChannels * 2;
    const arrayBuffer = new ArrayBuffer(44 + length);
    const view = new DataView(arrayBuffer);
    const channels = [buffer.getChannelData(0)];
    const sampleRate = buffer.sampleRate;
    let pos = 0;

    const writeString = (str: string) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(pos++, str.charCodeAt(i));
      }
    };

    writeString('RIFF');
    view.setUint32(pos, 36 + length, true); pos += 4;
    writeString('WAVE');
    writeString('fmt ');
    view.setUint32(pos, 16, true); pos += 4;
    view.setUint16(pos, 1, true); pos += 2;
    view.setUint16(pos, buffer.numberOfChannels, true); pos += 2;
    view.setUint32(pos, sampleRate, true); pos += 4;
    view.setUint32(pos, sampleRate * 2 * buffer.numberOfChannels, true); pos += 4;
    view.setUint16(pos, buffer.numberOfChannels * 2, true); pos += 2;
    view.setUint16(pos, 16, true); pos += 2;
    writeString('data');
    view.setUint32(pos, length, true); pos += 4;

    const volume = 0.9;
    for (let i = 0; i < buffer.length; i++) {
      for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, channels[channel][i])) * volume;
        view.setInt16(pos, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
        pos += 2;
      }
    }

    return arrayBuffer;
  };

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
