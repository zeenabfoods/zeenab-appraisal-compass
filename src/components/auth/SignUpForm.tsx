
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Department {
  id: string;
  name: string;
  line_manager_id?: string;
}

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  role: string;
}

interface SignUpFormProps {
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
  loading: boolean;
  dataLoading: boolean;
  dataError: string;
  departments: Department[];
  managers: Profile[];
  selectedRole: string;
  selectedDepartment: string;
  selectedManager: string;
  onRoleChange: (role: string) => void;
  onDepartmentChange: (departmentId: string) => void;
  onManagerChange: (managerId: string) => void;
}

export function SignUpForm({
  onSubmit,
  loading,
  dataLoading,
  dataError,
  departments,
  managers,
  selectedRole,
  selectedDepartment,
  selectedManager,
  onRoleChange,
  onDepartmentChange,
  onManagerChange
}: SignUpFormProps) {
  if (dataLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600"></div>
        <span className="ml-2 text-sm text-gray-600">Loading system data...</span>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {dataError && (
        <div className="p-3 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md">
          {dataError}
        </div>
      )}
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">First Name</Label>
          <Input
            id="firstName"
            name="firstName"
            placeholder="First name"
            className="backdrop-blur-sm bg-white/70 border-white/40"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Last Name</Label>
          <Input
            id="lastName"
            name="lastName"
            placeholder="Last name"
            className="backdrop-blur-sm bg-white/70 border-white/40"
            required
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="Enter your email"
          className="backdrop-blur-sm bg-white/70 border-white/40"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder="Create a password"
          className="backdrop-blur-sm bg-white/70 border-white/40"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="role">Role</Label>
        <Select name="role" defaultValue="staff" onValueChange={onRoleChange}>
          <SelectTrigger className="backdrop-blur-sm bg-white/70 border-white/40">
            <SelectValue placeholder="Select your role" />
          </SelectTrigger>
          <SelectContent className="backdrop-blur-md bg-white/90 z-50">
            <SelectItem value="staff">Staff</SelectItem>
            <SelectItem value="manager">Manager</SelectItem>
            <SelectItem value="hr">HR</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="department">Department <span className="text-red-500">*</span></Label>
        <Select 
          value={selectedDepartment}
          onValueChange={onDepartmentChange}
          required
        >
          <SelectTrigger className="backdrop-blur-sm bg-white/70 border-white/40">
            <SelectValue placeholder="Choose your department" />
          </SelectTrigger>
          <SelectContent className="backdrop-blur-md bg-white/90 z-50">
            {departments.length > 0 ? (
              departments.map((dept) => (
                <SelectItem key={dept.id} value={dept.id}>
                  {dept.name}
                </SelectItem>
              ))
            ) : (
              <SelectItem value="no-departments-available" disabled>
                No departments available
              </SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>

      {selectedRole !== 'admin' && (
        <div className="space-y-2">
          <Label htmlFor="lineManager">Line Manager <span className="text-red-500">*</span></Label>
          <Select 
            value={selectedManager}
            onValueChange={onManagerChange}
            required
          >
            <SelectTrigger className="backdrop-blur-sm bg-white/70 border-white/40">
              <SelectValue placeholder="Choose your line manager" />
            </SelectTrigger>
            <SelectContent className="backdrop-blur-md bg-white/90 z-50">
              {managers.length > 0 ? (
                managers.map((manager) => (
                  <SelectItem key={manager.id} value={manager.id}>
                    {manager.first_name} {manager.last_name} ({manager.role.toUpperCase()})
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="no-managers-available" disabled>
                  No managers available
                </SelectItem>
              )}
            </SelectContent>
          </Select>
          {selectedDepartment && departments.find(d => d.id === selectedDepartment)?.line_manager_id === selectedManager && (
            <p className="text-sm text-blue-600">
              💡 This is the suggested manager for your chosen department
            </p>
          )}
        </div>
      )}

      <Button 
        type="submit" 
        className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 shadow-lg" 
        disabled={loading}
      >
        {loading ? 'Creating account...' : 'Sign Up'}
      </Button>
    </form>
  );
}
