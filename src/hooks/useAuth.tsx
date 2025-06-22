
import { useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Profile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  department_id?: string;
  department?: {
    name: string;
  };
  position?: string;
  line_manager_id?: string;
  role: 'staff' | 'manager' | 'hr' | 'admin';
  created_at?: string;
  last_login?: string;
  is_active?: boolean;
}

// Allowed email domains
const ALLOWED_DOMAINS = [
  '@cnthlimited.com',
  '@nigerianexportershub.com',
  '@zeenabgroup.com',
  '@zeenabfoods.com'
];

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);
  const { toast } = useToast();

  const createBasicProfile = (user: User): Profile => {
    return {
      id: user.id,
      email: user.email || '',
      first_name: user.user_metadata?.first_name || 'User',
      last_name: user.user_metadata?.last_name || '',
      role: 'staff'
    };
  };

  const fetchProfile = async (userId: string) => {
    try {
      console.log('Fetching profile for user:', userId);
      
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select(`
          *,
          department:departments!profiles_department_id_fkey(name)
        `)
        .eq('id', userId)
        .single();
      
      if (error) {
        console.log('Profile fetch error, using basic profile:', error.message);
        const currentUser = await supabase.auth.getUser();
        if (currentUser.data.user) {
          const basicProfile = createBasicProfile(currentUser.data.user);
          setProfile(basicProfile);
        }
        return;
      }
      
      console.log('Profile fetched successfully:', profileData);
      setProfile(profileData);
    } catch (error) {
      console.log('Profile fetch exception, using basic profile:', error);
      const currentUser = await supabase.auth.getUser();
      if (currentUser.data.user) {
        const basicProfile = createBasicProfile(currentUser.data.user);
        setProfile(basicProfile);
      }
    }
  };

  useEffect(() => {
    console.log('Setting up auth state listener');
    
    let mounted = true;
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id);
        
        if (!mounted) return;
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          const basicProfile = createBasicProfile(session.user);
          setProfile(basicProfile);
          
          setTimeout(() => {
            if (mounted) {
              fetchProfile(session.user.id);
            }
          }, 100);
        } else {
          setProfile(null);
        }
        
        if (mounted) {
          setLoading(false);
          setAuthReady(true);
        }
      }
    );

    const initializeAuth = async () => {
      try {
        console.log('Checking for existing session');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
          
          if (session?.user) {
            const basicProfile = createBasicProfile(session.user);
            setProfile(basicProfile);
            
            setTimeout(() => {
              if (mounted) {
                fetchProfile(session.user.id);
              }
            }, 100);
          } else {
            setProfile(null);
          }
          
          setLoading(false);
          setAuthReady(true);
        }
      } catch (error) {
        console.error('Error in initializeAuth:', error);
        if (mounted) {
          setLoading(false);
          setAuthReady(true);
        }
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
      console.log('Cleaning up auth subscription');
      subscription.unsubscribe();
    };
  }, []);

  const validateEmailDomain = (email: string): boolean => {
    const emailLower = email.toLowerCase();
    return ALLOWED_DOMAINS.some(domain => emailLower.endsWith(domain.toLowerCase()));
  };

  const signUp = async (email: string, password: string, userData: {
    first_name: string;
    last_name: string;
    role?: 'staff' | 'manager' | 'hr' | 'admin';
    department_id?: string;
    line_manager_id?: string;
  }) => {
    try {
      if (!validateEmailDomain(email)) {
        const error = new Error('Email provider not accepted');
        toast({
          title: "Sign Up Error",
          description: "Email provider not accepted. Please use an email from one of the allowed domains: @cnthlimited.com, @nigerianexportershub.com, @zeenabgroup.com, @zeenabfoods.com",
          variant: "destructive"
        });
        return { error };
      }

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: userData
        }
      });

      if (error) {
        toast({
          title: "Sign Up Error",
          description: error.message,
          variant: "destructive"
        });
        return { error };
      }

      toast({
        title: "Success",
        description: "Please check your email to confirm your account."
      });

      return { error: null };
    } catch (error: any) {
      toast({
        title: "Sign Up Error",
        description: error.message,
        variant: "destructive"
      });
      return { error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        toast({
          title: "Sign In Error",
          description: error.message,
          variant: "destructive"
        });
        return { error };
      }

      return { error: null };
    } catch (error: any) {
      toast({
        title: "Sign In Error",
        description: error.message,
        variant: "destructive"
      });
      return { error };
    }
  };

  const signOut = async () => {
    try {
      console.log('Attempting to sign out...');
      
      // Clear local state immediately to prevent UI issues
      setUser(null);
      setSession(null);
      setProfile(null);
      
      // Attempt to sign out from Supabase
      // If session is missing, this will still clear any remaining auth state
      await supabase.auth.signOut({ scope: 'local' });
      
      console.log('Sign out completed successfully');
      toast({
        title: "Success",
        description: "You have been signed out successfully."
      });
    } catch (error: any) {
      console.log('Sign out error (handled gracefully):', error);
      // Even if there's an error, we've already cleared local state
      // This handles the "Auth session missing!" error gracefully
      toast({
        title: "Success",
        description: "You have been signed out successfully."
      });
    }
  };

  console.log('Auth state:', { 
    user: !!user, 
    profile: !!profile, 
    loading,
    authReady
  });

  return {
    user,
    session,
    profile,
    loading,
    authReady,
    signUp,
    signIn,
    signOut
  };
}
