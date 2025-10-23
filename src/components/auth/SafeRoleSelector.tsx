import React, { useState } from 'react';
import { User, CreditCard, Package, Users, Shield, Lock, Eye, EyeOff } from 'lucide-react';
import { requiresAuthCode, getAuthCodeForUserType } from '../../utils/auth-helpers';

interface SafeRoleSelectorProps {
  selectedRole: string;
  onRoleChange: (userType: string) => void;
  error?: string;
}

// Updated user type options to match new schema
const userTypeOptions = [
  { 
    value: 'customer', 
    label: 'Customer', // Fixed: Changed from 'Consumer' to 'Customer' for clarity
    icon: User,
    description: 'Browse and purchase cleaning supplies',
    benefits: ['Loyalty points', 'Order history', 'Exclusive offers'],
    authRequired: false
  },
  { 
    value: 'cashier', 
    label: 'Cashier', 
    icon: CreditCard,
    description: 'Process customer transactions and orders',
    benefits: ['POS system access', 'Transaction processing', 'Customer service tools'],
    authRequired: true
  },
  { 
    value: 'staff', 
    label: 'Staff Member', 
    icon: Package,
    description: 'Manage products and assist customers',
    benefits: ['Product management', 'Inventory updates', 'Order fulfillment'],
    authRequired: true
  },
  { 
    value: 'manager', 
    label: 'Manager', 
    icon: Users,
    description: 'Oversee operations and manage staff',
    benefits: ['Staff management', 'Analytics dashboard', 'Operational oversight'],
    authRequired: true
  },
  { 
    value: 'admin', 
    label: 'Administrator', 
    icon: Shield,
    description: 'Full system access and control',
    benefits: ['Full system access', 'User management', 'System configuration'],
    authRequired: true
  }
];

