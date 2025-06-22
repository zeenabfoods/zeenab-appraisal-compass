
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/components/AuthProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuthData } from '@/hooks/useAuthData';
import { AuthBackground } from '@/components/auth/AuthBackground';
import { SignInForm } from '@/components/auth/SignInForm';
import { SignUpForm } from '@/components/auth/SignUpForm';
import { useToast } from '@/hooks/use-toast';

export default function Auth() {
  const { signIn, signUp, user } = useAuthContext();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>('staff');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [selectedManager, setSelectedManager] = useState<string>('');
  
  const { departments, managers, dataLoading, dataError } = useAuthData();

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleDepartmentChange = (departmentId: string) => {
    console.log('🏢 Department selected:', departmentId);
    setSelectedDepartment(departmentId);
    
    // Auto-assign line manager based on department
    const selectedDept = departments.find(dept => dept.id === departmentId);
    if (selectedDept && selectedDept.line_manager_id) {
      console.log('💡 Auto-assigning line manager:', selectedDept.line_manager_id);
      setSelectedManager(selectedDept.line_manager_id);
    } else {
      console.log('⚠️ No line manager found for department:', departmentId);
      setSelectedManager('');
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
    
    // Remove the strict department validation - make it truly optional for sign-up
    // Only validate if user is not admin and actually selected a department that requires a line manager
    if (role !== 'admin' && selectedDepartment && selectedDepartment !== '') {
      // Check if department has a line manager assigned only if a department was selected
      const selectedDept = departments.find(dept => dept.id === selectedDepartment);
      if (!selectedDept?.line_manager_id) {
        toast({
          title: "Department Configuration Error",
          description: "The selected department does not have a line manager assigned. Please contact HR or select a different department.",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }
    }

    // Prepare the data - only include department/manager if actually selected
    const departmentId = selectedDepartment && selectedDepartment !== '' ? selectedDepartment : undefined;
    const lineManagerId = (role !== 'admin' && selectedManager && selectedManager !== '') ? selectedManager : undefined;

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

  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-red-50 px-4 relative overflow-hidden">
      <AuthBackground />

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
              <SignInForm onSubmit={handleSignIn} loading={loading} />
            </TabsContent>
            
            <TabsContent value="signup">
              <SignUpForm
                onSubmit={handleSignUp}
                loading={loading}
                dataLoading={dataLoading}
                dataError={dataError}
                departments={departments}
                managers={managers}
                selectedRole={selectedRole}
                selectedDepartment={selectedDepartment}
                selectedManager={selectedManager}
                onRoleChange={setSelectedRole}
                onDepartmentChange={handleDepartmentChange}
                onManagerChange={setSelectedManager}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
