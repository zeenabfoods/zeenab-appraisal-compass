
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/components/AuthProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AuthBackground } from '@/components/auth/AuthBackground';
import { SignInForm } from '@/components/auth/SignInForm';
import { SignUpForm } from '@/components/auth/SignUpForm';
import { PasswordResetForm } from '@/components/auth/PasswordResetForm';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';

export default function Auth() {
  const { signIn, signUp, user, resetPassword, requestPasswordReset } = useAuthContext();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>('staff');
  const [isPasswordReset, setIsPasswordReset] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);

  // Check for password reset token in URL
  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const type = hashParams.get('type');
    if (type === 'recovery') {
      setIsPasswordReset(true);
    }
  }, []);

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

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

    console.log('📝 Signing up with simplified data:', {
      email,
      firstName,
      lastName,
      role
    });

    await signUp(email, password, {
      first_name: firstName,
      last_name: lastName,
      role: role || 'staff'
    });
    
    setLoading(false);
  };

  const handlePasswordReset = async (password: string) => {
    setLoading(true);
    const { error } = await resetPassword(password);
    setLoading(false);
    
    if (!error) {
      // Clear the hash from URL
      window.location.hash = '';
      setIsPasswordReset(false);
      navigate('/');
    }
  };

  const handleForgotPassword = async (email: string) => {
    setLoading(true);
    const result = await requestPasswordReset(email);
    setLoading(false);
    return result;
  };

  if (user) {
    return null;
  }

  return (
    <div 
      className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden"
      style={{
        backgroundImage: 'url(/lovable-uploads/61d42ae6-37c2-4d92-98d3-90d3902cdd5d.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Dark overlay for better visibility */}
      <div className="absolute inset-0 bg-black/50 z-0"></div>

      <AuthBackground />

      <Card className="w-full max-w-md backdrop-blur-md bg-white/80 border-white/50 shadow-2xl relative z-10">
        <CardHeader className="text-center">
          {/* Added title above the logo */}
          <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent mb-6">
            Zeenab Appraisal System
          </h1>
          
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
          {isPasswordReset ? (
            <div className="space-y-4">
              <div className="text-center mb-4">
                <h3 className="text-lg font-semibold">Reset Your Password</h3>
                <p className="text-sm text-muted-foreground">Enter your new password below</p>
              </div>
              <PasswordResetForm onSubmit={handlePasswordReset} loading={loading} />
            </div>
          ) : isForgotPassword ? (
            <div className="space-y-4">
              <div className="text-center mb-4">
                <h3 className="text-lg font-semibold">Forgot Password</h3>
                <p className="text-sm text-muted-foreground">We'll send you a reset link</p>
              </div>
              <ForgotPasswordForm 
                onSubmit={handleForgotPassword} 
                onBack={() => setIsForgotPassword(false)}
                loading={loading} 
              />
            </div>
          ) : (
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-white/60">
                <TabsTrigger value="signin" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-500 data-[state=active]:text-white">Sign In</TabsTrigger>
                <TabsTrigger value="signup" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-500 data-[state=active]:text-white">Sign Up</TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin">
                <SignInForm 
                  onSubmit={handleSignIn} 
                  loading={loading}
                  onForgotPassword={() => setIsForgotPassword(true)}
                />
              </TabsContent>
              
              <TabsContent value="signup">
                <SignUpForm
                  onSubmit={handleSignUp}
                  loading={loading}
                  selectedRole={selectedRole}
                  onRoleChange={setSelectedRole}
                />
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
