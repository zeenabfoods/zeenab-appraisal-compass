import { useVoiceGuides } from './useVoiceGuides';

/**
 * Unified notification system for attendance events
 * Plays voice guide only for each event
 */
export function useAttendanceNotifications() {
  const { playVoiceGuide } = useVoiceGuides();

  const playNotification = async (eventType: string) => {
    try {
      // Play voice guide directly
      playVoiceGuide(eventType);
    } catch (error) {
      console.error('Error playing notification:', error);
    }
  };

  return {
    playNotification,
  };
}
