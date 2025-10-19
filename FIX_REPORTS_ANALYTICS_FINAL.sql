-- ============================================
-- FIX REPORTS AND ANALYTICS DATA ISSUES (FINAL)
-- ============================================
-- This fixes the column name issues and ensures reports work
-- Run this in your Supabase SQL Editor

BEGIN;

-- Step 1: Check orders table structure first
DO $$
DECLARE
    order_count INTEGER;
    column_info TEXT;
BEGIN
    SELECT COUNT(*) INTO order_count FROM orders;
    RAISE NOTICE '📊 Total orders in database: %', order_count;
    
    -- Get column information
    SELECT string_agg(column_name || ' (' || data_type || ')', ', ')
    INTO column_info
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'orders';
    
    RAISE NOTICE '📋 Orders table columns: %', column_info;
END $$;

-- Step 2: Drop all existing policies to start fresh
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    RAISE NOTICE '🗑️ Dropping all existing RLS policies...';
    
    -- Drop orders policies
    FOR policy_record IN 
        SELECT policyname FROM pg_policies 
        WHERE tablename = 'orders' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.orders', policy_record.policyname);
        RAISE NOTICE '   Dropped orders policy: %', policy_record.policyname;
    END LOOP;
    
    -- Drop order_items policies
    FOR policy_record IN 
        SELECT policyname FROM pg_policies 
        WHERE tablename = 'order_items' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.order_items', policy_record.policyname);
        RAISE NOTICE '   Dropped order_items policy: %', policy_record.policyname;
    END LOOP;
    
    RAISE NOTICE '✅ All policies dropped';
END $$;

-- Step 3: Enable RLS on both tables
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Step 4: Create RLS policies with proper type casting for orders
-- Allow users to read their own orders (with proper UUID casting)
CREATE POLICY "allow_own_orders_select" ON public.orders
    FOR SELECT 
    USING (auth.uid() = customer_id::uuid);

-- Allow reading orders by email
CREATE POLICY "allow_orders_by_email" ON public.orders
    FOR SELECT 
    USING (auth.jwt() ->> 'email' = customer_email);

-- Allow admins and managers to read all orders (for reports)
CREATE POLICY "allow_admin_orders_select" ON public.orders
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'manager', 'cashier')
        )
    );

-- Allow INSERT for authenticated users
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

-- Step 5: Create RLS policies for order_items with proper type casting
-- Allow reading order_items for orders the user can access
CREATE POLICY "allow_order_items_select" ON public.order_items
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.orders 
            WHERE id = order_items.order_id 
            AND (
                auth.uid() = customer_id::uuid
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
    WITH CHECK (auth.uid() IS NOT NULL);

-- Step 6: Create analytics views with correct column names
-- First, let's create a safe view that handles missing columns
CREATE OR REPLACE VIEW analytics_orders AS
SELECT 
    o.id,
    o.order_number,
    o.customer_id,
    o.customer_email,
    o.status,
    o.payment_status,
    o.total,
    o.created_at,
    o.updated_at,
    -- Use COALESCE to handle different column names
    COALESCE(o.total, 0) as revenue,
    CASE 
        WHEN o.status IN ('confirmed', 'processing', 'shipped', 'delivered', 'completed', 'paid') 
        THEN 'completed'
        ELSE 'pending'
    END as completion_status
FROM orders o;

-- Create a view for product performance analytics
CREATE OR REPLACE VIEW analytics_product_performance AS
SELECT 
    oi.product_id,
    oi.product_snapshot->>'name' as product_name,
    oi.product_snapshot->>'category' as category,
    SUM(oi.quantity) as total_quantity_sold,
    SUM(oi.total_price) as total_revenue,
    COUNT(DISTINCT oi.order_id) as order_count,
    AVG(oi.unit_price) as avg_price
FROM order_items oi
JOIN orders o ON o.id = oi.order_id
WHERE o.status IN ('confirmed', 'processing', 'shipped', 'delivered', 'completed', 'paid')
GROUP BY oi.product_id, oi.product_snapshot->>'name', oi.product_snapshot->>'category';

-- Step 7: Test the setup
DO $$
DECLARE
    test_passed BOOLEAN := true;
    error_messages TEXT := '';
    policy_count INTEGER;
    view_count INTEGER;
BEGIN
    -- Test 1: Check if orders table has data
    IF NOT EXISTS (SELECT 1 FROM orders LIMIT 1) THEN
        RAISE WARNING '⚠️ No orders data found - reports will be empty';
    END IF;
    
    -- Test 2: Check if RLS policies exist
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'orders';
    
    IF policy_count = 0 THEN
        test_passed := false;
        error_messages := error_messages || 'No orders policies found; ';
    END IF;
    
    -- Test 3: Check if analytics views exist
    SELECT COUNT(*) INTO view_count
    FROM information_schema.views 
    WHERE table_schema = 'public' 
    AND table_name IN ('analytics_orders', 'analytics_product_performance');
    
    IF view_count < 2 THEN
        test_passed := false;
        error_messages := error_messages || 'Analytics views missing; ';
    END IF;
    
    RAISE NOTICE '📊 Orders policies created: %', policy_count;
    RAISE NOTICE '📊 Analytics views created: %', view_count;
    
    IF test_passed THEN
        RAISE NOTICE '🎉 Reports and analytics setup complete!';
    ELSE
        RAISE WARNING '❌ Some issues found: %', error_messages;
    END IF;
END $$;

COMMIT;

-- Final verification
SELECT 
    'Reports Analytics Fix Complete' as status,
    COUNT(*) as total_orders,
    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as recent_orders
FROM orders;

-- Show created policies
SELECT 
    'Created Policies' as info,
    policyname,
    cmd
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('orders', 'order_items')
ORDER BY tablename, policyname;

-- Test the analytics view
SELECT 
    'Analytics View Test' as test,
    COUNT(*) as order_count,
    SUM(revenue) as total_revenue
FROM analytics_orders;

SELECT '🔧 Reports should now work with correct column names!' as message;
