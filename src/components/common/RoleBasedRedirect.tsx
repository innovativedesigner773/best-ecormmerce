import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getDefaultPageForRole } from '../../utils/roleRouting';

export default function RoleBasedRedirect() {
  const { user, userProfile } = useAuth();

  // If we have a full profile, redirect based on it
  if (user && userProfile) {
    const defaultPath = getDefaultPageForRole(userProfile.role);
    console.log(`🧭 Redirecting ${userProfile.role} user to: ${defaultPath}`);
    return <Navigate to={defaultPath} replace />;
  }

  // If signed in but profile hasn't loaded yet, infer role from auth metadata/cache
  if (user && !userProfile) {
    const md: any = user.user_metadata || {};
    const inferredRole = (md.userType || md.role || 'customer') as string;
    const mappedRole = inferredRole === 'consumer' ? 'customer' : inferredRole;
    const defaultPath = getDefaultPageForRole(mappedRole);
    console.log(`🧭 Redirecting signed-in user by inferred role '${mappedRole}' to: ${defaultPath}`);
    return <Navigate to={defaultPath} replace />;
  }

  // Not signed in: send to public catalog
  return <Navigate to="/products" replace />;
}