
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { QuestionDialog } from './QuestionDialog';
import { SectionDialog } from './SectionDialog';
import { SectionCard } from './SectionCard';
import { StaffSelectorWithManager } from './StaffSelectorWithManager';
import { EmployeeQuestionActions } from './EmployeeQuestionActions';
import { EmptyStateCard } from './EmptyStateCard';
import { FixedBulkQuestionAssignment } from './FixedBulkQuestionAssignment';
import { NotificationCenter } from './NotificationCenter';
import { PerformanceScoreCalculator } from './PerformanceScoreCalculator';
import { QuestionAssignmentTracker } from './QuestionAssignmentTracker';
import { QuickEmployeeAssignmentFixer } from './QuickEmployeeAssignmentFixer';
import { useEmployeeQuestions } from '@/hooks/useEmployeeQuestions';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PerformanceCalculationService } from '@/services/performanceCalculationService';

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
  const [showScoreCalculator, setShowScoreCalculator] = useState(false);

  const {
    sections,
    questions,
    staff,
    loading,
    fetchStaff,
    fetchSections,
    fetchQuestions,
    deleteAssignment,
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

  const handleDeleteQuestion = async (assignmentId: string) => {
    const success = await deleteAssignment(assignmentId);
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

  // One-time auto-recalculation on component mount
  useEffect(() => {
    const recalculateScoresOnce = async () => {
      const hasRecalculated = localStorage.getItem('performance_scores_recalculated_v2');
      
      if (!hasRecalculated && profile?.role === 'hr') {
        try {
          console.log('Auto-recalculating performance scores with corrected formula...');
          const result = await PerformanceCalculationService.recalculateAllScores();
          console.log('Recalculation complete:', result);
          localStorage.setItem('performance_scores_recalculated_v2', 'true');
        } catch (error) {
          console.error('Auto-recalculation failed:', error);
        }
      }
    };

    recalculateScoresOnce();
  }, [profile]);

  // Mock score data - in real implementation, this would come from appraisal responses
  const mockScoreData = sections.map(section => ({
    sectionName: section.name,
    weight: section.weight,
    maxScore: section.max_score,
    empScore: Math.floor(Math.random() * (section.max_score * 5)) + 1,
    mgrScore: Math.floor(Math.random() * (section.max_score * 5)) + 1,
    committeeScore: Math.floor(Math.random() * (section.max_score * 5)) + 1,
  }));

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
          <p className="text-gray-600 mt-2">Assign questions to employees and track assignment progress</p>
        </div>
      </div>

      <Tabs defaultValue="assignment" className="w-full">
        <TabsList>
          <TabsTrigger value="assignment">Question Assignment</TabsTrigger>
          <TabsTrigger value="tracking">Assignment Tracking</TabsTrigger>
          <TabsTrigger value="scores">Performance Scores</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>
        
        <TabsContent value="assignment" className="space-y-6">
          <StaffSelectorWithManager
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
                <FixedBulkQuestionAssignment
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
        
        <TabsContent value="tracking" className="space-y-6">
          <QuestionAssignmentTracker />
        </TabsContent>
        
        <TabsContent value="scores" className="space-y-6">
          <StaffSelectorWithManager
            staff={staff}
            selectedStaff={selectedStaff}
            onStaffChange={setSelectedStaff}
          />
          
          {selectedStaff && selectedEmployee && (
            <PerformanceScoreCalculator
              employeeId={selectedStaff}
            />
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
