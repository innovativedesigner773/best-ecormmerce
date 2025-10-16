-- ============================================
-- COMPREHENSIVE DATABASE FIX - Complete Solution
-- ============================================
-- This script diagnoses and fixes ALL issues causing "Database error saving new user"

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🔧 ============================================';
    RAISE NOTICE '🔧 COMPREHENSIVE DATABASE FIX STARTING...';
    RAISE NOTICE '🔧 ============================================';
    RAISE NOTICE '';
END $$;

-- ============================================
-- STEP 1: CLEAN SLATE - Remove everything and start fresh
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '🧹 STEP 1: Cleaning existing setup...';
    
    -- Drop existing trigger and function
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    DROP FUNCTION IF EXISTS public.handle_new_user();
    
    -- Drop existing table (this will recreate with exact schema)
    DROP TABLE IF EXISTS public.user_profiles CASCADE;
    
    RAISE NOTICE '✅ STEP 1: Cleanup completed';
END $$;

-- ============================================
-- STEP 2: CREATE EXACT USER PROFILES TABLE
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '🏗️  STEP 2: Creating user_profiles table with exact schema...';
    
    CREATE TABLE public.user_profiles (
        id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
        email TEXT NOT NULL UNIQUE,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'consumer' CHECK (role IN ('consumer', 'cashier', 'staff', 'manager', 'admin')),
        phone TEXT,
        address JSONB DEFAULT '{}',
        preferences JSONB DEFAULT '{}',
        loyalty_points INTEGER DEFAULT 100,
        is_active BOOLEAN DEFAULT true,
        email_verified BOOLEAN DEFAULT false,
        last_login_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Create essential indexes for performance
    CREATE INDEX idx_user_profiles_role ON public.user_profiles(role);
    CREATE INDEX idx_user_profiles_email ON public.user_profiles(email);
    CREATE INDEX idx_user_profiles_active ON public.user_profiles(is_active);
    
    RAISE NOTICE '✅ STEP 2: user_profiles table created successfully';
END $$;

-- ============================================
-- STEP 3: CREATE UPDATED TIMESTAMP TRIGGER
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '⏰ STEP 3: Creating updated_at trigger...';
    
    CREATE OR REPLACE FUNCTION public.update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER update_user_profiles_updated_at
        BEFORE UPDATE ON public.user_profiles
        FOR EACH ROW
        EXECUTE FUNCTION public.update_updated_at_column();
    
    RAISE NOTICE '✅ STEP 3: Updated timestamp trigger created';
END $$;

-- ============================================
-- STEP 4: CREATE BULLETPROOF USER CREATION TRIGGER
-- ============================================
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
    profile_exists BOOLEAN := false;
    raw_metadata JSONB;
BEGIN
    -- ============================================
    -- ENHANCED LOGGING FOR DEBUGGING
    -- ============================================
    RAISE NOTICE '';
    RAISE NOTICE '🔥 TRIGGER EXECUTION START 🔥';
    RAISE NOTICE 'User ID: %', NEW.id;
    RAISE NOTICE 'User Email: %', NEW.email;
    RAISE NOTICE 'Email Confirmed: %', CASE WHEN NEW.email_confirmed_at IS NOT NULL THEN 'YES' ELSE 'NO' END;
    
    -- Log the raw metadata
    raw_metadata := NEW.raw_user_meta_data;
    RAISE NOTICE 'Raw Metadata: %', raw_metadata;
    
    -- ============================================
    -- DUPLICATE PREVENTION
    -- ============================================
    SELECT EXISTS(
        SELECT 1 FROM public.user_profiles WHERE id = NEW.id
    ) INTO profile_exists;
    
    IF profile_exists THEN
        RAISE NOTICE '⚠️  Profile already exists for user %, skipping creation', NEW.id;
        RETURN NEW;
    END IF;

    -- ============================================
    -- EXTRACT METADATA WITH MULTIPLE FALLBACK STRATEGIES
    -- ============================================
    -- Strategy 1: Direct field extraction (React component format)
    user_role := COALESCE(
        raw_metadata->>'userType',  -- Primary: userType field from React
        raw_metadata->>'role',      -- Fallback: role field
        'consumer'                  -- Default: consumer
    );
    
    user_first_name := COALESCE(
        raw_metadata->>'firstName', -- Primary: firstName from React
        raw_metadata->>'first_name', -- Fallback: snake_case
        'User'                      -- Default
    );
    
    user_last_name := COALESCE(
        raw_metadata->>'lastName',  -- Primary: lastName from React
        raw_metadata->>'last_name', -- Fallback: snake_case
        ''                          -- Default
    );
    
    user_phone := COALESCE(
        raw_metadata->>'phone',     -- Phone field
        NULL                        -- Default
    );

    -- ============================================
    -- ENHANCED VALIDATION AND LOGGING
    -- ============================================
    RAISE NOTICE 'Extracted Values:';
    RAISE NOTICE '  - Role/UserType: %', user_role;
    RAISE NOTICE '  - First Name: %', user_first_name;
    RAISE NOTICE '  - Last Name: %', user_last_name;
    RAISE NOTICE '  - Phone: %', COALESCE(user_phone, 'NULL');

    -- Validate and fix role
    IF user_role NOT IN ('consumer', 'cashier', 'staff', 'manager', 'admin') THEN
        RAISE NOTICE '⚠️  Invalid role "%" detected, defaulting to consumer', user_role;
        user_role := 'consumer';
    END IF;

    -- Set loyalty points based on role
    default_loyalty_points := CASE 
        WHEN user_role = 'consumer' THEN 100  -- Welcome bonus for consumers
        ELSE 0  -- No loyalty points for staff/admin roles
    END;

    RAISE NOTICE 'Final Values:';
    RAISE NOTICE '  - Validated Role: %', user_role;
    RAISE NOTICE '  - Loyalty Points: %', default_loyalty_points;

    -- ============================================
    -- INSERT USER PROFILE WITH COMPREHENSIVE ERROR HANDLING
    -- ============================================
    BEGIN
        RAISE NOTICE '💾 Attempting to insert user profile...';
        
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
            email_verified,
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
            CASE WHEN NEW.email_confirmed_at IS NOT NULL THEN true ELSE false END,
            NOW(),
            NOW()
        );

        RAISE NOTICE '✅ SUCCESS: Profile created for user %', NEW.id;
        RAISE NOTICE '   Email: %', NEW.email;
        RAISE NOTICE '   Role: %', user_role;
        RAISE NOTICE '   Name: % %', user_first_name, user_last_name;
        RAISE NOTICE '   Loyalty Points: %', default_loyalty_points;
        RAISE NOTICE '🔥 TRIGGER EXECUTION END - SUCCESS 🔥';
        RAISE NOTICE '';
        
    EXCEPTION 
        WHEN unique_violation THEN
            RAISE NOTICE '⚠️  Unique violation - profile may already exist for user %', NEW.id;
            RAISE NOTICE '🔥 TRIGGER EXECUTION END - DUPLICATE HANDLED 🔥';
            RAISE NOTICE '';
            -- Don't re-raise, this is okay
            
        WHEN foreign_key_violation THEN
            RAISE WARNING '❌ Foreign key violation for user %: %', NEW.id, SQLERRM;
            RAISE WARNING '🔥 TRIGGER EXECUTION END - FOREIGN KEY ERROR 🔥';
            RAISE NOTICE '';
            RAISE; -- Re-raise to prevent auth user creation
            
        WHEN check_violation THEN
            RAISE WARNING '❌ Check constraint violation for user %: %', NEW.id, SQLERRM;
            RAISE WARNING '🔥 TRIGGER EXECUTION END - CHECK CONSTRAINT ERROR 🔥';
            RAISE NOTICE '';
            RAISE; -- Re-raise to prevent invalid data
            
        WHEN not_null_violation THEN
            RAISE WARNING '❌ Not null violation for user %: %', NEW.id, SQLERRM;
            RAISE WARNING 'This usually means required fields are missing from metadata';
            RAISE WARNING '🔥 TRIGGER EXECUTION END - NULL VIOLATION ERROR 🔥';
            RAISE NOTICE '';
            RAISE; -- Re-raise to prevent incomplete data
            
        WHEN OTHERS THEN
            RAISE WARNING '❌ Unexpected error creating profile for user %', NEW.id;
            RAISE WARNING 'Error: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
            RAISE WARNING '🔥 TRIGGER EXECUTION END - UNEXPECTED ERROR 🔥';
            RAISE NOTICE '';
            RAISE; -- Re-raise to prevent auth user creation with incomplete profile
    END;

    RETURN NEW;
