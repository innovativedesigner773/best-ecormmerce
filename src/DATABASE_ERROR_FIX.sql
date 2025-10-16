-- ============================================
-- COMPREHENSIVE FIX: Database error saving new user
-- ============================================
-- This script follows the exact troubleshooting guide provided
-- Run each section step by step in Supabase SQL Editor

-- STEP 1: Check if user_profiles table exists
-- Run this first to verify current state
SELECT 
    'STEP 1: Table Check' as step,
    CASE 
        WHEN EXISTS (
            SELECT table_name FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = 'user_profiles'
        ) 
        THEN '✅ user_profiles table EXISTS' 
        ELSE '❌ user_profiles table MISSING - will create in step 2' 
    END as result;

-- STEP 2: Create user_profiles table with exact schema
-- Run this if step 1 showed table is missing, or run anyway to ensure correct structure
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'cashier', 'staff', 'manager', 'admin')),
    phone TEXT,
    address JSONB DEFAULT '{}',
    preferences JSONB DEFAULT '{}',
    loyalty_points INTEGER DEFAULT 100,
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_active ON public.user_profiles(is_active);

-- Verify table creation
SELECT 
    'STEP 2: Table Creation' as step,
    '✅ user_profiles table and indexes created successfully' as result;

-- STEP 3: Check if trigger function exists
SELECT 
    'STEP 3: Function Check' as step,
    CASE 
        WHEN EXISTS (
            SELECT routine_name FROM information_schema.routines 
            WHERE routine_name = 'handle_new_user' AND routine_schema = 'public'
        ) 
        THEN '✅ handle_new_user function EXISTS' 
        ELSE '❌ handle_new_user function MISSING - will create in step 4' 
    END as result;

-- STEP 4: Drop existing trigger and recreate function
-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop existing function if it exists  
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create the improved function with better error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_role TEXT;
    user_first_name TEXT;
    user_last_name TEXT;
    user_phone TEXT;
    profile_exists BOOLEAN := false;
    default_loyalty_points INTEGER;
BEGIN
    -- Log the trigger execution for debugging
    RAISE NOTICE 'TRIGGER: Creating user profile for user ID: %', NEW.id;
    
    -- Check if profile already exists to prevent duplicates
    SELECT EXISTS(
        SELECT 1 FROM public.user_profiles WHERE id = NEW.id
    ) INTO profile_exists;
    
    IF profile_exists THEN
        RAISE NOTICE 'TRIGGER: Profile already exists for user %, skipping creation', NEW.id;
        RETURN NEW;
    END IF;

    -- Extract custom fields from raw_user_meta_data with safe defaults
    user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'customer');
    user_first_name := COALESCE(NEW.raw_user_meta_data->>'first_name', 'User');
    user_last_name := COALESCE(NEW.raw_user_meta_data->>'last_name', '');
    user_phone := COALESCE(NEW.raw_user_meta_data->>'phone', NULL);

    -- Validate and sanitize role
    IF user_role NOT IN ('customer', 'cashier', 'staff', 'manager', 'admin') THEN
        RAISE WARNING 'TRIGGER: Invalid role % provided for user %, defaulting to customer', user_role, NEW.id;
        user_role := 'customer';
    END IF;

    -- Set loyalty points based on role
    default_loyalty_points := CASE 
        WHEN user_role = 'customer' THEN 100  -- Welcome bonus for customers
        ELSE 0  -- No loyalty points for staff/admin roles
    END;

    -- Insert into user_profiles table with comprehensive error handling
    BEGIN
        INSERT INTO public.user_profiles (
            id,
            email,
            first_name,
            last_name,
            role,
            phone,
            address,
            preferences,
            loyalty_points,
            is_active,
            created_at,
            updated_at
        )
        VALUES (
            NEW.id,
            COALESCE(NEW.email, ''),
            user_first_name,
            user_last_name,
            user_role,
            user_phone,
            '{}'::jsonb,
            '{}'::jsonb,
            default_loyalty_points,
            true,
            NOW(),
            NOW()
        );

        RAISE NOTICE 'TRIGGER: ✅ Successfully created user profile for % (%) with role % and % loyalty points', 
                     NEW.id, NEW.email, user_role, default_loyalty_points;
        
    EXCEPTION 
        WHEN unique_violation THEN
            RAISE WARNING 'TRIGGER: Profile already exists for user % (unique violation), ignoring', NEW.id;
        WHEN foreign_key_violation THEN
            RAISE WARNING 'TRIGGER: Foreign key violation creating profile for user %: %', NEW.id, SQLERRM;
            -- Re-raise the error to prevent the auth user creation from succeeding
            RAISE;
        WHEN check_violation THEN
            RAISE WARNING 'TRIGGER: Check constraint violation for user %: %', NEW.id, SQLERRM;
            -- Re-raise the error to prevent invalid data
            RAISE;
        WHEN OTHERS THEN
            RAISE WARNING 'TRIGGER: Unexpected error creating profile for user %: % (SQLSTATE: %)', NEW.id, SQLERRM, SQLSTATE;
            -- Re-raise the error to prevent the auth user creation from succeeding
            RAISE;
    END;

    RETURN NEW;
