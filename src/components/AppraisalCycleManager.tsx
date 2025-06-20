
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Calendar, Users, TrendingUp, Settings, Edit, Trash2 } from 'lucide-react';

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

  const deleteCycle = async (cycleId: string) => {
    if (!confirm('Are you sure you want to delete this appraisal cycle? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('appraisal_cycles')
        .delete()
        .eq('id', cycleId);

      if (error) throw error;

      setCycles(cycles.filter(cycle => cycle.id !== cycleId));
      toast({
        title: "Success",
        description: "Appraisal cycle deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting cycle:', error);
      toast({
        title: "Error",
        description: "Failed to delete appraisal cycle",
        variant: "destructive",
      });
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'archived': return 'bg-gray-100 text-gray-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
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
          <Card key={cycle.id} className="backdrop-blur-md bg-white/60 border-white/40 shadow-lg hover:shadow-xl transition-all">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{cycle.name}</CardTitle>
                  <CardDescription>
                    Q{cycle.quarter} {cycle.year}
                  </CardDescription>
                </div>
                <Badge className={getStatusColor(cycle.status)}>
                  {cycle.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center text-sm text-gray-600">
                  <Calendar className="h-4 w-4 mr-2" />
                  {new Date(cycle.start_date).toLocaleDateString()} - {new Date(cycle.end_date).toLocaleDateString()}
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-sm text-gray-600">
                    <Users className="h-4 w-4 mr-1" />
                    <span>156 employees</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <TrendingUp className="h-4 w-4 mr-1" />
                    <span>73% complete</span>
                  </div>
                </div>
                
                {(profile?.role === 'hr' || profile?.role === 'admin') && (
                  <div className="flex flex-wrap gap-2">
                    {cycle.status === 'draft' && (
                      <Button
                        size="sm"
                        onClick={() => updateCycleStatus(cycle.id, 'active')}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Activate
                      </Button>
                    )}
                    {cycle.status === 'active' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateCycleStatus(cycle.id, 'completed')}
                      >
                        Complete
                      </Button>
                    )}
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => editCycle(cycle)}
                      className="hover:bg-blue-100"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => deleteCycle(cycle.id)}
                      className="hover:bg-red-100 text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
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
