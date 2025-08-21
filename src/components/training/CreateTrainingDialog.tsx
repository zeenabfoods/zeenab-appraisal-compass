
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Upload, Video, FileText, Headphones } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface CreateTrainingDialogProps {
  onTrainingCreated: () => void;
}

export function CreateTrainingDialog({ onTrainingCreated }: CreateTrainingDialogProps) {
  const { toast } = useToast();
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    content_type: '',
    content_url: '',
    duration_minutes: '',
    pass_mark: '70',
    max_attempts: '3'
  });

  const [file, setFile] = useState<File | null>(null);

  const contentTypes = [
    { value: 'video', label: 'Video Training', icon: Video, description: 'Upload video files (MP4, AVI, MOV)' },
    { value: 'audio', label: 'Audio Training', icon: Headphones, description: 'Upload audio files (MP3, WAV)' },
    { value: 'document', label: 'Document Training', icon: FileText, description: 'Upload documents (PDF, DOC, DOCX)' },
    { value: 'url', label: 'External URL', icon: Upload, description: 'Link to external training content' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setLoading(true);
    try {
      let file_path = null;
      let content_url = formData.content_url;

      // Handle file upload for non-URL content types
      if (file && formData.content_type !== 'url') {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `training-content/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('training-files')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        file_path = filePath;
        // Get public URL for the uploaded file
        const { data: { publicUrl } } = supabase.storage
          .from('training-files')
          .getPublicUrl(filePath);
        content_url = publicUrl;
      }

      // Create the training record
      const { error: insertError } = await supabase
        .from('trainings')
        .insert({
          title: formData.title,
          description: formData.description,
          content_type: formData.content_type,
          content_url: content_url,
          file_path: file_path,
          duration_minutes: formData.duration_minutes ? parseInt(formData.duration_minutes) : null,
          pass_mark: parseInt(formData.pass_mark),
          max_attempts: parseInt(formData.max_attempts),
          created_by: profile.id
        });

      if (insertError) throw insertError;

      toast({
        title: "Training Created",
        description: "Training content has been created successfully"
      });

      setFormData({
        title: '',
        description: '',
        content_type: '',
        content_url: '',
        duration_minutes: '',
        pass_mark: '70',
        max_attempts: '3'
      });
      setFile(null);
      setOpen(false);
      onTrainingCreated();

    } catch (error: any) {
      console.error('Error creating training:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const selectedContentType = contentTypes.find(ct => ct.value === formData.content_type);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Create Training
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Training</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Training Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                placeholder="Enter training title"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Describe what this training covers"
                rows={3}
              />
            </div>
          </div>

          {/* Content Type Selection */}
          <div className="space-y-4">
            <Label>Content Type</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {contentTypes.map((type) => (
                <Card 
                  key={type.value}
                  className={`cursor-pointer transition-colors ${
                    formData.content_type === type.value 
                      ? 'border-primary bg-primary/5' 
                      : 'hover:border-gray-300'
                  }`}
                  onClick={() => setFormData({...formData, content_type: type.value})}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <type.icon className="h-5 w-5 mt-1 text-primary" />
                      <div>
                        <h4 className="font-medium">{type.label}</h4>
                        <p className="text-sm text-muted-foreground">{type.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Content Source */}
          {formData.content_type && (
            <div className="space-y-4">
              <Label>Content Source</Label>
              {formData.content_type === 'url' ? (
                <div>
                  <Input
                    value={formData.content_url}
                    onChange={(e) => setFormData({...formData, content_url: e.target.value})}
                    placeholder="https://example.com/training-video"
                    type="url"
                    required
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Enter the URL to external training content
                  </p>
                </div>
              ) : (
                <div>
                  <Input
                    type="file"
                    onChange={handleFileChange}
                    accept={
                      formData.content_type === 'video' ? '.mp4,.avi,.mov,.mkv' :
                      formData.content_type === 'audio' ? '.mp3,.wav,.ogg' :
                      '.pdf,.doc,.docx'
                    }
                    required
                  />
                  {file && (
                    <div className="mt-2 flex items-center gap-2">
                      <selectedContentType?.icon className="h-4 w-4" />
                      <span className="text-sm">{file.name}</span>
                      <Badge variant="outline">{(file.size / 1024 / 1024).toFixed(1)} MB</Badge>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Training Settings */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Input
                id="duration"
                type="number"
                value={formData.duration_minutes}
                onChange={(e) => setFormData({...formData, duration_minutes: e.target.value})}
                placeholder="30"
                min="1"
              />
            </div>
            
            <div>
              <Label htmlFor="pass_mark">Pass Mark (%)</Label>
              <Input
                id="pass_mark"
                type="number"
                value={formData.pass_mark}
                onChange={(e) => setFormData({...formData, pass_mark: e.target.value})}
                min="1"
                max="100"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="max_attempts">Max Attempts</Label>
              <Input
                id="max_attempts"
                type="number"
                value={formData.max_attempts}
                onChange={(e) => setFormData({...formData, max_attempts: e.target.value})}
                min="1"
                max="10"
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !formData.title || !formData.content_type}>
              {loading ? 'Creating...' : 'Create Training'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
