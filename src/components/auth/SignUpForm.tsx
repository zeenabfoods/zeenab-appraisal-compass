
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
  // Debug logging for sign-up form
  React.useEffect(() => {
    console.log('🔥 SignUpForm: Component state:', {
      dataLoading,
      dataError: dataError || 'none',
      departmentsCount: departments?.length || 0,
      managersCount: managers?.length || 0,
      selectedRole,
      selectedDepartment,
      selectedManager
    });
  }, [dataLoading, dataError, departments, managers, selectedRole, selectedDepartment, selectedManager]);

  if (dataLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600"></div>
        <span className="ml-2 text-sm text-gray-600">Loading system data...</span>
      </div>
    );
  }

  // Get the line manager name for the selected department
  const getLineManagerInfo = () => {
    if (!selectedDepartment || selectedDepartment === '') return { name: '', exists: false };
    
    const selectedDept = departments.find(dept => dept.id === selectedDepartment);
    if (!selectedDept || !selectedDept.line_manager_id) {
      return { name: '', exists: false };
    }
    
    const lineManager = managers.find(manager => manager.id === selectedDept.line_manager_id);
    return {
      name: lineManager ? `${lineManager.first_name} ${lineManager.last_name}` : '',
      exists: !!lineManager
    };
  };

  const lineManagerInfo = getLineManagerInfo();

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {dataError && (
        <div className="p-3 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md">
          {dataError}
          <button 
            type="button" 
            onClick={() => window.location.reload()} 
            className="ml-2 text-amber-800 underline hover:no-underline"
          >
            Refresh page
          </button>
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
        <Label htmlFor="department">Department (Optional)</Label>
        <Select 
          value={selectedDepartment}
          onValueChange={onDepartmentChange}
        >
          <SelectTrigger className="backdrop-blur-sm bg-white/70 border-white/40">
            <SelectValue placeholder="Choose your department (optional)" />
          </SelectTrigger>
          <SelectContent className="backdrop-blur-md bg-white/90 z-50">
            {departments && departments.length > 0 ? (
              departments.map((dept) => (
                <SelectItem key={dept.id} value={dept.id}>
                  {dept.name}
                </SelectItem>
              ))
            ) : (
              <SelectItem value="no-departments" disabled>
                No departments available
              </SelectItem>
            )}
          </SelectContent>
        </Select>
        {departments.length === 0 && !dataLoading && (
          <p className="text-sm text-blue-600">
            ℹ️ Department assignment will be done by HR after account creation.
          </p>
        )}
      </div>

      {/* Always show line manager field if not admin and department is selected */}
      {selectedRole !== 'admin' && selectedDepartment && selectedDepartment !== '' && (
        <div className="space-y-2">
          <Label htmlFor="lineManager">Line Manager</Label>
          <Input
            id="lineManager"
            name="lineManager"
            value={lineManagerInfo.name || 'Will be assigned based on department'}
            placeholder="Line manager will be assigned based on department"
            className="backdrop-blur-sm bg-gray-100/70 border-white/40 text-gray-700"
            readOnly
          />
          {lineManagerInfo.exists ? (
            <p className="text-sm text-green-600">
              ✅ Line manager: {lineManagerInfo.name}
            </p>
          ) : (
            <p className="text-sm text-amber-600">
              ⚠️ Line manager will be assigned by HR after department confirmation
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
