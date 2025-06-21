
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
import { BulkQuestionAssignment } from './BulkQuestionAssignment';
import { NotificationCenter } from './NotificationCenter';
import { useEmployeeQuestions } from '@/hooks/useEmployeeQuestions';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
  const [showBulkAssignment, setShowBulkAssignment] = useState(false);
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);

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
    fetchAllQuestions();
  }, []);

  useEffect(() => {
    if (selectedStaff) {
      fetchSections();
      fetchQuestions(selectedStaff);
    }
  }, [selectedStaff]);

  const fetchAllQuestions = async () => {
    try {
      const { data, error } = await supabase
        .from('appraisal_questions')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;
      setAllQuestions(data || []);
    } catch (error) {
      console.error('Error fetching all questions:', error);
    }
  };

  const handleQuestionSave = () => {
    console.log('Question save callback triggered');
    if (selectedStaff) {
      fetchQuestions(selectedStaff);
    }
    fetchAllQuestions();
    setQuestionDialogOpen(false);
    setEditingQuestion(null);
  };

  const handleSectionSave = () => {
    console.log('Section save callback triggered');
    fetchSections();
    setSectionDialogOpen(false);
    setEditingSection(null);
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

  const selectedEmployee = staff.find(s => s.id === selectedStaff);

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
          <h1 className="text-3xl font-bold text-gray-900">Employee Questions Management</h1>
          <p className="text-gray-600 mt-2">Assign questions to employees and manage notifications</p>
        </div>
      </div>

      <Tabs defaultValue="assignment" className="w-full">
        <TabsList>
          <TabsTrigger value="assignment">Question Assignment</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>
        
        <TabsContent value="assignment" className="space-y-6">
          <StaffSelector
            staff={staff}
            selectedStaff={selectedStaff}
            onStaffChange={setSelectedStaff}
          />

          {selectedStaff && (
            <>
              <div className="flex items-center justify-between">
                <EmployeeQuestionActions
                  questionsCount={questions.length}
                  sectionsCount={sections.length}
                  onAddSection={() => setSectionDialogOpen(true)}
                  onAddQuestion={() => setQuestionDialogOpen(true)}
                />
                <div className="space-x-2">
                  <button
                    onClick={() => setShowBulkAssignment(!showBulkAssignment)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    {showBulkAssignment ? 'Hide Bulk Assignment' : 'Bulk Assign Questions'}
                  </button>
                </div>
              </div>

              {showBulkAssignment && selectedEmployee && (
                <BulkQuestionAssignment
                  employeeId={selectedStaff}
                  employeeName={`${selectedEmployee.first_name} ${selectedEmployee.last_name}`}
                  sections={sections}
                  allQuestions={allQuestions}
                  assignedQuestions={questions}
                  onAssignmentComplete={() => {
                    fetchQuestions(selectedStaff);
                    setShowBulkAssignment(false);
                  }}
                />
              )}

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
        </TabsContent>
        
        <TabsContent value="notifications">
          <NotificationCenter />
        </TabsContent>
      </Tabs>

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
