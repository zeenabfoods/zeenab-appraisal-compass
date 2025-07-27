
import { DashboardLayout } from '@/components/DashboardLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Users, Trash2 } from 'lucide-react';
import { EmployeeDialog } from '@/components/EmployeeDialog';
import { ExtendedProfile, EmployeeUpdateData } from '@/services/employeeProfileService';
import { useToast } from '@/hooks/use-toast';

export default function EmployeeManagement() {
  const [editingEmployee, setEditingEmployee] = useState<ExtendedProfile | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deletingEmployeeId, setDeletingEmployeeId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: employees, isLoading, refetch } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      console.log('Fetching employees...');
      
      // First get all employees - simplified query to avoid join issues
      const { data: employeesData, error: employeesError } = await supabase
        .from('profiles')
        .select('*')
        .order('first_name');
      
      if (employeesError) {
        console.error('Error fetching employees:', employeesError);
        throw employeesError;
      }

      console.log('Raw employees data:', employeesData);

      // Get all departments separately
      const { data: departmentsData } = await supabase
        .from('departments')
        .select('id, name')
        .eq('is_active', true);

      console.log('Departments data:', departmentsData);

      // Enhance employees with department and manager names
      const enhancedEmployees = await Promise.all(
        (employeesData || []).map(async (employee) => {
          const enhanced: any = { ...employee };

          // Add department name
          if (employee.department_id && departmentsData) {
            const department = departmentsData.find(d => d.id === employee.department_id);
            if (department) {
              enhanced.department = { name: department.name };
            }
          }

          // Add line manager name
          if (employee.line_manager_id) {
            const manager = employeesData.find(emp => emp.id === employee.line_manager_id);
            if (manager) {
              enhanced.line_manager = [{
                first_name: manager.first_name,
                last_name: manager.last_name
              }];
            }
          }

          return enhanced;
        })
      );

      console.log('Enhanced employees:', enhancedEmployees);
      return enhancedEmployees;
    }
  });

  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data;
    }
  });

  const [newEmployee, setNewEmployee] = useState<EmployeeUpdateData>({
    first_name: '',
    last_name: '',
    email: '',
    role: 'staff',
    position: '',
    department_id: null,
    line_manager_id: null
  });

  const resetForm = () => {
    setNewEmployee({
      first_name: '',
      last_name: '',
      email: '',
      role: 'staff',
      position: '',
      department_id: null,
      line_manager_id: null
    });
    setEditingEmployee(null);
  };

  const handleEdit = (employee: ExtendedProfile) => {
    setEditingEmployee(employee);
    setNewEmployee({
      first_name: employee.first_name,
      last_name: employee.last_name,
      email: employee.email,
      role: employee.role,
      position: employee.position || '',
      department_id: employee.department_id,
      line_manager_id: employee.line_manager_id
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployee) return;

    setUpdating(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: newEmployee.first_name,
          last_name: newEmployee.last_name,
          email: newEmployee.email,
          role: newEmployee.role,
          position: newEmployee.position,
          department_id: newEmployee.department_id,
          line_manager_id: newEmployee.line_manager_id
        })
        .eq('id', editingEmployee.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Employee profile updated successfully"
      });

      await queryClient.invalidateQueries({ queryKey: ['employees'] });
      setDialogOpen(false);
      resetForm();
    } catch (error: any) {
      console.error('Error updating employee:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update employee profile",
        variant: "destructive"
      });
    } finally {
      setUpdating(false);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'hr': return 'bg-purple-100 text-purple-800';
      case 'manager': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const deleteEmployeeMutation = useMutation({
    mutationFn: async (employeeId: string) => {
      console.log('Starting permanent employee deletion for ID:', employeeId);
      setDeletingEmployeeId(employeeId);
      
      try {
        // Step 1: Clear all query cache related to this employee
        await queryClient.cancelQueries({ queryKey: ['employees'] });
        
        // Step 2: Remove from cache immediately
        queryClient.setQueryData(['employees'], (oldData: any) => {
          if (!oldData) return oldData;
          return oldData.filter((emp: any) => emp.id !== employeeId);
        });

        // Step 3: Delete from database with comprehensive cleanup
        console.log('Cleaning up related data...');
        
        // Remove subordinates' line manager reference
        const { error: subordinatesError } = await supabase
          .from('profiles')
          .update({ line_manager_id: null })
          .eq('line_manager_id', employeeId);
        
        if (subordinatesError) {
          console.error('Error updating subordinates:', subordinatesError);
          throw new Error(`Failed to update subordinates: ${subordinatesError.message}`);
        }

        // Delete related records in proper order
        console.log('Deleting related records...');
        
        // Delete notifications first
        await supabase.from('notifications').delete().eq('related_employee_id', employeeId);
        
        // Delete employee question assignments
        await supabase.from('employee_appraisal_questions').delete().eq('employee_id', employeeId);
        
        // Delete appraisal responses
        await supabase.from('appraisal_responses').delete().eq('employee_id', employeeId);
        
        // Delete performance analytics
        await supabase.from('performance_analytics').delete().eq('employee_id', employeeId);
        
        // Delete appraisals
        await supabase.from('appraisals').delete().eq('employee_id', employeeId);

        // Step 4: Delete the employee profile
        console.log('Deleting employee profile...');
        const { error: profileError } = await supabase
          .from('profiles')
          .delete()
          .eq('id', employeeId);
        
        if (profileError) {
          console.error('Error deleting employee profile:', profileError);
          throw new Error(`Failed to delete employee profile: ${profileError.message}`);
        }

        console.log('Employee deletion completed successfully');
        return { success: true, deletedId: employeeId };
        
      } catch (error) {
        console.error('Error during employee deletion:', error);
        // Restore cache if deletion failed
        refetch();
        throw error;
      } finally {
        setDeletingEmployeeId(null);
      }
    },
    onSuccess: async (result) => {
      console.log('Delete mutation successful');
      
      // Clear all related queries
      await queryClient.invalidateQueries({ queryKey: ['employees'] });
      await queryClient.invalidateQueries({ queryKey: ['departments'] });
      
      // Force a fresh fetch to ensure consistency
      await refetch();
      
      toast({
        title: "Success",
        description: "Employee deleted successfully"
      });
    },
    onError: (error: any) => {
      console.error('Delete mutation failed:', error);
      setDeletingEmployeeId(null);
      toast({
        title: "Error",
        description: error.message || "Failed to delete employee",
        variant: "destructive"
      });
    }
  });

  const handleDeleteEmployee = async (employeeId: string) => {
    console.log('Delete button clicked for:', employeeId);
    
    // Find employee name for confirmation
    const employee = employees?.find(emp => emp.id === employeeId);
    const employeeName = employee ? `${employee.first_name} ${employee.last_name}` : 'this employee';
    
    const confirmed = window.confirm(
      `Are you sure you want to delete ${employeeName}?\n\nThis action cannot be undone and will remove:\n- All appraisal data\n- All question assignments\n- All performance analytics\n- All notifications\n\nClick OK to proceed or Cancel to abort.`
    );
    
    if (confirmed) {
      console.log('User confirmed deletion, proceeding...');
      deleteEmployeeMutation.mutate(employeeId);
    } else {
      console.log('User cancelled deletion');
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Employee Management</h1>
            <p className="text-gray-600">Manage employee profiles and assignments</p>
          </div>
          <div className="text-sm text-gray-500">
            Total Employees: {employees?.length || 0}
          </div>
        </div>

        {employees && employees.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                All Employees ({employees.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Line Manager</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((employee) => {
                    const lineManager = Array.isArray(employee.line_manager) && employee.line_manager.length > 0 
                      ? employee.line_manager[0] 
                      : null;
                    
                    const isDeleting = deletingEmployeeId === employee.id;
                    
                    return (
                      <TableRow key={employee.id} className={isDeleting ? 'opacity-50' : ''}>
                        <TableCell className="font-medium">
                          {employee.first_name} {employee.last_name}
                        </TableCell>
                        <TableCell>{employee.email}</TableCell>
                        <TableCell>
                          <Badge className={getRoleBadgeColor(employee.role)}>
                            {employee.role.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>{employee.position || 'Not set'}</TableCell>
                        <TableCell>
                          {employee.department?.name || 
                            <span className="text-amber-600 italic">Not assigned</span>
                          }
                        </TableCell>
                        <TableCell>
                          {lineManager ? 
                            `${lineManager.first_name} ${lineManager.last_name}` :
                            <span className="text-amber-600 italic">Not assigned</span>
                          }
                        </TableCell>
                        <TableCell>
                          <Badge variant={employee.is_active ? "default" : "secondary"}>
                            {employee.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEdit(employee)}
                              className="hover:bg-orange-100"
                              disabled={isDeleting}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteEmployee(employee.id)}
                              className="hover:bg-red-100 text-red-600 hover:text-red-700"
                              disabled={isDeleting}
                            >
                              {isDeleting ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No employees found</h3>
              <p className="text-gray-600 text-center">
                Employees will appear here once they register and sign up.
              </p>
            </CardContent>
          </Card>
        )}

        <EmployeeDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          editingEmployee={editingEmployee}
          newEmployee={newEmployee}
          setNewEmployee={setNewEmployee}
          departments={departments || []}
          employees={employees || []}
          updating={updating}
          onSubmit={handleSubmit}
        />
      </div>
    </DashboardLayout>
  );
}
