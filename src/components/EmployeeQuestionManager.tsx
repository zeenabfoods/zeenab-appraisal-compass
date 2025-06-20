
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit, Trash2, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { QuestionDialog } from './QuestionDialog';
import { SectionDialog } from './SectionDialog';
import { SectionCard } from './SectionCard';

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

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  role: string;
}

export function EmployeeQuestionManager() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [sections, setSections] = useState<Section[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [staff, setStaff] = useState<Profile[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [questionDialogOpen, setQuestionDialogOpen] = useState(false);
  const [sectionDialogOpen, setSectionDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [editingSection, setEditingSection] = useState<Section | null>(null);

  useEffect(() => {
    fetchStaff();
  }, []);

  useEffect(() => {
    if (selectedStaff) {
      fetchSections();
      fetchQuestions();
    }
  }, [selectedStaff]);

  const fetchStaff = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, role')
        .eq('role', 'staff')
        .eq('is_active', true)
        .order('first_name');
      
      if (error) throw error;
      setStaff(data || []);
    } catch (error) {
      console.error('Error fetching staff:', error);
      toast({
        title: "Error",
        description: "Failed to fetch staff members",
        variant: "destructive"
      });
    }
  };

  const fetchSections = async () => {
    if (!selectedStaff) return;
    
    try {
      const { data, error } = await supabase
        .from('appraisal_sections')
        .select('*')
        .eq('staff_id', selectedStaff)
        .order('sort_order');
      
      if (error) throw error;
      setSections(data || []);
    } catch (error) {
      console.error('Error fetching sections:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchQuestions = async () => {
    if (!selectedStaff) return;
    
    try {
      const { data, error } = await supabase
        .from('appraisal_questions')
        .select('*')
        .eq('staff_id', selectedStaff)
        .order('sort_order');
      
      if (error) throw error;
      setQuestions(data || []);
    } catch (error) {
      console.error('Error fetching questions:', error);
    }
  };

  const handleQuestionSave = async (questionData: any) => {
    try {
      if (editingQuestion) {
        const { error } = await supabase
          .from('appraisal_questions')
          .update({
            ...questionData,
            staff_id: selectedStaff
          })
          .eq('id', editingQuestion.id);
        
        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Question updated successfully"
        });
      } else {
        const { error } = await supabase
          .from('appraisal_questions')
          .insert({
            ...questionData,
            staff_id: selectedStaff
          });
        
        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Question created successfully"
        });
      }
      
      fetchQuestions();
      setQuestionDialogOpen(false);
      setEditingQuestion(null);
    } catch (error: any) {
      console.error('Error saving question:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleSectionSave = async (sectionData: any) => {
    try {
      if (editingSection) {
        const { error } = await supabase
          .from('appraisal_sections')
          .update({
            ...sectionData,
            staff_id: selectedStaff
          })
          .eq('id', editingSection.id);
        
        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Section updated successfully"
        });
      } else {
        const { error } = await supabase
          .from('appraisal_sections')
          .insert({
            ...sectionData,
            staff_id: selectedStaff
          });
        
        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Section created successfully"
        });
      }
      
      fetchSections();
      setSectionDialogOpen(false);
      setEditingSection(null);
    } catch (error: any) {
      console.error('Error saving section:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    try {
      const { error } = await supabase
        .from('appraisal_questions')
        .delete()
        .eq('id', questionId);
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Question deleted successfully"
      });
      
      fetchQuestions();
    } catch (error: any) {
      console.error('Error deleting question:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleToggleQuestionStatus = async (questionId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('appraisal_questions')
        .update({ is_active: isActive })
        .eq('id', questionId);
      
      if (error) throw error;
      
      fetchQuestions();
    } catch (error: any) {
      console.error('Error updating question status:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Select Staff Member
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedStaff} onValueChange={setSelectedStaff}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choose a staff member to manage their questions" />
            </SelectTrigger>
            <SelectContent>
              {staff.map((member) => (
                <SelectItem key={member.id} value={member.id}>
                  {member.first_name} {member.last_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedStaff && (
        <>
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <Badge variant="outline" className="text-sm">
                {questions.length} Questions
              </Badge>
              <Badge variant="outline" className="text-sm">
                {sections.length} Sections
              </Badge>
            </div>
            <div className="flex space-x-2">
              <Button 
                onClick={() => setSectionDialogOpen(true)}
                variant="outline"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Section
              </Button>
              <Button 
                onClick={() => setQuestionDialogOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Question
              </Button>
            </div>
          </div>

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
                onEditQuestion={(question) => {
                  setEditingQuestion(question);
                  setQuestionDialogOpen(true);
                }}
                onDeleteQuestion={handleDeleteQuestion}
                onToggleQuestionStatus={handleToggleQuestionStatus}
              />
            ))}

            {sections.length === 0 && !loading && (
              <Card>
                <CardContent className="p-12 text-center">
                  <p className="text-gray-500 mb-4">No sections created yet</p>
                  <Button onClick={() => setSectionDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Section
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </>
      )}

      <QuestionDialog
        open={questionDialogOpen}
        onOpenChange={setQuestionDialogOpen}
        question={editingQuestion}
        sections={sections}
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
