-- ============================================
-- QUICK REGISTRATION FIX
-- ============================================
-- Run this in Supabase SQL Editor to fix registration immediately

-- Step 1: Drop the problematic INSERT policy
DROP POLICY IF EXISTS "Allow profile creation during signup" ON public.user_profiles;

-- Step 2: Create a very permissive INSERT policy
CREATE POLICY "Allow profile creation during signup" ON public.user_profiles
    FOR INSERT 
    WITH CHECK (true);  -- Allow ALL inserts

-- Step 3: Verify the policy was created
SELECT 
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'user_profiles'
AND policyname = 'Allow profile creation during signup';

-- This should now allow registration to work!
