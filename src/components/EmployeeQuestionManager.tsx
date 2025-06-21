
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { QuestionDialog } from './QuestionDialog';
import { SectionDialog } from './SectionDialog';
import { SectionCard } from './SectionCard';
import { StaffSelector } from './StaffSelector';
import { EmployeeQuestionActions } from './EmployeeQuestionActions';
import { EmptyStateCard } from './EmptyStateCard';
import { useEmployeeQuestions } from '@/hooks/useEmployeeQuestions';
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

export function EmployeeQuestionManager() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [selectedStaff, setSelectedStaff] = useState<string>('');
  const [questionDialogOpen, setQuestionDialogOpen] = useState(false);
  const [sectionDialogOpen, setSectionDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [editingSection, setEditingSection] = useState<Section | null>(null);

  const {
    sections,
    questions,
    staff,
    loading,
    fetchStaff,
    fetchSections,
    fetchQuestions,
    deleteQuestion,
    toggleQuestionStatus
  } = useEmployeeQuestions();

  useEffect(() => {
    fetchStaff();
  }, []);

  useEffect(() => {
    if (selectedStaff) {
      fetchSections();
      fetchQuestions(selectedStaff);
    }
  }, [selectedStaff]);

  const handleQuestionSave = () => {
    fetchQuestions(selectedStaff);
    setQuestionDialogOpen(false);
    setEditingQuestion(null);
    toast({
      title: "Success",
      description: editingQuestion ? "Question updated successfully" : "Question created successfully"
    });
  };

  const handleSectionSave = () => {
    fetchSections();
    setSectionDialogOpen(false);
    setEditingSection(null);
    toast({
      title: "Success",
      description: editingSection ? "Section updated successfully" : "Section created successfully"
    });
  };

  const handleDeleteQuestion = async (questionId: string) => {
    const success = await deleteQuestion(questionId);
    if (success) {
      fetchQuestions(selectedStaff);
    }
  };

  const handleDeleteSection = async (sectionId: string) => {
    try {
      const { error } = await supabase.rpc('delete_section_with_questions', {
        section_id_param: sectionId
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Section and all its questions deleted successfully"
      });
      
      // Refresh both sections and questions
      fetchSections();
      if (selectedStaff) {
        fetchQuestions(selectedStaff);
      }
    } catch (error) {
      console.error('Error deleting section:', error);
      toast({
        title: "Error",
        description: "Failed to delete section",
        variant: "destructive"
      });
    }
  };

  const handleToggleQuestionStatus = async (questionId: string, isActive: boolean) => {
    const success = await toggleQuestionStatus(questionId, isActive);
    if (success) {
      fetchQuestions(selectedStaff);
    }
  };

  const getSectionQuestions = (sectionId: string) => {
    return questions.filter(q => q.section_id === sectionId);
  };

  if (!profile || (profile.role !== 'hr' && profile.role !== 'admin')) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-gray-500">Access denied. Only HR and Admin can manage employee questions.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Employee Questions</h1>
          <p className="text-gray-600 mt-2">Manage questions for individual staff members</p>
        </div>
      </div>

      <StaffSelector
        staff={staff}
        selectedStaff={selectedStaff}
        onStaffChange={setSelectedStaff}
      />

      {selectedStaff && (
        <>
          <EmployeeQuestionActions
            questionsCount={questions.length}
            sectionsCount={sections.length}
            onAddSection={() => setSectionDialogOpen(true)}
            onAddQuestion={() => setQuestionDialogOpen(true)}
          />

          <div className="space-y-6">
            {sections.map((section) => (
              <SectionCard
                key={section.id}
                section={section}
                questions={getSectionQuestions(section.id)}
                onEditSection={(section) => {
                  setEditingSection(section);
                  setSectionDialogOpen(true);
                }}
                onDeleteSection={handleDeleteSection}
                onEditQuestion={(question) => {
                  setEditingQuestion(question);
                  setQuestionDialogOpen(true);
                }}
                onDeleteQuestion={handleDeleteQuestion}
                onToggleQuestionStatus={handleToggleQuestionStatus}
              />
            ))}

            {sections.length === 0 && !loading && (
              <EmptyStateCard
                title="No sections created yet"
                buttonText="Create First Section"
                onButtonClick={() => setSectionDialogOpen(true)}
              />
            )}
          </div>
        </>
      )}

      <QuestionDialog
        open={questionDialogOpen}
        onOpenChange={setQuestionDialogOpen}
        question={editingQuestion}
        sections={sections}
        selectedStaff={selectedStaff}
        onSave={handleQuestionSave}
      />

      <SectionDialog
        open={sectionDialogOpen}
        onOpenChange={setSectionDialogOpen}
        section={editingSection}
        onSave={handleSectionSave}
      />
    </div>
  );
}
