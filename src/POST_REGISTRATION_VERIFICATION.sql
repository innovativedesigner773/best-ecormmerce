-- ============================================
-- POST-REGISTRATION VERIFICATION SCRIPT
-- ============================================
-- Run this AFTER testing registration in your app
-- This will verify that the trigger worked and data was created properly

-- Check the most recent user registrations
SELECT 
    '📊 RECENT USER REGISTRATIONS' as section,
    'Last 5 users created' as description;

SELECT 
    u.id,
    u.email,
    u.email_confirmed_at,
    u.raw_user_meta_data,
    u.created_at as auth_user_created,
    p.first_name,
    p.last_name,
    p.role,
    p.loyalty_points,
    p.is_active,
    p.created_at as profile_created,
    -- Calculate time difference between auth user and profile creation
    EXTRACT(EPOCH FROM (p.created_at - u.created_at)) as profile_delay_seconds
FROM auth.users u
LEFT JOIN public.user_profiles p ON u.id = p.id
ORDER BY u.created_at DESC
LIMIT 5;

-- Check for any orphaned auth users (without profiles)
SELECT 
    '🔍 ORPHANED USERS CHECK' as section,
    'Auth users without profiles (should be empty)' as description;

SELECT 
    u.id,
    u.email,
    u.created_at,
    u.raw_user_meta_data,
    'MISSING PROFILE' as issue
FROM auth.users u
LEFT JOIN public.user_profiles p ON u.id = p.id
WHERE p.id IS NULL
ORDER BY u.created_at DESC;

-- Check for any orphaned profiles (without auth users) - should not happen with FK constraint
SELECT 
    '🔍 ORPHANED PROFILES CHECK' as section,
    'Profiles without auth users (should be empty)' as description;

SELECT 
    p.id,
    p.email,
    p.first_name,
    p.last_name,
    p.role,
    p.created_at,
    'MISSING AUTH USER' as issue
FROM public.user_profiles p
LEFT JOIN auth.users u ON u.id = p.id
WHERE u.id IS NULL
ORDER BY p.created_at DESC;

-- Verify trigger is still active
SELECT 
    '⚡ TRIGGER STATUS CHECK' as section,
    'Verify trigger is active' as description;

SELECT 
    trigger_name,
    event_object_schema,
    event_object_table,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

-- Check RLS policies
SELECT 
    '🛡️ RLS POLICIES CHECK' as section,
    'Verify RLS policies are active' as description;

SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'user_profiles' 
ORDER BY policyname;

-- Summary statistics
SELECT 
    '📈 SUMMARY STATISTICS' as section,
    'Overall database health' as description;

SELECT 
    'Total auth users' as metric,
    COUNT(*)::text as value
FROM auth.users
UNION ALL
SELECT 
    'Total user profiles' as metric,
    COUNT(*)::text as value
FROM public.user_profiles
UNION ALL
SELECT 
    'Customer profiles' as metric,
    COUNT(*)::text as value
FROM public.user_profiles
WHERE role = 'customer'
UNION ALL
SELECT 
    'Staff profiles' as metric,
    COUNT(*)::text as value
FROM public.user_profiles
WHERE role IN ('cashier', 'staff', 'manager', 'admin')
UNION ALL
SELECT 
    'Active profiles' as metric,
    COUNT(*)::text as value
FROM public.user_profiles
WHERE is_active = true
UNION ALL
SELECT 
    'Profiles with loyalty points' as metric,
    COUNT(*)::text as value
FROM public.user_profiles
WHERE loyalty_points > 0;

-- Test trigger function manually (if needed)
-- Uncomment this section if you want to test the trigger again
/*
DO $$
DECLARE
    test_user_id UUID := gen_random_uuid();
    test_email TEXT := 'manual-test-' || extract(epoch from now()) || '@example.com';
    profile_created BOOLEAN := false;
BEGIN
    -- Start transaction for test
    BEGIN
        RAISE NOTICE 'Testing trigger with user: %', test_email;
        
        -- Insert test user
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
            '{"first_name": "Manual", "last_name": "Test", "role": "customer"}'::jsonb,
            NOW(),
            NOW(),
            NOW()
        );
        
        -- Check if profile was created
        SELECT EXISTS(
            SELECT 1 FROM public.user_profiles WHERE id = test_user_id
        ) INTO profile_created;
        
        IF profile_created THEN
            RAISE NOTICE '✅ Manual trigger test PASSED - Profile created successfully';
        ELSE
            RAISE WARNING '❌ Manual trigger test FAILED - Profile was not created';
        END IF;
        
        -- Always rollback the test
        RAISE EXCEPTION 'Test complete - rolling back';
        
    EXCEPTION 
        WHEN OTHERS THEN
            -- Expected exception to rollback
            IF SQLERRM != 'Test complete - rolling back' THEN
                RAISE WARNING 'Unexpected error during manual test: %', SQLERRM;
            END IF;
    END;
END $$;
*/

-- Final verification message
DO $$
DECLARE
    auth_count INTEGER;
    profile_count INTEGER;
    orphaned_users INTEGER;
    active_trigger INTEGER;
    policy_count INTEGER;
BEGIN
    -- Get counts
    SELECT COUNT(*) INTO auth_count FROM auth.users;
    SELECT COUNT(*) INTO profile_count FROM public.user_profiles;
    SELECT COUNT(*) INTO orphaned_users FROM auth.users u LEFT JOIN public.user_profiles p ON u.id = p.id WHERE p.id IS NULL;
    SELECT COUNT(*) INTO active_trigger FROM information_schema.triggers WHERE trigger_name = 'on_auth_user_created';
    SELECT COUNT(*) INTO policy_count FROM pg_policies WHERE tablename = 'user_profiles';
    
    RAISE NOTICE '';
    RAISE NOTICE '📊 ============================================';
    RAISE NOTICE '📊 POST-REGISTRATION VERIFICATION COMPLETE';
    RAISE NOTICE '📊 ============================================';
    RAISE NOTICE '';
    RAISE NOTICE '👥 Total auth users: %', auth_count;
    RAISE NOTICE '📋 Total user profiles: %', profile_count;
    RAISE NOTICE '⚠️  Orphaned users (missing profiles): %', orphaned_users;
    RAISE NOTICE '⚡ Active triggers: %', active_trigger;
    RAISE NOTICE '🛡️  RLS policies: %', policy_count;
    RAISE NOTICE '';
    
    IF orphaned_users = 0 AND active_trigger = 1 AND policy_count >= 4 THEN
        RAISE NOTICE '✅ VERIFICATION PASSED: Everything looks good!';
        RAISE NOTICE '✅ Registration should be working correctly';
    ELSE
        RAISE NOTICE '❌ VERIFICATION ISSUES DETECTED:';
        IF orphaned_users > 0 THEN
            RAISE NOTICE '   - % users missing profiles (trigger may not be working)', orphaned_users;
        END IF;
        IF active_trigger = 0 THEN
            RAISE NOTICE '   - Trigger is not active';
        END IF;
        IF policy_count < 4 THEN
            RAISE NOTICE '   - Insufficient RLS policies';
        END IF;
    END IF;
    RAISE NOTICE '';
END $$;