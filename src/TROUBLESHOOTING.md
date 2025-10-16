# Troubleshooting Guide

This guide helps you resolve common issues with the Best Brightness e-commerce platform.

## Current Known Issues and Solutions

### 1. Multiple GoTrueClient Instances Warning ✅ FIXED

**Issue**: `Multiple GoTrueClient instances detected in the same browser context`

**Solution**: 
- Created a shared Supabase client in `/utils/supabase/client.tsx`
- Updated all components to use the shared client
- This prevents multiple client instances and improves performance

### 2. Missing Database Tables ✅ SOLUTION PROVIDED

**Issue**: `Could not find the table 'public.user_profiles' in the schema cache`

**Solution**: 
- Follow the complete database setup in `DATABASE_SETUP.md`
- Run the provided SQL script in your Supabase SQL Editor
- This creates all necessary tables, RLS policies, and triggers

### 3. Server Connection Failed ✅ FIXED

**Issue**: `Server connection failed: TypeError: Failed to fetch`

**Solution**:
- Removed all references to non-existent Edge Function endpoints
- Authentication now uses direct Supabase Auth instead of custom backend
- All functionality works without additional server deployment

## Quick Health Check

Run these checks to ensure everything is working:

### Step 1: Verify Environment Variables

Check that `/utils/supabase/info.tsx` contains valid values:

```typescript
export const projectId = 'your-actual-project-id';
export const publicAnonKey = 'your-actual-anon-key';
```

### Step 2: Test Database Connection

1. Open your browser's Developer Tools (F12)
2. Go to the Console tab
3. Try registering a new user
4. Look for any error messages

**Expected behavior**: User registration should work without database errors.

### Step 3: Verify Tables Exist

1. Go to your Supabase dashboard
2. Navigate to Database → Tables
3. Confirm these tables exist:
   - `user_profiles`
   - `categories` 
   - `products`
   - `orders`
   - `order_items`
   - `promotions`

### Step 4: Test Authentication Flow

1. **Registration**: Create a new account
2. **Login**: Sign in with the new account
3. **Profile**: Check that user profile loads correctly
4. **Navigation**: Verify protected routes work

## Common Error Messages and Solutions

### "Failed to fetch" Errors

**Possible Causes**:
1. Network connectivity issues
2. Incorrect Supabase configuration
3. Browser blocking requests

**Solutions**:
1. Check your internet connection
2. Verify Supabase project URL and keys
3. Disable ad blockers or privacy extensions temporarily
4. Clear browser cache and cookies

### "Invalid JWT" or Auth Errors

**Possible Causes**:
1. Expired session
2. Invalid API keys
3. Clock synchronization issues

**Solutions**:
1. Sign out and sign back in
2. Verify your Supabase keys are correct
3. Check your system clock is accurate

### Database Permission Errors

**Possible Causes**:
1. Row Level Security (RLS) policies not set up
2. User doesn't have required permissions
3. Tables not properly configured

**Solutions**:
1. Run the complete database setup script
2. Check RLS policies in Supabase dashboard
3. Verify user roles are assigned correctly

### Cart or Product Loading Issues

**Possible Causes**:
1. User not authenticated
2. Mock data not loading
3. Component state issues

**Solutions**:
1. Ensure user is signed in
2. Check browser console for errors
3. Refresh the page

## Development vs Production Setup

### Development (Current Setup)
- Uses mock data for products and orders
- Local state management for cart
- Simplified authentication flow
- Email confirmation disabled

### Production Requirements
- Connect to real product database
- Implement server-side cart persistence
- Enable email confirmation
- Add proper error monitoring
- Set up real payment processing

## Getting Help

If you continue to experience issues:

1. **Check Browser Console**: Look for specific error messages
2. **Check Network Tab**: See if requests are failing
3. **Verify Configuration**: Ensure all environment variables are correct
4. **Test in Incognito**: Rule out browser extension conflicts
5. **Clear Browser Data**: Clear cache, cookies, and local storage

## Performance Tips

1. **Lazy Loading**: The app uses code splitting for better performance
2. **Image Optimization**: Uses optimized images from Unsplash
3. **State Management**: Efficient context providers minimize re-renders
4. **Error Boundaries**: Proper error handling prevents app crashes

## Security Notes

1. **API Keys**: Never commit private keys to version control
2. **RLS Policies**: Database access is properly restricted
3. **Authentication**: Uses secure JWT tokens
4. **HTTPS**: Always use HTTPS in production

This troubleshooting guide should help you resolve most common issues. The authentication system is now simplified and should work reliably without external dependencies.