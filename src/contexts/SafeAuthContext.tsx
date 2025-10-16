import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../utils/supabase/client';

interface User {
  id: string;
  email: string;
  email_confirmed_at?: string;
  user_metadata?: {
    first_name?: string;
    last_name?: string;
    phone?: string;
    role?: string;
  };
}

interface UserProfile {
  id: string;
  role: 'customer' | 'admin' | 'staff' | 'manager' | 'cashier';
  first_name?: string;
  last_name?: string;
  phone?: string;
  email?: string;
  avatar_url?: string;
  is_active: boolean;
  email_verified: boolean;
  last_login?: string;
  login_attempts: number;
  two_factor_enabled: boolean;
  loyalty_points: number;
  total_spent: number;
  address?: any;
  preferences?: any;
  created_at?: string;
  updated_at?: string;
}

interface SafeAuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isDatabaseSetup: boolean;
  signUp: (email: string, password: string, firstName: string, lastName: string, role?: string, phone?: string) => Promise<{ success: boolean; error?: string; requiresConfirmation?: boolean }>;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string; role?: string }>;
  signOut: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<{ success: boolean; error?: string }>;
  updateLastLogin: () => Promise<void>;
  forgotPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  resendConfirmation: (email: string) => Promise<{ success: boolean; error?: string }>;
  isAtLeastRole: (requiredRole: 'customer' | 'admin' | 'staff' | 'manager' | 'cashier') => boolean;
  hasRole: (role: 'customer' | 'admin' | 'staff' | 'manager' | 'cashier') => boolean;
  hasAnyRole: (roles: ('customer' | 'admin' | 'staff' | 'manager' | 'cashier')[]) => boolean;
  checkDatabaseStatus: () => Promise<boolean>;
  refreshDatabaseStatus: () => Promise<void>;
}

const SafeAuthContext = createContext<SafeAuthContextType | undefined>(undefined);

