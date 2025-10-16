import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { createIsAtLeastRoleFunction } from '../utils/roleRouting';

// Types - Updated to match database schema exactly
export interface UserProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'customer' | 'cashier' | 'staff' | 'manager' | 'admin'; // Updated to match DB schema
  phone?: string;
  address?: any;
  preferences?: any;
  loyalty_points: number;
  is_active: boolean;
  email_verified: boolean;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
}

interface AuthState {
  user: User | null;
  userProfile: UserProfile | null;
  profile: UserProfile | null; // Alias for backwards compatibility with Navbar
  session: Session | null;
  loading: boolean;
}

interface AuthContextType extends AuthState {
  signUp: (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    role: string
  ) => Promise<{ success: boolean; error?: string; requiresConfirmation?: boolean }>;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<{ success: boolean; error?: string }>;
  resendConfirmation: (email: string) => Promise<{ success: boolean; error?: string }>;
  refreshUserProfile: () => Promise<void>;
  isAtLeastRole: (requiredRole: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    userProfile: null,
    profile: null, // Alias for backwards compatibility
    session: null,
    loading: true,
  });

  // Local cache helpers for user profile to improve UX on slow networks
  const getProfileCacheKey = (userId: string) => `bb:profile:${userId}`;
  const loadProfileFromCache = (userId: string): UserProfile | null => {
    try {
      const raw = window.localStorage.getItem(getProfileCacheKey(userId));
      return raw ? (JSON.parse(raw) as UserProfile) : null;
    } catch {
      return null;
    }
  };
  const saveProfileToCache = (profile: UserProfile | null) => {
    try {
      if (profile) {
        window.localStorage.setItem(getProfileCacheKey(profile.id), JSON.stringify(profile));
      }
    } catch {
      // ignore storage errors
    }
  };

  // Monitor auth state changes for debugging - only significant changes
  useEffect(() => {
    // Only log meaningful state changes, not every single update
    const hasUser = !!authState.user;
    const hasProfile = !!authState.userProfile;
    
    console.log('🎯 AuthState Updated:', {
      user: authState.user?.id || null,
      email: authState.user?.email || null,
      userProfile: authState.userProfile?.role || null,
      loading: authState.loading,
      hasUser,
      hasProfile,
      timestamp: new Date().toISOString()
    });
  }, [authState.user?.id, authState.userProfile?.role, authState.loading]); // Only log when key values change

  // Fetch user profile from database
  const fetchUserProfile = React.useCallback(async (userId: string): Promise<UserProfile | null> => {
    try {
      console.log('🔍 Fetching user profile for:', userId);
      
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('❌ Error fetching user profile:', error);
        return null;
      }

      console.log('✅ User profile fetched:', data);
      const profile = data as UserProfile;
      saveProfileToCache(profile);
      return profile;
    } catch (error) {
      console.error('❌ Unexpected error fetching user profile:', error);
      return null;
    }
  }, []);

  // Background retry for profile fetch with exponential backoff
  const fetchProfileWithRetry = React.useCallback(async (userId: string, maxAttempts: number = 2) => {
    let attempt = 0;
    let timeoutId: NodeJS.Timeout | null = null;
    
    const cleanup = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    };
    
    try {
      while (attempt < maxAttempts) {
        const profile = await fetchUserProfile(userId);
        if (profile) {
          setAuthState(prev => ({ ...prev, userProfile: profile, profile }));
          return profile;
        }
        attempt += 1;
        const delayMs = Math.min(2000, 500 * Math.pow(2, attempt));
        
        // Use a cancellable timeout
        await new Promise<void>((resolve, reject) => {
          timeoutId = setTimeout(resolve, delayMs);
        });
      }
      return null;
    } finally {
      cleanup();
    }
  }, [fetchUserProfile]);

  // Refresh user profile
  const refreshUserProfile = async () => {
    if (!authState.user) return;

    const profile = await fetchUserProfile(authState.user.id);
    setAuthState(prev => ({
      ...prev,
      userProfile: profile,
      profile: profile, // Set both for backwards compatibility
    }));
  };

  // Update last login time
  const updateLastLogin = async (userId: string) => {
    try {
      await supabase
        .from('user_profiles')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', userId);
    } catch (error) {
      console.error('❌ Error updating last login:', error);
    }
  };

  // Initialize auth state
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        console.log('🔄 Initializing auth (restoring existing session if present)...');
        const { data: { session } } = await supabase.auth.getSession();

        if (mounted) {
          if (session?.user) {
            // Use cached profile immediately to avoid null during render
            const cached = loadProfileFromCache(session.user.id);
            setAuthState(prev => ({
              ...prev,
              user: session.user,
              userProfile: cached,
              profile: cached,
              session,
              loading: false,
            }));
            // Refresh profile in background with retries
            fetchProfileWithRetry(session.user.id);
          } else {
            setAuthState(prev => ({ ...prev, loading: false }));
          }
        }
      } catch (error) {
        console.error('❌ Error initializing auth:', error);
        if (mounted) {
          setAuthState(prev => ({ ...prev, loading: false }));
        }
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        console.log('🔄 Auth state changed:', event, session?.user?.email);

        if (event === 'SIGNED_IN' && session?.user) {
          console.log('✅ Processing SIGNED_IN event for user:', session.user.id);
          
          // Set immediate state using cache and mark loading false
          const cached = loadProfileFromCache(session.user.id);
          setAuthState({
            user: session.user,
            userProfile: cached,
            profile: cached,
            session,
            loading: false,
          });

          // Fetch profile in background with longer timeout and retries
          // Don't await this to prevent blocking
          if (mounted) {
            fetchProfileWithRetry(session.user.id).catch(err => {
              console.error('❌ Failed to fetch profile after retries:', err);
              // Even if profile fetch fails, user is still logged in
              // Loading is already false, so UI won't be stuck
            });

            // Update last login in background
            updateLastLogin(session.user.id).catch(err => {
              console.error('⚠️ Failed to update last login:', err);
            });
          }
        } else if (event === 'SIGNED_OUT' || !session) {
          setAuthState({
            user: null,
            userProfile: null,
            profile: null,
            session: null,
            loading: false,
          });
        } else if (event === 'TOKEN_REFRESHED' && session) {
          setAuthState(prev => ({
            ...prev,
            session,
            loading: false,
          }));
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfileWithRetry]);

  // Enhanced sign up function with proper metadata handling
  const signUp = async (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    role: string
  ) => {
    setAuthState(prev => ({ ...prev, loading: true }));
    
    // Set a timeout to prevent loading state from being stuck permanently
    const loadingTimeout = setTimeout(() => {
      console.log('⏰ SignUp loading timeout - forcing loading to false');
      setAuthState(prev => ({ ...prev, loading: false }));
    }, 10000); // 10 seconds timeout (reduced from 30s)

    try {
      console.log('🔄 Starting enhanced signup process...', { email, role });

      // Map role correctly for database
      const mappedRole = role === "consumer" ? "customer" : role;

      // Create auth user with metadata for trigger
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            firstName: firstName,
            lastName: lastName,
            userType: mappedRole,
            role: mappedRole,
            phone: null, // Can be added later
            signup_method: 'web_registration',
            timestamp: new Date().toISOString()
          }
        }
      });

      if (authError) {
        console.error('❌ Auth signup error:', authError);
        return { success: false, error: authError.message };
      }

      const user = authData.user;
      if (!user) {
        return { success: false, error: "User creation failed" };
      }

      console.log('✅ Auth user created:', user.email, 'ID:', user.id);

      // The trigger should have created the profile automatically
      // Let's verify it was created
      await new Promise(resolve => setTimeout(resolve, 500)); // Wait for trigger (reduced from 1000ms)

      try {
        const { data: profileData, error: profileError } = await supabase
          .from("user_profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (profileError || !profileData) {
          console.warn('⚠️ Profile not created by trigger, creating manually...');
          
          // Fallback: Create profile manually
          const { data: manualProfile, error: manualError } = await supabase
            .from("user_profiles")
            .insert({
              id: user.id,
              email,
              first_name: firstName,
              last_name: lastName,
              role: mappedRole,
              loyalty_points: mappedRole === 'customer' ? 100 : 0,
              is_active: true,
              email_verified: user.email_confirmed_at !== null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select()
            .single();

          if (manualError) {
            console.error('❌ Manual profile creation failed:', manualError);
            
            // Try to clean up auth user
            try {
              await supabase.auth.signOut();
            } catch (cleanupError) {
              console.warn('⚠️ Could not clean up after profile creation failure');
            }
            
            return { 
              success: false, 
              error: `Profile creation failed: ${manualError.message}. Please try again.`
            };
          }

          console.log('✅ Manual profile created:', manualProfile);
        } else {
          console.log('✅ Profile created by trigger:', profileData);
          // Ensure role matches the selected role (if metadata mapping changed)
          if (profileData.role !== mappedRole) {
            await supabase
              .from('user_profiles')
              .update({ role: mappedRole, updated_at: new Date().toISOString() })
              .eq('id', user.id);
            console.log('🔧 Updated profile role to match selected role');
          }
        }

      } catch (profileException) {
        console.error('❌ Profile verification/creation exception:', profileException);
        return {
          success: false,
          error: 'Failed to create user profile. Please try again.'
        };
      }

      // Handle confirmation logic
      const requiresConfirmation = !authData.session;
      console.log('📧 Requires email confirmation:', requiresConfirmation);

      return {
        success: true,
        requiresConfirmation,
      };

    } catch (error) {
      console.error('❌ Signup exception:', error);
      return {
        success: false,
        error: 'An unexpected error occurred during signup. Please try again.'
      };
    } finally {
      clearTimeout(loadingTimeout); // Clear the timeout
      setAuthState(prev => ({ ...prev, loading: false }));
    }
  };

  // Sign in function
  const signIn = async (email: string, password: string) => {
    setAuthState(prev => ({ ...prev, loading: true }));
    
    // Set a timeout to prevent loading state from being stuck permanently
    const loadingTimeout = setTimeout(() => {
      console.log('⏰ SignIn loading timeout - forcing loading to false');
      setAuthState(prev => ({ ...prev, loading: false }));
    }, 10000); // 10 seconds timeout (reduced from 30s)

    try {
      console.log('🔄 Starting signin process...', { email });

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('❌ Signin error:', error);
        return { 
          success: false, 
          error: error.message 
        };
      }

      if (data.user) {
        console.log('✅ Signin successful:', data.user.email);

        // Ensure a user_profiles row exists and contains the selected role
        try {
          const { data: existingProfile, error: profileErr } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

          if (profileErr || !existingProfile) {
            console.warn('ℹ️ Profile missing after signin, creating from user metadata...');
            const md: any = data.user.user_metadata || {};
            const mdRole = (md.userType || md.role || 'customer') as string;
            const mappedRole = mdRole === 'consumer' ? 'customer' : mdRole;

            const insertPayload = {
              id: data.user.id,
              email: data.user.email,
              first_name: md.firstName || md.first_name || 'User',
              last_name: md.lastName || md.last_name || '',
              role: mappedRole,
              loyalty_points: mappedRole === 'customer' ? 100 : 0,
              is_active: true,
              email_verified: !!data.user.email_confirmed_at,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };

            const { error: insertErr } = await supabase
              .from('user_profiles')
              .insert(insertPayload);

            if (insertErr) {
              console.warn('⚠️ Failed to auto-create profile after signin:', insertErr);
            } else {
              console.log('✅ Auto-created user profile after signin');
            }
          }

          // Don't await profile fetch to avoid blocking
          // The auth state change event will handle the profile loading
          // Just ensure we're not stuck in loading
          setAuthState(prev => ({
            ...prev,
            loading: false,
          }));
        } catch (ensureErr) {
          console.warn('⚠️ Error ensuring profile on signin:', ensureErr);
        }

        return { success: true };
      }

      return { 
        success: false, 
        error: 'Signin failed - no user returned' 
      };
    } catch (error) {
      console.error('❌ Signin exception:', error);
      return { 
        success: false, 
        error: 'An unexpected error occurred during signin' 
      };
    } finally {
      clearTimeout(loadingTimeout); // Clear the timeout
      setAuthState(prev => ({ ...prev, loading: false }));
    }
  };

  // Sign out function
  const signOut = async () => {
    try {
      console.log('🔄 Starting signout process...');

      // Clear auth state first
      setAuthState({
        user: null,
        userProfile: null,
        profile: null,
        session: null,
        loading: false,
      });

      // Clear any cached data
      localStorage.removeItem('best-brightness-auth');
      sessionStorage.removeItem('best-brightness-auth');

      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error('❌ Signout error:', error);
        return { 
          success: false, 
          error: error.message 
        };
      }

      console.log('✅ Signout successful');
      return { success: true };
    } catch (error) {
      console.error('❌ Signout exception:', error);
      return { 
        success: false, 
        error: 'An unexpected error occurred during signout' 
      };
    }
  };

  // Resend confirmation email - Updated to follow specification
  const resendConfirmation = async (email: string) => {
    try {
      console.log('🔄 Resending confirmation email...', { email });

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });

      if (error) {
        console.error('❌ Resend confirmation error:', error);
        return { 
          success: false, 
          error: error.message 
        };
      }

      console.log('✅ Confirmation email resent successfully');
      return { success: true };
    } catch (error) {
      console.error('❌ Resend confirmation exception:', error);
      return { 
        success: false, 
        error: 'Failed to resend confirmation email' 
      };
    }
  };

  // Create the isAtLeastRole function that Navbar expects
  const isAtLeastRole = createIsAtLeastRoleFunction(authState.userProfile?.role);

  const contextValue: AuthContextType = {
    ...authState,
    signUp,
    signIn,
    signOut,
    resendConfirmation,
    refreshUserProfile,
    isAtLeastRole,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};