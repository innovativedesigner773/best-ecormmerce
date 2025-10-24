import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Package, Gift, Shield, User, CreditCard, Mail, CheckCircle, AlertCircle, Clock, ChevronLeft, ChevronRight, Check } from 'lucide-react';
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
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;

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

  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const validateCurrentStep = () => {
    const newErrors: Record<string, string> = {};
    
    switch (currentStep) {
      case 1: // Personal Information
        if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
        if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
        if (!formData.email.trim()) {
          newErrors.email = 'Email is required';
        } else {
          // More comprehensive email validation
          const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
          
          // Check for basic email structure first
          if (!formData.email.includes('@')) {
            newErrors.email = 'Email must contain @ symbol';
          } else if (!formData.email.includes('.')) {
            newErrors.email = 'Email must contain a domain (e.g., .com)';
          } else if (formData.email.length > 254) {
            newErrors.email = 'Email address is too long';
          } else if (formData.email.includes('..') || formData.email.startsWith('.') || formData.email.endsWith('.')) {
            newErrors.email = 'Email format is invalid';
          } else if (!emailRegex.test(formData.email)) {
            newErrors.email = 'Please enter a valid email address';
          }
        }
        
        // Phone validation (optional but if provided, must be valid SA format)
        if (formData.phone && formData.phone.trim()) {
          const phoneRegex = /^(\+27|0)[0-9]{9}$/;
          const cleanPhone = formData.phone.replace(/\s/g, '');
          if (!phoneRegex.test(cleanPhone)) {
            newErrors.phone = 'Please enter a valid South African phone number (e.g., 082 123 4567 or +27 82 123 4567)';
          }
        }
        break;
      case 2: // Security Setup
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
        break;
      case 3: // Account Type
        if (!formData.userType) {
          newErrors.userType = 'Please select an account type';
        }
        break;
      case 4: // Terms
        if (!formData.acceptTerms) {
          newErrors.acceptTerms = 'You must accept the terms and conditions';
        }
        break;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleStepNext = () => {
    if (validateCurrentStep()) {
      nextStep();
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
        
        // Parse specific error messages for better user experience
        let errorMessage = 'Registration failed. Please try again.';
        
        if (result.error) {
          if (result.error.includes('Email address') && result.error.includes('invalid')) {
            errorMessage = 'Please enter a valid email address.';
          } else if (result.error.includes('User already registered')) {
            errorMessage = 'An account with this email already exists. Please try logging in instead.';
          } else if (result.error.includes('Password')) {
            errorMessage = 'Password does not meet security requirements.';
          } else if (result.error.includes('rate limit')) {
            errorMessage = 'Too many registration attempts. Please wait a moment and try again.';
          } else {
            errorMessage = result.error;
          }
        }
        
        setErrors({ general: errorMessage });
      }
    } catch (error) {
      console.error('❌ Registration error:', error);
      
      // Handle different types of errors
      let errorMessage = 'An unexpected error occurred. Please try again.';
      
      if (error instanceof Error) {
        if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        } else if (error.message.includes('timeout')) {
          errorMessage = 'Request timed out. Please try again.';
        }
      }
      
      setErrors({ general: errorMessage });
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

  // Step components
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <div className="bg-blue-100 text-blue-600 p-3 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <User className="h-8 w-8" />
              </div>
              <h3 className="text-2xl text-[#09215F] mb-2">Personal Information</h3>
              <p className="text-sm text-[#09215F]/70">Let's start with your basic details</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm text-[#09215F] mb-2">
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
                  className={`w-full px-4 py-3 border ${
                    errors.firstName ? 'border-red-300' : 'border-gray-300'
                  } rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-300 text-gray-900 placeholder-gray-500`}
                  placeholder="First name"
                />
                {errors.firstName && (
                  <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>
                )}
              </div>

              <div>
                <label htmlFor="lastName" className="block text-sm text-[#09215F] mb-2">
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
                  className={`w-full px-4 py-3 border ${
                    errors.lastName ? 'border-red-300' : 'border-gray-300'
                  } rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-300 text-gray-900 placeholder-gray-500`}
                  placeholder="Last name"
                />
                {errors.lastName && (
                  <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm text-[#09215F] mb-2">
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
                className={`w-full px-4 py-3 border ${
                  errors.email ? 'border-red-300' : 'border-gray-300'
                } rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-300 text-gray-900 placeholder-gray-500`}
                placeholder="Enter your email (e.g., john@example.com)"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
              )}
              {!errors.email && formData.email && (() => {
                // Check if email is actually valid before showing success message
                const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
                const isValidEmail = emailRegex.test(formData.email) && 
                                   formData.email.length <= 254 && 
                                   !formData.email.includes('..') && 
                                   !formData.email.startsWith('.') && 
                                   !formData.email.endsWith('.');
                
                return isValidEmail ? (
                  <div className="mt-1 flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <p className="text-xs text-green-600">
                      Email format looks good! We'll use this to send you important updates.
                    </p>
                  </div>
                ) : (
                  <div className="mt-1 flex items-center space-x-2">
                    <AlertCircle className="h-4 w-4 text-orange-500" />
                    <p className="text-xs text-orange-600">
                      Please enter a valid email address (e.g., john@example.com)
                    </p>
                  </div>
                );
              })()}
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm text-[#09215F] mb-2">
                Phone number (optional)
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                value={formData.phone}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 border ${
                  errors.phone ? 'border-red-300' : 'border-gray-300'
                } rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-300 text-gray-900 placeholder-gray-500`}
                placeholder="Enter your phone number (e.g., 082 123 4567)"
              />
              {errors.phone && (
                <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
              )}
              {!errors.phone && formData.phone && (() => {
                // Check if phone is actually valid for SA format
                const phoneRegex = /^(\+27|0)[0-9]{9}$/;
                const cleanPhone = formData.phone.replace(/\s/g, '');
                const isValidPhone = phoneRegex.test(cleanPhone);
                
                return isValidPhone ? (
                  <div className="mt-1 flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <p className="text-xs text-green-600">
                      Phone number format looks good!
                    </p>
                  </div>
                ) : (
                  <div className="mt-1 flex items-center space-x-2">
                    <AlertCircle className="h-4 w-4 text-orange-500" />
                    <p className="text-xs text-orange-600">
                      Please enter a valid South African phone number (e.g., 082 123 4567 or +27 82 123 4567)
                    </p>
                  </div>
                );
              })()}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <div className="bg-green-100 text-green-600 p-3 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Shield className="h-8 w-8" />
              </div>
              <h3 className="text-2xl text-[#09215F] mb-2">Security Setup</h3>
              <p className="text-sm text-[#09215F]/70">Create a secure password for your account</p>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm text-[#09215F] mb-2">
                Password *
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 pr-12 border ${
                    errors.password ? 'border-red-300' : 'border-gray-300'
                  } rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-300 text-gray-900 placeholder-gray-500`}
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

            <div>
              <label htmlFor="confirmPassword" className="block text-sm text-[#09215F] mb-2">
                Confirm password *
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 pr-12 border ${
                    errors.confirmPassword ? 'border-red-300' : 'border-gray-300'
                  } rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-300 text-gray-900 placeholder-gray-500`}
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

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-start space-x-3">
                <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="text-sm text-blue-800 mb-1">Password Requirements</h4>
                  <p className="text-xs text-blue-700">
                    Your password must be at least 6 characters long and should include a mix of letters and numbers for better security.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <div className="bg-purple-100 text-purple-600 p-3 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <User className="h-8 w-8" />
              </div>
              <h3 className="text-2xl text-[#09215F] mb-2">Account Type</h3>
              <p className="text-sm text-[#09215F]/70">Choose the type of account you need</p>
            </div>

            <SafeRoleSelector
              selectedRole={formData.userType}
              onRoleChange={handleRoleChange}
              error={errors.userType}
            />

            {/* Role-specific information */}
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
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <div className="bg-orange-100 text-orange-600 p-3 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <CheckCircle className="h-8 w-8" />
              </div>
              <h3 className="text-2xl text-[#09215F] mb-2">Terms & Final Review</h3>
              <p className="text-sm text-[#09215F]/70">Review your information and accept our terms</p>
            </div>

            {/* Review Summary */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
              <h4 className="text-lg text-[#09215F] mb-4">Registration Summary</h4>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Name:</span>
                  <span className="text-sm text-[#09215F]">{formData.firstName} {formData.lastName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Email:</span>
                  <span className="text-sm text-[#09215F]">{formData.email}</span>
                </div>
                {formData.phone && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Phone:</span>
                    <span className="text-sm text-[#09215F]">
                      {formData.phone.startsWith('+27') ? formData.phone : 
                       formData.phone.startsWith('0') ? `+27 ${formData.phone.substring(1)}` : 
                       formData.phone}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Account Type:</span>
                  <span className="text-sm text-[#09215F]">{getRoleDisplayName(formData.userType)}</span>
                </div>
              </div>
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
                className="h-4 w-4 text-[#97CF50] focus:ring-primary border-gray-300 rounded accent-[#97CF50] mt-1"
              />
              <label htmlFor="acceptTerms" className="ml-3 block text-sm text-[#09215F]">
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
          </div>
        );

      default:
        return null;
    }
  };

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

        {/* Progress Indicator */}
        <div className="flex items-center justify-center space-x-4 mb-8">
          {[1, 2, 3, 4].map((step) => (
            <div key={step} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step <= currentStep 
                  ? 'bg-[#97CF50] text-white' 
                  : 'bg-gray-200 text-gray-500'
              }`}>
                {step < currentStep ? <Check className="h-4 w-4" /> : step}
              </div>
              {step < 4 && (
                <div className={`w-8 h-0.5 mx-2 ${
                  step < currentStep ? 'bg-[#97CF50]' : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* General Error Message */}
        {errors.general && !errors.general.includes('sent') && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <div className="flex items-start space-x-3">
              <div className="bg-red-100 p-2 rounded-full">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm text-red-800 mb-1">Registration Error</h3>
                <p className="text-sm text-red-700">{errors.general}</p>
                {errors.general.includes('email') && (
                  <p className="text-xs text-red-600 mt-2">
                    Please check your email format and try again. Make sure there are no extra spaces or special characters.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Success Message */}
        {errors.general && errors.general.includes('sent') && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
            <div className="flex items-start space-x-3">
              <div className="bg-green-100 p-2 rounded-full">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm text-green-800 mb-1">Email Sent!</h3>
                <p className="text-sm text-green-700">{errors.general}</p>
              </div>
            </div>
          </div>
        )}

        {/* Step Content */}
        <div className="min-h-[400px]">
          {renderStepContent()}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={prevStep}
            disabled={currentStep === 1}
            className={`flex items-center px-4 py-2 text-sm rounded-xl transition-all duration-300 ${
              currentStep === 1
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-[#09215F] hover:text-[#97CF50] hover:bg-gray-50'
            }`}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </button>

          <div className="text-sm text-gray-500">
            Step {currentStep} of {totalSteps}
          </div>

          {currentStep < totalSteps ? (
            <button
              type="button"
              onClick={handleStepNext}
              className="flex items-center px-6 py-2 text-sm rounded-xl text-white bg-[#97CF50] hover:bg-secondary transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="flex items-center px-6 py-2 text-sm rounded-xl text-white bg-[#97CF50] hover:bg-secondary transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <LoadingSpinner size="small" />
                  <span>Creating account...</span>
                </div>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-1" />
                  Create account
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}