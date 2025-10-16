# Supabase Email Confirmation Setup Guide

This guide provides step-by-step instructions to configure Supabase Authentication for email confirmation in the Best Brightness application.

## Required Supabase Dashboard Configuration

### 1. Enable Email Confirmation

1. **Go to Authentication Settings**
   - Navigate to your Supabase project dashboard
   - Click on **Authentication** in the left sidebar
   - Go to **Settings** tab

2. **Enable Email Confirmations**
   - Find the **"Enable email confirmations"** toggle
   - **Turn this ON** ✅
   - This ensures users must confirm their email before they can log in

3. **Set Email Confirmation Settings**
   - **Email confirmation required**: `Enabled`
   - **Secure email change**: `Enabled` (recommended)
   - **Email OTP**: Can be left disabled (we're using default confirmation emails)

### 2. Configure URL Configuration

1. **Navigate to URL Configuration**
   - Still in **Authentication > Settings**
   - Scroll down to **"URL Configuration"** section

2. **Add Site URLs**
   - **Site URL**: Add your production domain (e.g., `https://yourapp.com`)
   - For development, add: `http://localhost:3000`

3. **Add Redirect URLs**
   - Click **"Add URL"** under **"Redirect URLs"**
   - Add the following URLs:
     
     **For Development:**
     ```
     http://localhost:3000/auth/confirm
     http://localhost:3000/login
     http://localhost:3000/reset-password
     ```
     
     **For Production:**
     ```
     https://yourdomain.com/auth/confirm
     https://yourdomain.com/login
     https://yourdomain.com/reset-password
     ```

### 3. Email Template Configuration (Optional)

1. **Go to Email Templates**
   - Navigate to **Authentication > Email Templates**
   - You can customize the confirmation email template here

2. **Confirm signup template variables:**
   - `{{ .ConfirmationURL }}` - The confirmation link
   - `{{ .SiteURL }}` - Your site URL
   - `{{ .Email }}` - User's email address

## Code Implementation Details

### 1. Registration Flow (`signUp` function)

The registration process now includes:
- `emailRedirectTo` parameter pointing to `/auth/confirm`
- User metadata with role information
- Proper error handling for confirmation requirements

```typescript
const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    emailRedirectTo: `${window.location.origin}/auth/confirm`,
    data: {
      first_name: firstName,
      last_name: lastName,
      role: userRole
    }
  }
});
```

### 2. Login Flow (`signIn` function)

The login process now:
- Checks for `email_confirmed_at` field
- Blocks login attempts for unconfirmed emails
- Provides clear error messages with resend options

### 3. Email Confirmation Page (`/auth/confirm`)

Handles the confirmation process:
- Extracts tokens from URL parameters
- Sets the session with confirmed tokens
- Redirects users to their role-appropriate dashboard
- Handles expired or invalid links gracefully

## Testing Email Confirmation

### 1. Local Development Testing

1. **Start your development server**
   ```bash
   npm run dev
   ```

2. **Register a new account**
   - Go to `/register`
   - Fill out the form with a real email address
   - Submit the registration

3. **Check your email**
   - Look for an email from Supabase
   - Check spam folder if not in inbox
   - Click the confirmation link

4. **Verify the flow**
   - Should redirect to `/auth/confirm`
   - Should show success message
   - Should redirect to appropriate dashboard based on role

### 2. Verify Supabase Logs

1. **Check Authentication Logs**
   - Go to **Authentication > Users** in Supabase dashboard
   - Look for your test user
   - Check if `email_confirmed_at` field is populated

2. **Check Email Logs**
   - Go to **Logs** in Supabase dashboard
   - Filter by "auth" events
   - Look for email confirmation events

## Common Issues and Troubleshooting

### Issue 1: "Invalid or expired confirmation link"

**Causes:**
- Redirect URL not configured in Supabase
- Wrong domain in Site URL
- Email confirmation disabled

**Solutions:**
- Verify redirect URLs include `/auth/confirm`
- Check Site URL matches your domain
- Ensure email confirmation is enabled

### Issue 2: "Email not confirmed" error on login

**Expected Behavior:**
- This is correct! Users must confirm email before login
- Login page should show resend confirmation option

### Issue 3: Confirmation emails not being sent

**Check:**
1. Email confirmation is enabled in Auth settings
2. SMTP settings are configured (if using custom SMTP)
3. User's email is valid and not bouncing
4. Check Supabase email quota/limits

### Issue 4: Development vs Production URLs

**Development:**
- Use `http://localhost:3000` for local testing
- Ensure port matches your dev server

**Production:**
- Use your actual domain with HTTPS
- Update all redirect URLs after deployment

## Security Best Practices

1. **Always use HTTPS in production**
2. **Keep redirect URLs specific** - don't use wildcards
3. **Regularly review authentication logs**
4. **Set up proper error monitoring**
5. **Consider rate limiting for resend confirmation**

## Environment Variables

Ensure these environment variables are set:

```env
# In your production environment
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Email Configuration Checklist

- [ ] Email confirmation enabled in Supabase Auth settings
- [ ] Site URL configured correctly
- [ ] Redirect URLs added for all environments
- [ ] Email templates customized (optional)
- [ ] Development testing completed
- [ ] Production URLs updated after deployment
- [ ] Error handling tested (expired links, invalid tokens)
- [ ] Resend confirmation functionality working
- [ ] Role-based redirects working after confirmation

## Support

If you encounter issues:

1. Check Supabase documentation: https://supabase.com/docs/guides/auth
2. Review Supabase dashboard logs
3. Test with different email providers
4. Contact Supabase support if needed

The email confirmation system is now fully implemented and ready for production use!