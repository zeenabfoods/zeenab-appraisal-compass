import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface VoiceGuide {
  id: string;
  event_type: string;
  event_category: string;
  phrase_text: string;
  audio_file_url: string | null;
  is_active: boolean;
  volume: number;
}

export function useVoiceGuides() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: voiceGuides, isLoading } = useQuery({
    queryKey: ['voice-guides'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('voice_guides')
        .select('*')
        .order('event_category', { ascending: true })
        .order('event_type', { ascending: true });
      
      if (error) throw error;
      return data as VoiceGuide[];
    },
  });

  const uploadVoiceMutation = useMutation({
    mutationFn: async ({ eventType, file }: { eventType: string; file: File }) => {
      // Validate file
      if (!file.type.startsWith('audio/')) {
        throw new Error('Please upload an audio file (MP3, WAV, OGG)');
      }
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('File size must be less than 5MB');
      }

      // Upload to storage
      const fileName = `voice-${eventType}-${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('alert-sounds')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Update voice guide record
      const { error: updateError } = await supabase
        .from('voice_guides')
        .update({ audio_file_url: fileName })
        .eq('event_type', eventType);

      if (updateError) throw updateError;

      return fileName;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['voice-guides'] });
      toast({
        title: 'Success',
        description: 'Voice guide uploaded successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Upload Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const playVoiceGuide = async (eventType: string) => {
    try {
      const guide = voiceGuides?.find(g => g.event_type === eventType);
      if (!guide?.audio_file_url) {
        toast({
          title: 'No Audio File',
          description: 'Please upload an audio file first',
          variant: 'destructive',
        });
        return;
      }

      const { data } = supabase.storage
        .from('alert-sounds')
        .getPublicUrl(guide.audio_file_url);

      const audio = new Audio(data.publicUrl);
      audio.volume = guide.volume;
      await audio.play();
    } catch (error) {
      console.error('Error playing voice guide:', error);
      toast({
        title: 'Playback Error',
        description: 'Failed to play audio file',
        variant: 'destructive',
      });
    }
  };

  const updateVolumeMutation = useMutation({
    mutationFn: async ({ eventType, volume }: { eventType: string; volume: number }) => {
      const { error } = await supabase
        .from('voice_guides')
        .update({ volume })
        .eq('event_type', eventType);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['voice-guides'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Update Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    voiceGuides,
    isLoading,
    uploadVoice: uploadVoiceMutation.mutate,
    isUploading: uploadVoiceMutation.isPending,
    playVoiceGuide,
    updateVolume: updateVolumeMutation.mutate,
  };
}