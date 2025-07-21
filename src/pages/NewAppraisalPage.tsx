import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Plus, Calendar } from 'lucide-react';

interface AppraisalCycle {
  id: string;
  name: string;
  status: string;
  start_date: string;
  end_date: string;
  quarter: number;
  year: number;
}

export default function NewAppraisalPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [cycles, setCycles] = useState<AppraisalCycle[]>([]);
  const [selectedCycle, setSelectedCycle] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadActiveCycles();
  }, []);

  const loadActiveCycles = async () => {
    try {
      const { data, error } = await supabase
        .from('appraisal_cycles')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCycles(data || []);
    } catch (error) {
      console.error('Error loading cycles:', error);
      toast({
        title: "Error",
        description: "Failed to load available appraisal cycles",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAppraisal = async () => {
    if (!profile || !selectedCycle) return;

    setCreating(true);
    try {
      // Check if appraisal already exists for this cycle
      const { data: existingAppraisal, error: checkError } = await supabase
        .from('appraisals')
        .select('id')
        .eq('employee_id', profile.id)
        .eq('cycle_id', selectedCycle)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingAppraisal) {
        toast({
          title: "Appraisal Already Exists",
          description: "You already have an appraisal for this cycle. Redirecting to continue...",
        });
        navigate(`/appraisal/${existingAppraisal.id}`);
        return;
      }

      // Create new appraisal
      const { data: newAppraisal, error: createError } = await supabase
        .from('appraisals')
        .insert({
          employee_id: profile.id,
          cycle_id: selectedCycle,
          status: 'draft'
        })
        .select()
        .single();

      if (createError) throw createError;

      toast({
        title: "Success",
        description: "New appraisal created successfully",
      });

      navigate(`/appraisal/${newAppraisal.id}`);
    } catch (error) {
      console.error('Error creating appraisal:', error);
      toast({
        title: "Error",
        description: "Failed to create new appraisal",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout pageTitle="New Appraisal">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout pageTitle="New Appraisal">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Start New Appraisal</h1>
          <p className="text-gray-600">Begin a new performance appraisal for an active cycle</p>
        </div>

        <Card className="max-w-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Plus className="h-5 w-5 mr-2" />
              Create New Appraisal
            </CardTitle>
            <CardDescription>
              Select an active appraisal cycle to begin your performance evaluation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {cycles.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Cycles</h3>
                <p className="text-gray-600">
                  There are no active appraisal cycles available at the moment. Please contact HR for more information.
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <label htmlFor="cycle-select" className="text-sm font-medium">
                    Select Appraisal Cycle
                  </label>
                  <Select value={selectedCycle} onValueChange={setSelectedCycle}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose an appraisal cycle" />
                    </SelectTrigger>
                    <SelectContent>
                      {cycles.map((cycle) => (
                        <SelectItem key={cycle.id} value={cycle.id}>
                          <div className="flex flex-col">
                            <span>{cycle.name}</span>
                            <span className="text-xs text-gray-500">
                              Q{cycle.quarter} {cycle.year} • {new Date(cycle.start_date).toLocaleDateString()} - {new Date(cycle.end_date).toLocaleDateString()}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={handleCreateAppraisal}
                  disabled={!selectedCycle || creating}
                  className="w-full"
                >
                  {creating ? 'Creating...' : 'Start Appraisal'}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