END;
$$;

-- Verify function creation
SELECT 
    'STEP 4: Function Creation' as step,
    '✅ handle_new_user function created successfully' as result;

-- STEP 5: Create the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Verify trigger creation
SELECT 
    'STEP 5: Trigger Creation' as step,
    '✅ on_auth_user_created trigger created successfully' as result;

-- STEP 6: Enable RLS and create policies

-- Enable Row Level Security (RLS) on user_profiles table
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to ensure clean slate
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Managers can view staff profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Allow profile creation during signup" ON public.user_profiles;
DROP POLICY IF EXISTS "Public signup access" ON public.user_profiles;

-- Create comprehensive RLS policies

-- 1. Allow profile creation during signup (CRITICAL for signup to work)
CREATE POLICY "Allow profile creation during signup" ON public.user_profiles
    FOR INSERT 
    WITH CHECK (true);  -- Very permissive for INSERT operations

-- 2. Users can view their own profile + staff can view all profiles
CREATE POLICY "Users can view own profile" ON public.user_profiles
    FOR SELECT 
    USING (
        auth.uid() = id 
        OR 
        EXISTS (
            SELECT 1 FROM public.user_profiles staff_profile 
            WHERE staff_profile.id = auth.uid() 
            AND staff_profile.role IN ('staff', 'manager', 'admin')
            AND staff_profile.is_active = true
        )
    );

-- 3. Users can update their own profile + admins/managers can update any profile
CREATE POLICY "Users can update own profile" ON public.user_profiles
    FOR UPDATE 
    USING (
        auth.uid() = id 
        OR 
        EXISTS (
            SELECT 1 FROM public.user_profiles admin_profile 
            WHERE admin_profile.id = auth.uid() 
            AND admin_profile.role IN ('admin', 'manager')
            AND admin_profile.is_active = true
        )
    );

-- 4. Only admins can delete profiles (safety measure)
CREATE POLICY "Admins can delete profiles" ON public.user_profiles
    FOR DELETE 
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles admin_profile 
            WHERE admin_profile.id = auth.uid() 
            AND admin_profile.role = 'admin'
            AND admin_profile.is_active = true
        )
    );

-- Verify RLS and policies
SELECT 
    'STEP 6: RLS and Policies' as step,
    '✅ RLS enabled and policies created successfully' as result;

-- STEP 7: Comprehensive verification
SELECT 
    'STEP 7: VERIFICATION RESULTS' as step,
    'See detailed results below' as result;

-- Detailed verification checks
SELECT 
    'Table Check' as check_type,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'user_profiles' AND table_schema = 'public'
    ) 
    THEN '✅ user_profiles table exists' 
    ELSE '❌ user_profiles table missing' END as status

UNION ALL

SELECT 
    'Function Check' as check_type,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.routines 
        WHERE routine_name = 'handle_new_user' AND routine_schema = 'public'
    ) 
    THEN '✅ handle_new_user function exists' 
    ELSE '❌ handle_new_user function missing' END as status

UNION ALL

SELECT 
    'Trigger Check' as check_type,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'on_auth_user_created' 
        AND event_object_schema = 'auth' 
        AND event_object_table = 'users'
    ) 
    THEN '✅ on_auth_user_created trigger exists' 
    ELSE '❌ on_auth_user_created trigger missing' END as status

UNION ALL

