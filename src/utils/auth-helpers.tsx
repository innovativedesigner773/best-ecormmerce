import { supabase } from '../lib/supabase';

// Types matching your exact AuthContext interface with updated schema
export interface UserProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'customer' | 'cashier' | 'staff' | 'manager' | 'admin'; // Updated to use 'consumer'
  phone?: string;
  address?: any;
  preferences?: any;
  loyalty_points: number;
  is_active: boolean;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
}

interface SignUpResult {
  success: boolean;
  error?: string;
  requiresConfirmation?: boolean;
  userId?: string;
}

interface ResendResult {
  success: boolean;
  error?: string;
}

/**
 * Safe signUp function that works with your SQL trigger
 * The trigger automatically creates user_profiles when auth.users is inserted
 */
export async function signUp(
  email: string,
  password: string,
  firstName: string,
  lastName: string,
  userType: 'customer' | 'cashier' | 'staff' | 'manager' | 'admin', // Updated parameter name and default
  phone?: string
): Promise<SignUpResult> {
  try {
    console.log(`🔐 Starting signUp for: ${email} with user type: ${userType}`);
    
    // Validate inputs
    if (!email || !password || !firstName || !lastName) {
      return {
        success: false,
        error: 'All required fields must be provided (email, password, first name, last name)'
      };
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return {
        success: false,
        error: 'Please enter a valid email address'
      };
    }

    // Validate password
    if (password.length < 6) {
      return {
        success: false,
        error: 'Password must be at least 6 characters long'
      };
    }

    // Validate user type - Updated to use new values
    const validUserTypes = ['customer', 'cashier', 'staff', 'manager', 'admin'];
    if (!validUserTypes.includes(userType)) {
      return {
        success: false,
        error: 'Invalid user type selected'
      };
    }

    // Normalize inputs
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedFirstName = firstName.trim();
    const normalizedLastName = lastName.trim();
    const normalizedPhone = phone?.trim() || null;

    // Get redirect URL for email confirmation
    const redirectTo = process.env.NODE_ENV === 'development' 
      ? 'http://localhost:3000/auth/confirm' 
      : `${window.location.origin}/auth/confirm`;

    console.log('📧 Creating auth user with Supabase...');

    // Use supabase.auth.signUp - your trigger will automatically create the profile
    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        emailRedirectTo: redirectTo,
        data: {
          firstName: normalizedFirstName,    // Match the field names your trigger expects
          lastName: normalizedLastName,      // Match the field names your trigger expects
          userType: userType,                // Changed from 'role' to 'userType'
          phone: normalizedPhone
        }
      }
    });

    if (error) {
      console.error('❌ Auth signup error:', error);
      
      let errorMessage = 'Account creation failed';
      
      if (error.message.includes('already registered') || error.message.includes('already been registered')) {
        errorMessage = 'An account with this email already exists. Please try logging in instead.';
      } else if (error.message.includes('weak password')) {
        errorMessage = 'Password is too weak. Please choose a stronger password.';
      } else if (error.message.includes('invalid email')) {
        errorMessage = 'Please enter a valid email address.';
      } else if (error.message.includes('signup_disabled')) {
        errorMessage = 'Account registration is currently disabled.';
      } else if (error.message.includes('Database error saving new user')) {
        errorMessage = 'There was a technical issue creating your profile. Please try again.';
      } else {
        errorMessage = error.message;
      }
      
      return {
        success: false,
        error: errorMessage
      };
    }

    // Check if auth user was created
    if (!data.user) {
      console.error('❌ No user returned from auth signup');
      return {
        success: false,
        error: 'Failed to create user account. Please try again.'
      };
    }

    const userId = data.user.id;
    console.log(`✅ Auth user created successfully: ${userId}`);

    // Your SQL trigger should have automatically created the profile
    // Let's verify it was created successfully
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('id, role')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.warn('⚠️ Profile verification failed, but auth user was created:', profileError);
        // Don't fail the signup if profile verification fails - the trigger might take a moment
      } else {
        console.log('✅ User profile verified:', { id: profileData.id, role: profileData.role });
      }
    } catch (verifyError) {
      console.warn('⚠️ Profile verification error:', verifyError);
      // Don't fail the signup for verification errors
    }

    // Check if email confirmation is required
    const requiresConfirmation = !data.user.email_confirmed_at;
    
    if (requiresConfirmation) {
      console.log('📧 Email confirmation required');
      return {
        success: true,
        requiresConfirmation: true,
        userId: userId
      };
    } else {
      console.log('✅ User account created and confirmed');
      return {
        success: true,
        requiresConfirmation: false,
        userId: userId
      };
    }

  } catch (error) {
    console.error('❌ Unexpected signUp error:', error);
    
    let errorMessage = 'An unexpected error occurred during account creation.';
    if (error instanceof Error) {
      if (error.message.includes('fetch')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Request timed out. Please try again.';
      }
    }
    
    return {
      success: false,
      error: errorMessage
    };
  }
}

