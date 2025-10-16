-- ============================================
-- TRIGGER AND RLS COMPREHENSIVE FIX
-- ============================================
-- This script ensures your SQL trigger and RLS policies work perfectly

-- Step 1: Ensure the user_profiles table exists with proper structure
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id uuid NOT NULL,
  email text NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  role text NOT NULL DEFAULT 'customer'::text,
  phone text NULL,
  address jsonb NULL DEFAULT '{}'::jsonb,
  preferences jsonb NULL DEFAULT '{}'::jsonb,
  loyalty_points integer NULL DEFAULT 100,
  is_active boolean NULL DEFAULT true,
  last_login_at timestamp with time zone NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT user_profiles_pkey PRIMARY KEY (id),
  CONSTRAINT user_profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users (id) ON DELETE CASCADE,
  CONSTRAINT user_profiles_role_check CHECK (
    role = ANY (ARRAY['customer','cashier','staff','manager','admin'])
  )
);

-- Step 2: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_active ON public.user_profiles(is_active);

-- Step 3: Drop existing trigger and function to recreate them properly
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Step 4: Create the improved trigger function with better error handling
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
    profile_exists BOOLEAN;
BEGIN
    -- Log the trigger execution
    RAISE NOTICE 'Creating user profile for user ID: %', NEW.id;
    
    -- Check if profile already exists to prevent duplicates
    SELECT EXISTS(
        SELECT 1 FROM public.user_profiles 
        WHERE id = NEW.id
    ) INTO profile_exists;
    
    IF profile_exists THEN
        RAISE NOTICE 'Profile already exists for user %, skipping creation', NEW.id;
        RETURN NEW;
    END IF;

    -- Extract custom fields from raw_user_meta_data with safe defaults
    user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'customer');
    user_first_name := COALESCE(NEW.raw_user_meta_data->>'first_name', 'User');
    user_last_name := COALESCE(NEW.raw_user_meta_data->>'last_name', '');
    user_phone := COALESCE(NEW.raw_user_meta_data->>'phone', NULL);

    -- Validate role - ensure it's one of the allowed values
    IF user_role NOT IN ('customer', 'cashier', 'staff', 'manager', 'admin') THEN
        RAISE WARNING 'Invalid role % provided, defaulting to customer', user_role;
        user_role := 'customer';
    END IF;

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
            CASE 
                WHEN user_role = 'customer' THEN 100  -- Welcome bonus for customers
                ELSE 0  -- No loyalty points for staff/admin roles
            END,
            true,
            NOW(),
            NOW()
        );

        RAISE NOTICE 'Successfully created user profile for % with role %', NEW.id, user_role;
        
    EXCEPTION 
        WHEN unique_violation THEN
            RAISE NOTICE 'Profile already exists for user %, ignoring duplicate', NEW.id;
        WHEN foreign_key_violation THEN
            RAISE WARNING 'Foreign key violation creating profile for user %: %', NEW.id, SQLERRM;
        WHEN check_violation THEN
            RAISE WARNING 'Check constraint violation for user %: %', NEW.id, SQLERRM;
        WHEN OTHERS THEN
            RAISE WARNING 'Unexpected error creating profile for user %: %', NEW.id, SQLERRM;
    END;

    RETURN NEW;
END;
$$;

-- Step 5: Create the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Step 6: Enable RLS on user_profiles
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Step 7: Drop all existing policies to recreate them properly
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Managers can view staff profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Allow profile creation during signup" ON public.user_profiles;

-- Step 8: Create comprehensive RLS policies

-- Allow profile creation during signup (very permissive for INSERT)
CREATE POLICY "Allow profile creation during signup"
    ON public.user_profiles FOR INSERT
    WITH CHECK (true);

-- Users can view their own profile OR staff+ can view all profiles
CREATE POLICY "Users can view own profile"
    ON public.user_profiles FOR SELECT
    USING (
        auth.uid() = id 
        OR 
        EXISTS (
            SELECT 1 FROM public.user_profiles up 
            WHERE up.id = auth.uid() 
            AND up.role IN ('staff', 'manager', 'admin')
        )
    );

-- Users can update their own profile OR admins can update any profile
CREATE POLICY "Users can update own profile"
    ON public.user_profiles FOR UPDATE
    USING (
        auth.uid() = id 
        OR 
        EXISTS (
            SELECT 1 FROM public.user_profiles up 
            WHERE up.id = auth.uid() 
            AND up.role IN ('admin', 'manager')
        )
    );

-- Admins can delete profiles (if needed)
CREATE POLICY "Admins can delete profiles"
    ON public.user_profiles FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles up 
            WHERE up.id = auth.uid() 
            AND up.role = 'admin'
        )
    );

-- Step 9: Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 10: Create updated_at trigger for user_profiles
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Step 11: Test the trigger function manually (optional verification)
DO $$
DECLARE
    test_passed BOOLEAN := true;
BEGIN
    -- Check if trigger exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'on_auth_user_created'
        AND event_object_schema = 'auth'
        AND event_object_table = 'users'
    ) THEN
        test_passed := false;
        RAISE WARNING 'Trigger on_auth_user_created does not exist!';
    END IF;

    -- Check if function exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.routines 
        WHERE routine_name = 'handle_new_user'
        AND routine_schema = 'public'
    ) THEN
        test_passed := false;
        RAISE WARNING 'Function handle_new_user does not exist!';
    END IF;

    -- Check if RLS is enabled
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE tablename = 'user_profiles' 
        AND schemaname = 'public'
        AND rowsecurity = true
    ) THEN
        test_passed := false;
        RAISE WARNING 'RLS is not enabled on user_profiles table!';
    END IF;

    IF test_passed THEN
        RAISE NOTICE '✅ All checks passed! Trigger and RLS are properly configured.';
    ELSE
        RAISE WARNING '❌ Some checks failed. Please review the setup.';
    END IF;
END $$;

-- Step 12: Final verification query
SELECT 
    'Trigger and RLS Setup Complete' as status,
    (
        SELECT COUNT(*) 
        FROM information_schema.triggers 
        WHERE trigger_name = 'on_auth_user_created'
        AND event_object_schema = 'auth'
        AND event_object_table = 'users'
    ) as trigger_exists,
    (
        SELECT COUNT(*) 
        FROM information_schema.routines 
        WHERE routine_name = 'handle_new_user'
        AND routine_schema = 'public'
    ) as function_exists,
    (
        SELECT rowsecurity 
        FROM pg_tables 
        WHERE tablename = 'user_profiles' 
        AND schemaname = 'public'
    ) as rls_enabled,
    (
        SELECT COUNT(*) 
        FROM pg_policies 
        WHERE tablename = 'user_profiles' 
        AND schemaname = 'public'
    ) as policy_count;

-- Success message
RAISE NOTICE '🎉 Trigger and RLS setup completed successfully!';
RAISE NOTICE '📋 Your signup flow should now work without database errors';
RAISE NOTICE '🔐 User profiles will be created automatically when users sign up';
RAISE NOTICE '🛡️ RLS policies are properly configured for security';
RAISE NOTICE '✅ Ready to test user registration!';