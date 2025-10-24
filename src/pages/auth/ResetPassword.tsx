import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../utils/supabase/client';
import { Eye, EyeOff, Package, CheckCircle, AlertTriangle, ArrowLeft, Mail, Key } from 'lucide-react';
import LoadingSpinner from '../../components/common/LoadingSpinner';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [validSession, setValidSession] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [pageMode, setPageMode] = useState<'request' | 'reset'>('request');

  // Check if we have a valid session from the email link
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Session check error:', error);
          setValidSession(false);
          setPageMode('request');
          setCheckingSession(false);
          return;
        }

        // Check if this is a password recovery session
        if (session?.user?.recovery_sent_at) {
          setValidSession(true);
          setPageMode('reset');
        } else {
          setValidSession(false);
          setPageMode('request');
        }
      } catch (error) {
        console.error('Unexpected session check error:', error);
        setValidSession(false);
        setPageMode('request');
      } finally {
        setCheckingSession(false);
      }
    };

    checkSession();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateEmailForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validatePasswordForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateEmailForm()) return;

    try {
      setLoading(true);
      setErrors({});

      const { error } = await supabase.auth.resetPasswordForEmail(formData.email, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) {
        console.error('Password reset request error:', error);
        setErrors({
          general: error.message || 'Failed to send reset email. Please try again.'
        });
        return;
      }

      setSuccess(true);
    } catch (error) {
      console.error('Unexpected password reset request error:', error);
      setErrors({
        general: 'An unexpected error occurred. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validatePasswordForm()) return;

    try {
      setLoading(true);
      setErrors({});

      const { error } = await supabase.auth.updateUser({
        password: formData.password
      });

      if (error) {
        console.error('Password update error:', error);
        setErrors({
          general: error.message || 'Failed to update password. Please try again.'
        });
        return;
      }

      setSuccess(true);
      
      // Redirect to login after a short delay
      setTimeout(() => {
        navigate('/login', {
          state: {
            message: 'Password updated successfully! Please sign in with your new password.'
          }
        });
      }, 3000);
    } catch (error) {
      console.error('Unexpected password reset error:', error);
      setErrors({
        general: 'An unexpected error occurred. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#97CF50] to-[#28A745]">
        <div className="text-center">
          <LoadingSpinner size="large" />
          <p className="mt-4 text-sm text-white">Verifying reset link...</p>
        </div>
      </div>
    );
  }

  // Show email request form by default when no valid session
  if (!validSession && pageMode === 'request') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#97CF50] to-[#28A745] py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 border border-gray-100">
          <div>
            <div className="flex justify-center">
              <div className="p-4">
                <img 
                  src="/assets/icon.png" 
                  alt="Best Brightness Logo" 
                  className="h-10 w-20 object-contain"
                />
              </div>
            </div>
            <h2 className="mt-6 text-center text-4xl font-bold text-gray-900">
              Reset Password
            </h2>
            <p className="mt-2 text-center text-sm text-gray-700">
              Enter your email address and we'll send you a link to reset your password.
            </p>
          </div>

          {/* General Error Message */}
          {errors.general && (
            <div className="mt-6 bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-red-700">{errors.general}</div>
              </div>
            </div>
          )}

          <form className="mt-8 space-y-6" onSubmit={handleRequestReset}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-900">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleChange}
                className={`mt-1 appearance-none relative block w-full px-3 py-3 border ${
                  errors.email ? 'border-red-300' : 'border-gray-300'
                } placeholder-gray-500 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#97CF50] focus:border-transparent sm:text-sm transition-all duration-300`}
                placeholder="Enter your email address"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
              )}
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-xl text-white bg-[#97CF50] hover:bg-[#28A745] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#97CF50] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              >
                {loading ? (
                  <LoadingSpinner size="small" />
                ) : (
                  'Send Reset Link'
                )}
              </button>
            </div>

            <div className="text-center">
              <Link
                to="/login"
                className="inline-flex items-center text-sm font-medium text-[#97CF50] hover:text-[#09215F] transition-colors"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Login
              </Link>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Success state for email sent
  if (success && pageMode === 'request') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#97CF50] to-[#28A745] py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 border border-gray-100">
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <div className="bg-green-100 p-4 rounded-2xl">
                <Mail className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Check Your Email</h2>
            <p className="text-sm text-gray-700 mb-6">
              We've sent a password reset link to <strong>{formData.email}</strong>. 
              Please check your email and click the link to reset your password.
            </p>
            <Link
              to="/login"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-xl text-white bg-[#97CF50] hover:bg-[#28A745] transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Success state for password updated
  if (success && pageMode === 'reset') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#97CF50] to-[#28A745] py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 border border-gray-100">
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <div className="bg-green-100 p-4 rounded-2xl">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Password Updated!</h2>
            <p className="text-sm text-gray-700 mb-6">
              Your password has been successfully updated. You will be redirected to the login page shortly.
            </p>
            <Link
              to="/login"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-xl text-white bg-[#97CF50] hover:bg-[#28A745] transition-colors"
            >
              Sign in now
            </Link>
          </div>
        </div>
      </div>
    );
  }


  // Reset password form (when user has valid session)
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#97CF50] to-[#28A745] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8">
        <div>
          <div className="flex justify-center">
            <div className="p-4">
              <img 
                src="/assets/icon.png" 
                alt="Best Brightness Logo" 
                className="h-10 w-20 object-contain"
              />
            </div>
          </div>
          <h2 className="mt-6 text-center text-4xl font-bold text-gray-900">
            Set New Password
          </h2>
          <p className="mt-2 text-center text-sm text-gray-700">
            Enter your new password below
          </p>
        </div>

        {/* General Error Message */}
        {errors.general && (
          <div className="mt-6 bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-700">{errors.general}</div>
            </div>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handlePasswordReset}>
          <div className="space-y-5">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-900">
                New Password
              </label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`appearance-none relative block w-full px-3 py-3 pr-10 border ${
                    errors.password ? 'border-red-300' : 'border-gray-300'
                  } placeholder-gray-500 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#97CF50] focus:border-transparent sm:text-sm transition-all duration-300`}
                  placeholder="Enter your new password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password}</p>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-900">
                Confirm New Password
              </label>
              <div className="mt-1 relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={`appearance-none relative block w-full px-3 py-3 pr-10 border ${
                    errors.confirmPassword ? 'border-red-300' : 'border-gray-300'
                  } placeholder-gray-500 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#97CF50] focus:border-transparent sm:text-sm transition-all duration-300`}
                  placeholder="Confirm your new password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
              )}
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-xl text-white bg-[#97CF50] hover:bg-[#28A745] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#97CF50] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
            >
              {loading ? (
                <LoadingSpinner size="small" />
              ) : (
                'Update Password'
              )}
            </button>
          </div>

          <div className="text-center">
            <Link
              to="/login"
              className="inline-flex items-center text-sm font-medium text-[#97CF50] hover:text-[#09215F] transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Login
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}