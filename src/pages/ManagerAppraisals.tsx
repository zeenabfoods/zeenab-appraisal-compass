
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AppraisalForm } from '@/components/AppraisalForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ClipboardList, Calendar, User, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ManagerAppraisal {
  appraisal_id: string;
  employee_id: string;
  employee_name: string;
  cycle_name: string;
  status: string;
  submitted_at: string;
  cycle_id: string;
}

export default function ManagerAppraisals() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [appraisals, setAppraisals] = useState<ManagerAppraisal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppraisal, setSelectedAppraisal] = useState<ManagerAppraisal | null>(null);
  const [showAppraisalForm, setShowAppraisalForm] = useState(false);

  useEffect(() => {
    if (profile?.role === 'manager' || profile?.role === 'hr' || profile?.role === 'admin') {
      loadManagerAppraisals();
    }
  }, [profile]);

  const loadManagerAppraisals = async () => {
    if (!profile) return;

    try {
      const { data, error } = await supabase.rpc('get_manager_appraisals', {
        manager_id_param: profile.id
      });

      if (error) throw error;
      setAppraisals(data || []);
    } catch (error) {
      console.error('Error loading manager appraisals:', error);
      toast({
        title: "Error",
        description: "Failed to load appraisals for review",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted': return 'bg-blue-100 text-blue-800';
      case 'manager_review': return 'bg-yellow-100 text-yellow-800';
      case 'committee_review': return 'bg-purple-100 text-purple-800';
      case 'completed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const openAppraisal = (appraisal: ManagerAppraisal) => {
    setSelectedAppraisal(appraisal);
    setShowAppraisalForm(true);
  };

  const handleAppraisalComplete = async () => {
    setShowAppraisalForm(false);
    setSelectedAppraisal(null);
    await loadManagerAppraisals(); // Refresh the list
    
    toast({
      title: "Success",
      description: "Appraisal review completed successfully",
    });
  };

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
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Team Appraisals</h2>
        <p className="text-gray-600">Review and evaluate your team members' performance appraisals</p>
      </div>

      {/* Appraisals List */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {appraisals.map((appraisal) => (
          <Card key={appraisal.appraisal_id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => openAppraisal(appraisal)}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg flex items-center">
                    <User className="h-5 w-5 mr-2" />
                    {appraisal.employee_name}
                  </CardTitle>
                  <CardDescription>
                    {appraisal.cycle_name}
                  </CardDescription>
                </div>
                <Badge className={getStatusColor(appraisal.status)}>
                  {appraisal.status.replace('_', ' ')}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center text-sm text-gray-600">
                  <Clock className="h-4 w-4 mr-2" />
                  Submitted: {new Date(appraisal.submitted_at).toLocaleDateString()}
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <ClipboardList className="h-4 w-4 mr-2" />
                  Manager Review
                </div>
              </div>
              
              <Button className="w-full mt-4" variant={appraisal.status === 'submitted' ? 'default' : 'outline'}>
                {appraisal.status === 'submitted' ? 'Start Review' : 'Continue Review'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {appraisals.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ClipboardList className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No appraisals to review</h3>
            <p className="text-gray-500 text-center">
              Team member appraisals will appear here when they are submitted for your review.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Appraisal Form Dialog */}
      <Dialog open={showAppraisalForm} onOpenChange={(open) => {
        setShowAppraisalForm(open);
        if (!open) {
          setSelectedAppraisal(null);
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Review Appraisal - {selectedAppraisal?.employee_name}
            </DialogTitle>
          </DialogHeader>
          {selectedAppraisal && (
            <AppraisalForm
              cycleId={selectedAppraisal.cycle_id}
              employeeId={selectedAppraisal.employee_id}
              mode="manager"
              onComplete={handleAppraisalComplete}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
