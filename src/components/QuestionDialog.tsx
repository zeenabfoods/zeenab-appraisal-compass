
import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

interface Section {
  id: string;
  name: string;
  description: string;
  sort_order: number;
  max_score: number;
  weight: number;
  is_active: boolean;
}

interface Question {
  id: string;
  question_text: string;
  section_id: string;
  question_type: string;
  weight: number;
  is_required: boolean;
  is_active: boolean;
  sort_order: number;
  cycle_id?: string;
}

interface QuestionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  editingQuestion: Question | null;
  sections: Section[];
  newQuestion: {
    question_text: string;
    section_id: string;
    question_type: string;
    weight: number;
    is_required: boolean;
    sort_order: number;
  };
  setNewQuestion: (question: any) => void;
  onSave: () => void;
}

export function QuestionDialog({
  isOpen,
  onClose,
  editingQuestion,
  sections,
  newQuestion,
  setNewQuestion,
  onSave
}: QuestionDialogProps) {
  const handleClose = () => {
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editingQuestion ? 'Edit' : 'Create'} Question</DialogTitle>
          <DialogDescription>
            {editingQuestion ? 'Update' : 'Add a new'} question to your appraisal template.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="question-text">Question</Label>
            <Textarea
              id="question-text"
              value={newQuestion.question_text}
              onChange={(e) => setNewQuestion({ ...newQuestion, question_text: e.target.value })}
              placeholder="How effectively does the employee manage their workload?"
            />
          </div>
          
          <div>
            <Label htmlFor="section">Section</Label>
            <Select value={newQuestion.section_id} onValueChange={(value) => setNewQuestion({ ...newQuestion, section_id: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select a section" />
              </SelectTrigger>
              <SelectContent>
                {sections.map(section => (
                  <SelectItem key={section.id} value={section.id}>
                    {section.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="question-type">Question Type</Label>
              <Select value={newQuestion.question_type} onValueChange={(value) => setNewQuestion({ ...newQuestion, question_type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rating">Rating Scale</SelectItem>
                  <SelectItem value="text">Text Response</SelectItem>
                  <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="weight">Weight</Label>
              <Input
                id="weight"
                type="number"
                step="0.1"
                min="0.1"
                max="5"
                value={newQuestion.weight}
                onChange={(e) => setNewQuestion({ ...newQuestion, weight: parseFloat(e.target.value) })}
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch
              id="required"
              checked={newQuestion.is_required}
              onCheckedChange={(checked) => setNewQuestion({ ...newQuestion, is_required: checked })}
            />
            <Label htmlFor="required">Required question</Label>
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button onClick={onSave}>
              {editingQuestion ? 'Update' : 'Create'} Question
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
