
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, Plus, Edit, Trash2, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Department {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  line_manager_id: string | null;
  created_at: string;
  updated_at: string;
  line_manager?: {
    first_name: string;
    last_name: string;
  };
}

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
}

export default function DepartmentManagement() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedLineManager, setSelectedLineManager] = useState<string>('');

  useEffect(() => {
    loadDepartments();
    loadProfiles();
  }, []);

  const loadDepartments = async () => {
    try {
      const { data, error } = await supabase
        .from('departments')
        .select(`
          *,
          line_manager:profiles!line_manager_id(first_name, last_name)
        `)
        .order('name');

      if (error) throw error;
      setDepartments(data || []);
    } catch (error) {
      console.error('Error loading departments:', error);
      toast({
        title: "Error",
        description: "Failed to load departments",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, role')
        .eq('is_active', true)
        .in('role', ['manager', 'hr', 'admin'])
        .order('first_name');

      if (error) throw error;
      setProfiles(data || []);
    } catch (error) {
      console.error('Error loading profiles:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const departmentData = {
      name: formData.get('name') as string,
      description: formData.get('description') as string || null,
      line_manager_id: selectedLineManager || null,
      is_active: true
    };

    try {
      if (editingDepartment) {
        const { error } = await supabase
          .from('departments')
          .update(departmentData)
          .eq('id', editingDepartment.id);

        if (error) throw error;
        toast({ title: "Success", description: "Department updated successfully" });
      } else {
        const { error } = await supabase
          .from('departments')
          .insert([departmentData]);

        if (error) throw error;
        toast({ title: "Success", description: "Department created successfully" });
      }

      setIsDialogOpen(false);
      setEditingDepartment(null);
      setSelectedLineManager('');
      loadDepartments();
    } catch (error) {
      console.error('Error saving department:', error);
      toast({
        title: "Error",
        description: "Failed to save department",
        variant: "destructive"
      });
    }
  };

  const toggleDepartmentStatus = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('departments')
        .update({ is_active: isActive })
        .eq('id', id);

      if (error) throw error;
      
      setDepartments(departments.map(dept => 
        dept.id === id ? { ...dept, is_active: isActive } : dept
      ));
      
      toast({
        title: "Success",
        description: `Department ${isActive ? 'activated' : 'deactivated'} successfully`
      });
    } catch (error) {
      console.error('Error updating department status:', error);
      toast({
        title: "Error",
        description: "Failed to update department status",
        variant: "destructive"
      });
    }
  };

  const deleteDepartment = async (id: string) => {
    if (!confirm('Are you sure you want to delete this department?')) return;

    try {
      const { error } = await supabase
        .from('departments')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setDepartments(departments.filter(dept => dept.id !== id));
      toast({ title: "Success", description: "Department deleted successfully" });
    } catch (error) {
      console.error('Error deleting department:', error);
      toast({
        title: "Error",
        description: "Failed to delete department",
        variant: "destructive"
      });
    }
  };

  const editDepartment = (department: Department) => {
    setEditingDepartment(department);
    setSelectedLineManager(department.line_manager_id || '');
    setIsDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingDepartment(null);
    setSelectedLineManager('');
    setIsDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Department Management</h1>
          <p className="text-gray-600 mt-2">Manage company departments and organizational structure</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
              onClick={openCreateDialog}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Department
            </Button>
          </DialogTrigger>
          <DialogContent className="backdrop-blur-md bg-white/90">
            <DialogHeader>
              <DialogTitle>{editingDepartment ? 'Edit Department' : 'Create New Department'}</DialogTitle>
              <DialogDescription>
                {editingDepartment ? 'Update department information' : 'Add a new department to your organization'}
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Department Name</Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={editingDepartment?.name || ''}
                  placeholder="e.g., Human Resources, Engineering, Sales"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  defaultValue={editingDepartment?.description || ''}
                  placeholder="Brief description of the department's role and responsibilities"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="line_manager">Line Manager</Label>
                <Select value={selectedLineManager} onValueChange={setSelectedLineManager}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a line manager (optional)" />
                  </SelectTrigger>
                  <SelectContent className="bg-white z-50">
                    <SelectItem value="">No line manager</SelectItem>
                    {profiles.map((profile) => (
                      <SelectItem key={profile.id} value={profile.id}>
                        {profile.first_name} {profile.last_name} ({profile.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button 
                  type="submit" 
                  className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                >
                  {editingDepartment ? 'Update' : 'Create'} Department
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {departments.map((department) => (
          <Card key={department.id} className="backdrop-blur-md bg-white/60 border-white/40 shadow-lg hover:shadow-xl transition-all">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2">
                  <Building2 className="h-5 w-5 text-orange-600" />
                  <CardTitle className="text-lg">{department.name}</CardTitle>
                </div>
                <Badge variant={department.is_active ? "default" : "secondary"}>
                  {department.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              {department.description && (
                <CardDescription className="text-sm text-gray-600">
                  {department.description}
                </CardDescription>
              )}
              {department.line_manager && (
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Users className="h-4 w-4" />
                  <span>Manager: {department.line_manager.first_name} {department.line_manager.last_name}</span>
                </div>
              )}
            </CardHeader>
            
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={department.is_active}
                    onCheckedChange={(checked) => toggleDepartmentStatus(department.id, checked)}
                  />
                  <span className="text-sm text-gray-600">
                    {department.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                
                <div className="flex space-x-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => editDepartment(department)}
                    className="hover:bg-orange-100"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteDepartment(department.id)}
                    className="hover:bg-red-100 text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="mt-3 text-xs text-gray-500">
                Created: {new Date(department.created_at).toLocaleDateString()}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {departments.length === 0 && (
        <Card className="backdrop-blur-md bg-white/60 border-white/40">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No departments found</h3>
            <p className="text-gray-600 text-center mb-4">
              Get started by creating your first department
            </p>
            <Button 
              onClick={openCreateDialog}
              className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Department
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
