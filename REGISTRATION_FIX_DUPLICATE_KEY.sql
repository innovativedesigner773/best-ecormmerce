-- ============================================
-- FIX DUPLICATE KEY CONSTRAINT ERROR
-- ============================================
-- This fixes the "duplicate key value violates unique constraint" error
-- Run this in your Supabase SQL Editor

BEGIN;

-- Step 1: Check if there are duplicate profiles
DO $$
DECLARE
    duplicate_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO duplicate_count
    FROM user_profiles 
    WHERE email IN (
        SELECT email 
        FROM user_profiles 
        GROUP BY email 
        HAVING COUNT(*) > 1
    );
    
    IF duplicate_count > 0 THEN
        RAISE NOTICE '⚠️ Found % duplicate profiles - cleaning up...', duplicate_count;
        
        -- Keep the oldest profile for each email
        DELETE FROM user_profiles 
        WHERE id NOT IN (
            SELECT DISTINCT ON (email) id 
            FROM user_profiles 
            ORDER BY email, created_at ASC
        );
        
        RAISE NOTICE '✅ Duplicate profiles cleaned up';
    ELSE
        RAISE NOTICE '✅ No duplicate profiles found';
    END IF;
END $$;

-- Step 2: Ensure the trigger function handles duplicates properly
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
    existing_profile_id TEXT;
BEGIN
    -- Check if profile already exists
    SELECT id INTO existing_profile_id
    FROM public.user_profiles 
    WHERE id = NEW.id;
    
    IF existing_profile_id IS NOT NULL THEN
        RAISE NOTICE 'Profile already exists for user %, skipping', NEW.id;
        RETURN NEW;
    END IF;
    
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
    
    -- Insert profile with proper error handling
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

-- Step 3: Recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Step 4: Verify the setup
DO $$
DECLARE
    profile_count INTEGER;
    trigger_exists BOOLEAN;
BEGIN
    -- Check profile count
    SELECT COUNT(*) INTO profile_count FROM user_profiles;
    RAISE NOTICE '📊 Total profiles in database: %', profile_count;
    
    -- Check if trigger exists
    SELECT EXISTS(
        SELECT 1 FROM pg_trigger t
        JOIN pg_class c ON c.oid = t.tgrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'auth' 
        AND c.relname = 'users'
        AND t.tgname = 'on_auth_user_created'
    ) INTO trigger_exists;
    
    IF trigger_exists THEN
        RAISE NOTICE '✅ Trigger exists and is active';
    ELSE
        RAISE WARNING '⚠️ Trigger not found';
    END IF;
END $$;

COMMIT;

-- Final verification
SELECT 
    'DUPLICATE KEY FIX COMPLETE' as status,
    COUNT(*) as total_profiles
FROM user_profiles;

SELECT '🔧 Duplicate key constraint fixed - Registration should work now!' as message;
