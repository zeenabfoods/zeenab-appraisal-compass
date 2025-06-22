import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/components/AuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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

export default function Auth() {
  const { signIn, signUp, user } = useAuthContext();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [managers, setManagers] = useState<Profile[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>('staff');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [assignedManager, setAssignedManager] = useState<string>('');
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState<string>('');

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  useEffect(() => {
    console.log('🔄 Loading departments and managers data...');
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setDataLoading(true);
    setDataError('');
    try {
      console.log('📋 Starting to fetch departments and managers...');
      await Promise.all([fetchDepartments(), fetchManagers()]);
      console.log('✅ Initial data loaded successfully');
    } catch (error) {
      console.error('❌ Error loading initial data:', error);
      setDataError('Failed to load system data. Some features may not be available.');
      // Don't show toast error - we'll handle this gracefully
    } finally {
      setDataLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      console.log('📋 Fetching departments...');
      const { data, error } = await supabase
        .from('departments')
        .select('id, name, line_manager_id')
        .eq('is_active', true)
        .order('name');
      
      if (error) {
        console.error('❌ Error fetching departments:', error);
        // Don't throw - handle gracefully
        setDepartments([]);
        return;
      }
      
      console.log('✅ Departments fetched:', data?.length || 0, 'departments');
      setDepartments(data || []);
      
    } catch (error) {
      console.error('❌ Error in fetchDepartments:', error);
      setDepartments([]);
    }
  };

  const fetchManagers = async () => {
    try {
      console.log('👔 Fetching managers...');
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, role')
        .in('role', ['manager', 'hr', 'admin'])
        .eq('is_active', true)
        .order('first_name');
      
      if (error) {
        console.error('❌ Error fetching managers:', error);
        // Don't throw - handle gracefully
        setManagers([]);
        return;
      }
      
      console.log('✅ Managers fetched:', data?.length || 0, 'managers');
      setManagers(data || []);
      
    } catch (error) {
      console.error('❌ Error in fetchManagers:', error);
      setManagers([]);
    }
  };

  const handleDepartmentChange = (departmentId: string) => {
    console.log('🏢 Department selected:', departmentId);
    setSelectedDepartment(departmentId);
    
    if (departmentId === 'none') {
      setAssignedManager('');
      return;
    }
    
    // Find the selected department and its line manager
    const selectedDept = departments.find(dept => dept.id === departmentId);
    if (selectedDept && selectedDept.line_manager_id) {
      console.log('👔 Auto-assigning line manager:', selectedDept.line_manager_id);
      setAssignedManager(selectedDept.line_manager_id);
    } else {
      console.log('⚠️ No line manager found for department:', selectedDept?.name || 'Unknown');
      setAssignedManager('');
    }
  };

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    const { error } = await signIn(email, password);
    
    if (!error) {
      navigate('/');
    }
    
    setLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const firstName = formData.get('firstName') as string;
    const lastName = formData.get('lastName') as string;
    const role = formData.get('role') as 'staff' | 'manager' | 'hr' | 'admin';
    const departmentId = selectedDepartment === 'none' ? undefined : selectedDepartment;
    const lineManagerId = (role === 'admin' || assignedManager === 'none') ? undefined : assignedManager;

    console.log('📝 Signing up with data:', {
      email,
      firstName,
      lastName,
      role,
      departmentId,
      lineManagerId
    });

    await signUp(email, password, {
      first_name: firstName,
      last_name: lastName,
      role: role || 'staff',
      department_id: departmentId,
      line_manager_id: lineManagerId
    });
    
    setLoading(false);
  };

  const getManagerName = (managerId: string) => {
    const manager = managers.find(m => m.id === managerId);
    return manager ? `${manager.first_name} ${manager.last_name} (${manager.role.toUpperCase()})` : 'Unknown Manager';
  };

  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-red-50 px-4 relative overflow-hidden">
      {/* Floating glass orbs for background effect */}
      <div className="absolute top-20 left-20 w-32 h-32 bg-gradient-to-r from-orange-400/20 to-red-400/20 rounded-full blur-xl"></div>
      <div className="absolute bottom-20 right-20 w-48 h-48 bg-gradient-to-r from-red-400/15 to-orange-400/15 rounded-full blur-2xl"></div>
      <div className="absolute top-1/2 left-10 w-24 h-24 bg-gradient-to-r from-orange-300/10 to-red-300/10 rounded-full blur-lg"></div>

      <Card className="w-full max-w-md backdrop-blur-md bg-white/60 border-white/40 shadow-2xl relative z-10">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="w-12 h-12 rounded-xl overflow-hidden shadow-lg">
              <img 
                src="/lovable-uploads/382d6c71-33c6-4592-bd0f-0fb453a48ecf.png" 
                alt="Zeenab Logo" 
                className="w-full h-full object-contain"
              />
            </div>
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
              Zeenab
            </CardTitle>
          </div>
          <CardDescription>
            Sign in to your account or create a new one
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-white/50">
              <TabsTrigger value="signin" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-500 data-[state=active]:text-white">Sign In</TabsTrigger>
              <TabsTrigger value="signup" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-500 data-[state=active]:text-white">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
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
                    placeholder="Enter your password"
                    className="backdrop-blur-sm bg-white/70 border-white/40"
                    required
                  />
                </div>
                <Button type="submit" className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 shadow-lg" disabled={loading}>
                  {loading ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              {dataLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600"></div>
                  <span className="ml-2 text-sm text-gray-600">Loading system data...</span>
                </div>
              ) : (
                <form onSubmit={handleSignUp} className="space-y-4">
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
                    <Select name="role" defaultValue="staff" onValueChange={setSelectedRole}>
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
                      name="department" 
                      value={selectedDepartment}
                      onValueChange={handleDepartmentChange}
                    >
                      <SelectTrigger className="backdrop-blur-sm bg-white/70 border-white/40">
                        <SelectValue placeholder="Select your department (optional)" />
                      </SelectTrigger>
                      <SelectContent className="backdrop-blur-md bg-white/90 z-50">
                        <SelectItem value="none">No Department</SelectItem>
                        {departments.length > 0 ? (
                          departments.map((dept) => (
                            <SelectItem key={dept.id} value={dept.id}>
                              {dept.name}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no-dept" disabled>
                            No departments available
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    {departments.length === 0 && (
                      <p className="text-sm text-blue-600">
                        You can be assigned to a department after registration.
                      </p>
                    )}
                  </div>
                  {selectedRole !== 'admin' && (
                    <div className="space-y-2">
                      <Label htmlFor="lineManager">Line Manager (Optional)</Label>
                      <Input
                        id="lineManager"
                        value={assignedManager ? getManagerName(assignedManager) : 'No manager assigned'}
                        className="backdrop-blur-sm bg-gray-100/70 border-white/40"
                        readOnly
                        placeholder="Will be assigned based on department or later"
                      />
                      {managers.length === 0 && (
                        <p className="text-sm text-blue-600">
                          You can be assigned a line manager after registration.
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
                  
                  {departments.length === 0 || managers.length === 0 ? (
                    <div className="mt-4 p-3 text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-md">
                      <p className="font-medium">Note:</p>
                      <p>Your account will be created successfully. Departments and managers can be assigned by an administrator after registration.</p>
                    </div>
                  ) : null}
                </form>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
