import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Package, Gift, Shield, User, CreditCard, Mail, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getRoleDisplayName, getRoleRedirectPath, validateSignUpForm } from '../../utils/auth-helpers';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import SafeRoleSelector from '../../components/auth/SafeRoleSelector';

// Form data interface matching your database schema
interface RegisterFormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  userType: 'customer' | 'cashier' | 'staff' | 'manager' | 'admin'; // Changed from 'role' to 'userType'
  phone: string;
  acceptTerms: boolean;
}

export default function Register() {
  const [formData, setFormData] = useState<RegisterFormData>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    userType: 'customer', // Changed from 'consumer' to 'customer' to match SafeRoleSelector
    phone: '',
    acceptTerms: false
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [registrationState, setRegistrationState] = useState<'form' | 'confirmation' | 'success'>('form');

  // Use your AuthContext
  const { signUp, resendConfirmation, loading } = useAuth();
  const navigate = useNavigate();

  console.log('📝 Register State:', { 
    userType: formData.userType, 
    loading, 
    registrationState,
    hasErrors: Object.keys(errors).length > 0,
    timestamp: new Date().toISOString() 
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    
    setFormData(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
    
    // Clear general error
    if (errors.general) {
      setErrors(prev => ({ ...prev, general: '' }));
    }
  };

  const handleRoleChange = (userType: string) => {
    console.log('🎭 User type changed to:', userType);
    setFormData(prev => ({ 
      ...prev, 
      userType: userType as RegisterFormData['userType']
    }));
    
    // Clear role error if it exists
    if (errors.userType) {
      setErrors(prev => ({ ...prev, userType: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('📤 Registration form submitted');
    
    // Validate form using our helper function
    const validationErrors = validateSignUpForm(
      formData.email,
      formData.password,
      formData.confirmPassword,
      formData.firstName,
      formData.lastName,
      formData.userType
    );

    // Check terms acceptance
    if (!formData.acceptTerms) {
      validationErrors.acceptTerms = 'You must accept the terms and conditions';
    }

    if (Object.keys(validationErrors).length > 0) {
      console.log('❌ Form validation failed:', validationErrors);
      setErrors(validationErrors);
      return;
    }

    try {
      setErrors({});
      
      console.log('🔄 Starting registration process...');
      
      // Call your AuthContext signUp method with user_type instead of role
      const result = await signUp(
        formData.email,
        formData.password,
        formData.firstName,
        formData.lastName,
        formData.userType // Pass userType to match database
      );
      
      if (result.success) {
        console.log(`✅ Registration successful for user type: ${formData.userType}`);
        
        if (result.requiresConfirmation) {
          console.log('📧 Email confirmation required');
          setRegistrationState('confirmation');
        } else {
          console.log('✅ Account created and confirmed');
          setRegistrationState('success');
          
          // Redirect after delay
          setTimeout(() => {
            navigate('/login', { 
              state: { 
                message: `${getRoleDisplayName(formData.userType)} account created successfully! You can now log in.`,
                email: formData.email
              } 
            });
          }, 3000);
        }
      } else {
        console.log('❌ Registration failed:', result.error);
        setErrors({ 
          general: result.error || 'Registration failed. Please try again.' 
        });
      }
    } catch (error) {
      console.error('❌ Registration error:', error);
      setErrors({ 
        general: 'An unexpected error occurred. Please try again.' 
      });
    }
  };

  const handleResendConfirmation = async () => {
    try {
      setErrors(prev => ({ ...prev, general: '' }));
      
      const result = await resendConfirmation(formData.email);
      
      if (result.success) {
        setErrors({ 
          general: 'Confirmation email sent! Please check your inbox and click the link to activate your account.' 
        });
        setTimeout(() => setErrors({ general: '' }), 5000);
      } else {
        setErrors({ general: result.error || 'Failed to resend confirmation email.' });
      }
    } catch (error) {
      setErrors({ general: 'Failed to resend confirmation email.' });
    }
  };

  // Helper function to determine if user type is privileged (requires special access)
  const isPrivilegedRole = (userType: string) => {
    return ['cashier', 'staff', 'manager', 'admin'].includes(userType);
  };

  // Helper function to get role-specific access description
  const getRoleAccessDescription = (userType: string) => {
    switch (userType) {
      case 'customer':
        return 'customer shopping features';
      case 'cashier':
        return 'POS system access';
      case 'staff':
        return 'product and order management access';
      case 'manager':
        return 'management and analytics access';
      case 'admin':
        return 'full system access';
      default:
        return 'system access';
    }
  };

  // Email confirmation screen
  if (registrationState === 'confirmation') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <div className="bg-green-100 text-green-600 p-4 rounded-2xl shadow-lg">
                <Mail className="h-8 w-8" />
              </div>
            </div>
            
            <h2 className="text-3xl text-[#09215F] mb-4">
              Check Your Email
            </h2>
            
            <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-6">
              <div className="flex items-start space-x-3">
                <div className="bg-green-100 p-2 rounded-full">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="text-sm text-green-800 mb-2">
                    {getRoleDisplayName(formData.userType)} Account Created!
                  </h3>
                  <p className="text-sm text-green-700 leading-relaxed">
                    We've sent a confirmation email to <strong>{formData.email}</strong>. 
                    Please click the link in the email to activate your account.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
              <div className="flex items-start space-x-3">
                <div className="bg-green-100 p-2 rounded-full">
                  <Gift className="h-4 w-4 text-green-600" />
                </div>
                <div className="flex-1 text-left">
                  <h4 className="text-sm text-green-800 mb-1">What happens next?</h4>
                  <p className="text-sm text-green-700">
                    After confirming your email, you'll be automatically redirected to your {getRoleRedirectPath(formData.userType)} 
                    where you can start using Best Brightness immediately.
                  </p>
                </div>
              </div>
            </div>

            {/* Error/Success Messages */}
            {errors.general && (
              <div className={`border rounded-xl p-4 mb-6 ${
                errors.general.includes('sent') 
                  ? 'bg-green-50 border-green-200 text-green-700' 
                  : 'bg-red-50 border-red-200 text-red-700'
              }`}>
                <div className="flex items-start space-x-2">
                  {errors.general.includes('sent') ? (
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                  )}
                  <div className="text-sm">{errors.general}</div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <button
                onClick={handleResendConfirmation}
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-[#97CF50] text-sm rounded-xl text-[#97CF50] bg-white hover:bg-primary hover:text-primary-foreground focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <LoadingSpinner size="small" />
                    <span>Sending...</span>
                  </div>
                ) : (
                  <>
                    <Mail className="h-4 w-4 mr-2" />
                    Resend Confirmation Email
                  </>
                )}
              </button>

              <Link
                to="/login"
                state={{ 
                  email: formData.email,
                  message: `Please confirm your email first, then log in to access your ${getRoleDisplayName(formData.userType)} dashboard.`
                }}
                className="w-full flex justify-center py-3 px-4 border border-transparent text-sm rounded-xl text-white bg-[#97CF50] hover:bg-secondary transition-all duration-300"
              >
                Go to Login Page
              </Link>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                Need help? Contact our support team at{' '}
                <a href="mailto:support@bestbrightness.com" className="text-[#97CF50] hover:text-[#09215F]">
                  support@bestbrightness.com
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Success screen (when email confirmation is disabled)
  if (registrationState === 'success') {
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
              Account Created Successfully!
            </h2>
            
            <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-6">
              <p className="text-sm text-green-700">
                Your <strong>{getRoleDisplayName(formData.userType)}</strong> account has been created. 
                You will be redirected to the login page in a few seconds.
              </p>
            </div>

            <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
              <Clock className="h-4 w-4" />
              <span>Redirecting to login...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main registration form
  return (
    <div className="min-h-screen flex items-center justify-center bg-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white rounded-2xl shadow-2xl p-8">
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
          <h2 className="mt-6 text-center text-4xl text-[#09215F]">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-[#09215F]/80">
            Or{' '}
            <Link
              to="/login"
              className="text-[#97CF50] hover:text-[#09215F] transition-colors"
            >
              sign in to your existing account
            </Link>
          </p>
        </div>

        {/* Email Verification Notice */}
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-start space-x-3">
            <div className="bg-green-100 p-2 rounded-full">
              <Mail className="h-4 w-4 text-green-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm text-green-800 mb-1">Email Verification Required</h3>
              <p className="text-xs text-green-700">
                After registration, you'll receive an email to confirm your account before you can log in.
              </p>
            </div>
          </div>
        </div>

        {/* Role-specific Welcome Message - Fixed logic */}
        {isPrivilegedRole(formData.userType) && (
          <div className={`border-2 rounded-2xl p-6 shadow-lg ${
            formData.userType === 'admin' 
              ? 'bg-gradient-to-r from-[#FF6B35]/20 to-[#FF6B35]/30 border-[#FF6B35]/40'
              : formData.userType === 'manager'
              ? 'bg-gradient-to-r from-primary/20 to-primary/30 border-primary/40'
              : 'bg-gradient-to-r from-[#28A745]/20 to-[#28A745]/30 border-[#28A745]/40'
          }`}>
            <div className="flex items-center space-x-3 mb-3">
              <div className={`text-white p-2 rounded-xl ${
                formData.userType === 'admin' ? 'bg-[#FF6B35]' : 
                formData.userType === 'manager' ? 'bg-[#97CF50]' : 'bg-[#28A745]'
              }`}>
                {formData.userType === 'admin' ? <Shield className="h-5 w-5" /> : 
                 formData.userType === 'manager' ? <User className="h-5 w-5" /> : <CreditCard className="h-5 w-5" />}
              </div>
              <h3 className="text-lg text-[#09215F]">
                {getRoleDisplayName(formData.userType)} Account
              </h3>
            </div>
            <p className="text-sm text-[#09215F]/80 leading-relaxed">
              You're creating a {formData.userType} account with{' '}
              {getRoleAccessDescription(formData.userType)}. 
              After email confirmation, you'll be redirected to your {getRoleRedirectPath(formData.userType)}.
            </p>
          </div>
        )}

        {/* Loyalty Program Highlight for Customer */}
        {formData.userType === 'customer' && (
          <div className="bg-gradient-to-r from-accent/20 to-primary/20 border border-primary/30 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center space-x-3 mb-3">
              <div className="bg-primary text-primary-foreground p-2 rounded-xl">
                <Gift className="h-5 w-5" />
              </div>
              <h3 className="text-lg text-[#09215F]">Welcome Bonus!</h3>
            </div>
            <p className="text-sm text-[#09215F]/80 leading-relaxed">
              Get <span className="text-[#97CF50]">100 loyalty points</span> when you create your account. 
              After email confirmation, you'll be redirected to our {getRoleRedirectPath(formData.userType)} to start shopping!
            </p>
          </div>
        )}

        {/* General Error Message */}
        {errors.general && !errors.general.includes('sent') && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-start space-x-2">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              <div className="text-sm text-red-700">{errors.general}</div>
            </div>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-5">
            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm text-[#09215F]">
                  First name *
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  autoComplete="given-name"
                  required
                  value={formData.firstName}
                  onChange={handleInputChange}
                  className={`mt-1 appearance-none relative block w-full px-3 py-3 border ${
                    errors.firstName ? 'border-red-300' : 'border-gray-300'
                  } placeholder-gray-500 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm transition-all duration-300`}
                  placeholder="First name"
                />
                {errors.firstName && (
                  <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>
                )}
              </div>

              <div>
                <label htmlFor="lastName" className="block text-sm text-[#09215F]">
                  Last name *
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  autoComplete="family-name"
                  required
                  value={formData.lastName}
                  onChange={handleInputChange}
                  className={`mt-1 appearance-none relative block w-full px-3 py-3 border ${
                    errors.lastName ? 'border-red-300' : 'border-gray-300'
                  } placeholder-gray-500 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm transition-all duration-300`}
                  placeholder="Last name"
                />
                {errors.lastName && (
                  <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>
                )}
              </div>
            </div>

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

            {/* Phone (Optional) */}
            <div>
              <label htmlFor="phone" className="block text-sm text-[#09215F]">
                Phone number (optional)
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                value={formData.phone}
                onChange={handleInputChange}
                className="mt-1 appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm transition-all duration-300"
                placeholder="Enter your phone number"
              />
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
                  autoComplete="new-password"
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  className={`appearance-none relative block w-full px-3 py-3 pr-10 border ${
                    errors.password ? 'border-red-300' : 'border-gray-300'
                  } placeholder-gray-500 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm transition-all duration-300`}
                  placeholder="Create a password"
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

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm text-[#09215F]">
                Confirm password *
              </label>
              <div className="mt-1 relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className={`appearance-none relative block w-full px-3 py-3 pr-10 border ${
                    errors.confirmPassword ? 'border-red-300' : 'border-gray-300'
                  } placeholder-gray-500 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm transition-all duration-300`}
                  placeholder="Confirm your password"
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

            {/* Role Selection using SafeRoleSelector */}
            <SafeRoleSelector
              selectedRole={formData.userType}
              onRoleChange={handleRoleChange}
              error={errors.userType}
            />
          </div>

          {/* Terms and Conditions */}
          <div className="flex items-start">
            <input
              id="acceptTerms"
              name="acceptTerms"
              type="checkbox"
              required
              checked={formData.acceptTerms}
              onChange={handleInputChange}
              className="h-4 w-4 text-[#97CF50] focus:ring-primary border-gray-300 rounded accent-[#97CF50]"
            />
            <label htmlFor="acceptTerms" className="ml-2 block text-sm text-[#09215F]">
              I agree to the{' '}
              <a href="#" className="text-[#97CF50] hover:text-[#09215F] transition-colors">
                Terms and Conditions
              </a>{' '}
              and{' '}
              <a href="#" className="text-[#97CF50] hover:text-[#09215F] transition-colors">
                Privacy Policy
              </a>
            </label>
          </div>
          {errors.acceptTerms && (
            <p className="text-sm text-red-600">{errors.acceptTerms}</p>
          )}

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
                  <span>Creating account...</span>
                </div>
              ) : (
                'Create account'
              )}
            </button>
          </div>

          {/* Additional Benefits */}
          <div className="mt-6 border-t border-gray-200 pt-6">
            <p className="text-center text-sm text-[#09215F]/80 mb-4">Why create an account?</p>
            <div className="space-y-3">
              <div className="flex items-center space-x-3 p-3 rounded-xl bg-[#97CF50]/5 border border-[#97CF50]/20">
                <div className="bg-[#97CF50]/10 p-2 rounded-lg">
                  <Gift className="h-4 w-4 text-[#97CF50]" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-[#09215F]">Loyalty Rewards</p>
                  <p className="text-xs text-[#09215F]/70">Earn points on every purchase</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3 p-3 rounded-xl bg-[#97CF50]/5 border border-[#97CF50]/20">
                <div className="bg-[#97CF50]/10 p-2 rounded-lg">
                  <Package className="h-4 w-4 text-[#97CF50]" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-[#09215F]">Order History</p>
                  <p className="text-xs text-[#09215F]/70">Track your purchases easily</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3 p-3 rounded-xl bg-[#97CF50]/5 border border-[#97CF50]/20">
                <div className="bg-[#97CF50]/10 p-2 rounded-lg">
                  <User className="h-4 w-4 text-[#97CF50]" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-[#09215F]">Personal Dashboard</p>
                  <p className="text-xs text-[#09215F]/70">Manage your account and preferences</p>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}