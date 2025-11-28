import { supabase } from '@/integrations/supabase/client';

/**
 * Play alert beep followed by voice guide for attendance events
 */
export async function playAttendanceNotification(eventType: string) {
  try {
    // Fetch alert settings
    const { data: alertSettings } = await supabase
      .from('attendance_settings')
      .select('*')
      .single();

    // Fetch voice guide
    const { data: voiceGuide } = await supabase
      .from('voice_guides')
      .select('*')
      .eq('event_type', eventType)
      .eq('is_active', true)
      .single();

    // Play alert beep first
    let beepUrl: string;
    if (alertSettings?.alert_sound_url) {
      const { data } = supabase.storage
        .from('alert-sounds')
        .getPublicUrl(alertSettings.alert_sound_url);
      beepUrl = data.publicUrl;
    } else {
      beepUrl = generateDefaultBeep();
    }

    const alertAudio = new Audio(beepUrl);
    alertAudio.volume = alertSettings?.alert_volume || 0.8;
    await alertAudio.play();

    // Wait 500ms then play voice guide
    if (voiceGuide?.audio_file_url) {
      setTimeout(async () => {
        const { data } = supabase.storage
          .from('alert-sounds')
          .getPublicUrl(voiceGuide.audio_file_url);
        
        const voiceAudio = new Audio(data.publicUrl);
        voiceAudio.volume = voiceGuide.volume || 0.8;
        await voiceAudio.play();
      }, 500);
    }
  } catch (error) {
    console.error('Error playing attendance notification:', error);
  }
}

function generateDefaultBeep(): string {
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
}

function encodeWAV(buffer: AudioBuffer): ArrayBuffer {
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
}
