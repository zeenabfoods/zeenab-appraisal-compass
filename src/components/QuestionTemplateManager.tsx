
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, GripVertical } from 'lucide-react';

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
          <Dialog open={showSectionDialog} onOpenChange={setShowSectionDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add Section
              </Button>
            </DialogTrigger>
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
                  <Button variant="outline" onClick={() => {
                    setShowSectionDialog(false);
                    setEditingSection(null);
                  }}>
                    Cancel
                  </Button>
                  <Button onClick={saveSection}>
                    {editingSection ? 'Update' : 'Create'} Section
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={showQuestionDialog} onOpenChange={setShowQuestionDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Question
              </Button>
            </DialogTrigger>
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
                  <Button variant="outline" onClick={() => {
                    setShowQuestionDialog(false);
                    setEditingQuestion(null);
                  }}>
                    Cancel
                  </Button>
                  <Button onClick={saveQuestion}>
                    {editingQuestion ? 'Update' : 'Create'} Question
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Sections and Questions */}
      {sections.map(section => {
        const sectionQuestions = questions.filter(q => q.section_id === section.id);
        
        return (
          <Card key={section.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center">
                    <GripVertical className="h-4 w-4 mr-2 text-gray-400" />
                    {section.name}
                  </CardTitle>
                  <CardDescription>{section.description}</CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline">Weight: {section.weight}</Badge>
                  <Badge variant="outline">Max: {section.max_score}</Badge>
                  <Button size="sm" variant="ghost" onClick={() => editSection(section)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {sectionQuestions.map((question, index) => (
                  <div key={question.id} className="flex items-start justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-500">Q{index + 1}</span>
                        <span className="text-sm text-gray-900">{question.question_text}</span>
                      </div>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {question.question_type}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          Weight: {question.weight}
                        </Badge>
                        {question.is_required && (
                          <Badge variant="outline" className="text-xs">Required</Badge>
                        )}
                        {!question.is_active && (
                          <Badge variant="destructive" className="text-xs">Inactive</Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={question.is_active}
                        onCheckedChange={(checked) => toggleQuestionStatus(question.id, checked)}
                        size="sm"
                      />
                      <Button size="sm" variant="ghost" onClick={() => editQuestion(question)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => deleteQuestion(question.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                
                {sectionQuestions.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No questions in this section yet.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
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
    </div>
  );
}
