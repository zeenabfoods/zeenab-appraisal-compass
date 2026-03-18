
import { useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  useDepartmentRatingCycles,
  useRatingQuestions,
  useRatingAssignments,
  useDepartmentRatingMutations
} from '@/hooks/useDepartmentRatings';
import {
  Plus, Trash2, Calendar, FileText, Building2, CheckCircle, Play, Square, Settings2
} from 'lucide-react';

export default function DepartmentRatingManagement() {
  const { user } = useAuth();
  const { data: cycles = [], isLoading: cyclesLoading } = useDepartmentRatingCycles();
  const [selectedCycleId, setSelectedCycleId] = useState<string>('');
  const { data: questions = [] } = useRatingQuestions(selectedCycleId);
  const { data: assignments = [] } = useRatingAssignments(selectedCycleId);
  const mutations = useDepartmentRatingMutations();

  const { data: departments = [] } = useQuery({
    queryKey: ['departments-active'],
    queryFn: async () => {
      const { data, error } = await supabase.from('departments').select('*').eq('is_active', true).order('name');
      if (error) throw error;
      return data;
    }
  });

  // Cycle form
  const [showCycleForm, setShowCycleForm] = useState(false);
  const [cycleName, setCycleName] = useState('');
  const [cycleDesc, setCycleDesc] = useState('');
  const [cycleStart, setCycleStart] = useState('');
  const [cycleEnd, setCycleEnd] = useState('');

  // Question form
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [questionText, setQuestionText] = useState('');
  const [questionCategory, setQuestionCategory] = useState('general');

  // Assignment dialog
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [assignDeptId, setAssignDeptId] = useState('');
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);

  const selectedCycle = cycles.find(c => c.id === selectedCycleId);

  const handleCreateCycle = () => {
    if (!cycleName || !cycleStart || !cycleEnd) return;
    mutations.createCycle.mutate({
      name: cycleName,
      description: cycleDesc || undefined,
      start_date: cycleStart,
      end_date: cycleEnd,
      created_by: user?.id
    }, {
      onSuccess: () => {
        setShowCycleForm(false);
        setCycleName(''); setCycleDesc(''); setCycleStart(''); setCycleEnd('');
      }
    });
  };

  const handleCreateQuestion = () => {
    if (!questionText || !selectedCycleId) return;
    mutations.createQuestion.mutate({
      cycle_id: selectedCycleId,
      question_text: questionText,
      question_category: questionCategory,
      sort_order: questions.length,
      created_by: user?.id
    }, {
      onSuccess: () => {
        setShowQuestionForm(false);
        setQuestionText(''); setQuestionCategory('general');
      }
    });
  };

  const handleAssignQuestions = () => {
    if (!assignDeptId || selectedQuestionIds.length === 0 || !selectedCycleId) return;
    mutations.assignQuestionsToDepartment.mutate({
      cycleId: selectedCycleId,
      departmentId: assignDeptId,
      questionIds: selectedQuestionIds
    }, {
      onSuccess: () => {
        setShowAssignDialog(false);
        setAssignDeptId(''); setSelectedQuestionIds([]);
      }
    });
  };

  const getAssignmentsForDept = (deptId: string) =>
    assignments.filter(a => a.department_id === deptId);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case 'completed': return <Badge className="bg-blue-100 text-blue-800">Completed</Badge>;
      default: return <Badge variant="outline">Draft</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Department Rating Management</h1>
            <p className="text-gray-600">Create rating cycles, questions, and assign them to departments</p>
          </div>
          <Button onClick={() => setShowCycleForm(true)} className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600">
            <Plus className="h-4 w-4 mr-2" /> New Rating Cycle
          </Button>
        </div>

        {/* Create Cycle Dialog */}
        <Dialog open={showCycleForm} onOpenChange={setShowCycleForm}>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Rating Cycle</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <Input placeholder="Cycle name (e.g., Q1 2026 Department Rating)" value={cycleName} onChange={e => setCycleName(e.target.value)} />
              <Textarea placeholder="Description (optional)" value={cycleDesc} onChange={e => setCycleDesc(e.target.value)} />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Start Date</label>
                  <Input type="date" value={cycleStart} onChange={e => setCycleStart(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">End Date</label>
                  <Input type="date" value={cycleEnd} onChange={e => setCycleEnd(e.target.value)} />
                </div>
              </div>
              <Button onClick={handleCreateCycle} disabled={mutations.createCycle.isPending} className="w-full">
                {mutations.createCycle.isPending ? 'Creating...' : 'Create Cycle'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Cycles List */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {cyclesLoading ? (
            <div className="col-span-full flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600" />
            </div>
          ) : cycles.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="flex flex-col items-center justify-center py-12 text-gray-500">
                <Calendar className="h-12 w-12 mb-4 opacity-50" />
                <p>No rating cycles created yet</p>
              </CardContent>
            </Card>
          ) : cycles.map(cycle => (
            <Card
              key={cycle.id}
              className={`cursor-pointer transition-all ${selectedCycleId === cycle.id ? 'ring-2 ring-orange-500 shadow-lg' : 'hover:shadow-md'}`}
              onClick={() => setSelectedCycleId(cycle.id)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{cycle.name}</CardTitle>
                  {getStatusBadge(cycle.status)}
                </div>
                {cycle.description && <CardDescription>{cycle.description}</CardDescription>}
              </CardHeader>
              <CardContent>
                <div className="text-sm text-gray-500 space-y-1">
                  <div>{new Date(cycle.start_date).toLocaleDateString()} — {new Date(cycle.end_date).toLocaleDateString()}</div>
                </div>
                {selectedCycleId === cycle.id && (
                  <div className="flex gap-2 mt-3">
                    {cycle.status === 'draft' && (
                      <Button size="sm" variant="outline" onClick={e => { e.stopPropagation(); mutations.updateCycleStatus.mutate({ id: cycle.id, status: 'active' }); }}>
                        <Play className="h-3 w-3 mr-1" /> Activate
                      </Button>
                    )}
                    {cycle.status === 'active' && (
                      <Button size="sm" variant="outline" onClick={e => { e.stopPropagation(); mutations.updateCycleStatus.mutate({ id: cycle.id, status: 'completed' }); }}>
                        <Square className="h-3 w-3 mr-1" /> Complete
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Questions & Assignments for selected cycle */}
        {selectedCycleId && (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Questions */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" /> Questions ({questions.length})
                  </CardTitle>
                  <Button size="sm" onClick={() => setShowQuestionForm(true)}>
                    <Plus className="h-4 w-4 mr-1" /> Add
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {questions.length === 0 ? (
                  <p className="text-gray-400 text-center py-4">No questions yet. Add some!</p>
                ) : (
                  <div className="space-y-3">
                    {questions.map((q, idx) => (
                      <div key={q.id} className="flex items-start justify-between gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <p className="text-sm font-medium">{idx + 1}. {q.question_text}</p>
                          <Badge variant="outline" className="mt-1 text-xs">{q.question_category}</Badge>
                        </div>
                        <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700"
                          onClick={() => mutations.deleteQuestion.mutate({ id: q.id, cycleId: selectedCycleId })}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Department Assignments */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" /> Department Assignments
                  </CardTitle>
                  <Button size="sm" onClick={() => setShowAssignDialog(true)} disabled={questions.length === 0}>
                    <Settings2 className="h-4 w-4 mr-1" /> Assign
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {departments.length === 0 ? (
                  <p className="text-gray-400 text-center py-4">No departments found</p>
                ) : (
                  <div className="space-y-3">
                    {departments.map(dept => {
                      const deptAssignments = getAssignmentsForDept(dept.id);
                      return (
                        <div key={dept.id} className="p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm">{dept.name}</span>
                            <Badge variant={deptAssignments.length > 0 ? 'default' : 'outline'}>
                              {deptAssignments.length} question{deptAssignments.length !== 1 ? 's' : ''}
                            </Badge>
                          </div>
                          {deptAssignments.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {deptAssignments.map(a => {
                                const q = questions.find(q => q.id === a.question_id);
                                return q ? (
                                  <div key={a.id} className="flex items-center justify-between text-xs text-gray-600">
                                    <span className="truncate flex-1">• {q.question_text}</span>
                                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-400"
                                      onClick={() => mutations.removeAssignment.mutate({ id: a.id, cycleId: selectedCycleId })}>
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ) : null;
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Add Question Dialog */}
        <Dialog open={showQuestionForm} onOpenChange={setShowQuestionForm}>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Rating Question</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <Textarea placeholder="Enter the question (e.g., How responsive is this department?)" value={questionText} onChange={e => setQuestionText(e.target.value)} />
              <Select value={questionCategory} onValueChange={setQuestionCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="service_quality">Service Quality</SelectItem>
                  <SelectItem value="responsiveness">Responsiveness</SelectItem>
                  <SelectItem value="collaboration">Collaboration</SelectItem>
                  <SelectItem value="communication">Communication</SelectItem>
                  <SelectItem value="professionalism">Professionalism</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleCreateQuestion} disabled={mutations.createQuestion.isPending} className="w-full">
                {mutations.createQuestion.isPending ? 'Adding...' : 'Add Question'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Assign Questions Dialog */}
        <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Assign Questions to Department</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <Select value={assignDeptId} onValueChange={setAssignDeptId}>
                <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                <SelectContent>
                  {departments.map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                <p className="text-sm font-medium text-gray-700">Select questions:</p>
                {questions.map(q => {
                  const alreadyAssigned = assignments.some(a => a.department_id === assignDeptId && a.question_id === q.id);
                  return (
                    <label key={q.id} className={`flex items-start gap-3 p-2 rounded cursor-pointer hover:bg-gray-50 ${alreadyAssigned ? 'opacity-50' : ''}`}>
                      <Checkbox
                        checked={selectedQuestionIds.includes(q.id)}
                        disabled={alreadyAssigned}
                        onCheckedChange={(checked) => {
                          setSelectedQuestionIds(prev =>
                            checked ? [...prev, q.id] : prev.filter(id => id !== q.id)
                          );
                        }}
                      />
                      <span className="text-sm">{q.question_text} {alreadyAssigned && <span className="text-xs text-gray-400">(assigned)</span>}</span>
                    </label>
                  );
                })}
              </div>
              <Button onClick={handleAssignQuestions} disabled={!assignDeptId || selectedQuestionIds.length === 0} className="w-full">
                Assign {selectedQuestionIds.length} Question{selectedQuestionIds.length !== 1 ? 's' : ''}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
