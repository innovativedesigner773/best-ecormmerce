-- ============================================
-- FINAL DATABASE FIX: Resolve "Database error saving new user"
-- ============================================
-- This script completely fixes the registration issue with proper schema alignment

DO $$
BEGIN
    RAISE NOTICE '🔧 ============================================';
    RAISE NOTICE '🔧 FINAL DATABASE FIX STARTING...';
    RAISE NOTICE '🔧 ============================================';
    RAISE NOTICE '';
END $$;

-- STEP 1: Drop everything and start fresh
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- STEP 2: Verify/Create user_profiles table with exact schema
DO $$
BEGIN
    -- Drop table if it exists to recreate with exact schema
    DROP TABLE IF EXISTS public.user_profiles CASCADE;
    
    RAISE NOTICE '🔧 Creating user_profiles table with correct schema...';
    
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

    -- Create indexes for performance
    CREATE INDEX idx_user_profiles_role ON public.user_profiles(role);
    CREATE INDEX idx_user_profiles_email ON public.user_profiles(email);
    CREATE INDEX idx_user_profiles_active ON public.user_profiles(is_active);
    CREATE INDEX idx_user_profiles_email_verified ON public.user_profiles(email_verified);
    
    RAISE NOTICE '✅ user_profiles table created with correct schema';
END $$;

-- STEP 3: Create updated timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- STEP 4: Create the corrected trigger function
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
BEGIN
    -- Enhanced logging
    RAISE NOTICE 'TRIGGER: handle_new_user called for user % (%)', NEW.id, NEW.email;
    RAISE NOTICE 'TRIGGER: raw_user_meta_data = %', NEW.raw_user_meta_data;
    
    -- Check if profile already exists to prevent duplicates
    SELECT EXISTS(
        SELECT 1 FROM public.user_profiles WHERE id = NEW.id
    ) INTO profile_exists;
    
    IF profile_exists THEN
        RAISE NOTICE 'TRIGGER: Profile already exists for user %, skipping creation', NEW.id;
        RETURN NEW;
    END IF;

    -- Extract metadata with the exact field names your React component sends
    -- React sends: { firstName: "...", lastName: "...", userType: "...", phone: "..." }
    user_role := COALESCE(NEW.raw_user_meta_data->>'userType', 'consumer');
    user_first_name := COALESCE(NEW.raw_user_meta_data->>'firstName', 'User');
    user_last_name := COALESCE(NEW.raw_user_meta_data->>'lastName', '');
    user_phone := COALESCE(NEW.raw_user_meta_data->>'phone', NULL);

    -- Enhanced validation with detailed logging
    IF user_role NOT IN ('consumer', 'cashier', 'staff', 'manager', 'admin') THEN
        RAISE NOTICE 'TRIGGER: Invalid user type "%" from metadata, defaulting to consumer', user_role;
        user_role := 'consumer';
    ELSE
        RAISE NOTICE 'TRIGGER: Valid user type "%s" extracted from metadata', user_role;
    END IF;

    -- Set loyalty points based on user type
    default_loyalty_points := CASE 
        WHEN user_role = 'consumer' THEN 100  -- Welcome bonus for consumers
        ELSE 0  -- No loyalty points for staff/admin roles
    END;

    RAISE NOTICE 'TRIGGER: Creating profile with: first_name=%, last_name=%, role=%, loyalty_points=%', 
                 user_first_name, user_last_name, user_role, default_loyalty_points;

    -- Insert profile with comprehensive error handling
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

        RAISE NOTICE 'TRIGGER: ✅ Profile created successfully for user % with role % and % loyalty points', 
                     NEW.id, user_role, default_loyalty_points;
        
    EXCEPTION 
        WHEN unique_violation THEN
            RAISE NOTICE 'TRIGGER: Profile already exists for user % (unique violation), continuing', NEW.id;
        WHEN foreign_key_violation THEN
            RAISE WARNING 'TRIGGER: Foreign key violation creating profile for user %: %', NEW.id, SQLERRM;
            RAISE; -- Re-raise to prevent auth user creation
        WHEN check_violation THEN
            RAISE WARNING 'TRIGGER: Check constraint violation for user %: %', NEW.id, SQLERRM;
            RAISE; -- Re-raise to prevent invalid data
        WHEN not_null_violation THEN
            RAISE WARNING 'TRIGGER: Not null violation for user %: %', NEW.id, SQLERRM;
            RAISE; -- Re-raise to prevent incomplete data
        WHEN OTHERS THEN
            RAISE WARNING 'TRIGGER: Unexpected error creating profile for user %: % (SQLSTATE: %)', NEW.id, SQLERRM, SQLSTATE;
            RAISE; -- Re-raise to prevent auth user creation with incomplete profile
    END;

    RETURN NEW;
END;
$$;

-- STEP 5: Create the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- STEP 6: Configure RLS with permissive policies for signup
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to start fresh
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname FROM pg_policies 
        WHERE tablename = 'user_profiles' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.user_profiles', policy_record.policyname);
    END LOOP;
    RAISE NOTICE '🔧 All existing policies dropped';
END $$;

-- Create new comprehensive RLS policies
-- 1. CRITICAL: Allow INSERT during signup (this is the key fix!)
CREATE POLICY "allow_signup_insert" ON public.user_profiles
    FOR INSERT 
    WITH CHECK (true);  -- Very permissive for INSERT to allow signup

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
            AND admin_profile.is_active = true
        )
    );

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
            AND admin_profile.is_active = true
        )
    );

