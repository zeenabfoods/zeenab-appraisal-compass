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
  const { toast } = useToast();

  const fetchProfile = async (userId: string) => {
    try {
      console.log('Fetching profile for user:', userId);
      
      // Fix the ambiguous relationship by being specific about which department relationship to use
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select(`
          *,
          department:departments!profiles_department_id_fkey(name)
        `)
        .eq('id', userId)
        .single();
      
      if (error) {
        console.error('Error fetching profile:', error);
        
        // If no profile exists, create a basic one from user data
        if (error.code === 'PGRST116') {
          console.log('No profile found, creating basic profile from user data');
          const user = await supabase.auth.getUser();
          if (user.data.user) {
            const basicProfile: Profile = {
              id: userId,
              email: user.data.user.email || '',
              first_name: user.data.user.user_metadata?.first_name || 'User',
              last_name: user.data.user.user_metadata?.last_name || '',
              role: 'staff'
            };
            setProfile(basicProfile);
            return;
          }
        }
        
        setProfile(null);
        toast({
          title: "Profile Error",
          description: "Failed to load user profile. Using basic profile.",
          variant: "destructive"
        });
        return;
      }
      
      console.log('Profile fetched successfully:', profileData);
      setProfile(profileData);
    } catch (error) {
      console.error('Error fetching profile:', error);
      setProfile(null);
      toast({
        title: "Profile Error",
        description: "Failed to load user profile. Using basic profile.",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    console.log('Setting up auth state listener');
    
    let mounted = true;
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id);
        
        if (!mounted) return;
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
        }
        
        setLoading(false);
      }
    );

    // Check for existing session
    const initializeAuth = async () => {
      try {
        console.log('Checking for existing session');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          if (mounted) {
            setLoading(false);
          }
          return;
        }
        
        console.log('Initial session:', session?.user?.id);
        
        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
          
          if (session?.user) {
            await fetchProfile(session.user.id);
          } else {
            setProfile(null);
          }
          
          setLoading(false);
        }
      } catch (error) {
        console.error('Error in initializeAuth:', error);
        if (mounted) {
          setLoading(false);
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
      // Validate email domain before attempting sign up
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
      const { error } = await supabase.auth.signOut();
      if (error) {
        toast({
          title: "Sign Out Error",
          description: error.message,
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error('Error signing out:', error);
    }
  };

  console.log('Auth state:', { 
    user: !!user, 
    profile: !!profile, 
    loading
  });

  return {
    user,
    session,
    profile,
    loading,
    signUp,
    signIn,
    signOut
  };
}
