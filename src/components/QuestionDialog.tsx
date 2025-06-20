
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
  employee_id?: string;
}

interface QuestionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  question: Question | null;
  sections: Section[];
  selectedStaff: string;
  onSave: () => void;
}

export function QuestionDialog({
  open,
  onOpenChange,
  question,
  sections,
  selectedStaff,
  onSave
}: QuestionDialogProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    question_text: '',
    section_id: '',
    question_type: 'rating',
    weight: 1.0,
    is_required: true,
    sort_order: 0,
  });

  useEffect(() => {
    if (question) {
      setFormData({
        question_text: question.question_text,
        section_id: question.section_id,
        question_type: question.question_type,
        weight: question.weight,
        is_required: question.is_required,
        sort_order: question.sort_order,
      });
    } else {
      setFormData({
        question_text: '',
        section_id: '',
        question_type: 'rating',
        weight: 1.0,
        is_required: true,
        sort_order: 0,
      });
    }
  }, [question, open]);

  const handleSave = async () => {
    if (!selectedStaff || !formData.question_text || !formData.section_id) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      if (question) {
        const { error } = await supabase
          .from('employee_questions')
          .update({
            ...formData,
            employee_id: selectedStaff
          })
          .eq('id', question.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('employee_questions')
          .insert({
            ...formData,
            employee_id: selectedStaff
          });
        
        if (error) throw error;
      }
      
      onSave();
    } catch (error: any) {
      console.error('Error saving question:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{question ? 'Edit' : 'Create'} Question</DialogTitle>
          <DialogDescription>
            {question ? 'Update' : 'Add a new'} question for the selected employee.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="question-text">Question</Label>
            <Textarea
              id="question-text"
              value={formData.question_text}
              onChange={(e) => setFormData({ ...formData, question_text: e.target.value })}
              placeholder="How effectively does the employee manage their workload?"
            />
          </div>
          
          <div>
            <Label htmlFor="section">Section</Label>
            <Select value={formData.section_id} onValueChange={(value) => setFormData({ ...formData, section_id: value })}>
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
              <Select value={formData.question_type} onValueChange={(value) => setFormData({ ...formData, question_type: value })}>
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
                value={formData.weight}
                onChange={(e) => setFormData({ ...formData, weight: parseFloat(e.target.value) })}
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch
              id="required"
              checked={formData.is_required}
              onCheckedChange={(checked) => setFormData({ ...formData, is_required: checked })}
            />
            <Label htmlFor="required">Required question</Label>
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {question ? 'Update' : 'Create'} Question
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
