-- ================================
-- UPDATED SQL TRIGGER FOR NEW SCHEMA
-- ================================
-- This matches your database schema changes: userType instead of role, consumer instead of customer

-- Step 1: Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Step 2: Create the updated trigger function with correct field mapping
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
    -- Log trigger execution for debugging
    RAISE NOTICE 'TRIGGER: handle_new_user called for user % (%)', NEW.id, NEW.email;
    
    -- Extract metadata with correct field names from your React component
    user_role := COALESCE(NEW.raw_user_meta_data->>'userType', 'consumer');  -- Changed from 'role' to 'userType'
    user_first_name := COALESCE(NEW.raw_user_meta_data->>'firstName', 'User');  -- Changed from 'first_name' to 'firstName'
    user_last_name := COALESCE(NEW.raw_user_meta_data->>'lastName', '');     -- Changed from 'last_name' to 'lastName'
    user_phone := COALESCE(NEW.raw_user_meta_data->>'phone', NULL);

    -- Validate role (using new values: consumer instead of customer)
    IF user_role NOT IN ('consumer', 'cashier', 'staff', 'manager', 'admin') THEN
        RAISE NOTICE 'TRIGGER: Invalid user type %, defaulting to consumer', user_role;
        user_role := 'consumer';  -- Default to 'consumer' instead of 'customer'
    END IF;

    -- Set loyalty points based on user type
    default_loyalty_points := CASE 
        WHEN user_role = 'consumer' THEN 100  -- Welcome bonus for consumers
        ELSE 0  -- No loyalty points for staff/admin roles
    END;

    -- Insert profile with proper error handling
    BEGIN
        INSERT INTO public.user_profiles (
            id,
            email,
            first_name,
            last_name,
            role,                    -- Database field is still 'role'
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
            user_role,               -- Maps userType from metadata to role in DB
            user_phone,
            '{}'::jsonb,
            '{}'::jsonb,
            default_loyalty_points,
            true,
            NOW(),
            NOW()
        );

        RAISE NOTICE 'TRIGGER: ✅ Profile created for user % with user type % and % loyalty points', 
                     NEW.id, user_role, default_loyalty_points;
        
    EXCEPTION 
        WHEN unique_violation THEN
            RAISE NOTICE 'TRIGGER: Profile already exists for user %, skipping', NEW.id;
        WHEN foreign_key_violation THEN
            RAISE WARNING 'TRIGGER: Foreign key violation creating profile for user %: %', NEW.id, SQLERRM;
            -- Re-raise to prevent auth user creation if profile creation fails
            RAISE;
        WHEN check_violation THEN
            RAISE WARNING 'TRIGGER: Check constraint violation for user %: %', NEW.id, SQLERRM;
            -- Re-raise to prevent invalid data
            RAISE;
        WHEN OTHERS THEN
            RAISE WARNING 'TRIGGER: Unexpected error creating profile for user %: % (SQLSTATE: %)', NEW.id, SQLERRM, SQLSTATE;
            -- Re-raise to prevent auth user creation if profile creation fails
            RAISE;
    END;

    RETURN NEW;
END;
$$;

-- Step 3: Create the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Step 4: Verify the setup
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🔧 ============================================';
    RAISE NOTICE '🔧 TRIGGER UPDATE COMPLETED';
    RAISE NOTICE '🔧 ============================================';
    RAISE NOTICE '';
    RAISE NOTICE '📋 FIELD MAPPINGS:';
    RAISE NOTICE '   React Component -> Database';
    RAISE NOTICE '   userType -> role';
    RAISE NOTICE '   firstName -> first_name';
    RAISE NOTICE '   lastName -> last_name';
    RAISE NOTICE '   consumer -> consumer (in role field)';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Trigger function updated with correct field mappings';
    RAISE NOTICE '✅ Trigger created and active';
    RAISE NOTICE '✅ Ready for registration testing!';
    RAISE NOTICE '';
END $$;

-- Step 5: Test the field mapping manually (optional)
-- Uncomment this section to test the trigger with your exact metadata format
/*
DO $$
DECLARE
    test_user_id UUID := gen_random_uuid();
    test_email TEXT := 'trigger-test-' || extract(epoch from now()) || '@example.com';
    profile_created BOOLEAN := false;
BEGIN
    -- Test the trigger with your exact metadata format
    RAISE NOTICE 'Testing trigger with metadata format from your React component...';
    
    BEGIN
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
            NOW()
        );
        
        -- Check if profile was created
        SELECT EXISTS(
            SELECT 1 FROM public.user_profiles 
            WHERE id = test_user_id AND role = 'consumer'
        ) INTO profile_created;
        
        IF profile_created THEN
            RAISE NOTICE '✅ Trigger test PASSED - Profile created with correct mapping';
        ELSE
            RAISE WARNING '❌ Trigger test FAILED - Profile not created or incorrect mapping';
        END IF;
        
        -- Always rollback the test
        RAISE EXCEPTION 'Test complete - rolling back';
        
    EXCEPTION 
        WHEN OTHERS THEN
            IF SQLERRM != 'Test complete - rolling back' THEN
                RAISE WARNING 'Trigger test error: %', SQLERRM;
            END IF;
    END;
END $$;
*/

-- Verification query
SELECT 
    'VERIFICATION' as component,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'on_auth_user_created') 
        THEN '✅ Trigger exists' 
        ELSE '❌ Trigger missing' 
    END as trigger_status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'handle_new_user') 
        THEN '✅ Function exists' 
        ELSE '❌ Function missing' 
    END as function_status;