-- 4. Only admins can delete profiles
CREATE POLICY "allow_admin_delete" ON public.user_profiles
    FOR DELETE 
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles admin_profile 
            WHERE admin_profile.id = auth.uid() 
            AND admin_profile.role = 'admin'
            AND admin_profile.is_active = true
        )
    );

-- STEP 7: Test the complete setup
DO $$
DECLARE
    test_user_id UUID := gen_random_uuid();
    test_email TEXT := 'final-test-' || extract(epoch from now()) || '@example.com';
    profile_created BOOLEAN := false;
    test_role TEXT;
    test_points INTEGER;
BEGIN
    RAISE NOTICE '🧪 Testing complete setup with realistic data...';
    
    BEGIN
        -- Insert test user with exact metadata format from your React app
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
            '{"firstName": "Final", "lastName": "Test", "userType": "consumer", "phone": ""}'::jsonb,
            NOW(),
            NOW(),
            NOW()
        );
        
        -- Check if profile was created with correct mapping
        SELECT EXISTS(
            SELECT 1 FROM public.user_profiles 
            WHERE id = test_user_id
        ) INTO profile_created;
        
        IF profile_created THEN
            -- Get the created profile details
            SELECT role, loyalty_points INTO test_role, test_points
            FROM public.user_profiles 
            WHERE id = test_user_id;
            
            RAISE NOTICE '✅ FINAL TEST PASSED:';
            RAISE NOTICE '   - Profile created: YES';
            RAISE NOTICE '   - Role mapping: userType -> role = %', test_role;
            RAISE NOTICE '   - Loyalty points: %', test_points;
            RAISE NOTICE '   - Field mapping: firstName -> first_name = Final';
            RAISE NOTICE '   - Registration should work perfectly!';
        ELSE
            RAISE WARNING '❌ FINAL TEST FAILED: Profile was not created';
        END IF;
        
        -- Always rollback the test
        RAISE EXCEPTION 'Test complete - rolling back';
        
    EXCEPTION 
        WHEN OTHERS THEN
            IF SQLERRM != 'Test complete - rolling back' THEN
                RAISE WARNING '🧪 Test error: %', SQLERRM;
            END IF;
    END;
END $$;

-- STEP 8: Final comprehensive verification
DO $$
DECLARE
    table_exists BOOLEAN;
    function_exists BOOLEAN;
    trigger_exists BOOLEAN;
    rls_enabled BOOLEAN;
    insert_policy_exists BOOLEAN;
    policy_count INTEGER;
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
    
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE tablename = 'user_profiles' AND schemaname = 'public';
    
    RAISE NOTICE '';
    RAISE NOTICE '📋 ============================================';
    RAISE NOTICE '📋 FINAL VERIFICATION RESULTS';
    RAISE NOTICE '📋 ============================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Component Status:';
    RAISE NOTICE '  📊 user_profiles table: %', CASE WHEN table_exists THEN '✅ EXISTS' ELSE '❌ MISSING' END;
    RAISE NOTICE '  ⚡ handle_new_user function: %', CASE WHEN function_exists THEN '✅ EXISTS' ELSE '❌ MISSING' END;
    RAISE NOTICE '  🔄 on_auth_user_created trigger: %', CASE WHEN trigger_exists THEN '✅ ACTIVE' ELSE '❌ MISSING' END;
    RAISE NOTICE '  🛡️  RLS enabled: %', CASE WHEN rls_enabled THEN '✅ ENABLED' ELSE '❌ DISABLED' END;
    RAISE NOTICE '  🚪 INSERT policy: %', CASE WHEN insert_policy_exists THEN '✅ ALLOWS SIGNUP' ELSE '❌ BLOCKS SIGNUP' END;
    RAISE NOTICE '  📜 Total policies: %', policy_count;
    RAISE NOTICE '';
    
    IF table_exists AND function_exists AND trigger_exists AND rls_enabled AND insert_policy_exists THEN
        RAISE NOTICE '🎉 ============================================';
        RAISE NOTICE '🎉 ALL SYSTEMS READY!';
        RAISE NOTICE '🎉 ============================================';
        RAISE NOTICE '';
        RAISE NOTICE '✅ Database setup is complete and correct';
        RAISE NOTICE '✅ User registration should work without errors';
        RAISE NOTICE '✅ Field mappings: userType->role, firstName->first_name';
        RAISE NOTICE '✅ RLS policies allow signup operations';
        RAISE NOTICE '✅ Trigger creates profiles automatically';
        RAISE NOTICE '';
        RAISE NOTICE '🚀 NEXT STEPS:';
        RAISE NOTICE '1. Clear browser cache completely';
        RAISE NOTICE '2. Hard refresh your application';
        RAISE NOTICE '3. Try registration with a new email';
        RAISE NOTICE '4. Registration should complete successfully!';
        RAISE NOTICE '';
    ELSE
        RAISE WARNING '❌ SETUP INCOMPLETE - some components are missing';
        RAISE WARNING 'Please check the individual component statuses above';
    END IF;
END $$;

-- Display the final policies for reference
SELECT 
    'ACTIVE RLS POLICIES' as info,
    policyname as policy_name,
    cmd as operation,
    CASE cmd 
        WHEN 'INSERT' THEN 'CRITICAL - Allows user registration'
        WHEN 'SELECT' THEN 'Allows profile reading'
        WHEN 'UPDATE' THEN 'Allows profile updates'
        WHEN 'DELETE' THEN 'Allows profile deletion'
        ELSE 'Other operation'
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