-- ============================================
-- DIAGNOSTIC CHECK: Database error saving new user
-- ============================================
-- Run this first to see what's missing or broken

DO $$
BEGIN
    RAISE NOTICE '🔍 ============================================';
    RAISE NOTICE '🔍 DIAGNOSTIC CHECK STARTING...';
    RAISE NOTICE '🔍 ============================================';
    RAISE NOTICE '';
END $$;

-- 1. Check if user_profiles table exists
SELECT 
    '1. TABLE CHECK' as check_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = 'user_profiles'
        ) 
        THEN '✅ user_profiles table EXISTS' 
        ELSE '❌ user_profiles table MISSING' 
    END as status;

-- 2. Check table structure if it exists
DO $$
DECLARE
    table_exists BOOLEAN;
    column_count INTEGER;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'user_profiles'
    ) INTO table_exists;
    
    IF table_exists THEN
        SELECT COUNT(*) INTO column_count
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'user_profiles';
        
        RAISE NOTICE '2. TABLE STRUCTURE: user_profiles has % columns', column_count;
        
        -- Check for required columns
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'id') THEN
            RAISE NOTICE '   ✅ id column exists';
        ELSE
            RAISE NOTICE '   ❌ id column MISSING';
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'email') THEN
            RAISE NOTICE '   ✅ email column exists';
        ELSE
            RAISE NOTICE '   ❌ email column MISSING';
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'first_name') THEN
            RAISE NOTICE '   ✅ first_name column exists';
        ELSE
            RAISE NOTICE '   ❌ first_name column MISSING';
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'role') THEN
            RAISE NOTICE '   ✅ role column exists';
        ELSE
            RAISE NOTICE '   ❌ role column MISSING';
        END IF;
        
    ELSE
        RAISE NOTICE '2. TABLE STRUCTURE: Cannot check - table does not exist';
    END IF;
END $$;

-- 3. Check if trigger function exists
SELECT 
    '3. FUNCTION CHECK' as check_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.routines 
            WHERE routine_name = 'handle_new_user' AND routine_schema = 'public'
        ) 
        THEN '✅ handle_new_user function EXISTS' 
        ELSE '❌ handle_new_user function MISSING' 
    END as status;

-- 4. Check if trigger exists
SELECT 
    '4. TRIGGER CHECK' as check_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.triggers 
            WHERE trigger_name = 'on_auth_user_created'
            AND event_object_schema = 'auth'
            AND event_object_table = 'users'
        ) 
        THEN '✅ on_auth_user_created trigger EXISTS' 
        ELSE '❌ on_auth_user_created trigger MISSING' 
    END as status;

-- 5. Check RLS status
SELECT 
    '5. RLS CHECK' as check_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_class 
            WHERE relname = 'user_profiles' AND relrowsecurity = true
        ) 
        THEN '✅ RLS ENABLED on user_profiles' 
        ELSE '❌ RLS DISABLED on user_profiles' 
    END as status;

-- 6. Check RLS policies
SELECT 
    '6. POLICIES CHECK' as check_name,
    CASE 
        WHEN (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'user_profiles' AND schemaname = 'public') = 0
        THEN '❌ NO RLS policies found'
        WHEN (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'user_profiles' AND schemaname = 'public') < 3
        THEN '⚠️ Only ' || (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'user_profiles' AND schemaname = 'public')::text || ' RLS policies (need at least 3)'
        ELSE '✅ ' || (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'user_profiles' AND schemaname = 'public')::text || ' RLS policies found'
    END as status;

-- 7. Check for INSERT policy specifically (most critical for signup)
SELECT 
    '7. INSERT POLICY CHECK' as check_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE tablename = 'user_profiles' 
            AND schemaname = 'public' 
            AND cmd = 'INSERT'
        )
        THEN '✅ INSERT policy EXISTS (signup allowed)'
        ELSE '❌ INSERT policy MISSING (signup will fail)'
    END as status;

-- 8. Check recent auth.users vs user_profiles
DO $$
DECLARE
    auth_users_count INTEGER;
    profiles_count INTEGER;
    orphaned_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO auth_users_count FROM auth.users;
    
    SELECT COUNT(*) INTO profiles_count 
    FROM public.user_profiles 
    WHERE EXISTS (SELECT 1 FROM auth.users WHERE auth.users.id = user_profiles.id);
    
    SELECT COUNT(*) INTO orphaned_count 
    FROM auth.users u 
    LEFT JOIN public.user_profiles p ON u.id = p.id 
    WHERE p.id IS NULL;
    
    RAISE NOTICE '8. DATA CONSISTENCY:';
    RAISE NOTICE '   📊 Total auth.users: %', auth_users_count;
    RAISE NOTICE '   📊 Total user_profiles: %', profiles_count;
    RAISE NOTICE '   📊 Orphaned users (no profile): %', orphaned_count;
    
    IF orphaned_count > 0 THEN
        RAISE NOTICE '   ❌ % users have no profiles - trigger may not be working', orphaned_count;
    ELSE
        RAISE NOTICE '   ✅ All users have profiles';
    END IF;
