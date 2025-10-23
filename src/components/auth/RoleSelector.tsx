import React, { useState } from 'react';
import { User, Shield, CreditCard, Lock, AlertTriangle, CheckCircle } from 'lucide-react';

interface RoleSelectorProps {
  selectedRole: string;
  onRoleChange: (role: string) => void;
  error?: string;
  className?: string;
}

const roleOptions = [
  {
    value: 'customer',
    label: 'Customer',
    description: 'Browse and purchase products',
    icon: User,
    color: 'from-[#97CF50]/20 to-[#4682B4]/20 border-[#4682B4]/30',
    iconColor: 'text-[#4682B4]',
    bgColor: 'bg-[#4682B4]/10',
    requiresAuth: false
  },
  {
    value: 'cashier',
    label: 'Cashier',
    description: 'Process sales and transactions',
    icon: CreditCard,
    color: 'from-[#28A745]/20 to-[#28A745]/30 border-[#28A745]/40',
    iconColor: 'text-[#28A745]',
    bgColor: 'bg-[#28A745]/10',
    requiresAuth: true,
    authCode: 'CASHIER2024'
  },
  {
    value: 'staff',
    label: 'Staff',
    description: 'Manage products and orders',
    icon: User,
    color: 'from-[#4682B4]/20 to-[#4682B4]/30 border-[#4682B4]/40',
    iconColor: 'text-[#4682B4]',
    bgColor: 'bg-[#4682B4]/10',
    requiresAuth: true,
    authCode: 'STAFF2024'
  },
  {
    value: 'manager',
    label: 'Manager',
    description: 'Business operations and analytics',
    icon: User,
    color: 'from-[#2C3E50]/20 to-[#2C3E50]/30 border-[#2C3E50]/40',
    iconColor: 'text-[#2C3E50]',
    bgColor: 'bg-[#2C3E50]/10',
    requiresAuth: true,
    authCode: 'MANAGER2024'
  },
  {
    value: 'admin',
    label: 'Admin',
    description: 'Full system management',
    icon: Shield,
    color: 'from-[#FF6B35]/20 to-[#FF6B35]/30 border-[#FF6B35]/40',
    iconColor: 'text-[#FF6B35]',
    bgColor: 'bg-[#FF6B35]/10',
    requiresAuth: true,
    authCode: 'ADMIN2024'
  }
];

