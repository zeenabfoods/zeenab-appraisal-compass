
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AppraisalForm } from '@/components/AppraisalForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { autoAssignQuestionsToEmployee } from '@/utils/autoAssignQuestions';
import { ClipboardList, Calendar, User, RefreshCw } from 'lucide-react';

interface Appraisal {
  id: string;
  status: string;
  cycle_id: string;
  employee_id: string;
  created_at: string;
  appraisal_cycles: {
    name: string;
    quarter: number;
    year: number;
    start_date: string;
    end_date: string;
  };
}

export default function MyAppraisals() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [appraisals, setAppraisals] = useState<Appraisal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppraisal, setSelectedAppraisal] = useState<Appraisal | null>(null);
  const [showAppraisalForm, setShowAppraisalForm] = useState(false);
  const [autoAssigning, setAutoAssigning] = useState(false);

  useEffect(() => {
    loadAppraisals();
  }, [profile]);

  const loadAppraisals = async () => {
    if (!profile) return;

    try {
      setLoading(true);
      
      // Only create appraisals for staff and managers, not HR/admin
      if (profile.role === 'staff' || profile.role === 'manager') {
        console.log('Loading appraisals for employee:', profile.id);
        
        // First, get active appraisal cycles
        const { data: activeCycles, error: cyclesError } = await supabase
          .from('appraisal_cycles')
          .select('*')
          .eq('status', 'active');

        if (cyclesError) {
          console.error('Error loading cycles:', cyclesError);
          throw cyclesError;
        }

        // Create appraisals for active cycles if they don't exist
        if (activeCycles && activeCycles.length > 0) {
          for (const cycle of activeCycles) {
            const { data: existingAppraisal } = await supabase
              .from('appraisals')
              .select('id')
              .eq('employee_id', profile.id)
              .eq('cycle_id', cycle.id)
              .maybeSingle();

            if (!existingAppraisal) {
              const { error: createError } = await supabase
                .from('appraisals')
                .insert({
                  employee_id: profile.id,
                  cycle_id: cycle.id,
                  status: 'draft'
                });

              if (createError) {
                console.error('Error creating appraisal:', createError);
              }
            }
          }
        }
      }

      // Load all appraisals for this user only
      const { data, error } = await supabase
        .from('appraisals')
        .select(`
          *,
          appraisal_cycles (
            name,
            quarter,
            year,
            start_date,
            end_date
          )
        `)
        .eq('employee_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAppraisals(data || []);
    } catch (error) {
      console.error('Error loading appraisals:', error);
      toast({
        title: "Error",
        description: "Failed to load appraisals",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAutoAssignQuestions = async () => {
    if (!profile) return;

    try {
      setAutoAssigning(true);
      
      // Get active cycles and auto-assign questions
      const { data: activeCycles } = await supabase
        .from('appraisal_cycles')
        .select('id, name')
        .eq('status', 'active');

      if (!activeCycles || activeCycles.length === 0) {
        toast({
          title: "Info",
          description: "No active appraisal cycles found",
        });
        return;
      }

      let totalAssigned = 0;
      for (const cycle of activeCycles) {
        const result = await autoAssignQuestionsToEmployee(profile.id, cycle.id);
        if (result.success && result.questionsAssigned) {
          totalAssigned += result.questionsAssigned;
        }
      }

      if (totalAssigned > 0) {
        toast({
          title: "Success",
          description: `Assigned ${totalAssigned} questions to your appraisals`,
        });
        // Reload appraisals to reflect the changes
        await loadAppraisals();
      } else {
        toast({
          title: "Info",
          description: "No new questions were assigned. You may already have all applicable questions.",
        });
      }
    } catch (error) {
      console.error('Error auto-assigning questions:', error);
      toast({
        title: "Error",
        description: "Failed to assign questions",
        variant: "destructive",
      });
    } finally {
      setAutoAssigning(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'submitted': return 'bg-blue-100 text-blue-800';
      case 'manager_review': return 'bg-yellow-100 text-yellow-800';
      case 'hr_review': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const openAppraisal = async (appraisal: Appraisal) => {
    // Auto-assign questions if needed before opening the appraisal
    if (profile) {
      const result = await autoAssignQuestionsToEmployee(profile.id, appraisal.cycle_id);
      if (result.success && result.questionsAssigned && result.questionsAssigned > 0) {
        toast({
          title: "Questions Assigned",
          description: `${result.questionsAssigned} questions have been assigned to this appraisal`,
        });
      }
    }
    
    setSelectedAppraisal(appraisal);
    setShowAppraisalForm(true);
  };

  // Don't show this page for HR/Admin users since they don't have personal appraisals
  if (profile?.role === 'hr' || profile?.role === 'admin') {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">My Appraisals</h2>
          <p className="text-gray-600">Personal performance appraisals</p>
        </div>

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ClipboardList className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Personal Appraisals</h3>
            <p className="text-gray-500 text-center">
              As an {profile.role.toUpperCase()} user, you don't have personal appraisals. 
              Use the dashboard to manage team appraisals and cycles.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">My Appraisals</h2>
          <p className="text-gray-600">View and complete your performance appraisals</p>
        </div>
        <Button 
          onClick={handleAutoAssignQuestions}
          disabled={autoAssigning}
          variant="outline"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${autoAssigning ? 'animate-spin' : ''}`} />
          {autoAssigning ? 'Assigning Questions...' : 'Assign Questions'}
        </Button>
      </div>

      {/* Appraisals List */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {appraisals.map((appraisal) => (
          <Card key={appraisal.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => openAppraisal(appraisal)}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg flex items-center">
                    <ClipboardList className="h-5 w-5 mr-2" />
                    {appraisal.appraisal_cycles.name}
                  </CardTitle>
                  <CardDescription>
                    Q{appraisal.appraisal_cycles.quarter} {appraisal.appraisal_cycles.year}
                  </CardDescription>
                </div>
                <Badge className={getStatusColor(appraisal.status)}>
                  {appraisal.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center text-sm text-gray-600">
                  <Calendar className="h-4 w-4 mr-2" />
                  {new Date(appraisal.appraisal_cycles.start_date).toLocaleDateString()} - {new Date(appraisal.appraisal_cycles.end_date).toLocaleDateString()}
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <User className="h-4 w-4 mr-2" />
                  Self Assessment
                </div>
              </div>
              
              <Button className="w-full mt-4" variant={appraisal.status === 'draft' ? 'default' : 'outline'}>
                {appraisal.status === 'draft' ? 'Continue' : 'View'} Appraisal
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {appraisals.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ClipboardList className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No appraisals available</h3>
            <p className="text-gray-500 text-center mb-4">
              Your appraisals will appear here when appraisal cycles are created.
            </p>
            <Button onClick={handleAutoAssignQuestions} disabled={autoAssigning}>
              <RefreshCw className={`h-4 w-4 mr-2 ${autoAssigning ? 'animate-spin' : ''}`} />
              {autoAssigning ? 'Checking...' : 'Check for Appraisals'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Appraisal Form Dialog */}
      <Dialog open={showAppraisalForm} onOpenChange={(open) => {
        setShowAppraisalForm(open);
        if (!open) {
          setSelectedAppraisal(null);
          loadAppraisals(); // Refresh data when dialog closes
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedAppraisal?.appraisal_cycles.name}
            </DialogTitle>
          </DialogHeader>
          {selectedAppraisal && (
            <AppraisalForm
              cycleId={selectedAppraisal.cycle_id}
              employeeId={selectedAppraisal.employee_id}
              mode="employee"
              onComplete={() => setShowAppraisalForm(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
