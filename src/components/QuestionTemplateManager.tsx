
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

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
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

  const handleSectionSaved = () => {
    console.log('Section save callback triggered');
    setShowSectionDialog(false);
    setEditingSection(null);
    loadData(); // Reload data to get fresh state
  };

  const handleQuestionSaved = () => {
    console.log('Question save callback triggered');
    setShowQuestionDialog(false);
    setEditingQuestion(null);
    loadData(); // Reload data to get fresh state
  };

  const deleteSection = async (sectionId: string) => {
    try {
      const { error } = await supabase.rpc('delete_section_with_questions', {
        section_id_param: sectionId
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Section and all related questions deleted successfully",
      });
      
      loadData(); // Reload data to get fresh state
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

      toast({
        title: "Success",
        description: "Question deleted successfully",
      });
      
      loadData(); // Reload data to get fresh state
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

      toast({
        title: "Success",
        description: `Question ${isActive ? 'activated' : 'deactivated'}`,
      });
      
      loadData(); // Reload data to get fresh state
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
    setShowQuestionDialog(true);
  };

  const editSection = (section: Section) => {
    setEditingSection(section);
    setShowSectionDialog(true);
  };

  const openNewQuestionDialog = () => {
    setEditingQuestion(null);
    setShowQuestionDialog(true);
  };

  const openNewSectionDialog = () => {
    setEditingSection(null);
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
          <Button variant="outline" onClick={openNewSectionDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Add Section
          </Button>

          <Button onClick={openNewQuestionDialog}>
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
            <Button onClick={openNewSectionDialog}>
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
        onSave={handleSectionSaved}
      />

      <QuestionDialog
        open={showQuestionDialog}
        onOpenChange={(open) => {
          setShowQuestionDialog(open);
          if (!open) setEditingQuestion(null);
        }}
        question={editingQuestion}
        sections={sections}
        selectedStaff="" // Empty in template mode
        onSave={handleQuestionSaved}
        isTemplateMode={true} // This is the key change - enables template mode
      />
    </div>
  );
}
