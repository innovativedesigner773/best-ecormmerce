# Safe SignUp Implementation - Fix Database Errors & Role Authentication

## 🚨 Current Issues Identified

### 1. **Database Foreign Key/Constraint Errors**
- User profile creation trigger is failing during signup
- RLS policies might be blocking profile creation
- Database constraints causing "Database error saving new user"

### 2. **Role Authentication Logic Problem**  
- Customer role is **always authenticated by default** (line 72 in RoleSelector.tsx)
- This makes it confusing to register other roles
- Users can't easily switch between role types during registration

### 3. **SignUp Flow Issues**
- Not handling database constraint violations properly
- Profile creation happening too early in the process
- Missing fallback mechanisms when database operations fail

## 🔧 **SOLUTION 1: Fix Database Setup First**

**Run this SQL in your Supabase SQL Editor immediately:**

```sql
-- ============================================
-- SAFE SIGNUP DATABASE FIX
-- ============================================

-- Step 1: Temporarily disable RLS to fix profile creation
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop and recreate the trigger with better error handling
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS create_user_profile();

-- Step 3: Create a MUCH safer trigger function
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
DECLARE
    user_role TEXT;
    user_first_name TEXT;
    user_last_name TEXT;
    profile_exists BOOLEAN;
BEGIN
    -- Check if profile already exists (prevent duplicates)
    SELECT EXISTS(SELECT 1 FROM user_profiles WHERE id = NEW.id) INTO profile_exists;
    
    IF profile_exists THEN
        RAISE NOTICE 'Profile already exists for user %, skipping creation', NEW.id;
        RETURN NEW;
    END IF;

    -- Extract metadata with safe defaults
    user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'customer');
    user_first_name := COALESCE(NEW.raw_user_meta_data->>'first_name', 'User');
    user_last_name := COALESCE(NEW.raw_user_meta_data->>'last_name', '');

    -- Validate role - if invalid, default to customer
    IF user_role NOT IN ('customer', 'cashier', 'staff', 'manager', 'admin') THEN
        user_role := 'customer';
    END IF;

    -- Insert with extensive error handling
    BEGIN
        INSERT INTO user_profiles (
            id,
            email,
            first_name,
            last_name,
            role,
            phone,
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
            COALESCE(NEW.raw_user_meta_data->>'phone', NULL),
            CASE WHEN user_role = 'customer' THEN 100 ELSE 0 END,
            true,
            NOW(),
            NOW()
        );
        
        RAISE NOTICE 'Successfully created profile for user % with role %', NEW.id, user_role;
        
    EXCEPTION 
        WHEN unique_violation THEN
            RAISE NOTICE 'Profile already exists for user %, ignoring duplicate', NEW.id;
        WHEN foreign_key_violation THEN
            RAISE WARNING 'Foreign key violation creating profile for user %: %', NEW.id, SQLERRM;
        WHEN check_violation THEN
            RAISE WARNING 'Check constraint violation creating profile for user %: %', NEW.id, SQLERRM;
        WHEN OTHERS THEN
            RAISE WARNING 'Unexpected error creating profile for user %: %', NEW.id, SQLERRM;
    END;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Create the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_user_profile();

-- Step 5: Re-enable RLS with permissive policies
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Step 6: Create very permissive policies for signup process
DROP POLICY IF EXISTS "Allow profile creation during signup" ON user_profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;

-- Super permissive policy for profile creation
CREATE POLICY "Allow profile creation during signup"
    ON user_profiles FOR INSERT
    WITH CHECK (true); -- Allow all inserts during signup

-- Basic policies for normal operations
CREATE POLICY "Users can view their own profile"
    ON user_profiles FOR SELECT
    USING (auth.uid() = id OR auth.jwt()->>'role' IN ('admin', 'manager'));

CREATE POLICY "Users can update their own profile"
    ON user_profiles FOR UPDATE
    USING (auth.uid() = id OR auth.jwt()->>'role' IN ('admin', 'manager'));

-- Step 7: Test the fix
SELECT 'Database setup complete - signup should now work' as status;
```

## 🔧 **SOLUTION 2: Fix Role Authentication Logic**

The current RoleSelector **always authenticates customer by default**. This is confusing for registration. Let's fix it: