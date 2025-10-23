import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, Package, CheckCircle, AlertCircle, Mail, ArrowRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { redirectUserByRole, getRoleDisplayName } from '../../utils/roleRouting';
import LoadingSpinner from '../../components/common/LoadingSpinner';

interface LocationState {
  message?: string;
  email?: string;
  from?: string;
}

export default function Login() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loginState, setLoginState] = useState<'form' | 'success'>('form');

  const { signIn, signOut, user, userProfile, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Get message and email from navigation state (e.g., from registration)
  const locationState = location.state as LocationState || {};
  const { message: locationMessage, email: prefilledEmail, from } = locationState;

  // Remove console log from render to prevent multiple logs
  React.useEffect(() => {
    console.log('🔐 Login page loaded', {
      user: user?.id || null,
      userProfile: userProfile?.role || null,
      locationMessage,
      prefilledEmail,
      from,
      timestamp: new Date().toISOString()
    });
  }, []); // Only log once on mount

  // Prefill email if provided from registration
  useEffect(() => {
    if (prefilledEmail && !formData.email) {
      setFormData(prev => ({ ...prev, email: prefilledEmail }));
    }
  }, [prefilledEmail, formData.email]);

  // If user is already logged in, redirect them
  useEffect(() => {
    if (user && userProfile && !loading) {
      console.log('✅ User already logged in, redirecting...');
      setLoginState('success');
      setTimeout(() => {
        const redirectPath = redirectUserByRole(userProfile.role);
        navigate(redirectPath);
      }, 2000);
    }
  }, [user, userProfile, loading, navigate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    
    setFormData(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }));
    
    // Clear errors when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
    if (errors.general) {
      setErrors(prev => ({ ...prev, general: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('📤 Login form submitted');
    
    if (!validateForm()) {
      console.log('❌ Form validation failed');
      return;
    }

    try {
      setErrors({});
      
      console.log('🔄 Starting login process...');
      
      const result = await signIn(formData.email, formData.password);
      
      if (result.success) {
        console.log('✅ Login successful');
        setLoginState('success');
        
        // Small delay before redirect to show success state
        setTimeout(() => {
          if (from && from !== '/login' && from !== '/register') {
            // Redirect back to where they came from
            navigate(from, { replace: true });
          } else {
            // No specific "from" location, redirect based on role
            // Note: redirectUserByRole will be called by the useEffect above
            // when userProfile is loaded
            console.log('🔄 Waiting for user profile to load for role-based redirect...');
          }
        }, 1500);
      } else {
        console.log('❌ Login failed:', result.error);
        setErrors({ 
          general: result.error || 'Login failed. Please check your credentials and try again.' 
        });
      }
    } catch (error) {
      console.error('❌ Login error:', error);
      setErrors({ 
        general: 'An unexpected error occurred. Please try again.' 
      });
    }
  };

  // Show success state while redirecting
  if (loginState === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <div className="bg-green-100 text-green-600 p-4 rounded-2xl shadow-lg">
                <CheckCircle className="h-8 w-8" />
              </div>
            </div>
            
            <h2 className="text-3xl text-[#09215F] mb-4">
              Welcome Back!
            </h2>
            
            <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-6">
              <p className="text-sm text-green-700">
                Login successful! {userProfile && (
                  <>Welcome back, <strong>{userProfile.first_name}</strong>!</>
                )}
              </p>
            </div>

            {userProfile && (
              <div className="bg-gradient-to-r from-[#97CF50] to-[#09215F] rounded-xl p-4 text-white mb-6">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <ArrowRight className="h-4 w-4" />
                  <span className="text-sm">Redirecting to your dashboard...</span>
                </div>
                <p className="text-xs opacity-90">
                  Taking you to your {getRoleDisplayName(userProfile.role)} area
                </p>
              </div>
            )}

            <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
              <LoadingSpinner size="small" />
              <span>Loading your dashboard...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white rounded-2xl shadow-2xl p-8">
        <div>
          <div className="flex justify-center">
            <div className="bg-primary text-primary-foreground p-4 rounded-2xl shadow-lg">
              <Package className="h-8 w-8" />
            </div>
          </div>
          <h2 className="mt-6 text-center text-4xl text-[#09215F]">
            Welcome back
          </h2>
          <p className="mt-2 text-center text-sm text-[#09215F]/80">
            Or{' '}
            <Link
              to="/register"
              className="text-[#97CF50] hover:text-[#09215F] transition-colors"
            >
              create a new account
            </Link>
          </p>
        </div>

        {/* Location Message (from registration, etc.) */}
        {locationMessage && (
          <div className={`border-2 rounded-2xl p-4 shadow-lg ${
            locationMessage.includes('successful') || locationMessage.includes('created')
              ? 'bg-green-50 border-green-200'
              : locationMessage.includes('confirm') || locationMessage.includes('email')
              ? 'bg-green-50 border-green-200'
              : 'bg-amber-50 border-amber-200'
          }`}>
            <div className="flex items-start space-x-3">
              <div className={`p-2 rounded-xl ${
                locationMessage.includes('successful') || locationMessage.includes('created')
                  ? 'bg-green-100 text-green-600'
                  : locationMessage.includes('confirm') || locationMessage.includes('email')
                  ? 'bg-green-100 text-green-600'
                  : 'bg-amber-100 text-amber-600'
              }`}>
                {locationMessage.includes('successful') || locationMessage.includes('created') ? (
                  <CheckCircle className="h-5 w-5" />
                ) : locationMessage.includes('confirm') || locationMessage.includes('email') ? (
                  <Mail className="h-5 w-5" />
                ) : (
                  <AlertCircle className="h-5 w-5" />
                )}
              </div>
              <div className="flex-1">
                <p className={`text-sm leading-relaxed ${
                  locationMessage.includes('successful') || locationMessage.includes('created')
                    ? 'text-green-700'
                    : locationMessage.includes('confirm') || locationMessage.includes('email')
                    ? 'text-green-700'
                    : 'text-amber-700'
                }`}>
                  {locationMessage}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* General Error Message */}
        {errors.general && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-start space-x-2">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              <div className="text-sm text-red-700">{errors.general}</div>
            </div>
          </div>
        )}

        {/* Debug Section - Show when there's a session mismatch */}
        {loading && process.env.NODE_ENV === 'development' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <div className="flex items-start space-x-2">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-medium text-yellow-800">Debug: Authentication State Issue</h4>
                <p className="text-sm text-yellow-700 mt-1">
                  The app is stuck in loading state. This might be due to a session mismatch.
                </p>
                <button
                  type="button"
                  onClick={async () => {
                    console.log('🧹 Manual logout triggered');
                    await signOut();
                    window.location.reload();
                  }}
                  className="mt-2 px-3 py-1 text-xs bg-yellow-600 text-white rounded hover:bg-yellow-700"
                >
                  Clear Session & Reload
                </button>
              </div>
            </div>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-5">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm text-[#09215F]">
                Email address *
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleInputChange}
                className={`mt-1 appearance-none relative block w-full px-3 py-3 border ${
                  errors.email ? 'border-red-300' : 'border-gray-300'
                } placeholder-gray-500 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm transition-all duration-300`}
                placeholder="Enter your email"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm text-[#09215F]">
                Password *
              </label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  className={`appearance-none relative block w-full px-3 py-3 pr-10 border ${
                    errors.password ? 'border-red-300' : 'border-gray-300'
                  } placeholder-gray-500 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm transition-all duration-300`}
                  placeholder="Enter your password"
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
          </div>

          {/* Remember Me & Forgot Password */}
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="rememberMe"
                name="rememberMe"
                type="checkbox"
                checked={formData.rememberMe}
                onChange={handleInputChange}
                className="h-4 w-4 text-[#97CF50] focus:ring-primary border-gray-300 rounded accent-[#97CF50]"
              />
              <label htmlFor="rememberMe" className="ml-2 block text-sm text-[#09215F]">
                Remember me
              </label>
            </div>

            <div className="text-sm">
              <Link
                to="/reset-password"
                className="text-[#97CF50] hover:text-[#09215F] transition-colors"
              >
                Forgot password?
              </Link>
            </div>
          </div>

          {/* Submit Button */}
          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm rounded-xl text-white bg-[#97CF50] hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <LoadingSpinner size="small" />
                  <span>Signing in...</span>
                </div>
              ) : (
                'Sign in'
              )}
            </button>
          </div>

          {/* Register Link */}
          <div className="text-center">
            <p className="text-sm text-[#09215F]/80">
              Don't have an account?{' '}
              <Link
                to="/register"
                className="text-[#97CF50] hover:text-[#09215F] transition-colors"
              >
                Create one now
              </Link>
            </p>
          </div>
        </form>

        {/* Additional Help */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-center text-sm text-[#09215F]/80">
            Need help? Contact our support team at{' '}
            <a 
              href="mailto:support@bestbrightness.com" 
              className="text-[#97CF50] hover:text-[#09215F] transition-colors"
            >
              support@bestbrightness.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}