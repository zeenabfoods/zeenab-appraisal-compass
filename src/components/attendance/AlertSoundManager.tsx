import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Upload, Volume2, Play } from 'lucide-react';
import { useAlertSound } from '@/hooks/useAlertSound';
import { useQueryClient } from '@tanstack/react-query';

export function AlertSoundManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { settings, playAlertSound } = useAlertSound();
  const [uploading, setUploading] = useState(false);
  const [volume, setVolume] = useState(settings?.alert_volume || 0.8);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('audio/')) {
      toast({
        title: 'Invalid File',
        description: 'Please upload an audio file (MP3, WAV, OGG)',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File Too Large',
        description: 'Please upload a file smaller than 5MB',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    try {
      // Upload file to storage
      const fileName = `alert-${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('alert-sounds')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Update settings
      const { error: updateError } = await supabase
        .from('attendance_settings')
        .update({ alert_sound_url: fileName })
        .eq('id', settings?.id || '');

      if (updateError) throw updateError;

      queryClient.invalidateQueries({ queryKey: ['alert-settings'] });

      toast({
        title: 'Success',
        description: 'Alert sound uploaded successfully',
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleVolumeChange = async (values: number[]) => {
    const newVolume = values[0];
    setVolume(newVolume);

    try {
      const { error } = await supabase
        .from('attendance_settings')
        .update({ alert_volume: newVolume })
        .eq('id', settings?.id || '');

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['alert-settings'] });
    } catch (error: any) {
      console.error('Volume update error:', error);
      toast({
        title: 'Update Failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleTestSound = () => {
    playAlertSound(volume);
    toast({
      title: 'Playing Alert Sound',
      description: 'Testing your current alert sound configuration',
    });
  };

  const handleResetToDefault = async () => {
    try {
      // Delete custom sound if exists
      if (settings?.alert_sound_url) {
        await supabase.storage
          .from('alert-sounds')
          .remove([settings.alert_sound_url]);
      }

      // Reset to default
      const { error } = await supabase
        .from('attendance_settings')
        .update({ alert_sound_url: null })
        .eq('id', settings?.id || '');

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['alert-settings'] });

      toast({
        title: 'Reset Complete',
        description: 'Using default generated beep sound',
      });
    } catch (error: any) {
      console.error('Reset error:', error);
      toast({
        title: 'Reset Failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Volume2 className="h-5 w-5" />
          Alert Sound Configuration
        </CardTitle>
        <CardDescription>
          Upload a custom alert sound or use the default generated beep
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Upload Section */}
        <div className="space-y-2">
          <Label htmlFor="sound-upload">Upload Custom Alert Sound</Label>
          <div className="flex items-center gap-2">
            <Input
              id="sound-upload"
              type="file"
              accept="audio/*"
              onChange={handleFileUpload}
              disabled={uploading}
              className="flex-1"
            />
            <Button
              variant="outline"
              size="icon"
              disabled={uploading}
              onClick={() => document.getElementById('sound-upload')?.click()}
            >
              <Upload className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Supported formats: MP3, WAV, OGG (Max 5MB)
          </p>
        </div>

        {/* Volume Control */}
        <div className="space-y-2">
          <Label>Alert Volume</Label>
          <div className="flex items-center gap-4">
            <Volume2 className="h-4 w-4 text-muted-foreground" />
            <Slider
              value={[volume]}
              onValueChange={handleVolumeChange}
              max={1}
              step={0.1}
              className="flex-1"
            />
            <span className="text-sm font-medium w-12 text-right">
              {Math.round(volume * 100)}%
            </span>
          </div>
        </div>

        {/* Current Sound Status */}
        <div className="rounded-lg bg-muted p-4">
          <p className="text-sm font-medium mb-1">Current Alert Sound:</p>
          <p className="text-xs text-muted-foreground">
            {settings?.alert_sound_url ? 'Custom uploaded sound' : 'Default generated beep'}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button onClick={handleTestSound} variant="outline" className="flex-1">
            <Play className="h-4 w-4 mr-2" />
            Test Sound
          </Button>
          {settings?.alert_sound_url && (
            <Button onClick={handleResetToDefault} variant="outline">
              Reset to Default
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
