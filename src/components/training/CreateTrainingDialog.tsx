
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Upload, FileText, Video, Volume2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface CreateTrainingDialogProps {
  onTrainingCreated?: () => void;
}

export function CreateTrainingDialog({ onTrainingCreated }: CreateTrainingDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    content_type: 'document' as 'document' | 'video' | 'audio',
    content_url: '',
    duration_minutes: 30,
    pass_mark: 70
  });
  const [file, setFile] = useState<File | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast({
        title: "Error",
        description: "Training title is required",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      let filePath = '';
      let contentUrl = formData.content_url;

      // Upload file if provided
      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        filePath = `training-content/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('training-files')
          .upload(filePath, file);

        if (uploadError) {
          throw uploadError;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('training-files')
          .getPublicUrl(filePath);
        
        contentUrl = urlData.publicUrl;
      }

      // Create training record
      const { error } = await supabase
        .from('trainings')
        .insert({
          title: formData.title,
          description: formData.description,
          content_type: formData.content_type,
          content_url: contentUrl,
          file_path: filePath,
          duration_minutes: formData.duration_minutes,
          pass_mark: formData.pass_mark,
          is_active: true
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Training content created successfully"
      });

      // Reset form
      setFormData({
        title: '',
        description: '',
        content_type: 'document',
        content_url: '',
        duration_minutes: 30,
        pass_mark: 70
      });
      setFile(null);
      setOpen(false);
      
      if (onTrainingCreated) {
        onTrainingCreated();
      }
    } catch (error) {
      console.error('Error creating training:', error);
      toast({
        title: "Error",
        description: "Failed to create training content",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getContentIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video className="h-4 w-4" />;
      case 'audio': return <Volume2 className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Training
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create New Training Content</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="title">Training Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Enter training title"
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe the training content"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="content_type">Content Type</Label>
            <Select 
              value={formData.content_type} 
              onValueChange={(value: 'document' | 'video' | 'audio') => 
                setFormData(prev => ({ ...prev, content_type: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="document">
                  <div className="flex items-center">
                    <FileText className="h-4 w-4 mr-2" />
                    Document
                  </div>
                </SelectItem>
                <SelectItem value="video">
                  <div className="flex items-center">
                    <Video className="h-4 w-4 mr-2" />
                    Video
                  </div>
                </SelectItem>
                <SelectItem value="audio">
                  <div className="flex items-center">
                    <Volume2 className="h-4 w-4 mr-2" />
                    Audio
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="file">Upload Content File (Optional)</Label>
            <div className="mt-2">
              <Input
                id="file"
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                accept={
                  formData.content_type === 'video' ? 'video/*' :
                  formData.content_type === 'audio' ? 'audio/*' :
                  '.pdf,.doc,.docx,.ppt,.pptx'
                }
              />
            </div>
          </div>

          <div>
            <Label htmlFor="content_url">Content URL (if not uploading file)</Label>
            <Input
              id="content_url"
              value={formData.content_url}
              onChange={(e) => setFormData(prev => ({ ...prev, content_url: e.target.value }))}
              placeholder="https://example.com/training-content"
              type="url"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Input
                id="duration"
                type="number"
                min="1"
                value={formData.duration_minutes}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  duration_minutes: parseInt(e.target.value) || 30 
                }))}
              />
            </div>
            <div>
              <Label htmlFor="pass_mark">Pass Mark (%)</Label>
              <Input
                id="pass_mark"
                type="number"
                min="0"
                max="100"
                value={formData.pass_mark}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  pass_mark: parseInt(e.target.value) || 70 
                }))}
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Training'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
