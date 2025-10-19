-- ============================================
-- FIX REPORTS AND ANALYTICS DATA ISSUES
-- ============================================
-- This ensures reports have proper data and RLS policies
-- Run this in your Supabase SQL Editor

BEGIN;

-- Step 1: Check if we have orders data
DO $$
DECLARE
    order_count INTEGER;
    recent_orders INTEGER;
BEGIN
    SELECT COUNT(*) INTO order_count FROM orders;
    SELECT COUNT(*) INTO recent_orders FROM orders WHERE created_at >= NOW() - INTERVAL '30 days';
    
    RAISE NOTICE '📊 Total orders in database: %', order_count;
    RAISE NOTICE '📊 Recent orders (last 30 days): %', recent_orders;
    
    IF order_count = 0 THEN
        RAISE WARNING '⚠️ No orders found in database - reports will be empty';
    END IF;
END $$;

-- Step 2: Ensure RLS policies allow reading orders for reports
-- Drop existing policies on orders
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname FROM pg_policies 
        WHERE tablename = 'orders' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.orders', policy_record.policyname);
    END LOOP;
END $$;

-- Create comprehensive RLS policies for orders
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own orders
CREATE POLICY "allow_own_orders_select" ON public.orders
    FOR SELECT 
    USING (auth.uid()::text = customer_id);

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

-- Step 3: Create similar policies for order_items
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

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Allow reading order_items for accessible orders
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
                    AND role IN ('admin', 'manager', 'cashier')
                )
            )
        )
    );

-- Allow inserting order_items
CREATE POLICY "allow_order_items_insert" ON public.order_items
    FOR INSERT 
    WITH CHECK (auth.uid() IS NOT NULL);

-- Step 4: Create a view for easy analytics queries
CREATE OR REPLACE VIEW analytics_orders AS
SELECT 
    o.id,
    o.order_number,
    o.customer_id,
    o.customer_email,
    o.status,
    o.payment_status,
    o.total,
    o.total_amount,
    o.created_at,
    o.updated_at,
    COALESCE(o.total, o.total_amount, 0) as revenue,
    CASE 
        WHEN o.status IN ('confirmed', 'processing', 'shipped', 'delivered', 'completed', 'paid') 
        THEN 'completed'
        ELSE 'pending'
    END as completion_status
FROM orders o;

-- Step 5: Create a view for product performance
CREATE OR REPLACE VIEW analytics_product_performance AS
SELECT 
    oi.product_id,
    oi.product_snapshot->>'name' as product_name,
    oi.product_snapshot->>'category' as category,
    SUM(oi.quantity) as total_quantity_sold,
    SUM(oi.total_price) as total_revenue,
    COUNT(DISTINCT oi.order_id) as order_count,
    AVG(oi.unit_price) as avg_price,
    o.created_at as order_date
FROM order_items oi
JOIN orders o ON o.id = oi.order_id
WHERE o.status IN ('confirmed', 'processing', 'shipped', 'delivered', 'completed', 'paid')
GROUP BY oi.product_id, oi.product_snapshot->>'name', oi.product_snapshot->>'category', o.created_at;

-- Step 6: Test the setup
DO $$
DECLARE
    test_passed BOOLEAN := true;
    error_messages TEXT := '';
BEGIN
    -- Test 1: Check if orders table has data
    IF NOT EXISTS (SELECT 1 FROM orders LIMIT 1) THEN
        test_passed := false;
        error_messages := error_messages || 'No orders data found; ';
    END IF;
    
    -- Test 2: Check if RLS policies exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'orders' 
        AND policyname = 'allow_admin_orders_select'
    ) THEN
        test_passed := false;
        error_messages := error_messages || 'Admin orders policy missing; ';
    END IF;
    
    -- Test 3: Check if analytics views exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.views 
        WHERE table_schema = 'public' 
        AND table_name = 'analytics_orders'
    ) THEN
        test_passed := false;
        error_messages := error_messages || 'Analytics orders view missing; ';
    END IF;
    
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

SELECT '🔧 Reports should now show real data instead of mock data!' as message;
