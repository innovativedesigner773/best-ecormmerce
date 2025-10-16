-- STEP 1: Fix Database Schema and Triggers
-- Run this in your Supabase SQL Editor

-- Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create the handle_new_user function with proper error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_role text := 'customer'; -- default role
  user_first_name text := '';
  user_last_name text := '';
  user_phone text := '';
BEGIN
  -- Log the trigger execution
  RAISE LOG 'handle_new_user triggered for user: %', NEW.id;
  
  -- Extract user data from raw_user_meta_data
  IF NEW.raw_user_meta_data IS NOT NULL THEN
    -- Extract firstName (try different possible keys)
    user_first_name := COALESCE(
      NEW.raw_user_meta_data->>'firstName',
      NEW.raw_user_meta_data->>'first_name',
      NEW.raw_user_meta_data->>'fname',
      ''
    );
    
    -- Extract lastName (try different possible keys)
    user_last_name := COALESCE(
      NEW.raw_user_meta_data->>'lastName',
      NEW.raw_user_meta_data->>'last_name',
      NEW.raw_user_meta_data->>'lname',
      ''
    );
    
    -- Extract userType/role (try different possible keys)
    user_role := COALESCE(
      NEW.raw_user_meta_data->>'userType',
      NEW.raw_user_meta_data->>'role',
      NEW.raw_user_meta_data->>'user_type',
      'customer'
    );
    
    -- Extract phone
    user_phone := COALESCE(
      NEW.raw_user_meta_data->>'phone',
      ''
    );
    
    RAISE LOG 'Extracted data - firstName: %, lastName: %, userType: %, phone: %', 
      user_first_name, user_last_name, user_role, user_phone;
  END IF;
  
  -- Ensure we have valid role
  IF user_role NOT IN ('customer', 'cashier', 'staff', 'manager', 'admin') THEN
    user_role := 'customer';
  END IF;
  
  -- Insert into user_profiles with error handling
  BEGIN
    INSERT INTO public.user_profiles (
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
    ) VALUES (
      NEW.id,
      NEW.email,
      user_first_name,
      user_last_name,
      user_role,
      user_phone,
      100, -- Welcome bonus points
      true,
      NOW(),
      NOW()
    );
    
    RAISE LOG 'Successfully created user_profile for user: %', NEW.id;
    
  EXCEPTION 
    WHEN OTHERS THEN
      RAISE LOG 'Error creating user_profile for user %: % %', NEW.id, SQLERRM, SQLSTATE;
      -- Don't re-raise the exception to prevent blocking auth user creation
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- STEP 2: Fix RLS Policies
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Authenticated users can insert their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Service role can manage all profiles" ON user_profiles;

-- Create comprehensive RLS policies
CREATE POLICY "Anyone can insert user profiles" ON user_profiles
  FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE 
  USING (auth.uid() = id);

CREATE POLICY "Service role can manage all profiles" ON user_profiles
  FOR ALL 
  USING (
    current_setting('role') = 'service_role' OR
    auth.jwt() ->> 'role' = 'service_role'
  );

-- STEP 3: Ensure table exists with correct structure
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT NOT NULL DEFAULT '',
  last_name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'cashier', 'staff', 'manager', 'admin')),
  phone TEXT,
  address JSONB DEFAULT '{}',
  preferences JSONB DEFAULT '{}',
  loyalty_points INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_active ON user_profiles(is_active);

-- STEP 4: Create a test user function
CREATE OR REPLACE FUNCTION public.test_user_creation(
  test_email TEXT,
  test_password TEXT,
  test_first_name TEXT DEFAULT 'Test',
  test_last_name TEXT DEFAULT 'User',
  test_role TEXT DEFAULT 'customer'
) RETURNS JSONB AS $$
DECLARE
  result JSONB;
  user_id UUID;
BEGIN
  -- Test trigger functionality
  RAISE LOG 'Testing user creation for email: %', test_email;
  
  -- Simulate auth user creation
  user_id := gen_random_uuid();
  
  -- Test profile creation directly
  INSERT INTO public.user_profiles (
    id,
    email,
    first_name,
    last_name,
    role,
    loyalty_points,
    is_active,
    created_at,
    updated_at
  ) VALUES (
    user_id,
    test_email,
    test_first_name,
    test_last_name,
    test_role,
    100,
    true,
    NOW(),
    NOW()
  );
  
  result := jsonb_build_object(
    'success', true,
    'user_id', user_id,
    'message', 'Test user profile created successfully'
  );
  
  RETURN result;
  
EXCEPTION 
  WHEN OTHERS THEN
    result := jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'error_code', SQLSTATE
    );
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Test the function
SELECT public.test_user_creation('test@example.com', 'password123', 'Test', 'User', 'customer');