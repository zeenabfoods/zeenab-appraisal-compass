
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus } from 'lucide-react';
import { EmployeeProfileService, ExtendedProfile, EmployeeUpdateData } from '@/services/employeeProfileService';
import EmployeeCard from '@/components/EmployeeCard';
import EmployeeDialog from '@/components/EmployeeDialog';
import EmployeeFilters from '@/components/EmployeeFilters';
import EmployeeEmptyState from '@/components/EmployeeEmptyState';

interface Department {
  id: string;
  name: string;
}

export default function EmployeeManagement() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [employees, setEmployees] = useState<ExtendedProfile[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<ExtendedProfile | null>(null);
  const [updating, setUpdating] = useState(false);
  const [newEmployee, setNewEmployee] = useState<EmployeeUpdateData>({
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
      console.log('🔄 Loading employee management data...');
      
      // Load departments first
      const { data: departmentsData, error: departmentsError } = await supabase
        .from('departments')
        .select('id, name')
        .eq('is_active', true)
        .order('name');

      if (departmentsError) {
        console.error('❌ Error loading departments:', departmentsError);
        throw departmentsError;
      }

      console.log('✅ Departments loaded:', departmentsData?.length);
      setDepartments(departmentsData || []);

      // Load all employees with names using the service
      const employeesWithNames = await EmployeeProfileService.getAllEmployeesWithNames();
      setEmployees(employeesWithNames);
      console.log('✅ Employees loaded with names:', employeesWithNames.length);
      
    } catch (error) {
      console.error('❌ Error in loadData:', error);
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
    
    if (!editingEmployee) {
      toast({ 
        title: "Info", 
        description: "Employee creation requires proper authentication setup",
        variant: "default"
      });
      return;
    }

    setUpdating(true);
    
    try {
      console.log('🔄 Starting employee update process...');
      console.log('📝 Form data:', newEmployee);
      console.log('👤 Editing employee:', editingEmployee.id);
      
      // Use the service to update the employee
      const updatedProfile = await EmployeeProfileService.updateEmployee(editingEmployee.id, newEmployee);
      
      // Update the local state with the complete updated profile
      setEmployees(currentEmployees => 
        currentEmployees.map(emp => 
          emp.id === editingEmployee.id ? updatedProfile : emp
        )
      );

      const successMessage = `Employee "${updatedProfile.first_name} ${updatedProfile.last_name}" updated successfully.`;
      const departmentStatus = updatedProfile.department_id ? 
        `Department: ${updatedProfile.department_name || 'Assigned'}` : 'No department assigned';
      const managerStatus = updatedProfile.line_manager_id ? 
        `Manager: ${updatedProfile.line_manager_name || 'Assigned'}` : 'No manager assigned';
      
      toast({ 
        title: "Success", 
        description: `${successMessage} ${departmentStatus}, ${managerStatus}.`,
      });

      console.log('✅ Employee update completed successfully');
      
      setShowAddDialog(false);
      setEditingEmployee(null);
      resetForm();

      // Force a fresh reload to ensure consistency
      setTimeout(() => {
        console.log('🔄 Reloading data to ensure consistency...');
        loadData();
      }, 500);
      
    } catch (error) {
      console.error('❌ Error saving employee:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to save employee',
        variant: "destructive"
      });
    } finally {
      setUpdating(false);
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

  const editEmployee = (employee: ExtendedProfile) => {
    console.log('📝 Editing employee:', employee);
    console.log('🏢 Employee department_id:', employee.department_id);
    console.log('👤 Employee line_manager_id:', employee.line_manager_id);
    
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
    
    console.log('📋 Form state set to:', {
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

  const handleAddEmployee = () => {
    setEditingEmployee(null);
    resetForm();
    setShowAddDialog(true);
  };

  const filteredEmployees = employees.filter(employee => {
    const matchesSearch = 
      employee.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = filterRole === 'all' || employee.role === filterRole;
    
    return matchesSearch && matchesRole;
  });

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
              onClick={handleAddEmployee}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Employee
            </Button>
          </DialogTrigger>
          <EmployeeDialog
            open={showAddDialog}
            onOpenChange={setShowAddDialog}
            editingEmployee={editingEmployee}
            newEmployee={newEmployee}
            setNewEmployee={setNewEmployee}
            departments={departments}
            employees={employees}
            updating={updating}
            onSubmit={handleSubmit}
          />
        </Dialog>
      </div>

      <EmployeeFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        filterRole={filterRole}
        setFilterRole={setFilterRole}
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredEmployees.map((employee) => (
          <EmployeeCard
            key={employee.id}
            employee={employee}
            onEdit={editEmployee}
            onToggleStatus={toggleEmployeeStatus}
          />
        ))}
      </div>

      {filteredEmployees.length === 0 && (
        <EmployeeEmptyState
          searchTerm={searchTerm}
          filterRole={filterRole}
          onAddEmployee={handleAddEmployee}
        />
      )}
    </div>
  );
}
