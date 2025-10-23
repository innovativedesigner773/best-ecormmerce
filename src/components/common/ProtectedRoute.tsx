import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from './LoadingSpinner';
import { Shield, Lock, AlertTriangle, Home } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ('customer' | 'admin' | 'staff' | 'manager' | 'cashier')[];
  requireAuth?: boolean;
  fallbackPath?: string;
}

export default function ProtectedRoute({ 
  children, 
  allowedRoles = ['customer', 'admin', 'staff', 'manager', 'cashier'],
  requireAuth = true,
  fallbackPath = '/login'
}: ProtectedRouteProps) {
  const { user, profile, loading, isDatabaseSetup } = useAuth();
  const location = useLocation();

  console.log('🛡️ ProtectedRoute Check:', {
    path: location.pathname,
    user: user?.id || null,
    profile: profile?.role || null,
    allowedRoles,
    requireAuth,
    loading,
    isDatabaseSetup
  });

  // Show loading spinner while authentication is being determined
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <LoadingSpinner size="large" />
          <p className="mt-4 text-sm text-gray-600">Verifying access permissions...</p>
        </div>
      </div>
    );
  }

  // If authentication is required but user is not logged in
  if (requireAuth && !user) {
    console.log('🚫 Access denied: User not authenticated');
    return <Navigate to={fallbackPath} state={{ from: location }} replace />;
  }

  // If user exists but profile is not loaded and database is set up
  if (user && !profile && isDatabaseSetup) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <LoadingSpinner size="large" />
          <p className="mt-4 text-sm text-gray-600">Loading user profile...</p>
        </div>
      </div>
    );
  }

  // If email is not confirmed (except in development)
  if (user && !user.email_confirmed_at && process.env.NODE_ENV !== 'development') {
    console.log('📧 Access denied: Email not confirmed');
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 text-center">
          <div className="flex justify-center mb-6">
            <div className="bg-amber-100 text-amber-600 p-4 rounded-2xl">
              <AlertTriangle className="h-8 w-8" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-[#2C3E50] mb-4">
            Email Confirmation Required
          </h2>
          <p className="text-gray-600 mb-6">
            Please confirm your email address before accessing this area of the application.
          </p>
          <button
            onClick={() => window.location.href = '/login'}
            className="w-full py-3 px-4 bg-[#4682B4] text-white rounded-xl hover:bg-[#2C3E50] transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  // Check if user's role is allowed
  if (profile && !allowedRoles.includes(profile.role)) {
    console.log(`🚫 Access denied: Role '${profile.role}' not in allowed roles:`, allowedRoles);
    
    const getRoleDisplayName = (role: string) => {
      switch (role) {
        case 'admin': return 'Administrator';
        case 'cashier': return 'Cashier';
        case 'staff': return 'Staff Member';
        case 'manager': return 'Manager';
        default: return 'Customer';
      }
    };

    const getDefaultPath = (role: string) => {
      switch (role) {
        case 'admin': return '/admin';
        case 'cashier': return '/cashier/pos';
        case 'staff': return '/admin/products';
        case 'manager': return '/admin';
        default: return '/products';
      }
    };

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 text-center">
          <div className="flex justify-center mb-6">
            <div className="bg-red-100 text-red-600 p-4 rounded-2xl">
              <Lock className="h-8 w-8" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-[#2C3E50] mb-4">
            Access Restricted
          </h2>
          <p className="text-gray-600 mb-4">
            You don't have permission to access this area. This section is restricted to specific roles.
          </p>
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
            <div className="flex items-center space-x-3">
              <Shield className="h-5 w-5 text-green-600" />
              <div className="text-left">
                <p className="text-sm font-medium text-green-800">Your Role</p>
                <p className="text-sm text-green-700">{getRoleDisplayName(profile.role)}</p>
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <button
              onClick={() => window.location.href = getDefaultPath(profile.role)}
              className="w-full py-3 px-4 bg-[#4682B4] text-white rounded-xl hover:bg-[#2C3E50] transition-colors"
            >
              Go to My Dashboard
            </button>
            <button
              onClick={() => window.location.href = '/'}
              className="w-full py-3 px-4 border border-gray-300 text-gray-700 bg-white rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center space-x-2"
            >
              <Home className="h-4 w-4" />
              <span>Go to Homepage</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Check if account is active (only if database is set up)
  if (profile && isDatabaseSetup && !profile.is_active) {
    console.log('🚫 Access denied: Account is deactivated');
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 text-center">
          <div className="flex justify-center mb-6">
            <div className="bg-red-100 text-red-600 p-4 rounded-2xl">
              <Lock className="h-8 w-8" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-[#2C3E50] mb-4">
            Account Deactivated
          </h2>
          <p className="text-gray-600 mb-6">
            Your account has been deactivated. Please contact support for assistance.
          </p>
          <div className="space-y-3">
            <a
              href="mailto:support@bestbrightness.com"
              className="w-full py-3 px-4 bg-[#4682B4] text-white rounded-xl hover:bg-[#2C3E50] transition-colors inline-block"
            >
              Contact Support
            </a>
            <button
              onClick={() => window.location.href = '/'}
              className="w-full py-3 px-4 border border-gray-300 text-gray-700 bg-white rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center space-x-2"
            >
              <Home className="h-4 w-4" />
              <span>Go to Homepage</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If all checks pass, render the protected content
  console.log('✅ Access granted');
  return <>{children}</>;
}