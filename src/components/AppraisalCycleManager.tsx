import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Calendar } from 'lucide-react';
import { AppraisalCycleStats } from '@/components/AppraisalCycleStats';

interface AppraisalCycle {
  id: string;
  name: string;
  quarter: number;
  year: number;
  start_date: string;
  end_date: string;
  status: string;
  created_at: string;
}

export function AppraisalCycleManager() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [cycles, setCycles] = useState<AppraisalCycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingCycle, setEditingCycle] = useState<AppraisalCycle | null>(null);
  const [newCycle, setNewCycle] = useState({
    name: '',
    quarter: 1,
    year: new Date().getFullYear(),
    start_date: '',
    end_date: '',
  });

  useEffect(() => {
    loadCycles();
  }, []);

  const loadCycles = async () => {
    try {
      const { data, error } = await supabase
        .from('appraisal_cycles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCycles(data || []);
    } catch (error) {
      console.error('Error loading cycles:', error);
      toast({
        title: "Error",
        description: "Failed to load appraisal cycles",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    try {
      if (editingCycle) {
        const { error } = await supabase
          .from('appraisal_cycles')
          .update(newCycle)
          .eq('id', editingCycle.id);

        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Appraisal cycle updated successfully",
        });
      } else {
        const { data, error } = await supabase
          .from('appraisal_cycles')
          .insert({
            ...newCycle,
            created_by: profile.id,
          })
          .select()
          .single();

        if (error) throw error;

        setCycles([data, ...cycles]);
        toast({
          title: "Success",
          description: "Appraisal cycle created successfully",
        });
      }

      setShowCreateDialog(false);
      setEditingCycle(null);
      resetForm();
      loadCycles();
    } catch (error) {
      console.error('Error saving cycle:', error);
      toast({
        title: "Error",
        description: "Failed to save appraisal cycle",
        variant: "destructive",
      });
    }
  };

  const updateCycleStatus = async (cycleId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('appraisal_cycles')
        .update({ status })
        .eq('id', cycleId);

      if (error) throw error;

      setCycles(cycles.map(cycle => 
        cycle.id === cycleId ? { ...cycle, status } : cycle
      ));

      toast({
        title: "Success",
        description: `Cycle ${status} successfully`,
      });
    } catch (error) {
      console.error('Error updating cycle status:', error);
      toast({
        title: "Error",
        description: "Failed to update cycle status",
        variant: "destructive",
      });
    }
  };

  const deleteCycle = async (cycleId: string, cycleName: string) => {
    if (!confirm(`Are you sure you want to delete "${cycleName}"? This will also delete all related appraisals and responses. This action cannot be undone.`)) {
      return;
    }

    try {
      console.log('Deleting cycle with ID:', cycleId);

      // Use a more robust deletion approach
      const { error } = await supabase.rpc('delete_appraisal_cycle_cascade', {
        cycle_id_param: cycleId
      });

      if (error) {
        console.error('Error from RPC function:', error);
        // Fallback to manual deletion if RPC doesn't exist
        await performManualDeletion(cycleId);
      }

      setCycles(cycles.filter(cycle => cycle.id !== cycleId));
      toast({
        title: "Success",
        description: `"${cycleName}" deleted successfully`,
      });
    } catch (error) {
      console.error('Error deleting cycle:', error);
      toast({
        title: "Error",
        description: "Failed to delete appraisal cycle. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Fallback manual deletion function
  const performManualDeletion = async (cycleId: string) => {
    console.log('Performing manual deletion for cycle:', cycleId);
    
    // Delete in correct order to avoid foreign key constraints
    
    // 1. Delete appraisal responses
    const { error: responsesError } = await supabase
      .from('appraisal_responses')
      .delete()
      .eq('cycle_id', cycleId);

    if (responsesError) {
      console.error('Error deleting responses:', responsesError);
      // Continue even if some responses fail to delete
    }

    // 2. Delete employee question assignments
    const { error: assignmentsError } = await supabase
      .from('employee_appraisal_questions')
      .delete()
      .eq('cycle_id', cycleId);

    if (assignmentsError) {
      console.error('Error deleting assignments:', assignmentsError);
      // Continue even if some assignments fail to delete
    }

    // 3. Delete appraisals
    const { error: appraisalsError } = await supabase
      .from('appraisals')
      .delete()
      .eq('cycle_id', cycleId);

    if (appraisalsError) {
      console.error('Error deleting appraisals:', appraisalsError);
      throw appraisalsError;
    }

    // 4. Finally delete the cycle
    const { error: cycleError } = await supabase
      .from('appraisal_cycles')
      .delete()
      .eq('id', cycleId);

    if (cycleError) {
      console.error('Error deleting cycle:', cycleError);
      throw cycleError;
    }
  };

  const editCycle = (cycle: AppraisalCycle) => {
    setEditingCycle(cycle);
    setNewCycle({
      name: cycle.name,
      quarter: cycle.quarter,
      year: cycle.year,
      start_date: cycle.start_date,
      end_date: cycle.end_date,
    });
    setShowCreateDialog(true);
  };

  const resetForm = () => {
    setNewCycle({
      name: '',
      quarter: 1,
      year: new Date().getFullYear(),
      start_date: '',
      end_date: '',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Appraisal Cycles</h2>
          <p className="text-gray-600">Manage performance appraisal cycles and timelines</p>
        </div>
        
        {(profile?.role === 'hr' || profile?.role === 'admin') && (
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button 
                className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                onClick={() => {
                  setEditingCycle(null);
                  resetForm();
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Cycle
              </Button>
            </DialogTrigger>
            <DialogContent className="backdrop-blur-md bg-white/90">
              <DialogHeader>
                <DialogTitle>
                  {editingCycle ? 'Edit Appraisal Cycle' : 'Create New Appraisal Cycle'}
                </DialogTitle>
                <DialogDescription>
                  {editingCycle 
                    ? 'Update the appraisal cycle details below.'
                    : 'Set up a new performance appraisal cycle for your organization.'
                  }
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Cycle Name</Label>
                  <Input
                    id="name"
                    value={newCycle.name}
                    onChange={(e) => setNewCycle({ ...newCycle, name: e.target.value })}
                    placeholder="Q1 2024 Performance Review"
                    required
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="quarter">Quarter</Label>
                    <Select 
                      value={newCycle.quarter.toString()} 
                      onValueChange={(value) => setNewCycle({ ...newCycle, quarter: parseInt(value) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Q1</SelectItem>
                        <SelectItem value="2">Q2</SelectItem>
                        <SelectItem value="3">Q3</SelectItem>
                        <SelectItem value="4">Q4</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="year">Year</Label>
                    <Input
                      id="year"
                      type="number"
                      value={newCycle.year}
                      onChange={(e) => setNewCycle({ ...newCycle, year: parseInt(e.target.value) })}
                      required
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="start_date">Start Date</Label>
                    <Input
                      id="start_date"
                      type="date"
                      value={newCycle.start_date}
                      onChange={(e) => setNewCycle({ ...newCycle, start_date: e.target.value })}
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="end_date">End Date</Label>
                    <Input
                      id="end_date"
                      type="date"
                      value={newCycle.end_date}
                      onChange={(e) => setNewCycle({ ...newCycle, end_date: e.target.value })}
                      required
                    />
                  </div>
                </div>
                
                <div className="flex justify-end space-x-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setShowCreateDialog(false);
                      setEditingCycle(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit"
                    className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                  >
                    {editingCycle ? 'Update' : 'Create'} Cycle
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Cycles Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {cycles.map((cycle) => (
          <AppraisalCycleStats 
            key={cycle.id} 
            cycle={cycle}
            onEdit={(profile?.role === 'hr' || profile?.role === 'admin') ? editCycle : undefined}
            onDelete={(profile?.role === 'hr' || profile?.role === 'admin') ? deleteCycle : undefined}
          />
        ))}
      </div>

      {cycles.length === 0 && (
        <Card className="backdrop-blur-md bg-white/60 border-white/40">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No appraisal cycles</h3>
            <p className="text-gray-500 text-center mb-6">
              Get started by creating your first appraisal cycle.
            </p>
            {(profile?.role === 'hr' || profile?.role === 'admin') && (
              <Button 
                onClick={() => {
                  setEditingCycle(null);
                  resetForm();
                  setShowCreateDialog(true);
                }}
                className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create First Cycle
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
