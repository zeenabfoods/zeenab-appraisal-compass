
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Section {
  id: string;
  name: string;
  description: string;
  sort_order: number;
  max_score: number;
  weight: number;
  is_active: boolean;
}

interface SectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  section: Section | null;
  onSave: () => void;
}

export function SectionDialog({
  open,
  onOpenChange,
  section,
  onSave
}: SectionDialogProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    max_score: 5,
    weight: 1.0,
    sort_order: 0,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (section) {
      setFormData({
        name: section.name,
        description: section.description,
        max_score: section.max_score,
        weight: section.weight,
        sort_order: section.sort_order,
      });
    } else {
      setFormData({
        name: '',
        description: '',
        max_score: 5,
        weight: 1.0,
        sort_order: 0,
      });
    }
  }, [section, open]);

  const handleSave = async () => {
    if (!formData.name) {
      toast({
        title: "Error",
        description: "Please enter a section name",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);

    try {
      const sectionData = {
        ...formData,
        is_active: true
      };

      if (section) {
        // Update existing section
        const { error } = await supabase
          .from('appraisal_question_sections')
          .update(sectionData)
          .eq('id', section.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Section updated successfully"
        });
      } else {
        // Create new section
        const { error } = await supabase
          .from('appraisal_question_sections')
          .insert(sectionData);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Section created successfully"
        });
      }

      onSave();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error saving section:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save section",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{section ? 'Edit' : 'Create'} Section</DialogTitle>
          <DialogDescription>
            {section ? 'Update' : 'Create a new'} question section for organizing appraisal questions.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="section-name">Section Name</Label>
            <Input
              id="section-name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Job Performance"
            />
          </div>
          
          <div>
            <Label htmlFor="section-description">Description</Label>
            <Textarea
              id="section-description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Assessment of core job responsibilities..."
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="max-score">Max Score</Label>
              <Input
                id="max-score"
                type="number"
                min="1"
                max="10"
                value={formData.max_score}
                onChange={(e) => setFormData({ ...formData, max_score: parseInt(e.target.value) })}
              />
            </div>
            
            <div>
              <Label htmlFor="weight">Weight</Label>
              <Input
                id="weight"
                type="number"
                step="0.1"
                min="0.1"
                max="5"
                value={formData.weight}
                onChange={(e) => setFormData({ ...formData, weight: parseFloat(e.target.value) })}
              />
            </div>
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={handleClose} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : (section ? 'Update' : 'Create')} Section
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
