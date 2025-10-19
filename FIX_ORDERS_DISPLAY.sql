-- ============================================
-- FIX ORDERS DISPLAY ISSUE
-- ============================================
-- This fixes orders not showing on the orders page
-- Run this in your Supabase SQL Editor

BEGIN;

-- Step 1: Check current RLS status on orders table
DO $$
DECLARE
    rls_enabled BOOLEAN;
    policy_count INTEGER;
BEGIN
    -- Check if RLS is enabled
    SELECT relrowsecurity INTO rls_enabled
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' 
    AND c.relname = 'orders';
    
    -- Count existing policies
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'orders';
    
    RAISE NOTICE '📊 Orders table RLS status: %', CASE WHEN rls_enabled THEN 'ENABLED' ELSE 'DISABLED' END;
    RAISE NOTICE '📊 Existing policies: %', policy_count;
END $$;

-- Step 2: Drop all existing RLS policies on orders table
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    RAISE NOTICE '🗑️ Dropping all existing RLS policies on orders table...';
    
    FOR policy_record IN 
        SELECT policyname FROM pg_policies 
        WHERE tablename = 'orders' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.orders', policy_record.policyname);
        RAISE NOTICE '   Dropped policy: %', policy_record.policyname;
    END LOOP;
    
    RAISE NOTICE '✅ All orders policies dropped';
END $$;

-- Step 3: Enable RLS on orders table
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Step 4: Create permissive RLS policies for orders
-- Allow users to read their own orders
CREATE POLICY "allow_own_orders_select" ON public.orders
    FOR SELECT 
    USING (auth.uid()::text = customer_id);

-- Allow users to read orders where they are the customer (by email)
CREATE POLICY "allow_orders_by_email" ON public.orders
    FOR SELECT 
    USING (auth.jwt() ->> 'email' = customer_email);

-- Allow admins to read all orders
CREATE POLICY "allow_admin_orders_select" ON public.orders
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'manager')
        )
    );

-- Allow INSERT for all authenticated users (for order creation)
CREATE POLICY "allow_order_insert" ON public.orders
    FOR INSERT 
    WITH CHECK (auth.uid() IS NOT NULL);

-- Allow UPDATE for order status changes (admin/manager only)
CREATE POLICY "allow_admin_order_update" ON public.orders
    FOR UPDATE 
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'manager')
        )
    );

-- Step 5: Create similar policies for order_items
-- Drop existing policies on order_items
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname FROM pg_policies 
        WHERE tablename = 'order_items' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.order_items', policy_record.policyname);
    END LOOP;
END $$;

-- Enable RLS on order_items
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Allow reading order_items for orders the user can access
CREATE POLICY "allow_order_items_select" ON public.order_items
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.orders 
            WHERE id = order_items.order_id 
            AND (
                auth.uid()::text = customer_id 
                OR auth.jwt() ->> 'email' = customer_email
                OR EXISTS (
                    SELECT 1 FROM public.user_profiles 
                    WHERE id = auth.uid() 
                    AND role IN ('admin', 'manager')
                )
            )
        )
    );

-- Allow inserting order_items for authenticated users
CREATE POLICY "allow_order_items_insert" ON public.order_items
    FOR INSERT 
    WITH CHECK (auth.uid() IS NOT NULL);

-- Step 6: Test the policies
DO $$
DECLARE
    test_passed BOOLEAN := true;
    error_messages TEXT := '';
BEGIN
    -- Test 1: Check if orders table has RLS enabled
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' 
        AND c.relname = 'orders'
        AND c.relrowsecurity = true
    ) THEN
        test_passed := false;
        error_messages := error_messages || 'RLS not enabled on orders; ';
    END IF;
    
    -- Test 2: Check if policies exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'orders' 
        AND policyname = 'allow_own_orders_select'
    ) THEN
        test_passed := false;
        error_messages := error_messages || 'Orders SELECT policy missing; ';
    END IF;
    
    -- Test 3: Check order_items policies
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'order_items' 
        AND policyname = 'allow_order_items_select'
    ) THEN
        test_passed := false;
        error_messages := error_messages || 'Order items SELECT policy missing; ';
    END IF;
    
    IF test_passed THEN
        RAISE NOTICE '🎉 All orders policies created successfully!';
    ELSE
        RAISE WARNING '❌ Some policies failed: %', error_messages;
    END IF;
END $$;

COMMIT;

-- Final verification
SELECT 
    'Orders Display Fix Complete' as status,
    COUNT(*) as orders_policies,
    (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'order_items') as order_items_policies
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'orders';

SELECT '🔧 Orders should now display correctly on the orders page!' as message;
