// Role-based routing utility - Updated for new user type schema
export type UserRole = 'consumer' | 'cashier' | 'staff' | 'manager' | 'admin';

interface RoleConfig {
  defaultPage: string;
  allowedPages: string[];
  redirectAfterLogin: string;
  displayName: string;
  description: string;
}

// Updated role configuration for new schema
export const roleConfigs: Record<UserRole, RoleConfig> = {
  consumer: {
    defaultPage: '/products',
    allowedPages: [
      '/',
      '/products',
      '/products/*',
      '/cart',
      '/favourites',
      '/checkout',
      '/profile',
      '/orders'
    ],
    redirectAfterLogin: '/products',
    displayName: 'Consumer',
    description: 'Browse and purchase cleaning supplies'
  },
  cashier: {
    defaultPage: '/cashier/pos',
    allowedPages: [
      '/',
      '/products',
      '/products/*',
      '/cashier',
      '/cashier/*',
      '/profile'
    ],
    redirectAfterLogin: '/cashier/pos',
    displayName: 'Cashier',
    description: 'Process customer transactions'
  },
  staff: {
    defaultPage: '/admin/products',
    allowedPages: [
      '/',
      '/products',
      '/products/*',
      '/cashier',
      '/cashier/*',
      '/admin/products',
      '/admin/orders',
      '/profile'
    ],
    redirectAfterLogin: '/admin/products',
    displayName: 'Staff Member',
    description: 'Manage products and orders'
  },
  manager: {
    defaultPage: '/admin',
    allowedPages: [
      '/',
      '/products',
      '/products/*',
      '/cashier',
      '/cashier/*',
      '/admin',
      '/admin/*',
      '/profile'
    ],
    redirectAfterLogin: '/admin',
    displayName: 'Manager',
    description: 'Oversee operations and staff'
  },
  admin: {
    defaultPage: '/admin',
    allowedPages: [
      '*' // Admins can access everything
    ],
    redirectAfterLogin: '/admin',
    displayName: 'Administrator',
    description: 'Full system access and control'
  }
};

/**
 * Get the default page for a user role after login
 */
export function getDefaultPageForRole(role: string): string {
  const userRole = role as UserRole;
  return roleConfigs[userRole]?.defaultPage || '/products';
}

/**
 * Get the redirect path after login for a user role
 */
export function getRedirectAfterLogin(role: string): string {
  const userRole = role as UserRole;
  return roleConfigs[userRole]?.redirectAfterLogin || '/products';
}

/**
 * Redirect user based on their role - used by EmailConfirm.tsx and Login.tsx
 */
export function redirectUserByRole(role: string): string {
  const userRole = role as UserRole;
  const config = roleConfigs[userRole];
  
  if (!config) {
    console.warn(`Unknown user role: ${role}, redirecting to default`);
    return '/products';
  }
  
  console.log(`🧭 Redirecting ${role} user to: ${config.redirectAfterLogin}`);
  return config.redirectAfterLogin;
}

/**
 * MISSING FUNCTION: Check if user has at least the specified role level
 * Used by Navbar component for role-based UI rendering
 */
export function isAtLeastRole(userRole: string, requiredRole: string): boolean {
  const roleHierarchy: Record<string, number> = {
    consumer: 1,
    cashier: 2,
    staff: 3,
    manager: 4,
    admin: 5
  };

  const userLevel = roleHierarchy[userRole] || 0;
  const requiredLevel = roleHierarchy[requiredRole] || 0;

  return userLevel >= requiredLevel;
}

/**
 * MISSING FUNCTION: Check if current user has at least the specified role
 * This is the function the Navbar expects from AuthContext
 */
export function createIsAtLeastRoleFunction(currentUserRole?: string) {
  return (requiredRole: string): boolean => {
    if (!currentUserRole) return false;
    return isAtLeastRole(currentUserRole, requiredRole);
  };
}

/**
 * Check if a user role can access a specific page
 */
export function canAccessPage(role: string, page: string): boolean {
  const userRole = role as UserRole;
  const config = roleConfigs[userRole];
  
  if (!config) return false;
  
  // Admin can access everything
  if (config.allowedPages.includes('*')) return true;
  
  // Check exact match
  if (config.allowedPages.includes(page)) return true;
  
  // Check wildcard patterns
  return config.allowedPages.some(allowedPage => {
    if (allowedPage.endsWith('/*')) {
      const basePath = allowedPage.slice(0, -2);
      return page.startsWith(basePath);
    }
    return false;
  });
}

/**
 * Get display name for a user role
 */
export function getRoleDisplayName(role: string): string {
  const userRole = role as UserRole;
  return roleConfigs[userRole]?.displayName || 'User';
}

/**
 * Get description for a user role
 */
