-- ============================================
-- COMPLETE SUPABASE AUTHENTICATION FIX
-- ============================================
-- Run this in your Supabase SQL Editor

-- Clean up existing setup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP TABLE IF EXISTS public.user_profiles CASCADE;

-- Create the user_profiles table with correct schema
CREATE TABLE public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'customer' 
        CHECK (role IN ('customer', 'cashier', 'staff', 'manager', 'admin')),
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

-- Create update trigger for updated_at
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

-- Create user creation trigger
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
    profile_exists BOOLEAN := false;
    raw_metadata JSONB;
BEGIN
    RAISE NOTICE 'Creating profile for user: %', NEW.id;
    
    -- Check if profile already exists
    SELECT EXISTS(
        SELECT 1 FROM public.user_profiles WHERE id = NEW.id
    ) INTO profile_exists;
    
    IF profile_exists THEN
        RAISE NOTICE 'Profile already exists for user %, skipping', NEW.id;
        RETURN NEW;
    END IF;

    -- Extract metadata
    raw_metadata := NEW.raw_user_meta_data;
    
    user_role := COALESCE(
        raw_metadata->>'userType',
        raw_metadata->>'role',
        'customer'
    );
    
    user_first_name := COALESCE(
        raw_metadata->>'firstName',
        raw_metadata->>'first_name',
        'User'
    );
    
    user_last_name := COALESCE(
        raw_metadata->>'lastName', 
        raw_metadata->>'last_name',
        ''
    );
    
    user_phone := raw_metadata->>'phone';

    -- Validate role
    IF user_role NOT IN ('customer', 'cashier', 'staff', 'manager', 'admin') THEN
        user_role := 'customer';
    END IF;

    -- Create the user profile
    INSERT INTO public.user_profiles (
        id,
        email,
        first_name,
        last_name,
        role,
        phone,
        loyalty_points,
        is_active,
        email_verified,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        NEW.email,
        user_first_name,
        user_last_name,
        user_role,
        user_phone,
        CASE WHEN user_role = 'customer' THEN 100 ELSE 0 END,
        true,
        NEW.email_confirmed_at IS NOT NULL,
        NOW(),
        NOW()
    );

    RAISE NOTICE 'Profile created successfully for user: %', NEW.id;
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error creating profile for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Set up RLS policies
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own profile
CREATE POLICY "Users can view own profile"
    ON public.user_profiles FOR SELECT
    USING (auth.uid() = id);

-- Policy: Users can update their own profile  
CREATE POLICY "Users can update own profile"
    ON public.user_profiles FOR UPDATE
    USING (auth.uid() = id);

-- Policy: Allow insert during signup
CREATE POLICY "Allow profile creation during signup"
    ON public.user_profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Policy: Admins can manage all profiles
CREATE POLICY "Admins can manage all profiles"
    ON public.user_profiles FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.user_profiles TO anon, authenticated;

RAISE NOTICE 'Complete Supabase authentication setup completed successfully!';
