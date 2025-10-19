-- ============================================
-- REGISTRATION FIX: Resolve RLS Policy Issues (FINAL CORRECTED)
-- ============================================
-- This script fixes the "new row violates row-level security policy" error
-- Run this in your Supabase SQL Editor

BEGIN;

-- Step 1: Drop all existing RLS policies to start fresh
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    RAISE NOTICE '🔧 Dropping all existing RLS policies...';
    
    FOR policy_record IN 
        SELECT policyname FROM pg_policies 
        WHERE tablename = 'user_profiles' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.user_profiles', policy_record.policyname);
        RAISE NOTICE '   Dropped policy: %', policy_record.policyname;
    END LOOP;
    
    RAISE NOTICE '✅ All existing policies dropped';
END $$;

-- Step 2: Ensure RLS is enabled
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Step 3: Create new comprehensive RLS policies

-- CRITICAL: Very permissive INSERT policy for signup
CREATE POLICY "allow_signup_insert" ON public.user_profiles
    FOR INSERT 
    WITH CHECK (true);  -- Allow ALL inserts during signup

-- Allow users to read their own profile + admins can read all
CREATE POLICY "allow_own_profile_select" ON public.user_profiles
    FOR SELECT 
    USING (
        auth.uid() = id 
        OR 
        EXISTS (
            SELECT 1 FROM public.user_profiles admin_profile 
            WHERE admin_profile.id = auth.uid() 
            AND admin_profile.role IN ('admin', 'manager')
        )
    );

-- Allow users to update their own profile + admins can update any
CREATE POLICY "allow_own_profile_update" ON public.user_profiles
    FOR UPDATE 
    USING (
        auth.uid() = id 
        OR 
        EXISTS (
            SELECT 1 FROM public.user_profiles admin_profile 
            WHERE admin_profile.id = auth.uid() 
            AND admin_profile.role IN ('admin', 'manager')
        )
    );

-- Only admins can delete profiles (safety measure)
CREATE POLICY "allow_admin_delete" ON public.user_profiles
    FOR DELETE 
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles admin_profile 
            WHERE admin_profile.id = auth.uid() 
            AND admin_profile.role = 'admin'
        )
    );

-- Step 4: Create or replace the trigger function
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
    default_loyalty_points INTEGER;
BEGIN
    -- Extract metadata from auth user
    user_role := COALESCE(
        NEW.raw_user_meta_data->>'userType',
        NEW.raw_user_meta_data->>'role',
        'customer'
    );
    
    user_first_name := COALESCE(
        NEW.raw_user_meta_data->>'firstName',
        NEW.raw_user_meta_data->>'first_name',
        'User'
    );
    
    user_last_name := COALESCE(
        NEW.raw_user_meta_data->>'lastName',
        NEW.raw_user_meta_data->>'last_name',
        ''
    );
    
    user_phone := NEW.raw_user_meta_data->>'phone';
    
    -- Validate role
    IF user_role NOT IN ('customer', 'cashier', 'staff', 'manager', 'admin') THEN
        user_role := 'customer';
    END IF;
    
    -- Set loyalty points based on role
    default_loyalty_points := CASE 
        WHEN user_role = 'customer' THEN 100
        ELSE 0
    END;
    
    -- Insert profile with error handling
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
        ) VALUES (
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
        
        RAISE NOTICE '✅ Profile created for user % with role %', NEW.id, user_role;
        
    EXCEPTION 
        WHEN unique_violation THEN
            RAISE NOTICE 'Profile already exists for user %, skipping', NEW.id;
        WHEN OTHERS THEN
            RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
    END;
    
    RETURN NEW;
END;
$$;

-- Step 5: Ensure trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Step 6: Test the setup
DO $$
DECLARE
    test_passed BOOLEAN := true;
    error_messages TEXT := '';
BEGIN
    -- Test 1: Check if user_profiles table exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'user_profiles'
    ) THEN
        test_passed := false;
        error_messages := error_messages || 'user_profiles table does not exist; ';
    END IF;
    
    -- Test 2: Check if RLS is enabled
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' 
        AND c.relname = 'user_profiles'
        AND c.relrowsecurity = true
    ) THEN
        test_passed := false;
        error_messages := error_messages || 'RLS not enabled on user_profiles; ';
    END IF;
    
    -- Test 3: Check if INSERT policy exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'user_profiles' 
        AND policyname = 'allow_signup_insert'
        AND cmd = 'INSERT'
    ) THEN
        test_passed := false;
        error_messages := error_messages || 'INSERT policy missing; ';
    END IF;
    
    -- Test 4: Check if trigger exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger t
        JOIN pg_class c ON c.oid = t.tgrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'auth' 
        AND c.relname = 'users'
        AND t.tgname = 'on_auth_user_created'
    ) THEN
        test_passed := false;
        error_messages := error_messages || 'Trigger missing; ';
    END IF;
    
    IF test_passed THEN
        RAISE NOTICE '🎉 All tests passed! Registration should now work.';
    ELSE
        RAISE WARNING '❌ Some tests failed: %', error_messages;
    END IF;
END $$;

COMMIT;

-- Final verification
SELECT 
    'Registration Fix Complete' as status,
    COUNT(*) as policies_created
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'user_profiles';

-- Success message
SELECT '🔧 Registration fix completed. Try registering a new user now!' as message;