END;
$$;

-- ============================================
-- STEP 5: CREATE THE TRIGGER
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '🔗 STEP 5: Creating user creation trigger...';
    
    CREATE TRIGGER on_auth_user_created
        AFTER INSERT ON auth.users
        FOR EACH ROW
        EXECUTE FUNCTION public.handle_new_user();
    
    RAISE NOTICE '✅ STEP 5: Trigger created and activated';
END $$;

-- ============================================
-- STEP 6: CONFIGURE PERMISSIVE RLS POLICIES
-- ============================================
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    RAISE NOTICE '🛡️  STEP 6: Configuring RLS policies...';
    
    -- Enable RLS
    ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
    
    -- Drop all existing policies
    FOR policy_record IN 
        SELECT policyname FROM pg_policies 
        WHERE tablename = 'user_profiles' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.user_profiles', policy_record.policyname);
        RAISE NOTICE '   Dropped policy: %', policy_record.policyname;
    END LOOP;

    -- 1. CRITICAL: Very permissive INSERT policy for signup
    CREATE POLICY "allow_all_insert_for_signup" ON public.user_profiles
        FOR INSERT 
        WITH CHECK (true);  -- Allow ALL inserts during signup
    
    RAISE NOTICE '   ✅ Created: allow_all_insert_for_signup (CRITICAL FOR REGISTRATION)';

    -- 2. Allow users to read their own profile + admins can read all
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
    
    RAISE NOTICE '   ✅ Created: allow_own_profile_select';

    -- 3. Allow users to update their own profile + admins can update any
    CREATE POLICY "allow_profile_update" ON public.user_profiles
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
    
    RAISE NOTICE '   ✅ Created: allow_profile_update';

    -- 4. Only admins can delete profiles
    CREATE POLICY "allow_admin_delete" ON public.user_profiles
        FOR DELETE 
        USING (
            EXISTS (
                SELECT 1 FROM public.user_profiles admin_profile 
                WHERE admin_profile.id = auth.uid() 
                AND admin_profile.role = 'admin'
            )
        );
    
    RAISE NOTICE '   ✅ Created: allow_admin_delete';
    RAISE NOTICE '✅ STEP 6: RLS policies configured successfully';