export default function RoleSelector({ selectedRole, onRoleChange, error, className = '' }: RoleSelectorProps) {
  const [authCodes, setAuthCodes] = useState<Record<string, string>>({});
  const [showAuthInput, setShowAuthInput] = useState<string | null>(null);
  const [authErrors, setAuthErrors] = useState<Record<string, string>>({});
  const [authenticatedRoles, setAuthenticatedRoles] = useState<Set<string>>(new Set(['customer'])); // Customer is always authenticated

  console.log('🎭 RoleSelector State:', { 
    selectedRole, 
    authenticatedRoles: Array.from(authenticatedRoles),
    showAuthInput,
    authCodes: Object.keys(authCodes),
    timestamp: new Date().toISOString()
  });

  const handleRoleClick = (role: string) => {
    const roleOption = roleOptions.find(opt => opt.value === role);
    
    if (roleOption?.requiresAuth && !authenticatedRoles.has(role)) {
      // Show auth input for roles that require authentication and aren't authenticated yet
      console.log(`🔐 Showing auth input for role: ${role}`);
      setShowAuthInput(role);
      setAuthErrors(prev => ({ ...prev, [role]: '' }));
    } else {
      // Role doesn't require auth OR is already authenticated
      console.log(`✅ Selecting role: ${role}`);
      onRoleChange(role);
      setShowAuthInput(null);
    }
  };

  const handleAuthCodeChange = (role: string, code: string) => {
    setAuthCodes(prev => ({ ...prev, [role]: code }));
    setAuthErrors(prev => ({ ...prev, [role]: '' }));
  };

  const handleAuthSubmit = (role: string) => {
    const roleOption = roleOptions.find(opt => opt.value === role);
    const enteredCode = authCodes[role];
    
    if (enteredCode === roleOption?.authCode) {
      console.log(`🎉 Successfully authenticated role: ${role}`);
      setAuthenticatedRoles(prev => new Set([...prev, role]));
      onRoleChange(role);
      setShowAuthInput(null);
      setAuthErrors(prev => ({ ...prev, [role]: '' }));
    } else {
      console.log(`❌ Failed authentication for role: ${role}`);
      setAuthErrors(prev => ({ 
        ...prev, 
        [role]: 'Invalid authorization code. Please contact your administrator.' 
      }));
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent, role: string) => {
    if (e.key === 'Enter') {
      handleAuthSubmit(role);
    }
  };

  const isRoleAuthenticated = (role: string) => {
    return authenticatedRoles.has(role);
  };

  const getRoleBorderColor = (role: string) => {
    switch (role) {
      case 'customer': return 'ring-[#4682B4]';
      case 'cashier': return 'ring-[#28A745]';
      case 'staff': return 'ring-[#4682B4]';
      case 'manager': return 'ring-[#2C3E50]';
      case 'admin': return 'ring-[#FF6B35]';
      default: return 'ring-[#4682B4]';
    }
  };

  const getRoleRadioColor = (role: string) => {
    switch (role) {
      case 'customer': return 'text-[#4682B4] focus:ring-[#4682B4] border-[#4682B4] accent-[#4682B4]';
      case 'cashier': return 'text-[#28A745] focus:ring-[#28A745] border-[#28A745] accent-[#28A745]';
      case 'staff': return 'text-[#4682B4] focus:ring-[#4682B4] border-[#4682B4] accent-[#4682B4]';
      case 'manager': return 'text-[#2C3E50] focus:ring-[#2C3E50] border-[#2C3E50] accent-[#2C3E50]';
      case 'admin': return 'text-[#FF6B35] focus:ring-[#FF6B35] border-[#FF6B35] accent-[#FF6B35]';
      default: return 'text-[#4682B4] focus:ring-[#4682B4] border-[#4682B4] accent-[#4682B4]';
    }
  };

  return (
    <div className={className}>
      <label className="block text-sm font-medium text-[#2C3E50] mb-3">
        Account Type
      </label>
      
      <div className="space-y-3">
        {roleOptions.map((option) => {
          const Icon = option.icon;
          const isSelected = selectedRole === option.value;
          const isAuthenticated = isRoleAuthenticated(option.value);
          const showingAuth = showAuthInput === option.value;
          const canSelect = !option.requiresAuth || isAuthenticated;
          
          return (
            <div key={option.value}>
              <div
                className={`
                  relative cursor-pointer rounded-xl border-2 p-4 transition-all duration-300
                  ${isSelected 
                    ? `bg-gradient-to-r ${option.color} ring-2 ring-offset-2 ring-offset-white transform scale-[1.02] ${getRoleBorderColor(option.value)}`
                    : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-md'
                  }
                  ${!canSelect && isSelected ? 'opacity-75' : ''}
                `}
                onClick={() => handleRoleClick(option.value)}
              >
                <div className="flex items-center space-x-4">
                  <div className={`p-3 rounded-xl ${isSelected ? option.bgColor : 'bg-gray-50'} transition-colors`}>
                    <Icon className={`h-6 w-6 ${isSelected ? option.iconColor : 'text-gray-400'} transition-colors`} />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h4 className={`font-medium transition-colors ${isSelected ? 'text-[#2C3E50]' : 'text-gray-700'}`}>
                        {option.label}
                      </h4>
                      {option.requiresAuth && (
                        <Lock className={`h-4 w-4 ${isAuthenticated ? 'text-green-500' : 'text-gray-400'}`} />
                      )}
                      {isSelected && isAuthenticated && (
                        <CheckCircle className={`h-4 w-4 ${
                          option.value === 'customer' ? 'text-[#4682B4]' :
                          option.value === 'cashier' ? 'text-[#28A745]' :
                          option.value === 'staff' ? 'text-[#4682B4]' :
                          option.value === 'manager' ? 'text-[#2C3E50]' : 'text-[#FF6B35]'
                        }`} />
                      )}
                    </div>
                    <p className={`text-sm transition-colors ${isSelected ? 'text-[#2C3E50]/80' : 'text-gray-500'}`}>
                      {option.description}
                    </p>
                    {option.requiresAuth && !isAuthenticated && (
                      <p className="text-xs text-amber-600 mt-1 flex items-center">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Requires authorization code
                      </p>
                    )}
                    {option.requiresAuth && isAuthenticated && (
                      <p className="text-xs text-green-600 mt-1 flex items-center">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Authorized and ready to use
                      </p>
                    )}
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="radio"
                      name="role"
                      value={option.value}
                      checked={isSelected}
                      onChange={() => handleRoleClick(option.value)}
                      className={`h-5 w-5 border-2 rounded-full transition-colors focus:ring-2 focus:ring-offset-2 ${getRoleRadioColor(option.value)}`}
                    />
                  </div>
                </div>
              </div>

              {/* Authorization Code Input */}
              {showingAuth && option.requiresAuth && (
                <div className="mt-3 p-4 bg-amber-50 border border-amber-200 rounded-xl animate-in slide-in-from-top-2 duration-300">
                  <div className="flex items-center space-x-2 mb-3">
                    <Lock className="h-4 w-4 text-amber-600" />
                    <h5 className="font-medium text-amber-800">Authorization Required</h5>
                  </div>
                  <p className="text-sm text-amber-700 mb-3">
                    This role requires an authorization code. Please contact your administrator to obtain the code for {option.label.toLowerCase()} access.
                  </p>
                  <div className="flex space-x-3">
                    <input
                      type="password"
                      placeholder="Enter authorization code"
                      value={authCodes[option.value] || ''}
                      onChange={(e) => handleAuthCodeChange(option.value, e.target.value)}
                      onKeyPress={(e) => handleKeyPress(e, option.value)}
                      className="flex-1 px-3 py-2 border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
                      autoFocus
                    />
                    <button
                      onClick={() => handleAuthSubmit(option.value)}
                      disabled={!authCodes[option.value]?.trim()}
                      className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:bg-amber-400 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                    >
                      Verify
                    </button>
                    <button
                      onClick={() => setShowAuthInput(null)}
                      className="px-4 py-2 border border-amber-300 text-amber-700 rounded-lg hover:bg-amber-100 transition-colors text-sm font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                  {authErrors[option.value] && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-600 flex items-center">
                        <AlertTriangle className="h-4 w-4 mr-2" />
                        {authErrors[option.value]}
                      </p>
                    </div>
                  )}
                  
                  {/* Demo codes hint for development */}
                  <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-xs text-green-600 font-medium mb-1">Demo Authorization Codes:</p>
                    <div className="text-xs text-green-600 space-y-1">
                      <div>• Cashier: <code className="bg-green-100 px-1 rounded">CASHIER2024</code></div>
                      <div>• Staff: <code className="bg-green-100 px-1 rounded">STAFF2024</code></div>
                      <div>• Manager: <code className="bg-green-100 px-1 rounded">MANAGER2024</code></div>
                      <div>• Admin: <code className="bg-green-100 px-1 rounded">ADMIN2024</code></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {/* Role Selection Information */}
      <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-xl">
        <h5 className="font-medium text-green-800 mb-2">Role Information</h5>
        <div className="space-y-2 text-sm text-green-700">
          <div className="flex items-center space-x-2">
            <User className="h-3 w-3" />
            <span><strong>Customer:</strong> Open registration - browse and purchase products</span>
          </div>
          <div className="flex items-center space-x-2">
            <CreditCard className="h-3 w-3" />
            <span><strong>Cashier:</strong> Process sales and manage transactions</span>
          </div>
          <div className="flex items-center space-x-2">
            <User className="h-3 w-3" />
            <span><strong>Staff:</strong> Manage products, inventory, and orders</span>
          </div>
          <div className="flex items-center space-x-2">
            <User className="h-3 w-3" />
            <span><strong>Manager:</strong> Business operations, analytics, and staff management</span>
          </div>
          <div className="flex items-center space-x-2">
            <Shield className="h-3 w-3" />
            <span><strong>Admin:</strong> Full system access and user management</span>
          </div>
          <div className="mt-3 pt-2 border-t border-green-200">
            <p className="text-xs text-green-600">
              <Lock className="h-3 w-3 inline mr-1" />
              Privileged roles require authorization codes from your administrator.
            </p>
          </div>
        </div>
      </div>

      {/* Current selection status */}
      {selectedRole && (
        <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-700 flex items-center">
            <CheckCircle className="h-4 w-4 mr-2" />
            <strong>Selected:</strong> {roleOptions.find(r => r.value === selectedRole)?.label} account
            {roleOptions.find(r => r.value === selectedRole)?.requiresAuth && 
              (isRoleAuthenticated(selectedRole) ? ' (Authorized)' : ' (Authorization Required)')
            }
          </p>
        </div>
      )}
      
      {error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600 flex items-center">
            <AlertTriangle className="h-4 w-4 mr-2" />
            {error}
          </p>
        </div>
      )}
    </div>
  );
}