SELECT 
    'RLS Check' as check_type,
    CASE WHEN EXISTS (
        SELECT 1 FROM pg_class 
        WHERE relname = 'user_profiles' AND relrowsecurity = true
    ) 
    THEN '✅ RLS enabled on user_profiles' 
    ELSE '❌ RLS not enabled on user_profiles' END as status

UNION ALL

SELECT 
    'Policies Check' as check_type,
    CASE WHEN (
        SELECT COUNT(*) FROM pg_policies 
        WHERE tablename = 'user_profiles' AND schemaname = 'public'
    ) >= 4 
    THEN '✅ RLS policies created (' || (
        SELECT COUNT(*) FROM pg_policies 
        WHERE tablename = 'user_profiles' AND schemaname = 'public'
    )::text || ' policies)' 
    ELSE '❌ Insufficient RLS policies' END as status;

-- STEP 8: Test the trigger manually (OPTIONAL - will be rolled back)
-- Uncomment the section below to test the trigger

/*
BEGIN;

-- Generate a test UUID
DO $$
DECLARE
    test_user_id UUID := gen_random_uuid();
    test_email TEXT := 'trigger-test-' || extract(epoch from now()) || '@example.com';
BEGIN
    RAISE NOTICE 'STEP 8: Testing trigger with user ID: % and email: %', test_user_id, test_email;
    
    -- Insert test user into auth.users (simulating signup)
    INSERT INTO auth.users (
        id, 
        email, 
        raw_user_meta_data,
        created_at,
        updated_at,
        email_confirmed_at
    ) VALUES (
        test_user_id,
        test_email,
        '{"first_name": "Trigger", "last_name": "Test", "role": "customer"}'::jsonb,
        NOW(),
        NOW(),
        NOW()
    );
    
    -- Check if user_profile was created
    IF EXISTS (SELECT 1 FROM public.user_profiles WHERE id = test_user_id) THEN
        RAISE NOTICE '✅ STEP 8: Trigger test PASSED - Profile created successfully';
    ELSE
        RAISE WARNING '❌ STEP 8: Trigger test FAILED - Profile was not created';
    END IF;
    
END $$;

-- Always rollback the test
ROLLBACK;

SELECT 
    'STEP 8: Trigger Test' as step,
    'Test completed (rolled back) - check NOTICES above for results' as result;
*/

-- STEP 9: Instructions for clearing cache and testing
SELECT 
    'STEP 9: NEXT ACTIONS REQUIRED' as step,
    'Clear browser cache and test registration - see instructions below' as result;

-- STEP 10: Query to verify data after testing
-- Run this AFTER you test registration in your app
-- SELECT 
--     'STEP 10: Post-Registration Verification' as step,
--     'Run the query below AFTER testing registration' as result;

-- Uncomment and run this query AFTER testing registration:
/*
SELECT 
    u.id,
    u.email,
    u.raw_user_meta_data,
    u.created_at as auth_created,
    p.first_name,
    p.last_name,
    p.role,
    p.loyalty_points,
    p.created_at as profile_created
FROM auth.users u
LEFT JOIN public.user_profiles p ON u.id = p.id
ORDER BY u.created_at DESC
LIMIT 5;
*/

-- Final success message
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🎉 ============================================';
    RAISE NOTICE '🎉 DATABASE ERROR FIX COMPLETED SUCCESSFULLY!';
    RAISE NOTICE '🎉 ============================================';
    RAISE NOTICE '';
    RAISE NOTICE '✅ user_profiles table created with proper schema';
    RAISE NOTICE '✅ handle_new_user trigger function created';
    RAISE NOTICE '✅ on_auth_user_created trigger activated';
    RAISE NOTICE '✅ RLS policies configured for security';
    RAISE NOTICE '';
    RAISE NOTICE '📋 NEXT STEPS:';
    RAISE NOTICE '1. Clear browser cache (localStorage.clear(), sessionStorage.clear())';
    RAISE NOTICE '2. Hard refresh browser (Ctrl+Shift+R)';
    RAISE NOTICE '3. Test registration with a new email address';
    RAISE NOTICE '4. Check for any console errors';
    RAISE NOTICE '5. Verify user_profiles data was created';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 If issues persist, check Supabase logs: Dashboard > Logs > Database';
    RAISE NOTICE '';
END $$;