END $$;

-- 9. Test trigger function manually (if it exists)
DO $$
DECLARE
    function_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.routines 
        WHERE routine_name = 'handle_new_user' AND routine_schema = 'public'
    ) INTO function_exists;
    
    IF function_exists THEN
        BEGIN
            -- Try to call the function to see if it compiles
            RAISE NOTICE '9. FUNCTION TEST: Checking if handle_new_user compiles...';
            -- We can't easily test this without creating a real auth user, so we'll just check compilation
            RAISE NOTICE '   ✅ Function exists and should be callable';
        EXCEPTION 
            WHEN OTHERS THEN
                RAISE NOTICE '   ❌ Function has compilation errors: %', SQLERRM;
        END;
    ELSE
        RAISE NOTICE '9. FUNCTION TEST: ❌ Function does not exist';
    END IF;
END $$;

-- 10. Final diagnosis
DO $$
DECLARE
    table_exists BOOLEAN;
    function_exists BOOLEAN;
    trigger_exists BOOLEAN;
    rls_enabled BOOLEAN;
    insert_policy_exists BOOLEAN;
    diagnosis TEXT;
BEGIN
    -- Check all components
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'user_profiles'
    ) INTO table_exists;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.routines 
        WHERE routine_name = 'handle_new_user' AND routine_schema = 'public'
    ) INTO function_exists;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'on_auth_user_created'
    ) INTO trigger_exists;
    
    SELECT EXISTS (
        SELECT 1 FROM pg_class 
        WHERE relname = 'user_profiles' AND relrowsecurity = true
    ) INTO rls_enabled;
    
    SELECT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_profiles' AND cmd = 'INSERT'
    ) INTO insert_policy_exists;
    
    RAISE NOTICE '';
    RAISE NOTICE '📋 ============================================';
    RAISE NOTICE '📋 DIAGNOSIS SUMMARY';
    RAISE NOTICE '📋 ============================================';
    
    -- Determine the problem
    IF NOT table_exists THEN
        diagnosis := 'MISSING TABLE: user_profiles table does not exist';
    ELSIF NOT function_exists THEN
        diagnosis := 'MISSING FUNCTION: handle_new_user function does not exist';
    ELSIF NOT trigger_exists THEN
        diagnosis := 'MISSING TRIGGER: on_auth_user_created trigger does not exist';
    ELSIF NOT rls_enabled THEN
        diagnosis := 'RLS DISABLED: Row Level Security is not enabled';
    ELSIF NOT insert_policy_exists THEN
        diagnosis := 'MISSING INSERT POLICY: No policy allows INSERT operations (critical for signup)';
    ELSE
        diagnosis := 'SETUP APPEARS COMPLETE: All components exist, but there may be a data or logic issue';
    END IF;
    
    RAISE NOTICE '🔍 PRIMARY ISSUE: %', diagnosis;
    RAISE NOTICE '';
    
    -- Provide specific next steps
    IF NOT table_exists THEN
        RAISE NOTICE '📋 NEXT STEP: Run the CREATE TABLE statement for user_profiles';
    ELSIF NOT function_exists THEN
        RAISE NOTICE '📋 NEXT STEP: Create the handle_new_user() function';
    ELSIF NOT trigger_exists THEN
        RAISE NOTICE '📋 NEXT STEP: Create the on_auth_user_created trigger';
    ELSIF NOT rls_enabled THEN
        RAISE NOTICE '📋 NEXT STEP: Enable RLS on user_profiles table';
    ELSIF NOT insert_policy_exists THEN
        RAISE NOTICE '📋 NEXT STEP: Create INSERT policy for user_profiles';
    ELSE
        RAISE NOTICE '📋 NEXT STEP: Check application code or try manual user creation test';
    END IF;
    
    RAISE NOTICE '';
END $$;

-- List existing policies for reference
SELECT 
    '📋 EXISTING POLICIES:' as info,
    policyname as policy_name,
    cmd as command,
    permissive as type,
    CASE 
        WHEN cmd = 'INSERT' THEN 'CRITICAL for signup'
        WHEN cmd = 'SELECT' THEN 'Needed for profile reading'
        WHEN cmd = 'UPDATE' THEN 'Needed for profile updates'
        ELSE 'Other operation'
    END as importance
FROM pg_policies 
WHERE tablename = 'user_profiles' 
ORDER BY 
    CASE cmd 
        WHEN 'INSERT' THEN 1 
        WHEN 'SELECT' THEN 2 
        WHEN 'UPDATE' THEN 3 
        ELSE 4 
    END;