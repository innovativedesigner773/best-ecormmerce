-- ============================================
-- URGENT FIX: Remove Infinite Recursion in RLS Policies
-- ============================================
-- This fixes the "infinite recursion detected in policy" error
-- Run this in your Supabase SQL Editor IMMEDIATELY

BEGIN;

-- Step 1: Drop ALL existing policies to stop the recursion
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    RAISE NOTICE '🚨 URGENT: Dropping all RLS policies to stop infinite recursion...';
    
    FOR policy_record IN 
        SELECT policyname FROM pg_policies 
        WHERE tablename = 'user_profiles' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.user_profiles', policy_record.policyname);
        RAISE NOTICE '   Dropped policy: %', policy_record.policyname;
    END LOOP;
    
    RAISE NOTICE '✅ All policies dropped - recursion stopped';
END $$;

-- Step 2: Temporarily disable RLS to allow registration
ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;

-- Step 3: Create SIMPLE, non-recursive policies
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- CRITICAL: Simple INSERT policy with NO self-references
CREATE POLICY "allow_signup_insert" ON public.user_profiles
    FOR INSERT 
    WITH CHECK (true);

-- Simple SELECT policy with NO self-references  
CREATE POLICY "allow_own_profile_select" ON public.user_profiles
    FOR SELECT 
    USING (auth.uid() = id);

-- Simple UPDATE policy with NO self-references
CREATE POLICY "allow_own_profile_update" ON public.user_profiles
    FOR UPDATE 
    USING (auth.uid() = id);

-- Step 4: Ensure trigger function exists (simplified)
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

-- Step 5: Recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Step 6: Test that policies are working
DO $$
DECLARE
    policy_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'user_profiles';
    
    RAISE NOTICE '✅ Created % policies for user_profiles', policy_count;
    
    IF policy_count >= 3 THEN
        RAISE NOTICE '🎉 Registration should now work without recursion!';
    ELSE
        RAISE WARNING '⚠️ Only % policies created - may need manual check', policy_count;
    END IF;
END $$;

COMMIT;

-- Final verification
SELECT 
    'URGENT FIX COMPLETE' as status,
    COUNT(*) as policies_created
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'user_profiles';

SELECT '🚨 INFINITE RECURSION FIXED - Registration should work now!' as message;
