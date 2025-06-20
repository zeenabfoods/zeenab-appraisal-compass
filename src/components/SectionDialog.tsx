
import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

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
  isOpen: boolean;
  onClose: () => void;
  editingSection: Section | null;
  newSection: {
    name: string;
    description: string;
    max_score: number;
    weight: number;
    sort_order: number;
  };
  setNewSection: (section: any) => void;
  onSave: () => void;
}

export function SectionDialog({
  isOpen,
  onClose,
  editingSection,
  newSection,
  setNewSection,
  onSave
}: SectionDialogProps) {
  const handleClose = () => {
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editingSection ? 'Edit' : 'Create'} Section</DialogTitle>
          <DialogDescription>
            {editingSection ? 'Update' : 'Create a new'} question section for organizing appraisal questions.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="section-name">Section Name</Label>
            <Input
              id="section-name"
              value={newSection.name}
              onChange={(e) => setNewSection({ ...newSection, name: e.target.value })}
              placeholder="Job Performance"
            />
          </div>
          
          <div>
            <Label htmlFor="section-description">Description</Label>
            <Textarea
              id="section-description"
              value={newSection.description}
              onChange={(e) => setNewSection({ ...newSection, description: e.target.value })}
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
                value={newSection.max_score}
                onChange={(e) => setNewSection({ ...newSection, max_score: parseInt(e.target.value) })}
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
                value={newSection.weight}
                onChange={(e) => setNewSection({ ...newSection, weight: parseFloat(e.target.value) })}
              />
            </div>
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button onClick={onSave}>
              {editingSection ? 'Update' : 'Create'} Section
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