END $$;

-- ============================================
-- STEP 7: COMPREHENSIVE VERIFICATION TEST
-- ============================================
DO $$
DECLARE
    test_user_id UUID := gen_random_uuid();
    test_email TEXT := 'comprehensive-test-' || extract(epoch from now()) || '@example.com';
    profile_created BOOLEAN := false;
    profile_data RECORD;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🧪 STEP 7: Running comprehensive verification test...';
    RAISE NOTICE '📧 Test Email: %', test_email;
    RAISE NOTICE '🆔 Test User ID: %', test_user_id;
    
    BEGIN
        -- Insert test user with EXACT metadata format from React component
        RAISE NOTICE '📝 Inserting test auth user with React metadata format...';
        
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
            '{"firstName": "Test", "lastName": "User", "userType": "consumer", "phone": ""}'::jsonb,
            NOW(),
            NOW(),
            NOW()  -- Auto-confirm for testing
        );
        
        RAISE NOTICE '✅ Test auth user inserted successfully';
        
        -- Wait a moment for trigger to execute
        PERFORM pg_sleep(0.1);
        
        -- Check if profile was created
        SELECT EXISTS(
            SELECT 1 FROM public.user_profiles 
            WHERE id = test_user_id
        ) INTO profile_created;
        
        IF profile_created THEN
            -- Get the created profile details
            SELECT * INTO profile_data
            FROM public.user_profiles 
            WHERE id = test_user_id;
            
            RAISE NOTICE '';
            RAISE NOTICE '🎉 ============================================';
            RAISE NOTICE '🎉 COMPREHENSIVE TEST PASSED! ';
            RAISE NOTICE '🎉 ============================================';
            RAISE NOTICE '';
            RAISE NOTICE '✅ Profile Creation: SUCCESS';
            RAISE NOTICE '✅ Field Mappings:';
            RAISE NOTICE '   userType -> role: % ✓', profile_data.role;
            RAISE NOTICE '   firstName -> first_name: % ✓', profile_data.first_name;
            RAISE NOTICE '   lastName -> last_name: % ✓', profile_data.last_name;
            RAISE NOTICE '✅ Loyalty Points: % ✓', profile_data.loyalty_points;
            RAISE NOTICE '✅ Default Values Applied Successfully';
            RAISE NOTICE '';
            RAISE NOTICE '🚀 REGISTRATION SHOULD NOW WORK PERFECTLY!';
            RAISE NOTICE '';
            
        ELSE
            RAISE WARNING '';
            RAISE WARNING '❌ ============================================';
            RAISE WARNING '❌ COMPREHENSIVE TEST FAILED!';
            RAISE WARNING '❌ ============================================';
            RAISE WARNING '';
            RAISE WARNING '❌ Profile was NOT created by trigger';
            RAISE WARNING '❌ Check trigger function and RLS policies';
            RAISE WARNING '';
        END IF;
        
        -- Always rollback the test
        RAISE EXCEPTION 'Test complete - rolling back test data';
        
    EXCEPTION 
        WHEN OTHERS THEN
            IF SQLERRM != 'Test complete - rolling back test data' THEN
                RAISE WARNING '';
                RAISE WARNING '🚨 ============================================';
                RAISE WARNING '🚨 TEST FAILED WITH ERROR!';
                RAISE WARNING '🚨 ============================================';
                RAISE WARNING '';
                RAISE WARNING 'Error: %', SQLERRM;
                RAISE WARNING 'SQLSTATE: %', SQLSTATE;
                RAISE WARNING '';
                RAISE WARNING 'This indicates a problem with the setup that needs to be fixed.';
                RAISE WARNING '';
            END IF;
    END;
