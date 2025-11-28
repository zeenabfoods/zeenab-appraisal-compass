import { useAlertSound } from './useAlertSound';
import { useVoiceGuides } from './useVoiceGuides';

/**
 * Unified notification system for attendance events
 * Plays alert beep followed by voice guide for each event
 */
export function useAttendanceNotifications() {
  const { playAlertSound } = useAlertSound();
  const { playVoiceGuide } = useVoiceGuides();

  const playNotification = async (eventType: string) => {
    try {
      // Play alert beep first to grab attention
      await playAlertSound();
      
      // Wait 500ms then play voice guide
      setTimeout(() => {
        playVoiceGuide(eventType);
      }, 500);
    } catch (error) {
      console.error('Error playing notification:', error);
    }
  };

  return {
    playNotification,
  };
}