export function getRoleDescription(role: string): string {
  const userRole = role as UserRole;
  return roleConfigs[userRole]?.description || 'System user';
}

/**
 * Get all available roles with their configurations
 */
export function getAllRoles(): Array<{ role: UserRole; config: RoleConfig }> {
  return Object.entries(roleConfigs).map(([role, config]) => ({
    role: role as UserRole,
    config
  }));
}

/**
 * Check if a role has admin privileges
 */
export function hasAdminPrivileges(role: string): boolean {
  return role === 'admin' || role === 'manager';
}

/**
 * Check if a role has staff privileges
 */
export function hasStaffPrivileges(role: string): boolean {
  return ['admin', 'manager', 'staff', 'cashier'].includes(role);
}

/**
 * Check if a role can manage products
 */
export function canManageProducts(role: string): boolean {
  return ['admin', 'manager', 'staff'].includes(role);
}

/**
 * Check if a role can use POS system
 */
export function canUsePOS(role: string): boolean {
  return ['admin', 'manager', 'staff', 'cashier'].includes(role);
}

/**
 * Check if a role can manage users
 */
export function canManageUsers(role: string): boolean {
  return ['admin', 'manager'].includes(role);
}

/**
 * Check if a role can view analytics
 */
export function canViewAnalytics(role: string): boolean {
  return ['admin', 'manager'].includes(role);
}

/**
 * Get navigation items for a user role
 */
export function getNavigationForRole(role: string): Array<{
  label: string;
  path: string;
  icon?: string;
  children?: Array<{ label: string; path: string }>;
}> {
  const userRole = role as UserRole;
  
  const baseNavigation = [
    { label: 'Home', path: '/', icon: 'Home' },
    { label: 'Products', path: '/products', icon: 'Package' },
    { label: 'Contact', path: '/contact', icon: 'Mail' }
  ];

  switch (userRole) {
    case 'consumer':
      return [
        ...baseNavigation,
        { label: 'Cart', path: '/cart', icon: 'ShoppingCart' },
        { label: 'Favourites', path: '/favourites', icon: 'Heart' },
        { label: 'Orders', path: '/orders', icon: 'FileText' },
        { label: 'Profile', path: '/profile', icon: 'User' }
      ];

    case 'cashier':
      return [
        ...baseNavigation,
        { label: 'POS System', path: '/cashier/pos', icon: 'CreditCard' },
        { label: 'Dashboard', path: '/cashier', icon: 'BarChart3' },
        { label: 'Profile', path: '/profile', icon: 'User' }
      ];

    case 'staff':
      return [
        ...baseNavigation,
        { label: 'POS System', path: '/cashier/pos', icon: 'CreditCard' },
        { 
          label: 'Management', 
          path: '/admin', 
          icon: 'Settings',
          children: [
            { label: 'Products', path: '/admin/products' },
            { label: 'Orders', path: '/admin/orders' }
          ]
        },
        { label: 'Profile', path: '/profile', icon: 'User' }
      ];

    case 'manager':
      return [
        ...baseNavigation,
        { label: 'POS System', path: '/cashier/pos', icon: 'CreditCard' },
        { 
          label: 'Management', 
          path: '/admin', 
          icon: 'Settings',
          children: [
            { label: 'Dashboard', path: '/admin' },
            { label: 'Products', path: '/admin/products' },
            { label: 'Orders', path: '/admin/orders' },
            { label: 'Promotions', path: '/admin/promotions' },
            { label: 'Users', path: '/admin/users' }
          ]
        },
        { label: 'Profile', path: '/profile', icon: 'User' }
      ];

    case 'admin':
      return [
        ...baseNavigation,
        { label: 'POS System', path: '/cashier/pos', icon: 'CreditCard' },
        { 
          label: 'Administration', 
          path: '/admin', 
          icon: 'Shield',
          children: [
            { label: 'Dashboard', path: '/admin' },
            { label: 'Products', path: '/admin/products' },
            { label: 'Orders', path: '/admin/orders' },
            { label: 'Promotions', path: '/admin/promotions' },
            { label: 'Users', path: '/admin/users' }
          ]
        },
        { label: 'Profile', path: '/profile', icon: 'User' }
      ];

    default:
      return baseNavigation;
  }
}

/**
 * Get role hierarchy level (higher number = more privileges)
 */
export function getRoleLevel(role: string): number {
  const levels: Record<string, number> = {
    consumer: 1,
    cashier: 2,
    staff: 3,
    manager: 4,
    admin: 5
  };
  return levels[role] || 0;
}

/**
 * Check if one role has higher privileges than another
 */
export function hasHigherPrivileges(role1: string, role2: string): boolean {
  return getRoleLevel(role1) > getRoleLevel(role2);
}