
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AppraisalForm } from '@/components/AppraisalForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ClipboardList, Calendar, User } from 'lucide-react';

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
  const [appraisals, setAppraisals] = useState<Appraisal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppraisal, setSelectedAppraisal] = useState<Appraisal | null>(null);
  const [showAppraisalForm, setShowAppraisalForm] = useState(false);

  useEffect(() => {
    loadAppraisals();
  }, [profile]);

  const loadAppraisals = async () => {
    if (!profile) return;

    try {
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
    } finally {
      setLoading(false);
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

  const openAppraisal = (appraisal: Appraisal) => {
    setSelectedAppraisal(appraisal);
    setShowAppraisalForm(true);
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
        <h2 className="text-2xl font-bold text-gray-900">My Appraisals</h2>
        <p className="text-gray-600">View and complete your performance appraisals</p>
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
            <p className="text-gray-500 text-center">
              Your appraisals will appear here when appraisal cycles are created.
            </p>
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
