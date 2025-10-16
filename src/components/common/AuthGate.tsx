import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import LoadingSpinner from './LoadingSpinner';

interface AuthGateProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  fallbackPath?: string;
  preserveCart?: boolean;
}

export default function AuthGate({ 
  children, 
  requireAuth = true, 
  fallbackPath = '/login',
  preserveCart = true 
}: AuthGateProps) {
  const { user, loading } = useAuth();
  const { mergeGuestCartWithUser } = useCart();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && requireAuth && !user) {
      // Save the current path to return to after login
      const returnTo = location.pathname + location.search;
      
      // Navigate to login with return URL
      navigate(fallbackPath, {
        state: { 
          from: returnTo,
          message: 'Please sign in to continue with your purchase',
          preserveCart
        },
        replace: true
      });
    }
  }, [user, loading, requireAuth, navigate, location, fallbackPath, preserveCart]);

  // Merge guest cart when user becomes available
  useEffect(() => {
    if (user && !loading && preserveCart) {
      mergeGuestCartWithUser();
    }
  }, [user, loading, mergeGuestCartWithUser, preserveCart]);

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="large" />
          <p className="mt-4 text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Don't render children if authentication is required but user is not authenticated
  if (requireAuth && !user) {
    return null;
  }

  // Render children if authentication check passes
  return <>{children}</>;
}