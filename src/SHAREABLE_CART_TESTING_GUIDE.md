# Shareable Cart Testing Guide

## Overview
This guide will help you test the complete shareable cart functionality to ensure everything works correctly with the new styling and database fixes.

## Prerequisites
1. Apply the database schema fix: `src/COMPLETE_SHAREABLE_CART_FIX.sql`
2. Ensure your Supabase project is running
3. Have items in your cart to test with

## Testing Steps

### 1. Database Setup Test
First, verify the database schema is properly set up:

```sql
-- Run this in your Supabase SQL editor
SELECT generate_share_token() as test_token;
```

Expected result: A base64url-encoded token (no "unrecognized encoding" error)

### 2. Create Shareable Cart Test

#### Step 1: Add Items to Cart
1. Navigate to your application
2. Add some products to your cart
3. Ensure you have at least 1 item in your cart

#### Step 2: Open Share Cart Modal
1. Click the "Share Cart" button in your cart
2. Verify the modal opens with the new styling:
   - Blue header with share icon
   - Cart summary with proper colors
   - Message input field
   - Expiration dropdown
   - Styled "Create Shareable Link" button

#### Step 3: Create Shareable Link
1. Optionally add a personal message
2. Select expiration period (default: 7 days)
3. Click "Create Shareable Link"
4. Verify:
   - Success state appears with green checkmark
   - Shareable URL is generated
   - Copy button works
   - Preview link opens in new tab

### 3. Shared Cart View Test

#### Step 1: Access Shared Cart
1. Copy the shareable URL
2. Open it in a new tab/incognito window
3. Verify the shared cart page loads with new styling:
   - Blue header with shopping bag icon
   - Progress steps with proper colors
   - Item cards with rounded corners and shadows

#### Step 2: Review Items
1. Verify items display correctly:
   - Product images
   - Names and details
   - Prices and quantities
   - Total calculations
2. Click "Proceed to Checkout"

#### Step 3: Shipping Information
1. Fill out shipping form with new styling:
   - Rounded input fields
   - Blue focus rings
   - Proper spacing and typography
2. Verify form validation works
3. Click "Continue to Payment"

#### Step 4: Payment Information
1. Fill out payment form
2. Verify styling matches the theme
3. Click "Complete Payment"
4. Verify loading state and success message

#### Step 5: Success State
1. Verify success page displays correctly:
   - Large green checkmark
   - Success message
   - "Continue Shopping" button

### 4. Error Handling Test

#### Test Expired Cart
1. Create a cart with 1-day expiration
2. Wait for expiration (or manually set expiration in database)
3. Try to access the shared cart
4. Verify error page displays with proper styling

#### Test Invalid Token
1. Try to access a cart with an invalid token
2. Verify error handling works correctly

### 5. Mobile Responsiveness Test
1. Test on mobile devices
2. Verify all forms and buttons work correctly
3. Check that the layout adapts properly

## Expected Results

### Styling Consistency
- All components use the project's color scheme:
  - Primary Blue: `#4682B4`
  - Trust Navy: `#2C3E50`
  - Fresh Green: `#28A745`
  - Alert Orange: `#FF6B35`
- Rounded corners: `rounded-xl` and `rounded-2xl`
- Proper shadows: `shadow-lg` and `shadow-2xl`
- Consistent typography and spacing

### Functionality
- Cart creation works without 400 errors
- Token generation uses proper base64url encoding
- All form validations work
- Payment processing completes successfully
- Access tracking works correctly
- Expiration handling works properly

## Troubleshooting

### Common Issues

#### 1. "Unrecognized encoding: base64url" Error
**Solution**: Run the database fix script:
```sql
-- Apply src/COMPLETE_SHAREABLE_CART_FIX.sql
```

#### 2. 400 Error When Creating Cart
**Solution**: Check RLS policies and ensure user is authenticated

#### 3. Styling Not Applied
**Solution**: Clear browser cache and ensure Tailwind CSS is properly configured

#### 4. Forms Not Working
**Solution**: Check that all required fields are filled and form validation is working

## Test Scripts

### Automated Testing
Run the test script to verify database functionality:
```bash
node src/test-complete-shareable-cart-flow.js
```

### Manual Testing Checklist
- [ ] Share cart modal opens and displays correctly
- [ ] Cart creation works without errors
- [ ] Shareable URL is generated
- [ ] Copy to clipboard works
- [ ] Preview link opens correctly
- [ ] Shared cart page loads with proper styling
- [ ] All form fields work correctly
- [ ] Payment processing completes
- [ ] Success state displays correctly
- [ ] Error handling works for expired/invalid carts
- [ ] Mobile responsiveness is good

## Performance Considerations
- Cart creation should complete within 2-3 seconds
- Page loads should be fast and smooth
- Form submissions should provide immediate feedback
- Loading states should be clearly visible

## Security Considerations
- Tokens should be unique and secure
- RLS policies should prevent unauthorized access
- Expired carts should not be accessible
- Payment information should be handled securely

## Conclusion
After completing all tests, the shareable cart feature should work seamlessly with your project's theme and provide a smooth user experience for both cart creators and recipients.