export function SafeAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDatabaseSetup, setIsDatabaseSetup] = useState(false);

  console.log('🔍 SafeAuth State Debug:', { 
    user: user?.id || null, 
    emailConfirmed: user?.email_confirmed_at ? 'confirmed' : 'pending',
    profile: profile?.role || null, 
    loading, 
    isDatabaseSetup,
    timestamp: new Date().toISOString() 
  });

  // Check if database tables exist
  const checkDatabaseStatus = async (): Promise<boolean> => {
    try {
      console.log('🔧 Checking database status...');
      
      const { error } = await supabase
        .from('user_profiles')
        .select('id')
        .limit(1);

      if (error && (error.code === '42P01' || error.code === 'PGRST205' || 
                   error.message.includes('does not exist') || 
                   error.message.includes('relation') && error.message.includes('does not exist'))) {
        console.log('📊 Database not set up - tables do not exist');
        setIsDatabaseSetup(false);
        return false;
      }

      console.log('✅ Database is set up');
      setIsDatabaseSetup(true);
      return true;
    } catch (error) {
      console.warn('⚠️ Database status check failed:', error);
      setIsDatabaseSetup(false);
      return false;
    }
  };

  // Force refresh database status
  const refreshDatabaseStatus = async (): Promise<void> => {
    try {
      console.log('🔄 Refreshing database status...');
      const isSetup = await checkDatabaseStatus();
      if (isSetup && user) {
        const userProfile = await fetchUserProfile(user.id);
        if (userProfile) {
          setProfile(userProfile);
        }
      }
    } catch (error) {
      console.error('❌ Error refreshing database status:', error);
    }
  };

  // Fetch user profile from database
  const fetchUserProfile = async (userId: string): Promise<UserProfile | null> => {
    try {
      console.log(`👤 Fetching profile for user: ${userId}`);
      
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        if (error.code === '42P01' || error.code === 'PGRST205' || 
            error.message.includes('does not exist') || 
            (error.message.includes('relation') && error.message.includes('does not exist'))) {
          console.log('🔧 Database tables do not exist - using temporary profile');
          setIsDatabaseSetup(false);
          
          return {
            id: userId,
            role: 'customer',
            first_name: '',
            last_name: '',
            phone: '',
            email: '',
            is_active: true,
            email_verified: false,
            login_attempts: 0,
            two_factor_enabled: false,
            loyalty_points: 0,
            total_spent: 0,
          };
        }
        
        console.error('❌ Error fetching user profile:', error);
        return null;
      }

      if (!isDatabaseSetup) {
        setIsDatabaseSetup(true);
      }

      console.log('✅ User profile fetched:', { role: data.role, id: data.id });
      return data;
    } catch (error) {
      console.error('❌ Unexpected error fetching profile:', error);
      return {
        id: userId,
        role: 'customer',
        first_name: '',
        last_name: '',
        phone: '',
        email: '',
        is_active: true,
        email_verified: false,
        login_attempts: 0,
        two_factor_enabled: false,
        loyalty_points: 0,
        total_spent: 0,
      };
    }
  };

  // Update last login timestamp
  const updateLastLogin = async (): Promise<void> => {
    try {
      if (!user || !isDatabaseSetup) return;

      const { error } = await supabase
        .from('user_profiles')
        .update({ 
          last_login: new Date().toISOString(),
          login_attempts: 0 // Reset login attempts on successful login
        })
        .eq('id', user.id);

      if (error && error.code !== '42P01' && error.code !== 'PGRST205') {
        console.error('❌ Error updating last login:', error);
      } else {
        console.log('✅ Last login updated successfully');
      }
    } catch (error) {
      console.error('❌ Unexpected error updating last login:', error);
    }
  };

  useEffect(() => {
    console.log('🚀 Initializing safe authentication...');
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        // Set a timeout to prevent infinite loading
        const timeoutId = setTimeout(() => {
          if (isMounted) {
            console.log('⏰ Auth initialization timeout - setting loading to false');
            setLoading(false);
          }
        }, 10000); // 10 second timeout

        // Check database status first
        await checkDatabaseStatus();

        // Check for existing session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ Session check error:', error);
          if (isMounted) {
            setLoading(false);
          }
          clearTimeout(timeoutId);
          return;
        }

        if (session?.user) {
          console.log('✅ Existing session found for user:', session.user.id);
          if (isMounted) {
            setUser(session.user);
          }
          
          // Only proceed if email is confirmed or if we're in development
          if (session.user.email_confirmed_at || process.env.NODE_ENV === 'development') {
            // Fetch user profile
            const userProfile = await fetchUserProfile(session.user.id);
            if (userProfile && isMounted) {
              setProfile(userProfile);
              // Update last login on session restoration
              await updateLastLogin();
            }
          } else {
            console.log('⚠️ User email not confirmed, waiting for confirmation');
          }
        } else {
          console.log('ℹ️ No existing session found');
        }

        clearTimeout(timeoutId);
      } catch (error) {
        console.error('❌ Auth initialization error:', error);
      } finally {
        if (isMounted) {
          console.log('✅ Auth initialization complete - setting loading to false');
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth state changed:', event, session?.user?.id || 'no user');
        
        if (!isMounted) return;
        
        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user);
          
          // Only fetch profile if email is confirmed or in development
          if (session.user.email_confirmed_at || process.env.NODE_ENV === 'development') {
            const userProfile = await fetchUserProfile(session.user.id);
            if (userProfile && isMounted) {
              setProfile(userProfile);
              // Update last login on new sign in
              await updateLastLogin();
            }
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setProfile(null);
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          setUser(session.user);
        }
        
        if (isMounted) {
          setLoading(false);
        }
      }
    );

    return () => {
      console.log('🧹 Cleaning up safe auth context');
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // 🔥 SAFER SIGNUP IMPLEMENTATION
  const signUp = async (
    email: string, 
    password: string, 
    firstName: string, 
    lastName: string, 
    role: string = 'customer',
    phone?: string
  ): Promise<{ success: boolean; error?: string; requiresConfirmation?: boolean }> => {
    try {
      console.log(`📝 SAFE signup for: ${email} with role: ${role}`);
      setLoading(true);
      
      // Validate input
      if (!email || !password || !firstName || !lastName) {
        return {
          success: false,
          error: 'All required fields must be provided'
        };
      }

      if (password.length < 6) {
        return {
          success: false,
          error: 'Password must be at least 6 characters long'
        };
      }

      // Validate role
      const validRoles = ['customer', 'admin', 'staff', 'manager', 'cashier'];
      const userRole = validRoles.includes(role) ? role : 'customer';

      // Get current URL for redirect
      const redirectTo = process.env.NODE_ENV === 'development' 
        ? 'http://localhost:3000/auth/confirm' 
        : `${window.location.origin}/auth/confirm`;

      console.log('🔐 Creating Supabase user...');

      // 🔥 SAFER: Use minimal metadata to avoid constraint issues
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          emailRedirectTo: redirectTo,
          data: {
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            phone: phone?.trim() || null,
            role: userRole
          }
        }
      });

      if (error) {
        console.error('❌ Supabase signup error:', error);
        let errorMessage = 'Registration failed';
        
        if (error.message.includes('already registered') || error.message.includes('already been registered')) {
          errorMessage = 'An account with this email already exists. Please try logging in instead.';
        } else if (error.message.includes('weak password')) {
          errorMessage = 'Password is too weak. Please use a stronger password with at least 6 characters.';
        } else if (error.message.includes('invalid email')) {
          errorMessage = 'Please enter a valid email address.';
        } else if (error.message.includes('Database error saving new user')) {
          // This is the error we're trying to fix
          errorMessage = 'Account creation is temporarily unavailable. Please try again in a moment.';
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        return {
          success: false,
          error: errorMessage
        };
      }

      // Check signup result
      if (data.user) {
        console.log('✅ Supabase user created successfully:', data.user.id);
        
        // The trigger should have created the profile automatically
        // We don't need to manually create it here anymore
        
        if (!data.user.email_confirmed_at) {
          console.log('📧 Email confirmation required');
          return { 
            success: true, 
            requiresConfirmation: true 
          };
        } else {
          console.log('✅ User created and confirmed immediately');
          return { success: true };
        }
      }

      console.log('✅ Signup process completed');
      return { success: true };
      
    } catch (error) {
      console.error('❌ Unexpected signup error:', error);
      
      // Handle specific database errors
      if (error instanceof Error) {
        if (error.message.includes('Database error saving new user') || 
            error.message.includes('foreign key') ||
            error.message.includes('constraint')) {
          return { 
            success: false, 
            error: 'There was a technical issue creating your account. Please try again in a moment.' 
          };
        }
      }
      
      return { 
        success: false, 
        error: 'An unexpected error occurred. Please try again.' 
      };
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (
    email: string, 
    password: string
  ): Promise<{ success: boolean; error?: string; role?: string }> => {
    try {
      console.log(`🔑 Signing in user: ${email}`);
      setLoading(true);
      
      if (!email || !password) {
        return {
          success: false,
          error: 'Email and password are required'
        };
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password
      });

      if (error) {
        console.error('❌ Sign in error:', error);
        let errorMessage = 'Login failed';
        
        if (error.message.includes('Invalid login credentials')) {
          errorMessage = 'Invalid email or password';
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = 'Please check your email and click the confirmation link before logging in. If you haven\'t received the email, you can request a new confirmation email from the login page.';
        } else if (error.message.includes('signup_disabled')) {
          errorMessage = 'Please confirm your email address before logging in';
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        return {
          success: false,
          error: errorMessage
        };
      }

      if (data.user) {
        // Check if email is confirmed
        if (!data.user.email_confirmed_at && process.env.NODE_ENV !== 'development') {
          console.log('⚠️ User email not confirmed');
          await supabase.auth.signOut(); // Sign them out immediately
          return {
            success: false,
            error: 'Please check your email and click the confirmation link before logging in. If you haven\'t received the email, you can request a new confirmation email below.'
          };
        }

        setUser(data.user);
        
        // Fetch user profile
        const userProfile = await fetchUserProfile(data.user.id);
        if (userProfile) {
          setProfile(userProfile);
          
          // Check if account is active (only if database is set up)
          if (isDatabaseSetup && !userProfile.is_active) {
            await supabase.auth.signOut();
            return {
              success: false,
              error: 'Your account has been deactivated. Please contact support.'
            };
          }

          // Update last login
          await updateLastLogin();

          console.log(`✅ Sign in successful - role: ${userProfile.role}`);
          return { 
            success: true, 
            role: userProfile.role 
          };
        } else {
          // If no profile exists, try to create one from metadata
          const metadata = data.user.user_metadata;
          console.log('⚠️ No profile found, creating from metadata:', metadata);
          
          const tempProfile: UserProfile = {
            id: data.user.id,
            role: (metadata?.role as any) || 'customer',
            first_name: metadata?.first_name || '',
            last_name: metadata?.last_name || '',
            phone: metadata?.phone || '',
            email: data.user.email || '',
            is_active: true,
            email_verified: true,
            login_attempts: 0,
            two_factor_enabled: false,
            loyalty_points: metadata?.role === 'customer' ? 100 : 0,
            total_spent: 0
          };
          
          setProfile(tempProfile);
          console.log(`✅ Sign in successful with temp profile - role: ${tempProfile.role}`);
          return { 
            success: true, 
            role: tempProfile.role 
          };
        }
      }

      return {
        success: false,
        error: 'Login failed'
      };
    } catch (error) {
      console.error('❌ Unexpected sign in error:', error);
      return { 
        success: false, 
        error: 'An unexpected error occurred. Please try again.' 
      };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async (): Promise<void> => {
    try {
      console.log('🚪 Signing out user...');
      setLoading(true);
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('❌ Sign out error:', error);
      }
      
      // Clear local state
      setUser(null);
      setProfile(null);
      console.log('✅ Sign out successful');
    } catch (error) {
      console.error('❌ Unexpected sign out error:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (
    data: Partial<UserProfile>
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!user || !profile) {
        return { success: false, error: 'Not authenticated' };
      }

      // If database is not set up, just update local state
      if (!isDatabaseSetup) {
        const newProfile = { ...profile, ...data };
        setProfile(newProfile);
        return { success: true };
      }

      // Remove id and other non-updatable fields
      const { id, created_at, updated_at, ...updateData } = data;

      // Try to update in database
      const { data: updatedProfile, error } = await supabase
        .from('user_profiles')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .select()
        .single();

      if (error && error.code !== '42P01' && error.code !== 'PGRST205') {
        console.error('❌ Profile update error:', error);
        return { 
          success: false, 
          error: 'Failed to update profile. Please try again.' 
        };
      }

      // Update local state 
      const newProfile = { ...profile, ...updateData };
      setProfile(newProfile);

      return { success: true };
    } catch (error) {
      console.error('❌ Unexpected profile update error:', error);
      return { 
        success: false, 
        error: 'An unexpected error occurred. Please try again.' 
      };
    }
  };

  const forgotPassword = async (
    email: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!email) {
        return {
          success: false,
          error: 'Email is required'
        };
      }

      const redirectTo = process.env.NODE_ENV === 'development' 
        ? 'http://localhost:3000/reset-password' 
        : `${window.location.origin}/reset-password`;

      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo
      });

      if (error) {
        console.error('❌ Forgot password error:', error);
        return { 
          success: false, 
          error: 'Failed to send password reset email. Please try again.' 
        };
      }

      return { success: true };
    } catch (error) {
      console.error('❌ Unexpected forgot password error:', error);
      return { 
        success: false, 
        error: 'An unexpected error occurred. Please try again.' 
      };
    }
  };

  const resendConfirmation = async (
    email: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!email) {
        return {
          success: false,
          error: 'Email is required'
        };
      }

      const redirectTo = process.env.NODE_ENV === 'development' 
        ? 'http://localhost:3000/auth/confirm' 
        : `${window.location.origin}/auth/confirm`;

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim().toLowerCase(),
        options: {
          emailRedirectTo: redirectTo
        }
      });

      if (error) {
        console.error('❌ Resend confirmation error:', error);
        return { 
          success: false, 
          error: 'Failed to resend confirmation email. Please try again.' 
        };
      }

      return { success: true };
    } catch (error) {
      console.error('❌ Unexpected resend confirmation error:', error);
      return { 
        success: false, 
        error: 'An unexpected error occurred. Please try again.' 
      };
    }
  };

  // Role hierarchy for role checking
  const roleHierarchy: Record<string, number> = {
    customer: 1,
    cashier: 2,
    staff: 3,
    manager: 4,
    admin: 5
  };

  // Check if user has at least the required role level
  const isAtLeastRole = (requiredRole: 'customer' | 'admin' | 'staff' | 'manager' | 'cashier'): boolean => {
    if (!profile || !user) return false;
    
    const userLevel = roleHierarchy[profile.role] || 0;
    const requiredLevel = roleHierarchy[requiredRole] || 0;
    
    return userLevel >= requiredLevel;
  };

  // Check if user has exact role
  const hasRole = (role: 'customer' | 'admin' | 'staff' | 'manager' | 'cashier'): boolean => {
    if (!profile || !user) return false;
    return profile.role === role;
  };

  // Check if user has any of the specified roles
  const hasAnyRole = (roles: ('customer' | 'admin' | 'staff' | 'manager' | 'cashier')[]): boolean => {
    if (!profile || !user) return false;
    return roles.includes(profile.role);
  };

  const value: SafeAuthContextType = {
    user,
    profile,
    loading,
    isDatabaseSetup,
    signUp,
    signIn,
    signOut,
    updateProfile,
    updateLastLogin,
    forgotPassword,
    resendConfirmation,
    isAtLeastRole,
    hasRole,
    hasAnyRole,
    checkDatabaseStatus,
    refreshDatabaseStatus
  };

  return (
    <SafeAuthContext.Provider value={value}>
      {children}
    </SafeAuthContext.Provider>
  );
}

export function useSafeAuth(): SafeAuthContextType {
  const context = useContext(SafeAuthContext);
  if (context === undefined) {
    throw new Error('useSafeAuth must be used within a SafeAuthProvider');
  }
  return context;
}