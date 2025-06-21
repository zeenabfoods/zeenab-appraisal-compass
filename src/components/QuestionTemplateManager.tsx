
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Plus } from 'lucide-react';
import { QuestionDialog } from './QuestionDialog';
import { SectionDialog } from './SectionDialog';
import { SectionCard } from './SectionCard';

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

export function QuestionTemplateManager() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [sections, setSections] = useState<Section[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [showQuestionDialog, setShowQuestionDialog] = useState(false);
  const [showSectionDialog, setShowSectionDialog] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [editingSection, setEditingSection] = useState<Section | null>(null);

  const [newQuestion, setNewQuestion] = useState({
    question_text: '',
    section_id: '',
    question_type: 'rating',
    weight: 1,
    is_required: true,
    sort_order: 0,
  });

  const [newSection, setNewSection] = useState({
    name: '',
    description: '',
    max_score: 5,
    weight: 1,
    sort_order: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load sections
      const { data: sectionsData, error: sectionsError } = await supabase
        .from('appraisal_question_sections')
        .select('*')
        .order('sort_order');

      if (sectionsError) throw sectionsError;
      setSections(sectionsData || []);

      // Load questions
      const { data: questionsData, error: questionsError } = await supabase
        .from('appraisal_questions')
        .select('*')
        .order('sort_order');

      if (questionsError) throw questionsError;
      setQuestions(questionsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Failed to load template data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveQuestion = async () => {
    try {
      if (editingQuestion) {
        const { error } = await supabase
          .from('appraisal_questions')
          .update(newQuestion)
          .eq('id', editingQuestion.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('appraisal_questions')
          .insert(newQuestion)
          .select()
          .single();

        if (error) throw error;
        setQuestions([...questions, data]);
      }

      setShowQuestionDialog(false);
      setEditingQuestion(null);
      setNewQuestion({
        question_text: '',
        section_id: '',
        question_type: 'rating',
        weight: 1,
        is_required: true,
        sort_order: 0,
      });

      toast({
        title: "Success",
        description: `Question ${editingQuestion ? 'updated' : 'created'} successfully`,
      });

      loadData();
    } catch (error) {
      console.error('Error saving question:', error);
      toast({
        title: "Error",
        description: "Failed to save question",
        variant: "destructive",
      });
    }
  };

  const saveSection = async () => {
    try {
      if (editingSection) {
        const { error } = await supabase
          .from('appraisal_question_sections')
          .update(newSection)
          .eq('id', editingSection.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('appraisal_question_sections')
          .insert(newSection)
          .select()
          .single();

        if (error) throw error;
        setSections([...sections, data]);
      }

      setShowSectionDialog(false);
      setEditingSection(null);
      setNewSection({
        name: '',
        description: '',
        max_score: 5,
        weight: 1,
        sort_order: 0,
      });

      toast({
        title: "Success",
        description: `Section ${editingSection ? 'updated' : 'created'} successfully`,
      });

      loadData();
    } catch (error) {
      console.error('Error saving section:', error);
      toast({
        title: "Error",
        description: "Failed to save section",
        variant: "destructive",
      });
    }
  };

  const deleteSection = async (sectionId: string) => {
    try {
      const { error } = await supabase.rpc('delete_section_with_questions', {
        section_id_param: sectionId
      });

      if (error) throw error;

      setSections(sections.filter(s => s.id !== sectionId));
      setQuestions(questions.filter(q => q.section_id !== sectionId));
      
      toast({
        title: "Success",
        description: "Section and all related questions deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting section:', error);
      toast({
        title: "Error",
        description: "Failed to delete section",
        variant: "destructive",
      });
    }
  };

  const deleteQuestion = async (questionId: string) => {
    try {
      const { error } = await supabase
        .from('appraisal_questions')
        .delete()
        .eq('id', questionId);

      if (error) throw error;

      setQuestions(questions.filter(q => q.id !== questionId));
      toast({
        title: "Success",
        description: "Question deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting question:', error);
      toast({
        title: "Error",
        description: "Failed to delete question",
        variant: "destructive",
      });
    }
  };

  const toggleQuestionStatus = async (questionId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('appraisal_questions')
        .update({ is_active: isActive })
        .eq('id', questionId);

      if (error) throw error;

      setQuestions(questions.map(q => 
        q.id === questionId ? { ...q, is_active: isActive } : q
      ));

      toast({
        title: "Success",
        description: `Question ${isActive ? 'activated' : 'deactivated'}`,
      });
    } catch (error) {
      console.error('Error updating question status:', error);
      toast({
        title: "Error",
        description: "Failed to update question status",
        variant: "destructive",
      });
    }
  };

  const editQuestion = (question: Question) => {
    setEditingQuestion(question);
    setNewQuestion({
      question_text: question.question_text,
      section_id: question.section_id,
      question_type: question.question_type,
      weight: question.weight,
      is_required: question.is_required,
      sort_order: question.sort_order,
    });
    setShowQuestionDialog(true);
  };

  const editSection = (section: Section) => {
    setEditingSection(section);
    setNewSection({
      name: section.name,
      description: section.description || '',
      max_score: section.max_score,
      weight: section.weight,
      sort_order: section.sort_order,
    });
    setShowSectionDialog(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (profile?.role !== 'hr' && profile?.role !== 'admin') {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <h3 className="text-lg font-medium text-gray-900">Access Restricted</h3>
          <p className="text-gray-500 text-center">
            Only HR and Admin users can manage question templates.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Question Templates</h2>
          <p className="text-gray-600">Manage appraisal questions and sections</p>
        </div>
        
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => setShowSectionDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Section
          </Button>

          <Button onClick={() => setShowQuestionDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Question
          </Button>
        </div>
      </div>

      {/* Sections and Questions */}
      {sections.map(section => {
        const sectionQuestions = questions.filter(q => q.section_id === section.id);
        
        return (
          <SectionCard
            key={section.id}
            section={section}
            questions={sectionQuestions}
            onEditSection={editSection}
            onDeleteSection={deleteSection}
            onEditQuestion={editQuestion}
            onDeleteQuestion={deleteQuestion}
            onToggleQuestionStatus={toggleQuestionStatus}
          />
        );
      })}

      {sections.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <h3 className="text-lg font-medium text-gray-900">No sections created</h3>
            <p className="text-gray-500 text-center mb-6">
              Start by creating sections to organize your appraisal questions.
            </p>
            <Button onClick={() => setShowSectionDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create First Section
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      <SectionDialog
        open={showSectionDialog}
        onOpenChange={(open) => {
          setShowSectionDialog(open);
          if (!open) setEditingSection(null);
        }}
        section={editingSection}
        onSave={() => {
          saveSection();
          setShowSectionDialog(false);
        }}
      />

      <QuestionDialog
        open={showQuestionDialog}
        onOpenChange={(open) => {
          setShowQuestionDialog(open);
          if (!open) setEditingQuestion(null);
        }}
        question={editingQuestion}
        sections={sections}
        selectedStaff=""
        onSave={() => {
          saveQuestion();
          setShowQuestionDialog(false);
        }}
      />
    </div>
  );
}
