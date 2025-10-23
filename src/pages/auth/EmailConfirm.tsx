import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, AlertCircle, Loader2, Mail, ArrowRight, Home } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { redirectUserByRole, getRoleDisplayName } from '../../utils/roleRouting';
import LoadingSpinner from '../../components/common/LoadingSpinner';

export default function EmailConfirm() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, userProfile, loading } = useAuth();
  
  const [confirmationState, setConfirmationState] = useState<{
    status: 'loading' | 'success' | 'error' | 'expired';
    message: string;
  }>({
    status: 'loading',
    message: 'Confirming your email...'
  });

  console.log('📧 EmailConfirm component loaded', {
    user: user?.id || null,
    emailConfirmed: user?.email_confirmed_at ? 'confirmed' : 'pending',
    userProfile: userProfile?.role || null,
    searchParams: Object.fromEntries(searchParams.entries()),
    timestamp: new Date().toISOString()
  });

  useEffect(() => {
    // If user is already confirmed and has profile, redirect them
    if (user && user.email_confirmed_at && userProfile) {
      console.log('✅ User already confirmed, redirecting to dashboard');
      setTimeout(() => {
        const redirectPath = redirectUserByRole(userProfile.role);
        navigate(redirectPath);
      }, 2000);
      
      setConfirmationState({
        status: 'success',
        message: `Welcome back! You're already confirmed. Redirecting you to your ${getRoleDisplayName(userProfile.role)} dashboard...`
      });
      return;
    }

    // Check for confirmation tokens in URL
    const token = searchParams.get('token');
    const type = searchParams.get('type');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    console.log('🔍 URL parameters:', { token, type, error, errorDescription });

    if (error) {
      console.error('❌ Confirmation error from URL:', error, errorDescription);
      
      let errorMessage = 'Email confirmation failed.';
      if (error === 'access_denied') {
        errorMessage = 'Email confirmation was denied or cancelled.';
      } else if (error === 'server_error') {
        errorMessage = 'A server error occurred during confirmation. Please try again.';
      } else if (errorDescription) {
        errorMessage = errorDescription;
      }

      setConfirmationState({
        status: 'error',
        message: errorMessage
      });
      return;
    }

    if (type === 'signup' && token) {
      console.log('🔄 Processing email confirmation token...');
      
      // The token will be automatically processed by Supabase auth
      // We just need to wait for the user state to update
      setConfirmationState({
        status: 'loading',
        message: 'Confirming your email address...'
      });

      // Set up a timeout in case confirmation takes too long
      const timeout = setTimeout(() => {
        console.warn('⏰ Email confirmation timeout');
        setConfirmationState({
          status: 'error',
          message: 'Email confirmation is taking longer than expected. Please try logging in manually.'
        });
      }, 15000);

      return () => clearTimeout(timeout);
    }

    // If no token but user exists, they might be already confirmed
    if (user) {
      if (user.email_confirmed_at) {
        console.log('✅ User email already confirmed');
        setConfirmationState({
          status: 'success',
          message: 'Your email is already confirmed! You can now access your account.'
        });
        
        // Redirect after showing success message
        if (userProfile) {
          setTimeout(() => {
            const redirectPath = redirectUserByRole(userProfile.role);
            navigate(redirectPath);
          }, 3000);
        }
      } else {
        console.log('⏳ User exists but email not confirmed yet');
        setConfirmationState({
          status: 'loading',
          message: 'Your account exists but email confirmation is still pending...'
        });
      }
    } else {
      // No user and no token - they might need to log in
      console.log('ℹ️ No user found and no confirmation token');
      setConfirmationState({
        status: 'error',
        message: 'No confirmation token found. Please check your email or try logging in.'
      });
    }
  }, [user, userProfile, searchParams, navigate]);

  // Monitor for successful confirmation
  useEffect(() => {
    if (user && user.email_confirmed_at && userProfile && confirmationState.status === 'loading') {
      console.log('✅ Email confirmation successful!');
      
      setConfirmationState({
        status: 'success',
        message: `Email confirmed successfully! Welcome to Best Brightness, ${userProfile.first_name}!`
      });

      // Redirect to role-appropriate dashboard
      setTimeout(() => {
        const redirectPath = redirectUserByRole(userProfile.role);
        navigate(redirectPath);
      }, 3000);
    }
  }, [user, userProfile, confirmationState.status, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <LoadingSpinner size="large" />
          <p className="mt-4 text-sm text-gray-600">Loading your account...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center">
            {/* Status Icon */}
            <div className="flex justify-center mb-6">
              <div className={`p-4 rounded-2xl shadow-lg ${
                confirmationState.status === 'success' 
                  ? 'bg-green-100 text-green-600'
                  : confirmationState.status === 'error'
                  ? 'bg-red-100 text-red-600' 
                  : 'bg-green-100 text-green-600'
              }`}>
                {confirmationState.status === 'loading' && (
                  <Loader2 className="h-8 w-8 animate-spin" />
                )}
                {confirmationState.status === 'success' && (
                  <CheckCircle className="h-8 w-8" />
                )}
                {confirmationState.status === 'error' && (
                  <AlertCircle className="h-8 w-8" />
                )}
              </div>
            </div>

            {/* Title */}
            <h1 className="text-3xl text-[#2C3E50] mb-6">
              {confirmationState.status === 'loading' && 'Confirming Email'}
              {confirmationState.status === 'success' && 'Email Confirmed!'}
              {confirmationState.status === 'error' && 'Confirmation Failed'}
            </h1>

            {/* Message */}
            <div className={`p-6 rounded-xl border-2 mb-6 ${
              confirmationState.status === 'success'
                ? 'bg-green-50 border-green-200'
                : confirmationState.status === 'error'
                ? 'bg-red-50 border-red-200'
                : 'bg-green-50 border-green-200'
            }`}>
              <p className={`text-sm leading-relaxed ${
                confirmationState.status === 'success'
                  ? 'text-green-700'
                  : confirmationState.status === 'error'
                  ? 'text-red-700'
                  : 'text-green-700'
              }`}>
                {confirmationState.message}
              </p>
            </div>

            {/* User Info (if available) */}
            {user && user.email_confirmed_at && userProfile && (
              <div className="bg-[#4682B4]/10 border border-[#4682B4]/20 rounded-xl p-4 mb-6">
                <div className="flex items-center justify-center space-x-3">
                  <div className="bg-[#4682B4] text-white p-2 rounded-lg">
                    <Mail className="h-4 w-4" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm text-[#2C3E50]">
                      <strong>{userProfile.first_name} {userProfile.last_name}</strong>
                    </p>
                    <p className="text-xs text-[#2C3E50]/70">
                      {getRoleDisplayName(userProfile.role)} • {user.email}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-4">
              {confirmationState.status === 'success' && userProfile && (
                <div className="bg-gradient-to-r from-[#4682B4] to-[#2C3E50] rounded-xl p-4 text-white">
                  <div className="flex items-center justify-center space-x-2 mb-2">
                    <ArrowRight className="h-4 w-4" />
                    <span className="text-sm">Redirecting in 3 seconds...</span>
                  </div>
                  <p className="text-xs opacity-90">
                    Taking you to your {getRoleDisplayName(userProfile.role)} dashboard
                  </p>
                </div>
              )}

              {confirmationState.status === 'error' && (
                <div className="space-y-3">
                  <Link
                    to="/login"
                    className="w-full flex justify-center py-3 px-4 border border-transparent text-sm rounded-xl text-white bg-[#4682B4] hover:bg-[#2C3E50] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#4682B4] transition-all duration-300"
                  >
                    Try Logging In
                  </Link>
                  <Link
                    to="/register"
                    className="w-full flex justify-center py-3 px-4 border border-[#4682B4] text-sm rounded-xl text-[#4682B4] bg-white hover:bg-[#4682B4] hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#4682B4] transition-all duration-300"
                  >
                    Create New Account
                  </Link>
                </div>
              )}

              {/* Always show home link */}
              <Link
                to="/"
                className="w-full flex justify-center items-center py-3 px-4 border border-gray-300 text-sm rounded-xl text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#4682B4] transition-all duration-300"
              >
                <Home className="h-4 w-4 mr-2" />
                Go to Homepage
              </Link>
            </div>

            {/* Help Text */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                Need help? Contact our support team at{' '}
                <a 
                  href="mailto:support@bestbrightness.com" 
                  className="text-[#4682B4] hover:text-[#2C3E50] transition-colors"
                >
                  support@bestbrightness.com
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}