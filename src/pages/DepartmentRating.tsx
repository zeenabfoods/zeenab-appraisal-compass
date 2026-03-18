
import { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  useActiveDepartmentRatingCycle,
  useRatingQuestions,
  useRatingAssignments,
  useEmployeeDepartmentRatings,
  useDepartmentRatingMutations
} from '@/hooks/useDepartmentRatings';
import { useToast } from '@/hooks/use-toast';
import { Building2, Star, ChevronRight, CheckCircle, ArrowLeft } from 'lucide-react';

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(star => (
        <button key={star} type="button" onClick={() => onChange(star)} className="focus:outline-none transition-transform hover:scale-110">
          <Star className={`h-7 w-7 ${star <= value ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
        </button>
      ))}
    </div>
  );
}

export default function DepartmentRating() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: activeCycle, isLoading: cycleLoading } = useActiveDepartmentRatingCycle();
  const { data: questions = [] } = useRatingQuestions(activeCycle?.id);
  const { data: allAssignments = [] } = useRatingAssignments(activeCycle?.id);
  const { data: myRatings = [] } = useEmployeeDepartmentRatings(activeCycle?.id, user?.id);
  const mutations = useDepartmentRatingMutations();

  const { data: departments = [] } = useQuery({
    queryKey: ['departments-active'],
    queryFn: async () => {
      const { data, error } = await supabase.from('departments').select('*').eq('is_active', true).order('name');
      if (error) throw error;
      return data;
    }
  });

  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null);
  const [localRatings, setLocalRatings] = useState<Record<string, { rating: number; comment: string }>>({});
  const [submitting, setSubmitting] = useState(false);

  // Get departments that have assignments in this cycle
  const rateableDepartments = useMemo(() => {
    const deptIds = [...new Set(allAssignments.map(a => a.department_id))];
    return departments.filter(d => deptIds.includes(d.id));
  }, [departments, allAssignments]);

  // For a given department, get its assigned questions
  const getDeptQuestions = (deptId: string) => {
    const questionIds = allAssignments.filter(a => a.department_id === deptId).map(a => a.question_id);
    return questions.filter(q => questionIds.includes(q.id));
  };

  // Check completion per department
  const getDeptCompletion = (deptId: string) => {
    const deptQuestions = getDeptQuestions(deptId);
    const answered = deptQuestions.filter(q =>
      myRatings.some(r => r.department_id === deptId && r.question_id === q.id)
    ).length;
    return { answered, total: deptQuestions.length };
  };

  // Overall completion
  const overallCompletion = useMemo(() => {
    let total = 0, answered = 0;
    rateableDepartments.forEach(d => {
      const c = getDeptCompletion(d.id);
      total += c.total;
      answered += c.answered;
    });
    return { total, answered, percent: total > 0 ? Math.round((answered / total) * 100) : 0 };
  }, [rateableDepartments, myRatings]);

  const selectedDept = departments.find(d => d.id === selectedDeptId);
  const selectedDeptQuestions = selectedDeptId ? getDeptQuestions(selectedDeptId) : [];

  // Initialize local ratings from existing data
  const initLocalRatings = (deptId: string) => {
    const existing: Record<string, { rating: number; comment: string }> = {};
    const deptQs = getDeptQuestions(deptId);
    deptQs.forEach(q => {
      const existingRating = myRatings.find(r => r.department_id === deptId && r.question_id === q.id);
      if (existingRating) {
        existing[q.id] = { rating: existingRating.rating, comment: existingRating.comment || '' };
      }
    });
    setLocalRatings(existing);
  };

  const handleSelectDept = (deptId: string) => {
    setSelectedDeptId(deptId);
    initLocalRatings(deptId);
  };

  const handleSubmitDeptRatings = async () => {
    if (!selectedDeptId || !activeCycle || !user) return;
    setSubmitting(true);
    try {
      for (const q of selectedDeptQuestions) {
        const lr = localRatings[q.id];
        if (lr && lr.rating > 0) {
          await mutations.submitRating.mutateAsync({
            cycle_id: activeCycle.id,
            department_id: selectedDeptId,
            question_id: q.id,
            employee_id: user.id,
            rating: lr.rating,
            comment: lr.comment || undefined
          });
        }
      }
      toast({ title: 'Success', description: `Ratings submitted for ${selectedDept?.name}` });
      setSelectedDeptId(null);
      setLocalRatings({});
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  if (cycleLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600" />
        </div>
      </DashboardLayout>
    );
  }

  if (!activeCycle) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <h1 className="text-2xl font-bold text-gray-900">Rate Departments</h1>
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-gray-500">
              <Building2 className="h-16 w-16 mb-4 opacity-30" />
              <p className="text-lg font-medium">No Active Rating Cycle</p>
              <p className="text-sm mt-1">There's no active department rating cycle at the moment. Check back later.</p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  // Department detail view
  if (selectedDeptId && selectedDept) {
    const allAnswered = selectedDeptQuestions.every(q => localRatings[q.id]?.rating > 0);

    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => { setSelectedDeptId(null); setLocalRatings({}); }}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Rate: {selectedDept.name}</h1>
              <p className="text-gray-600">{activeCycle.name}</p>
            </div>
          </div>

          <div className="space-y-4">
            {selectedDeptQuestions.map((q, idx) => {
              const lr = localRatings[q.id] || { rating: 0, comment: '' };
              return (
                <Card key={q.id}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">{idx + 1}. {q.question_text}</CardTitle>
                    <Badge variant="outline" className="w-fit text-xs">{q.question_category}</Badge>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <StarRating value={lr.rating} onChange={v => setLocalRatings(prev => ({ ...prev, [q.id]: { ...prev[q.id], rating: v, comment: prev[q.id]?.comment || '' } }))} />
                    <Textarea
                      placeholder="Optional comment..."
                      value={lr.comment}
                      onChange={e => setLocalRatings(prev => ({ ...prev, [q.id]: { ...prev[q.id], rating: prev[q.id]?.rating || 0, comment: e.target.value } }))}
                      className="text-sm"
                      rows={2}
                    />
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Button
            onClick={handleSubmitDeptRatings}
            disabled={!allAnswered || submitting}
            className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
            size="lg"
          >
            {submitting ? 'Submitting...' : `Submit Ratings for ${selectedDept.name}`}
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  // Department list view
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rate Departments</h1>
          <p className="text-gray-600">{activeCycle.name} — Rate each department based on your experience</p>
        </div>

        {/* Overall Progress */}
        <Card className="bg-gradient-to-r from-orange-50 to-red-50 border-orange-200">
          <CardContent className="py-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Overall Progress</span>
              <span className="text-sm font-bold text-orange-600">{overallCompletion.answered}/{overallCompletion.total} questions</span>
            </div>
            <Progress value={overallCompletion.percent} className="h-2" />
            <p className="text-xs text-gray-500 mt-1">{overallCompletion.percent}% complete</p>
          </CardContent>
        </Card>

        {/* Department List */}
        <div className="grid gap-4 md:grid-cols-2">
          {rateableDepartments.map(dept => {
            const completion = getDeptCompletion(dept.id);
            const isComplete = completion.answered === completion.total && completion.total > 0;
            return (
              <Card
                key={dept.id}
                className={`cursor-pointer transition-all hover:shadow-lg ${isComplete ? 'border-green-300 bg-green-50/50' : 'hover:border-orange-300'}`}
                onClick={() => handleSelectDept(dept.id)}
              >
                <CardContent className="flex items-center justify-between py-5 px-6">
                  <div className="flex items-center gap-4">
                    <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${isComplete ? 'bg-green-100' : 'bg-orange-100'}`}>
                      {isComplete ? <CheckCircle className="h-6 w-6 text-green-600" /> : <Building2 className="h-6 w-6 text-orange-600" />}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{dept.name}</p>
                      <p className="text-sm text-gray-500">{completion.answered}/{completion.total} questions answered</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </CardContent>
              </Card>
            );
          })}
        </div>

        {rateableDepartments.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Building2 className="h-12 w-12 mb-4 opacity-30" />
              <p>No departments have been set up for rating in this cycle</p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
