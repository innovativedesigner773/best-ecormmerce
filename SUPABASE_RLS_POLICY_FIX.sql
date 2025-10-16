-- RLS recursion fix for user_profiles
-- Run this in Supabase SQL Editor

BEGIN;

-- Drop recursive admin policy if present
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'user_profiles'
          AND policyname = 'Admins can manage all profiles'
    ) THEN
        EXECUTE 'DROP POLICY "Admins can manage all profiles" ON public.user_profiles';
    END IF;
END $$;

-- Ensure basic RLS policies exist and are safe
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'user_profiles' AND policyname = 'Users can view own profile'
    ) THEN
        EXECUTE 'CREATE POLICY "Users can view own profile" ON public.user_profiles FOR SELECT USING (auth.uid() = id)';
    END IF;
END $$;

-- Users can update their own profile
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'user_profiles' AND policyname = 'Users can update own profile'
    ) THEN
        EXECUTE 'CREATE POLICY "Users can update own profile" ON public.user_profiles FOR UPDATE USING (auth.uid() = id)';
    END IF;
END $$;

-- Allow insert during signup (trigger/manual fallback)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'user_profiles' AND policyname = 'Allow profile creation during signup'
    ) THEN
        EXECUTE 'CREATE POLICY "Allow profile creation during signup" ON public.user_profiles FOR INSERT WITH CHECK (auth.uid() = id)';
    END IF;
END $$;

COMMIT;

-- After running this, the /rest/v1/user_profiles SELECT/UPDATE for the current user should work.
