import { supabase } from '@/integrations/supabase/client';

/**
 * Play voice guide only for attendance events
 */
export async function playAttendanceNotification(eventType: string) {
  try {
    // Fetch voice guide
    const { data: voiceGuide } = await supabase
      .from('voice_guides')
      .select('*')
      .eq('event_type', eventType)
      .eq('is_active', true)
      .single();

    // Play voice guide directly
    if (voiceGuide?.audio_file_url) {
      const { data, error } = await supabase.storage
        .from('alert-sounds')
        .createSignedUrl(voiceGuide.audio_file_url, 60);
      if (error || !data?.signedUrl) return;
      
      const voiceAudio = new Audio(data.signedUrl);
      voiceAudio.volume = voiceGuide.volume || 0.8;
      await voiceAudio.play();
    }
  } catch (error) {
    console.error('Error playing attendance notification:', error);
  }
}
