# Best Brightness E-Commerce Platform Guidelines

## Project Overview
Best Brightness is a comprehensive e-commerce platform for cleaning supplies featuring:
- Multi-role access control (customer, cashier, staff, manager, admin)
- Barcode scanning and product management
- POS system integration
- Loyalty programs and promotional systems
- Real-time inventory management

## Design System Guidelines

### Brand Colors
Our hygiene-focused theme uses a clean, trustworthy color palette:
- **Primary Blue**: `#4682B4` - Main brand color for buttons and highlights
- **Light Blue**: `#87CEEB` - Accent color for backgrounds and secondary elements  
- **Fresh Blue**: `#B0E0E6` - Light backgrounds and subtle highlights
- **Trust Navy**: `#2C3E50` - Text color and headers
- **Fresh Green**: `#28A745` - Success states and positive actions
- **Alert Orange**: `#FF6B35` - Warnings and attention-grabbing elements
- **Pure White**: `#FFFFFF` - Clean backgrounds
- **Soft Gray**: `#F8F9FA` - Light backgrounds and borders

### Typography
- **Base font size**: 14px (defined in CSS custom properties)
- **Font weights**: 
  - Normal text: 400
  - Medium (buttons, labels, headings): 500
- **Line height**: 1.5 for all text elements

### Component Guidelines

#### Buttons
- **Primary Button**: Use `bg-[#4682B4]` with white text for main actions
- **Secondary Button**: Use `border-[#4682B4] text-[#4682B4]` for secondary actions  
- **Success Button**: Use `bg-[#28A745]` for positive confirmations
- **Warning Button**: Use `bg-[#FF6B35]` for destructive actions
- **Hover states**: Transition to `bg-[#2C3E50]` for primary buttons

#### Cards and Containers
- Use `rounded-xl` (12px) for main content cards
- Use `rounded-lg` (8px) for smaller components
- Apply subtle shadows: `shadow-lg` for elevated content
- Background: `bg-white` with `border border-gray-200`

#### Form Elements
- **Input fields**: `rounded-xl` with `border-gray-300`, focus ring `ring-[#4682B4]`
- **Labels**: Medium font weight, `text-[#2C3E50]`
- **Error states**: `border-red-300 bg-red-50` with red text
- **Success states**: `border-green-300 bg-green-50` with green text

#### Status Indicators
- **Success**: Use green (`#28A745`) with CheckCircle icon
- **Warning**: Use orange (`#FF6B35`) with AlertTriangle icon  
- **Error**: Use red (`#dc2626`) with AlertCircle icon
- **Info**: Use blue (`#4682B4`) with Info icon

## Code Standards

### File Organization
- **Pages**: Group by user role (`/pages/customer/`, `/pages/admin/`, `/pages/cashier/`)
- **Components**: Organize by purpose (`/components/common/`, `/components/auth/`, `/components/ui/`)
- **Utils**: Keep helper functions in logical modules (`/utils/auth-helpers.tsx`, `/utils/roleRouting.tsx`)

### Authentication & Authorization
- Always use the `useAuth()` hook for authentication state
- Wrap protected routes with `<ProtectedRoute allowedRoles={['role1', 'role2']}>` 
- Use `<AuthGate requireAuth={true}>` for pages that need authentication but should preserve cart
- Role hierarchy: `customer` < `cashier` < `staff` < `manager` < `admin`

### Error Handling
- Wrap main app sections in `<ErrorBoundary>`
- Use try-catch blocks for async operations
- Display user-friendly error messages, log technical details to console
- Handle network errors gracefully with retry mechanisms

### Loading States
- Always show loading indicators for async operations
- Use `LoadingSpinner` component with appropriate sizes
- Implement timeout fallbacks for critical loading states
- Provide meaningful loading messages

### Data Fetching
- Use React Query for server state management
- Set appropriate `staleTime` and `gcTime` values
- Handle error states and retry logic
- Don't retry on authentication errors (401/403)

## Role-Specific Guidelines

### Customer Experience
- Prioritize ease of browsing and purchasing
- Shopping cart should work without authentication
- Loyalty points and order history require login
- Seamless transition from guest to authenticated user

### Cashier Interface  
- Focus on speed and efficiency for POS operations
- Large, touch-friendly interface elements
- Clear product scanning feedback
- Quick access to common functions

### Admin Interface
- Comprehensive data views with filtering and search
- Bulk operations for efficiency
- Clear confirmation dialogs for destructive actions
- Analytics and reporting capabilities

## Performance Guidelines
- Lazy load non-critical components
- Optimize images with appropriate sizes and formats
- Use React.memo for expensive components
- Minimize bundle size by avoiding unnecessary imports
- Implement pagination for large data sets

## Security Guidelines
- Never expose sensitive data in client-side code
- Use proper role-based access control
- Validate all user inputs
- Use HTTPS for all API communications
- Implement proper CORS policies
- Store sensitive operations on the server side

## Testing Guidelines
- Test registration and authentication flows thoroughly
- Verify role-based access controls
- Test error scenarios and edge cases
- Ensure responsive design works across devices
- Test barcode scanning functionality
- Validate cart persistence and checkout flow