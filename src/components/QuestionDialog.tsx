
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

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

interface Section {
  id: string;
  name: string;
  description: string;
  sort_order: number;
  max_score: number;
  weight: number;
  is_active: boolean;
}

interface QuestionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  question: Question | null;
  sections: Section[];
  selectedStaff: string;
  onSave: () => void;
  isTemplateMode?: boolean; // New prop to distinguish between template and employee modes
}

export function QuestionDialog({
  open,
  onOpenChange,
  question,
  sections,
  selectedStaff,
  onSave,
  isTemplateMode = false
}: QuestionDialogProps) {
  const { toast } = useToast();
  const { profile } = useAuth();
  const [formData, setFormData] = useState({
    question_text: '',
    section_id: '',
    question_type: 'rating',
    weight: 1.0,
    is_required: true,
    sort_order: 0,
  });
  const [saving, setSaving] = useState(false);

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
    if (!formData.question_text || !formData.section_id) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    // Only require employee selection if not in template mode
    if (!isTemplateMode && !selectedStaff) {
      toast({
        title: "Error",
        description: "Please select an employee first",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);

    try {
      if (question) {
        // Update existing question
        const { error: updateError } = await supabase
          .from('appraisal_questions')
          .update({
            question_text: formData.question_text,
            section_id: formData.section_id,
            question_type: formData.question_type,
            weight: formData.weight,
            is_required: formData.is_required,
            sort_order: formData.sort_order,
          })
          .eq('id', question.id);

        if (updateError) throw updateError;

        toast({
          title: "Success",
          description: "Question updated successfully"
        });
      } else {
        // Create new question
        const { data: newQuestion, error: createError } = await supabase
          .from('appraisal_questions')
          .insert({
            question_text: formData.question_text,
            section_id: formData.section_id,
            question_type: formData.question_type,
            weight: formData.weight,
            is_required: formData.is_required,
            is_active: true,
            sort_order: formData.sort_order,
          })
          .select()
          .single();

        if (createError) throw createError;

        // Only assign to employee if not in template mode and employee is selected
        if (!isTemplateMode && selectedStaff) {
          const { error: assignError } = await supabase
            .from('employee_appraisal_questions')
            .insert({
              employee_id: selectedStaff,
              question_id: newQuestion.id,
              cycle_id: '00000000-0000-0000-0000-000000000000', // Default cycle
              assigned_by: profile?.id
            });

          if (assignError) throw assignError;

          toast({
            title: "Success",
            description: "Question created and assigned successfully"
          });
        } else {
          toast({
            title: "Success",
            description: isTemplateMode ? "Question template created successfully" : "Question created successfully"
          });
        }
      }

      onSave();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error saving question:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save question",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {question ? 'Edit' : 'Create'} {isTemplateMode ? 'Question Template' : 'Question'}
          </DialogTitle>
          <DialogDescription>
            {question ? 'Update' : 'Create a new'} appraisal question{isTemplateMode ? ' template' : ''} for evaluation.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="question-text">Question Text</Label>
            <Textarea
              id="question-text"
              value={formData.question_text}
              onChange={(e) => setFormData({ ...formData, question_text: e.target.value })}
              placeholder="How would you rate the employee's performance in..."
              rows={3}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="section">Section</Label>
              <Select value={formData.section_id} onValueChange={(value) => setFormData({ ...formData, section_id: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select section" />
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
            
            <div>
              <Label htmlFor="question-type">Question Type</Label>
              <Select value={formData.question_type} onValueChange={(value) => setFormData({ ...formData, question_type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rating">Rating (1-5)</SelectItem>
                  <SelectItem value="text">Text Response</SelectItem>
                  <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                  <SelectItem value="yes_no">Yes/No</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
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
            
            <div>
              <Label htmlFor="sort-order">Sort Order</Label>
              <Input
                id="sort-order"
                type="number"
                min="0"
                value={formData.sort_order}
                onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) })}
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch
              id="is-required"
              checked={formData.is_required}
              onCheckedChange={(checked) => setFormData({ ...formData, is_required: checked })}
            />
            <Label htmlFor="is-required">Required Question</Label>
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : (question ? 'Update' : 'Create')} Question
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
