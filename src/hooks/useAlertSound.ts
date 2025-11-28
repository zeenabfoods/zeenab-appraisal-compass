import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AlertSettings {
  id: string;
  alert_sound_url: string | null;
  alert_volume: number;
}

export function useAlertSound() {
  const { data: settings } = useQuery({
    queryKey: ['alert-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attendance_settings')
        .select('*')
        .single();
      
      if (error) throw error;
      return data as AlertSettings;
    },
  });

  const generateDefaultBeep = (): string => {
    // Create a loud, attention-grabbing beep sound using Web Audio API
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const sampleRate = audioContext.sampleRate;
    const duration = 0.5; // 500ms
    const frequency = 880; // A5 note - high and noticeable
    
    const length = sampleRate * duration;
    const buffer = audioContext.createBuffer(1, length, sampleRate);
    const channelData = buffer.getChannelData(0);
    
    // Generate a beep with attack-decay envelope for loudness
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const envelope = Math.exp(-t * 4); // Exponential decay
      channelData[i] = Math.sin(2 * Math.PI * frequency * t) * envelope;
    }
    
    // Convert to WAV format
    const wavData = encodeWAV(buffer);
    const blob = new Blob([wavData], { type: 'audio/wav' });
    return URL.createObjectURL(blob);
  };

  const playAlertSound = async (volume: number = 1.0) => {
    try {
      let soundUrl: string;
      
      if (settings?.alert_sound_url) {
        // Use uploaded custom sound with signed URL (works even if bucket is private)
        const { data, error } = await supabase.storage
          .from('alert-sounds')
          .createSignedUrl(settings.alert_sound_url, 60);
        if (error || !data?.signedUrl) throw error || new Error('Could not create signed URL for alert sound');
        soundUrl = data.signedUrl;
      } else {
        // Generate default beep sound
        soundUrl = generateDefaultBeep();
      }
      
      const audio = new Audio(soundUrl);
      audio.volume = Math.min(settings?.alert_volume || 0.8, volume);
      await audio.play();
    } catch (error) {
      console.error('Error playing alert sound:', error);
    }
  };

  return {
    playAlertSound,
    settings,
  };
}

// Helper function to encode AudioBuffer to WAV
function encodeWAV(buffer: AudioBuffer): ArrayBuffer {
  const length = buffer.length * buffer.numberOfChannels * 2;
  const arrayBuffer = new ArrayBuffer(44 + length);
  const view = new DataView(arrayBuffer);
  const channels = [buffer.getChannelData(0)];
  const sampleRate = buffer.sampleRate;
  let pos = 0;

  // Write WAV header
  const writeString = (str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(pos++, str.charCodeAt(i));
    }
  };

  writeString('RIFF');
  view.setUint32(pos, 36 + length, true); pos += 4;
  writeString('WAVE');
  writeString('fmt ');
  view.setUint32(pos, 16, true); pos += 4; // fmt chunk size
  view.setUint16(pos, 1, true); pos += 2; // PCM format
  view.setUint16(pos, buffer.numberOfChannels, true); pos += 2;
  view.setUint32(pos, sampleRate, true); pos += 4;
  view.setUint32(pos, sampleRate * 2 * buffer.numberOfChannels, true); pos += 4;
  view.setUint16(pos, buffer.numberOfChannels * 2, true); pos += 2;
  view.setUint16(pos, 16, true); pos += 2;
  writeString('data');
  view.setUint32(pos, length, true); pos += 4;

  // Write audio data
  const volume = 0.9;
  for (let i = 0; i < buffer.length; i++) {
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const sample = Math.max(-1, Math.min(1, channels[channel][i])) * volume;
      view.setInt16(pos, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
      pos += 2;
    }
  }

  return arrayBuffer;
}