export default function SafeRoleSelector({ selectedRole, onRoleChange, error }: SafeRoleSelectorProps) {
  const [authCode, setAuthCode] = useState('');
  const [showAuthCode, setShowAuthCode] = useState(false);
  const [authCodeError, setAuthCodeError] = useState('');
  // New: when a privileged role tile is clicked, we keep it here until code is validated
  const [pendingRole, setPendingRole] = useState<string | null>(null);

  const handleRoleSelection = (userType: string) => {
    // Clear previous auth code error
    setAuthCodeError('');
    
    if (!requiresAuthCode(userType)) {
      // No auth code needed for customer
      onRoleChange(userType);
      setAuthCode('');
      setPendingRole(null);
      return;
    }

    // Privileged role: stage the selection and require a valid code
    setPendingRole(userType);
    const requiredAuthCode = getAuthCodeForUserType(userType);

    // If user already entered a code, try to validate immediately
    if (authCode.trim()) {
      if (authCode.trim() !== requiredAuthCode) {
        setAuthCodeError('Invalid authorization code. Please contact your administrator.');
        return;
      }
      // Valid code: accept role
      onRoleChange(userType);
      setPendingRole(null);
      return;
    }

    // No code yet: prompt by showing the input area
    setShowAuthCode(true);
    setAuthCodeError(`Authorization code required for ${userTypeOptions.find(opt => opt.value === userType)?.label} role`);
  };

  const selectedOption = userTypeOptions.find(option => option.value === selectedRole);
  const pendingOption = pendingRole ? userTypeOptions.find(o => o.value === pendingRole) : undefined;
  const authTargetRole = pendingOption?.value || selectedOption?.value;
  const authTargetLabel = pendingOption?.label || selectedOption?.label;

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm text-[#2C3E50] mb-3">
          Account Type *
        </label>
        
        <div className="space-y-3">
          {userTypeOptions.map((option) => {
            const Icon = option.icon;
            const isSelected = selectedRole === option.value;
            
            return (
              <div key={option.value}>
                <div
                  onClick={() => handleRoleSelection(option.value)}
                  className={`relative cursor-pointer rounded-xl border-2 p-4 transition-all duration-300 ${
                    isSelected
                      ? 'border-[#4682B4] bg-[#4682B4]/5 shadow-md'
                      : 'border-gray-200 hover:border-[#4682B4]/50 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className={`p-2 rounded-lg ${
                      isSelected ? 'bg-[#4682B4] text-white' : 'bg-gray-100 text-[#2C3E50]'
                    }`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className={`text-base font-medium ${
                          isSelected ? 'text-[#4682B4]' : 'text-[#2C3E50]'
                        }`}>
                          {option.label}
                          {option.authRequired && (
                            <Lock className="inline h-4 w-4 ml-2 text-amber-500" />
                          )}
                        </h3>
                        
                        <div className={`w-4 h-4 rounded-full border-2 ${
                          isSelected 
                            ? 'border-[#4682B4] bg-[#4682B4]' 
                            : 'border-gray-300'
                        }`}>
                          {isSelected && (
                            <div className="w-full h-full rounded-full bg-white scale-50" />
                          )}
                        </div>
                      </div>
                      
                      <p className="text-sm text-gray-600 mt-1">
                        {option.description}
                      </p>
                      
                      <div className="flex flex-wrap gap-1 mt-2">
                        {option.benefits.map((benefit, index) => (
                          <span
                            key={index}
                            className={`inline-flex items-center px-2 py-1 rounded-md text-xs ${
                              isSelected
                                ? 'bg-[#4682B4]/10 text-[#4682B4]'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {benefit}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Auth Code Input for Privileged Roles */}
        {requiresAuthCode(authTargetRole || '') && (
          <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <div className="flex items-center space-x-2 mb-3">
              <Lock className="h-4 w-4 text-amber-600" />
              <h4 className="text-sm font-medium text-amber-800">
                Authorization Required
              </h4>
            </div>
            
            <p className="text-sm text-amber-700 mb-3">
              A valid authorization code is required to create a{' '}
              <strong>{authTargetLabel}</strong> account. Please enter the code
              provided by your administrator.
            </p>
            
            <div className="relative">
              <input
                type={showAuthCode ? 'text' : 'password'}
                value={authCode}
                onChange={(e) => {
                  setAuthCode(e.target.value);
                  setAuthCodeError(''); // Clear error when typing
                }}
                placeholder="Enter authorization code"
                className={`w-full px-3 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4682B4] focus:border-transparent text-sm ${
                  authCodeError 
                    ? 'border-red-300 bg-red-50' 
                    : 'border-amber-300 bg-white'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowAuthCode(!showAuthCode)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {showAuthCode ? (
                  <EyeOff className="h-4 w-4 text-amber-600" />
                ) : (
                  <Eye className="h-4 w-4 text-amber-600" />
                )}
              </button>
            </div>

            {/* Development Helper - Shows auth codes for testing */}
            {process.env.NODE_ENV === 'development' && (
              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-xs font-medium text-green-800 mb-2">Development Helper - Auth Codes:</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-white p-2 rounded border">
                    <strong>Cashier:</strong> CASHIER2024
                  </div>
                  <div className="bg-white p-2 rounded border">
                    <strong>Staff:</strong> STAFF2024
                  </div>
                  <div className="bg-white p-2 rounded border">
                    <strong>Manager:</strong> MANAGER2024
                  </div>
                  <div className="bg-white p-2 rounded border">
                    <strong>Admin:</strong> ADMIN2024
                  </div>
                </div>
              </div>
            )}

            <div className="mt-3 flex gap-2">
              <button
                type="button"
                className="px-3 py-2 text-sm rounded-md bg-[#4682B4] text-white hover:bg-[#3b6c95]"
                onClick={() => {
                  if (!authTargetRole) return;
                  const requiredAuthCode = getAuthCodeForUserType(authTargetRole);
                  if (!authCode.trim()) {
                    setAuthCodeError('Please enter the authorization code.');
                    return;
                  }
                  if (authCode.trim() !== requiredAuthCode) {
                    setAuthCodeError('Invalid authorization code. Please contact your administrator.');
                    return;
                  }
                  onRoleChange(authTargetRole);
                  setPendingRole(null);
                  setAuthCode('');
                  setAuthCodeError('');
                }}
              >
                Apply Code & Select Role
              </button>
              {pendingRole && (
                <button
                  type="button"
                  className="px-3 py-2 text-sm rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200"
                  onClick={() => {
                    setPendingRole(null);
                    setAuthCode('');
                    setAuthCodeError('');
                  }}
                >
                  Cancel
                </button>
              )}
            </div>
            
            {authCodeError && (
              <p className="mt-2 text-sm text-red-600 flex items-center">
                <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {authCodeError}
              </p>
            )}
            
            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
              <h5 className="text-sm font-medium text-green-800 mb-1">
                Don't have an authorization code?
              </h5>
              <p className="text-sm text-green-700">
                Contact your system administrator or manager to obtain the required
                authorization code for {selectedOption?.label} access.
              </p>
            </div>
          </div>
        )}

        {/* General Error Display */}
        {error && (
          <p className="mt-2 text-sm text-red-600 flex items-center">
            <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </p>
        )}
      </div>

      {/* Role Selection Summary */}
    {selectedRole && (
        <div className={`p-4 rounded-xl border-2 ${
      selectedOption?.value === 'customer'
            ? 'bg-gradient-to-r from-[#97CF50]/10 to-[#4682B4]/10 border-[#4682B4]/20'
            : selectedOption?.value === 'admin'
            ? 'bg-gradient-to-r from-[#FF6B35]/10 to-[#FF6B35]/20 border-[#FF6B35]/30'
            : 'bg-gradient-to-r from-[#28A745]/10 to-[#28A745]/20 border-[#28A745]/30'
        }`}>
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${
        selectedOption?.value === 'customer' 
                ? 'bg-[#4682B4] text-white'
                : selectedOption?.value === 'admin'
                ? 'bg-[#FF6B35] text-white'
                : 'bg-[#28A745] text-white'
            }`}>
              {selectedOption && <selectedOption.icon className="h-5 w-5" />}
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-[#2C3E50]">
                Selected: {selectedOption?.label}
              </h4>
              <p className="text-sm text-[#2C3E50]/80">
                {selectedOption?.description}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}