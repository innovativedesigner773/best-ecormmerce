-- ============================================
-- FIX ORDER RLS POLICY FOR SHARED CART CHECKOUT
-- ============================================
-- This script fixes the RLS policy for orders table to allow shared cart checkout
-- while maintaining security for regular orders.

BEGIN;

-- Step 1: Check current RLS status and policies
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

-- Step 4: Create comprehensive RLS policies for orders
-- Allow users to read their own orders
CREATE POLICY "allow_own_orders_select" ON public.orders
    FOR SELECT 
    USING (auth.uid() = customer_id);

-- Allow reading orders by email (for shared cart checkout)
CREATE POLICY "allow_orders_by_email" ON public.orders
    FOR SELECT 
    USING (auth.jwt() ->> 'email' = customer_email);

-- Allow admins and managers to read all orders
CREATE POLICY "allow_admin_orders_select" ON public.orders
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'manager', 'cashier')
        )
    );

-- Allow INSERT for authenticated users (regular orders)
CREATE POLICY "allow_authenticated_order_insert" ON public.orders
    FOR INSERT 
    WITH CHECK (
        auth.uid() IS NOT NULL 
        AND (
            customer_id = auth.uid() 
            OR customer_id IS NULL
        )
    );

-- Allow INSERT for anonymous users (shared cart checkout)
CREATE POLICY "allow_anonymous_order_insert" ON public.orders
    FOR INSERT 
    WITH CHECK (
        auth.uid() IS NULL 
        AND customer_id IS NULL 
        AND customer_email IS NOT NULL
    );

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

-- Step 5: Create RLS policies for order_items
-- Drop existing policies on order_items
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    RAISE NOTICE '🗑️ Dropping all existing RLS policies on order_items table...';
    
    FOR policy_record IN 
        SELECT policyname FROM pg_policies 
        WHERE tablename = 'order_items' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.order_items', policy_record.policyname);
        RAISE NOTICE '   Dropped policy: %', policy_record.policyname;
    END LOOP;
    
    RAISE NOTICE '✅ All order_items policies dropped';
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
                auth.uid() = customer_id
                OR auth.jwt() ->> 'email' = customer_email
                OR EXISTS (
                    SELECT 1 FROM public.user_profiles 
                    WHERE id = auth.uid() 
                    AND role IN ('admin', 'manager', 'cashier')
                )
            )
        )
    );

-- Allow inserting order_items for authenticated users
CREATE POLICY "allow_order_items_insert" ON public.order_items
    FOR INSERT 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.orders 
            WHERE id = order_items.order_id 
            AND (
                auth.uid() = customer_id
                OR auth.uid() IS NULL
            )
        )
    );

-- Allow inserting order_items for anonymous users (shared cart)
CREATE POLICY "allow_anonymous_order_items_insert" ON public.order_items
    FOR INSERT 
    WITH CHECK (
        auth.uid() IS NULL 
        AND EXISTS (
            SELECT 1 FROM public.orders 
            WHERE id = order_items.order_id 
            AND customer_id IS NULL
        )
    );

-- Step 6: Verify the policies were created
DO $$
DECLARE
    policy_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'orders';
    
    RAISE NOTICE '✅ Created % RLS policies for orders table', policy_count;
    
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'order_items';
    
    RAISE NOTICE '✅ Created % RLS policies for order_items table', policy_count;
END $$;

COMMIT;

-- ============================================
-- SUMMARY
-- ============================================
-- This script creates comprehensive RLS policies that allow:
-- 1. Authenticated users to create orders for themselves
-- 2. Anonymous users to create orders via shared cart checkout
-- 3. Proper access control for reading orders and order items
-- 4. Admin/manager access for order management
-- 
-- The key fix is allowing anonymous users (auth.uid() IS NULL) 
-- to create orders with customer_id = NULL for shared cart checkout.