/**
 * Resend confirmation email using supabase.auth.resend()
 */
export async function resendConfirmation(email: string): Promise<ResendResult> {
  try {
    console.log(`📧 Resending confirmation email to: ${email}`);
    
    if (!email) {
      return {
        success: false,
        error: 'Email address is required'
      };
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return {
        success: false,
        error: 'Please enter a valid email address'
      };
    }

    const normalizedEmail = email.trim().toLowerCase();
    
    const redirectTo = process.env.NODE_ENV === 'development' 
      ? 'http://localhost:3000/auth/confirm' 
      : `${window.location.origin}/auth/confirm`;

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: normalizedEmail,
      options: {
        emailRedirectTo: redirectTo
      }
    });

    if (error) {
      console.error('❌ Resend confirmation error:', error);
      
      let errorMessage = 'Failed to resend confirmation email';
      if (error.message.includes('rate limit')) {
        errorMessage = 'Too many requests. Please wait a few minutes before trying again.';
      } else if (error.message.includes('not found')) {
        errorMessage = 'No account found with this email address.';
      } else {
        errorMessage = error.message;
      }
      
      return {
        success: false,
        error: errorMessage
      };
    }

    console.log('✅ Confirmation email resent successfully');
    return { success: true };

  } catch (error) {
    console.error('❌ Unexpected resend error:', error);
    return {
      success: false,
      error: 'An unexpected error occurred. Please try again.'
    };
  }
}

/**
 * Helper function to get user type display name - Updated for new schema
 */
export function getRoleDisplayName(userType: string): string {
  const roleMap: Record<string, string> = {
    customer: 'customer',     // Updated from 'customer'
    cashier: 'Cashier',
    staff: 'Staff Member',
    manager: 'Manager',
    admin: 'Administrator'
  };
  return roleMap[userType] || 'User';
}

/**
 * Helper function to get user type redirect path description - Updated for new schema
 */
export function getRoleRedirectPath(userType: string): string {
  const pathMap: Record<string, string> = {
    customer: 'Product Catalog',  // Updated from 'customer'
    cashier: 'POS System',
    staff: 'Product Management',
    manager: 'Management Dashboard',
    admin: 'Admin Dashboard'
  };
  return pathMap[userType] || 'Dashboard';
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): { isValid: boolean; message?: string } {
  if (!password) {
    return { isValid: false, message: 'Password is required' };
  }
  
  if (password.length < 6) {
    return { isValid: false, message: 'Password must be at least 6 characters long' };
  }
  
  // Add more password rules if needed
  return { isValid: true };
}

/**
 * Validate form data - Updated to use userType
 */
export function validateSignUpForm(
  email: string,
  password: string,
  confirmPassword: string,
  firstName: string,
  lastName: string,
  userType: string
): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!firstName.trim()) {
    errors.firstName = 'First name is required';
  }

  if (!lastName.trim()) {
    errors.lastName = 'Last name is required';
  }

  if (!email.trim()) {
    errors.email = 'Email is required';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'Please enter a valid email address';
  }

  const passwordValidation = validatePassword(password);
  if (!passwordValidation.isValid) {
    errors.password = passwordValidation.message!;
  }

  if (!confirmPassword) {
    errors.confirmPassword = 'Please confirm your password';
  } else if (password !== confirmPassword) {
    errors.confirmPassword = 'Passwords do not match';
  }

  if (!userType) {
    errors.userType = 'Please select an account type'; // Updated field name
  } else if (!['customer', 'cashier', 'staff', 'manager', 'admin'].includes(userType)) {
    errors.userType = 'Invalid account type selected';
  }

  return errors;
}

/**
 * Get auth code requirements for different user types - Updated
 */
export function getAuthCodeForUserType(userType: string): string | null {
  const authCodes: Record<string, string> = {
    customer: '', // No auth code needed
    cashier: 'CASHIER2024',
    staff: 'STAFF2024',
    manager: 'MANAGER2024',
    admin: 'ADMIN2024'
  };
  return authCodes[userType] || null;
}

/**
 * Check if user type requires auth code
 */
export function requiresAuthCode(userType: string): boolean {
  return ['cashier', 'staff', 'manager', 'admin'].includes(userType);
}