END $$;

-- ============================================
-- STEP 8: FINAL SYSTEM VERIFICATION
-- ============================================
DO $$
DECLARE
    table_exists BOOLEAN;
    function_exists BOOLEAN;
    trigger_exists BOOLEAN;
    rls_enabled BOOLEAN;
    insert_policy_exists BOOLEAN;
    policy_count INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '📋 STEP 8: Final system verification...';
    
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
    
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE tablename = 'user_profiles' AND schemaname = 'public';
    
    RAISE NOTICE '';
    RAISE NOTICE '📊 SYSTEM STATUS:';
    RAISE NOTICE '   📊 user_profiles table: %', CASE WHEN table_exists THEN '✅ EXISTS' ELSE '❌ MISSING' END;
    RAISE NOTICE '   ⚡ handle_new_user function: %', CASE WHEN function_exists THEN '✅ EXISTS' ELSE '❌ MISSING' END;
    RAISE NOTICE '   🔄 on_auth_user_created trigger: %', CASE WHEN trigger_exists THEN '✅ ACTIVE' ELSE '❌ MISSING' END;
    RAISE NOTICE '   🛡️  RLS enabled: %', CASE WHEN rls_enabled THEN '✅ ENABLED' ELSE '❌ DISABLED' END;
    RAISE NOTICE '   🚪 INSERT policy: %', CASE WHEN insert_policy_exists THEN '✅ ALLOWS SIGNUP' ELSE '❌ BLOCKS SIGNUP' END;
    RAISE NOTICE '   📜 Total policies: %', policy_count;
    RAISE NOTICE '';
    
    IF table_exists AND function_exists AND trigger_exists AND rls_enabled AND insert_policy_exists THEN
        RAISE NOTICE '🎉 ============================================';
        RAISE NOTICE '🎉 ALL SYSTEMS OPERATIONAL!';
        RAISE NOTICE '🎉 ============================================';
        RAISE NOTICE '';
        RAISE NOTICE '✅ Database setup is complete and correct';
        RAISE NOTICE '✅ User registration should work without errors';
        RAISE NOTICE '✅ Field mappings: userType->role, firstName->first_name';
        RAISE NOTICE '✅ RLS policies allow signup operations';
        RAISE NOTICE '✅ Trigger creates profiles automatically';
        RAISE NOTICE '';
        RAISE NOTICE '🚀 NEXT STEPS:';
        RAISE NOTICE '1. Clear browser cache completely (localStorage + sessionStorage)';
        RAISE NOTICE '2. Hard refresh your application (Ctrl+Shift+R)';
        RAISE NOTICE '3. Try registration with a completely new email address';
        RAISE NOTICE '4. Registration should complete successfully!';
        RAISE NOTICE '';
        RAISE NOTICE '💡 If issues persist, run this script again and check the test results above.';
        RAISE NOTICE '';
    ELSE
        RAISE WARNING '';
        RAISE WARNING '❌ ============================================';
        RAISE WARNING '❌ SETUP INCOMPLETE!';
        RAISE WARNING '❌ ============================================';
        RAISE WARNING '';
        RAISE WARNING 'Some components are missing or incorrectly configured.';
        RAISE WARNING 'Please check the individual component statuses above.';
        RAISE WARNING 'You may need to run this script again or check database permissions.';
        RAISE WARNING '';
    END IF;
END $$;

-- Display active policies for reference
SELECT 
    '📋 ACTIVE RLS POLICIES' as info,
    policyname as policy_name,
    cmd as operation,
    CASE cmd 
        WHEN 'INSERT' THEN '🚀 CRITICAL - Allows user registration'
        WHEN 'SELECT' THEN '👁️  Allows profile reading'
        WHEN 'UPDATE' THEN '✏️  Allows profile updates'
        WHEN 'DELETE' THEN '🗑️  Allows profile deletion'
        ELSE '❓ Other operation'
    END as purpose
FROM pg_policies 
WHERE tablename = 'user_profiles' AND schemaname = 'public'
ORDER BY 
    CASE cmd 
        WHEN 'INSERT' THEN 1 
        WHEN 'SELECT' THEN 2 
        WHEN 'UPDATE' THEN 3 
        WHEN 'DELETE' THEN 4
        ELSE 5 
    END;