-- ============================================
-- IMMEDIATE FIX: Database error saving new user
-- ============================================
-- This script fixes the most common causes of the signup error
-- Run this after running DIAGNOSTIC_CHECK.sql

DO $$
BEGIN
    RAISE NOTICE '🔧 ============================================';
    RAISE NOTICE '🔧 IMMEDIATE FIX STARTING...';
    RAISE NOTICE '🔧 ============================================';
    RAISE NOTICE '';
END $$;

-- STEP 1: Create user_profiles table (if missing)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'user_profiles'
    ) THEN
        RAISE NOTICE '🔧 Creating user_profiles table...';
        
        CREATE TABLE public.user_profiles (
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
        
        -- Create indexes
        CREATE INDEX idx_user_profiles_role ON public.user_profiles(role);
        CREATE INDEX idx_user_profiles_email ON public.user_profiles(email);
        CREATE INDEX idx_user_profiles_active ON public.user_profiles(is_active);
        
        RAISE NOTICE '✅ user_profiles table created successfully';
    ELSE
        RAISE NOTICE '✅ user_profiles table already exists';
    END IF;
END $$;

-- STEP 2: Drop and recreate trigger function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

DO $$
BEGIN
    RAISE NOTICE '🔧 Creating handle_new_user function...';
END $$;

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
    -- Log trigger start
    RAISE NOTICE 'TRIGGER: handle_new_user called for user % (%)', NEW.id, NEW.email;
    
    -- Extract metadata with safe defaults
    user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'customer');
    user_first_name := COALESCE(NEW.raw_user_meta_data->>'first_name', 'User');
    user_last_name := COALESCE(NEW.raw_user_meta_data->>'last_name', '');
    user_phone := COALESCE(NEW.raw_user_meta_data->>'phone', NULL);

    -- Validate role
    IF user_role NOT IN ('customer', 'cashier', 'staff', 'manager', 'admin') THEN
        RAISE NOTICE 'TRIGGER: Invalid role %, defaulting to customer', user_role;
        user_role := 'customer';
    END IF;

    -- Set loyalty points
    default_loyalty_points := CASE 
        WHEN user_role = 'customer' THEN 100
        ELSE 0
    END;

    -- Insert profile
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

        RAISE NOTICE 'TRIGGER: ✅ Profile created for user % with role % and % loyalty points', 
                     NEW.id, user_role, default_loyalty_points;
        
    EXCEPTION 
        WHEN unique_violation THEN
            RAISE NOTICE 'TRIGGER: Profile already exists for user %, skipping', NEW.id;
        WHEN OTHERS THEN
            RAISE WARNING 'TRIGGER: Error creating profile for user %: %', NEW.id, SQLERRM;
            -- Re-raise to prevent auth user creation if profile creation fails
            RAISE;
    END;

    RETURN NEW;
END;
$$;

-- STEP 3: Create trigger
DO $$
BEGIN
    RAISE NOTICE '🔧 Creating on_auth_user_created trigger...';
END $$;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- STEP 4: Enable RLS
DO $$
BEGIN
    RAISE NOTICE '🔧 Enabling Row Level Security...';
END $$;

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- STEP 5: Drop all existing policies and create new ones
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Managers can view staff profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Allow profile creation during signup" ON public.user_profiles;
DROP POLICY IF EXISTS "Public signup access" ON public.user_profiles;

DO $$
BEGIN
    RAISE NOTICE '🔧 Creating RLS policies...';
END $$;

-- CRITICAL: Allow INSERT during signup (this is what was missing!)
CREATE POLICY "Allow profile creation during signup" ON public.user_profiles
    FOR INSERT 
    WITH CHECK (true);

-- Allow users to view their own profile + staff can view all
CREATE POLICY "Users can view own profile" ON public.user_profiles
    FOR SELECT 
    USING (
        auth.uid() = id 
        OR 
        EXISTS (
            SELECT 1 FROM public.user_profiles staff_profile 
            WHERE staff_profile.id = auth.uid() 
            AND staff_profile.role IN ('staff', 'manager', 'admin')
        )
    );

