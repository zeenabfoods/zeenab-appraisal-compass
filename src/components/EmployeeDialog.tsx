
import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ExtendedProfile, EmployeeUpdateData } from '@/services/employeeProfileService';

interface Department {
  id: string;
  name: string;
}

interface EmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingEmployee: ExtendedProfile | null;
  newEmployee: EmployeeUpdateData;
  setNewEmployee: (employee: EmployeeUpdateData) => void;
  departments: Department[];
  employees: ExtendedProfile[];
  updating: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export default function EmployeeDialog({
  open,
  onOpenChange,
  editingEmployee,
  newEmployee,
  setNewEmployee,
  departments,
  employees,
  updating,
  onSubmit
}: EmployeeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="backdrop-blur-md bg-white/90 max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editingEmployee ? 'Edit Employee' : 'Add New Employee'}</DialogTitle>
          <DialogDescription>
            {editingEmployee ? 'Update employee information' : 'Add a new employee to your organization'}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={onSubmit} className="space-y-4">
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
              <Select 
                value={newEmployee.role} 
                onValueChange={(value: 'staff' | 'manager' | 'hr' | 'admin') => 
                  setNewEmployee({ ...newEmployee, role: value })
                }
              >
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
                  console.log('🏢 Department changed to:', value);
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
                  console.log('👤 Line manager changed to:', value);
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
              disabled={updating}
              className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
            >
              {updating ? 'Updating...' : (editingEmployee ? 'Update' : 'Add')} Employee
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={updating}
            >
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
