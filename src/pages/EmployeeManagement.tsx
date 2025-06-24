import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, Users, Search, Filter, UserPlus, Building2 } from 'lucide-react';

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  position: string | null;
  department_id: string | null;
  line_manager_id: string | null;
  is_active: boolean;
  created_at: string;
  department_name?: string;
  line_manager_name?: string;
}

interface Department {
  id: string;
  name: string;
}

export default function EmployeeManagement() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [newEmployee, setNewEmployee] = useState({
    first_name: '',
    last_name: '',
    email: '',
    role: 'staff',
    position: '',
    department_id: '',
    line_manager_id: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      console.log('Loading employee data with fixed queries...');
      
      // Load employees first
      const { data: employeesData, error: employeesError } = await supabase
        .from('profiles')
        .select('*')
        .order('first_name');

      if (employeesError) {
        console.error('Error loading employees:', employeesError);
        throw employeesError;
      }
      
      console.log('✅ Employees loaded:', employeesData?.length);

      // Load departments
      const { data: departmentsData, error: departmentsError } = await supabase
        .from('departments')
        .select('id, name')
        .eq('is_active', true)
        .order('name');

      if (departmentsError) {
        console.error('Error loading departments:', departmentsError);
        throw departmentsError;
      }

      console.log('✅ Departments loaded:', departmentsData?.length);

      // Create department lookup map
      const departmentMap = new Map<string, string>();
      departmentsData?.forEach(dept => {
        departmentMap.set(dept.id, dept.name);
      });

      // Create manager lookup map
      const managerMap = new Map<string, string>();
      employeesData?.forEach(emp => {
        managerMap.set(emp.id, `${emp.first_name || ''} ${emp.last_name || ''}`.trim());
      });

      // Transform employee data with proper lookups
      const transformedEmployees = employeesData?.map(employee => ({
        ...employee,
        department_name: employee.department_id ? departmentMap.get(employee.department_id) : undefined,
        line_manager_name: employee.line_manager_id ? managerMap.get(employee.line_manager_id) : undefined
      })) || [];

      console.log('✅ Final transformed employees:', transformedEmployees.length);
      setEmployees(transformedEmployees);
      setDepartments(departmentsData || []);
      
    } catch (error) {
      console.error('Error in loadData:', error);
      toast({
        title: "Error",
        description: "Failed to load employee data. Please check the console for details.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      console.log('Submitting employee data:', newEmployee);
      
      if (editingEmployee) {
        // Prepare the update data - convert empty strings and 'none' to null
        const updateData = {
          first_name: newEmployee.first_name.trim(),
          last_name: newEmployee.last_name.trim(),
          email: newEmployee.email.trim(),
          role: newEmployee.role as any,
          position: newEmployee.position?.trim() || null,
          department_id: (newEmployee.department_id === 'none' || newEmployee.department_id === '') ? null : newEmployee.department_id,
          line_manager_id: (newEmployee.line_manager_id === 'none' || newEmployee.line_manager_id === '') ? null : newEmployee.line_manager_id
        };

        console.log('🔄 Updating employee with data:', updateData);
        console.log('🆔 Employee ID:', editingEmployee.id);

        // Perform the update with explicit error handling
        const { data: updatedData, error: updateError } = await supabase
          .from('profiles')
          .update(updateData)
          .eq('id', editingEmployee.id)
          .select('*')
          .single();

        if (updateError) {
          console.error('❌ Update error:', updateError);
          throw new Error(`Failed to update employee: ${updateError.message}`);
        }

        console.log('✅ Employee updated successfully:', updatedData);

        // Verify the update by fetching the record again
        const { data: verificationData, error: verifyError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', editingEmployee.id)
          .single();

        if (verifyError) {
          console.error('❌ Verification error:', verifyError);
        } else {
          console.log('✅ Verification - Updated record:', verificationData);
        }

        toast({ 
          title: "Success", 
          description: `Employee "${updateData.first_name} ${updateData.last_name}" updated successfully. Department: ${updateData.department_id ? 'Assigned' : 'Not assigned'}, Manager: ${updateData.line_manager_id ? 'Assigned' : 'Not assigned'}` 
        });
      } else {
        // For new employee creation, we need proper authentication setup
        toast({ 
          title: "Info", 
          description: "Employee creation requires proper authentication setup",
          variant: "default"
        });
      }

      setShowAddDialog(false);
      setEditingEmployee(null);
      resetForm();
      
      // Reload data to reflect changes with a small delay to ensure database consistency
      setTimeout(async () => {
        await loadData();
        console.log('📊 Data reloaded after update');
      }, 500);
      
    } catch (error) {
      console.error('❌ Error saving employee:', error);
      toast({
        title: "Error",
        description: `Failed to save employee: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  const toggleEmployeeStatus = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: isActive })
        .eq('id', id);

      if (error) throw error;
      
      setEmployees(employees.map(emp => 
        emp.id === id ? { ...emp, is_active: isActive } : emp
      ));
      
      toast({
        title: "Success",
        description: `Employee ${isActive ? 'activated' : 'deactivated'} successfully`
      });
    } catch (error) {
      console.error('Error updating employee status:', error);
      toast({
        title: "Error",
        description: "Failed to update employee status",
        variant: "destructive"
      });
    }
  };

  const editEmployee = (employee: Employee) => {
    console.log('Editing employee:', employee);
    console.log('Employee department_id:', employee.department_id);
    console.log('Employee line_manager_id:', employee.line_manager_id);
    
    setEditingEmployee(employee);
    setNewEmployee({
      first_name: employee.first_name,
      last_name: employee.last_name,
      email: employee.email,
      role: employee.role,
      position: employee.position || '',
      department_id: employee.department_id || 'none',
      line_manager_id: employee.line_manager_id || 'none'
    });
    
    console.log('Form state set to:', {
      first_name: employee.first_name,
      last_name: employee.last_name,
      email: employee.email,
      role: employee.role,
      position: employee.position || '',
      department_id: employee.department_id || 'none',
      line_manager_id: employee.line_manager_id || 'none'
    });
    
    setShowAddDialog(true);
  };

  const resetForm = () => {
    setNewEmployee({
      first_name: '',
      last_name: '',
      email: '',
      role: 'staff',
      position: '',
      department_id: '',
      line_manager_id: ''
    });
  };

  const filteredEmployees = employees.filter(employee => {
    const matchesSearch = 
      employee.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = filterRole === 'all' || employee.role === filterRole;
    
    return matchesSearch && matchesRole;
  });

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'hr': return 'bg-purple-100 text-purple-800';
      case 'manager': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
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
          <h1 className="text-3xl font-bold text-gray-900">Employee Management</h1>
          <p className="text-gray-600 mt-2">Manage employee profiles, roles, and organizational structure</p>
        </div>
        
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button 
              className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
              onClick={() => {
                setEditingEmployee(null);
                resetForm();
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Employee
            </Button>
          </DialogTrigger>
          <DialogContent className="backdrop-blur-md bg-white/90 max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingEmployee ? 'Edit Employee' : 'Add New Employee'}</DialogTitle>
              <DialogDescription>
                {editingEmployee ? 'Update employee information' : 'Add a new employee to your organization'}
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">First Name</Label>
                  <Input
                    id="first_name"
                    value={newEmployee.first_name}
                    onChange={(e) => setNewEmployee({ ...newEmployee, first_name: e.target.value })}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="last_name">Last Name</Label>
                  <Input
                    id="last_name"
                    value={newEmployee.last_name}
                    onChange={(e) => setNewEmployee({ ...newEmployee, last_name: e.target.value })}
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newEmployee.email}
                  onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })}
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select value={newEmployee.role} onValueChange={(value) => setNewEmployee({ ...newEmployee, role: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="staff">Staff</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="hr">HR</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="position">Position</Label>
                  <Input
                    id="position"
                    value={newEmployee.position}
                    onChange={(e) => setNewEmployee({ ...newEmployee, position: e.target.value })}
                    placeholder="Software Engineer, Marketing Manager, etc."
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Select 
                    value={newEmployee.department_id} 
                    onValueChange={(value) => {
                      console.log('Department changed to:', value);
                      setNewEmployee({ ...newEmployee, department_id: value });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Department</SelectItem>
                      {departments.map(dept => (
                        <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="line_manager">Line Manager</Label>
                  <Select 
                    value={newEmployee.line_manager_id} 
                    onValueChange={(value) => {
                      console.log('Line manager changed to:', value);
                      setNewEmployee({ ...newEmployee, line_manager_id: value });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select manager" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Manager</SelectItem>
                      {employees
                        .filter(emp => emp.role === 'manager' || emp.role === 'hr' || emp.role === 'admin')
                        .filter(emp => emp.id !== editingEmployee?.id)
                        .map(manager => (
                          <SelectItem key={manager.id} value={manager.id}>
                            {manager.first_name} {manager.last_name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button 
                  type="submit" 
                  className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                >
                  {editingEmployee ? 'Update' : 'Add'} Employee
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowAddDialog(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input 
            placeholder="Search employees..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={filterRole} onValueChange={setFilterRole}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="staff">Staff</SelectItem>
            <SelectItem value="manager">Manager</SelectItem>
            <SelectItem value="hr">HR</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Employee Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredEmployees.map((employee) => (
          <Card key={employee.id} className="backdrop-blur-md bg-white/60 border-white/40 shadow-lg hover:shadow-xl transition-all">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-orange-400 to-red-400 flex items-center justify-center text-white font-semibold">
                    {employee.first_name[0]}{employee.last_name[0]}
                  </div>
                  <div>
                    <CardTitle className="text-lg">
                      {employee.first_name} {employee.last_name}
                    </CardTitle>
                    <CardDescription className="text-sm">
                      {employee.email}
                    </CardDescription>
                  </div>
                </div>
                <Badge className={getRoleBadgeColor(employee.role)}>
                  {employee.role.toUpperCase()}
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="space-y-2 text-sm">
                {employee.position && (
                  <div className="flex items-center text-gray-600">
                    <UserPlus className="h-4 w-4 mr-2" />
                    {employee.position}
                  </div>
                )}
                
                <div className="flex items-center">
                  <Building2 className="h-4 w-4 mr-2" />
                  <span className={employee.department_name ? "text-gray-600" : "text-amber-600 italic"}>
                    {employee.department_name || "No Department Assigned"}
                  </span>
                </div>
                
                <div className="flex items-center">
                  <Users className="h-4 w-4 mr-2" />
                  <span className={employee.line_manager_name ? "text-gray-600" : "text-amber-600 italic"}>
                    {employee.line_manager_name ? 
                      `Reports to: ${employee.line_manager_name}` : 
                      "No Manager Assigned"
                    }
                  </span>
                </div>
              </div>
              
              <div className="flex items-center justify-between mt-4 pt-3 border-t">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={employee.is_active}
                    onCheckedChange={(checked) => toggleEmployeeStatus(employee.id, checked)}
                  />
                  <span className="text-sm text-gray-600">
                    {employee.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => editEmployee(employee)}
                  className="hover:bg-orange-100"
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="mt-2 text-xs text-gray-500">
                Joined: {new Date(employee.created_at).toLocaleDateString()}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredEmployees.length === 0 && (
        <Card className="backdrop-blur-md bg-white/60 border-white/40">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm || filterRole !== 'all' ? 'No employees found' : 'No employees yet'}
            </h3>
            <p className="text-gray-600 text-center mb-4">
              {searchTerm || filterRole !== 'all' 
                ? 'Try adjusting your search or filter criteria'
                : 'Get started by adding your first employee'
              }
            </p>
            {!searchTerm && filterRole === 'all' && (
              <Button 
                onClick={() => setShowAddDialog(true)}
                className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add First Employee
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