-- Allow users to update their own profile + admins can update any
CREATE POLICY "Users can update own profile" ON public.user_profiles
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

-- Only admins can delete profiles
CREATE POLICY "Admins can delete profiles" ON public.user_profiles
    FOR DELETE 
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles admin_profile 
            WHERE admin_profile.id = auth.uid() 
            AND admin_profile.role = 'admin'
        )
    );

DO $$
BEGIN
    RAISE NOTICE '✅ RLS policies created successfully';
END $$;

-- STEP 6: Test the setup
DO $$
DECLARE
    test_passed BOOLEAN := true;
    error_messages TEXT := '';
BEGIN
    RAISE NOTICE '🧪 Testing the setup...';
    
    -- Check table exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'user_profiles'
    ) THEN
        test_passed := false;
        error_messages := error_messages || '❌ user_profiles table missing; ';
    END IF;
    
    -- Check function exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.routines 
        WHERE routine_name = 'handle_new_user' AND routine_schema = 'public'
    ) THEN
        test_passed := false;
        error_messages := error_messages || '❌ handle_new_user function missing; ';
    END IF;
    
    -- Check trigger exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'on_auth_user_created'
    ) THEN
        test_passed := false;
        error_messages := error_messages || '❌ on_auth_user_created trigger missing; ';
    END IF;
    
    -- Check RLS enabled
    IF NOT EXISTS (
        SELECT 1 FROM pg_class 
        WHERE relname = 'user_profiles' AND relrowsecurity = true
    ) THEN
        test_passed := false;
        error_messages := error_messages || '❌ RLS not enabled; ';
    END IF;
    
    -- Check INSERT policy exists (most critical!)
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_profiles' AND cmd = 'INSERT'
    ) THEN
        test_passed := false;
        error_messages := error_messages || '❌ INSERT policy missing; ';
    END IF;
    
    IF test_passed THEN
        RAISE NOTICE '✅ All tests passed! Setup is complete.';
    ELSE
        RAISE WARNING '❌ Setup issues found: %', error_messages;
    END IF;
END $$;

-- STEP 7: Final verification
SELECT 
    'SETUP VERIFICATION' as component,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles') 
        THEN '✅ Table exists' 
        ELSE '❌ Table missing' 
    END as table_status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'handle_new_user') 
        THEN '✅ Function exists' 
        ELSE '❌ Function missing' 
    END as function_status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'on_auth_user_created') 
        THEN '✅ Trigger exists' 
        ELSE '❌ Trigger missing' 
    END as trigger_status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_class WHERE relname = 'user_profiles' AND relrowsecurity = true) 
        THEN '✅ RLS enabled' 
        ELSE '❌ RLS disabled' 
    END as rls_status,
    (SELECT COUNT(*)::text FROM pg_policies WHERE tablename = 'user_profiles') || ' policies' as policy_count;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🎉 ============================================';
    RAISE NOTICE '🎉 IMMEDIATE FIX COMPLETED!';
    RAISE NOTICE '🎉 ============================================';
    RAISE NOTICE '';
    RAISE NOTICE '📋 WHAT WAS FIXED:';
    RAISE NOTICE '✅ user_profiles table created/verified';
    RAISE NOTICE '✅ handle_new_user trigger function created';
    RAISE NOTICE '✅ on_auth_user_created trigger activated';
    RAISE NOTICE '✅ Row Level Security enabled';
    RAISE NOTICE '✅ INSERT policy created (critical for signup)';
    RAISE NOTICE '✅ SELECT/UPDATE/DELETE policies created';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 NEXT STEPS:';
    RAISE NOTICE '1. Clear browser cache (localStorage.clear())';
    RAISE NOTICE '2. Hard refresh your browser (Ctrl+Shift+R)';
    RAISE NOTICE '3. Try registration with a NEW email address';
    RAISE NOTICE '4. Registration should now work without errors!';
    RAISE NOTICE '';
    RAISE NOTICE '🔍 If still having issues, check browser console and Supabase logs';
    RAISE NOTICE '';
END $$;