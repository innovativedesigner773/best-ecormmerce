# Complete Troubleshooting Guide: "Database error saving new user"

This guide provides step-by-step instructions to fix the "Database error saving new user" issue in your Best Brightness e-commerce application.

## 🎯 Quick Fix Summary

The issue occurs because:
1. The `user_profiles` table doesn't exist or has wrong structure
2. The database trigger to create profiles automatically is missing
3. Row Level Security (RLS) policies are blocking INSERT operations
4. Browser cache is interfering with authentication

## 🔧 Step-by-Step Fix

### Step 1: Run the Database Fix Script

1. Go to your **Supabase Dashboard**
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `DATABASE_ERROR_FIX.sql`
4. Click **Run** to execute the script
5. Verify all checks show ✅ (green checkmarks)

### Step 2: Clear Browser Cache

1. Open your browser's **Developer Tools** (F12)
2. Go to the **Console** tab
3. Copy and paste the contents of `browser-cache-clear.js`
4. Press **Enter** to run the script
5. Wait for the page to auto-refresh

### Step 3: Test Registration

1. Navigate to `/register` in your app
2. Try registering with a **completely new email address**
3. Use different roles to test:
   - Customer (no auth code needed)
   - Cashier (auth code: `CASHIER2024`)
   - Staff/Manager/Admin (respective auth codes)
4. Check browser console for any errors

### Step 4: Verify the Fix

1. Go back to **Supabase Dashboard → SQL Editor**
2. Run the `POST_REGISTRATION_VERIFICATION.sql` script
3. Check that both `auth.users` and `user_profiles` have your new user
4. Verify loyalty points are set correctly (100 for customers, 0 for staff)

## 🔍 Detailed Troubleshooting

### If Step 1 Fails (Database Script Issues)

**Symptom:** SQL script shows ❌ (red X) for any checks

**Solutions:**
- Make sure you have proper permissions in Supabase
- Check if there are existing tables/functions with conflicting names
- Try running each section of the SQL script individually
- Check the Supabase logs for specific error messages

### If Step 3 Fails (Registration Still Fails)

**Symptom:** Still getting "Database error saving new user"

**Check These:**

1. **Trigger Function Logs:**
   ```sql
   -- Check recent database logs
   SELECT * FROM pg_stat_activity WHERE application_name LIKE '%supabase%';
   ```

2. **RLS Policy Issues:**
   ```sql
   -- Temporarily disable RLS to test
   ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
   -- Test registration, then re-enable:
   ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
   ```

3. **AuthContext Issues:**
   - Check if your `AuthContext.tsx` is using the correct Supabase client
   - Verify the signup function is calling `supabase.auth.signUp()` correctly
   - Make sure metadata is being passed properly

### If Step 4 Shows Missing Data

**Symptom:** User appears in `auth.users` but not in `user_profiles`

**This means the trigger isn't working. Check:**

1. **Trigger Status:**
   ```sql
   SELECT * FROM information_schema.triggers 
   WHERE trigger_name = 'on_auth_user_created';
   ```

2. **Function Errors:**
   ```sql
   -- Check for function compilation errors
   SELECT routine_name, routine_definition 
   FROM information_schema.routines 
   WHERE routine_name = 'handle_new_user';
   ```

3. **Manual Trigger Test:**
   ```sql
   -- Test the trigger manually
   SELECT handle_new_user() -- This will show specific errors
   ```

## 🛠️ Advanced Debugging

### Enable Detailed Logging

Add this to your trigger function for more detailed logs:

```sql
-- Add this at the start of handle_new_user() function
RAISE NOTICE 'TRIGGER DEBUG: User ID=%, Email=%, Metadata=%', 
    NEW.id, NEW.email, NEW.raw_user_meta_data;
```

### Check Supabase Logs

1. Go to **Supabase Dashboard → Logs**
2. Select **Database** logs
3. Look for trigger-related messages
4. Filter by recent timestamps when you tested registration

### Test Component

Use the `RegistrationTester.tsx` component to test registration programmatically:

1. Temporarily add it to your admin dashboard
2. Run controlled tests with different roles
3. Monitor the results and error messages

## 🚨 Common Issues and Solutions

### Issue: "Foreign key violation"
**Cause:** The auth user isn't being created properly
**Solution:** Check your Supabase project settings and auth configuration

### Issue: "Check constraint violation"
**Cause:** Invalid role being passed to the trigger
**Solution:** Verify role validation in your frontend and trigger function

### Issue: "Permission denied"
**Cause:** RLS policies are too restrictive
**Solution:** Review and update the RLS policies, especially the INSERT policy

### Issue: "Function does not exist"
**Cause:** The trigger function wasn't created properly
**Solution:** Re-run the database fix script, focusing on the function creation

## 📋 Verification Checklist

After completing all steps, verify:

- [ ] ✅ `user_profiles` table exists with correct schema
- [ ] ✅ `handle_new_user()` function exists and compiles
- [ ] ✅ `on_auth_user_created` trigger is active
- [ ] ✅ RLS is enabled with proper policies
- [ ] ✅ Browser cache is cleared
- [ ] ✅ Registration works without errors
- [ ] ✅ User data appears in both `auth.users` and `user_profiles`
- [ ] ✅ Loyalty points are set correctly
- [ ] ✅ Role-based functionality works

## 🆘 Still Having Issues?

If you're still experiencing problems:

1. **Check Network Tab** in browser dev tools for failed API calls
2. **Review Supabase Logs** for detailed error messages
3. **Test with a minimal example** using the registration tester
4. **Verify environment variables** are set correctly
5. **Check Supabase project settings** for any restrictions

## 📞 Support Resources

- **Supabase Documentation:** https://supabase.com/docs
- **Supabase Discord:** For community support
- **GitHub Issues:** Check for similar issues in the Supabase repo

---

## 🎉 Success Indicators

When everything is working correctly, you should see:

1. **Registration completes without errors**
2. **User receives email confirmation (if enabled)**
3. **User can log in after confirmation**
4. **User profile data is complete and accurate**
5. **Role-based routing works correctly**
6. **Loyalty points are assigned properly**

The registration flow should be smooth and error-free! 🚀