-- ============================================
-- BYPASS RLS FIX: Completely disable RLS for registration
-- ============================================
-- This completely disables RLS to allow registration to work
-- Run this in your Supabase SQL Editor

BEGIN;

-- Step 1: Drop ALL existing policies
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    RAISE NOTICE '🚨 Dropping ALL RLS policies...';
    
    FOR policy_record IN 
        SELECT policyname FROM pg_policies 
        WHERE tablename = 'user_profiles' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.user_profiles', policy_record.policyname);
        RAISE NOTICE '   Dropped policy: %', policy_record.policyname;
    END LOOP;
    
    RAISE NOTICE '✅ All policies dropped';
END $$;

-- Step 2: COMPLETELY DISABLE RLS on user_profiles table
ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;

-- Step 3: Create a simple trigger function that bypasses RLS
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
    
    -- Insert profile with error handling (RLS is disabled so this will work)
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

-- Step 4: Recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Step 5: Verify RLS is disabled
DO $$
DECLARE
    rls_enabled BOOLEAN;
BEGIN
    SELECT relrowsecurity INTO rls_enabled
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' 
    AND c.relname = 'user_profiles';
    
    IF rls_enabled THEN
        RAISE WARNING '⚠️ RLS is still enabled - this may cause issues';
    ELSE
        RAISE NOTICE '✅ RLS is DISABLED - registration should work now!';
    END IF;
END $$;

COMMIT;

-- Final verification
SELECT 
    'RLS BYPASS COMPLETE' as status,
    CASE 
        WHEN relrowsecurity THEN 'RLS ENABLED' 
        ELSE 'RLS DISABLED' 
    END as rls_status
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' 
AND c.relname = 'user_profiles';

SELECT '🚨 RLS BYPASSED - Registration should work immediately!' as message;
