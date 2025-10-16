# Best Brightness User Management Database Structure

This document outlines the current user management system using Supabase Auth + user_profiles table and provides guidance for enhancements.

## Current Implementation

### Supabase Auth Integration
The application uses Supabase's built-in authentication system which provides:
- User registration with email confirmation
- Secure password hashing and storage
- JWT token management
- Email verification and password reset
- Session management

### User Profiles Table Structure

The current `user_profiles` table structure includes:

```sql
-- Current user_profiles table (managed via Supabase)
user_profiles {
  id: UUID (references auth.users.id)
  email: VARCHAR(255)
  first_name: VARCHAR(100)
  last_name: VARCHAR(100)
  phone: VARCHAR(20)
  role: ENUM('customer', 'admin', 'staff', 'manager', 'cashier') DEFAULT 'customer'
  avatar_url: TEXT
  is_active: BOOLEAN DEFAULT TRUE
  email_verified: BOOLEAN DEFAULT FALSE
  last_login: TIMESTAMP
  login_attempts: INTEGER DEFAULT 0
  two_factor_enabled: BOOLEAN DEFAULT FALSE
  loyalty_points: INTEGER DEFAULT 0
  total_spent: DECIMAL(12,2) DEFAULT 0
  address: JSONB
  preferences: JSONB
  created_at: TIMESTAMP DEFAULT NOW()
  updated_at: TIMESTAMP DEFAULT NOW()
}
```

## Role-Based Access Control

### Role Hierarchy
```
Admin (Level 5)
├── Manager (Level 4)
├── Staff (Level 3)
├── Cashier (Level 2)
└── Customer (Level 1)
```

### Role Permissions

#### Customer
- Browse and purchase products
- Manage cart and favourites
- View order history
- Update profile
- Earn and redeem loyalty points

#### Cashier
- Access POS system
- Process sales transactions
- All customer permissions

#### Staff
- Manage products (add, edit, update inventory)
- Process orders
- Access POS system
- All customer permissions

#### Manager
- All staff permissions
- Manage promotions
- View analytics and reports
- Manage staff accounts (limited)

#### Admin
- Full system access
- Manage all users and roles
- System configuration
- Database management
- All lower-level permissions

## Navigation Flow

### After Registration/Login
```
User Registration → Email Confirmation → Role-Based Redirect:
├── Customer → /products (Product browsing)
├── Cashier → /cashier/pos (Point of Sale)
├── Staff → /admin/products (Product management)
├── Manager → /admin (Dashboard)
└── Admin → /admin (Full dashboard)
```

### Route Protection
```
Routes Protected by Role:
├── /admin/* → Admin, Manager only
├── /admin/users → Admin only
├── /admin/products → Admin, Manager, Staff
├── /cashier/* → Cashier and above
├── /products → All roles
├── /cart, /favourites → All roles
└── /checkout → Authenticated users only
```

## Security Features

### Email Confirmation
- Users must confirm email before accessing the system
- Confirmation links expire for security
- Resend functionality available

### Session Management
- JWT tokens with automatic refresh
- Secure session persistence
- Automatic logout on token expiration

### Account Security
- Login attempt tracking
- Account lockout after failed attempts
- Two-factor authentication support (ready for implementation)
- Password reset functionality

### Role Validation
- Server-side role verification
- Route-level protection
- Permission-based access control
- Authorization code requirement for admin/cashier registration

## Data Flow

### Registration Process
1. User submits registration form with role selection
2. Role validation (authorization codes for admin/cashier)
3. Supabase Auth creates user account
4. User profile created in user_profiles table
5. Email confirmation sent
6. User confirms email
7. Profile activated and user redirected to role-appropriate dashboard

### Login Process
1. User submits login credentials
2. Supabase Auth validates credentials
3. Email confirmation status checked
4. User profile fetched from user_profiles table
5. Role-based redirect executed
6. Last login timestamp updated
7. Session established

## API Integration

### AuthContext Functions
- `signUp()` - User registration with role assignment
- `signIn()` - Login with role-based navigation
- `signOut()` - Secure session termination
- `updateProfile()` - Profile management
- `updateLastLogin()` - Login tracking
- `resendConfirmation()` - Email confirmation resend

### Database Operations
- Profile creation and updates
- Role management
- Activity tracking
- Loyalty points management
- Session management

## Enhancements and Scalability

### Current Advantages
1. **Secure Foundation**: Built on Supabase's enterprise-grade auth
2. **Flexible Schema**: JSONB fields for extensible user data
3. **Role Hierarchy**: Scalable permission system
4. **Email Security**: Comprehensive email verification
5. **Session Management**: Automatic token handling

### Future Enhancements
1. **Two-Factor Authentication**: Framework already in place
2. **Advanced Permissions**: Granular permission system
3. **Audit Logging**: User activity tracking
4. **Account Management**: Advanced admin tools
5. **Social Login**: OAuth provider integration

## Production Considerations

### Performance
- Indexed user queries
- Efficient role checking
- Optimized session management
- Cached user profiles

### Security
- Regular security audits
- Role permission reviews
- Session timeout policies
- Failed login monitoring

### Monitoring
- User activity tracking
- Login success/failure rates
- Role usage analytics
- Performance metrics

## Development vs Production

### Development Mode
- Email confirmation can be bypassed
- Enhanced logging enabled
- Flexible role switching for testing

### Production Mode
- Strict email confirmation required
- Security logging enabled
- Role enforcement active
- Performance optimizations

This structure provides a solid foundation for the Best Brightness e-commerce platform while maintaining security, scalability, and user experience best practices.