-- ============================================
-- CHECK ORDERS TABLE AND RLS POLICIES
-- ============================================
-- Run this in Supabase SQL Editor to diagnose orders issues

-- Step 1: Check if orders table exists and has data
SELECT 
    'Orders Table Check' as check_type,
    COUNT(*) as total_orders,
    MAX(created_at) as latest_order,
    MIN(created_at) as oldest_order
FROM orders;

-- Step 2: Check recent orders (last 10)
SELECT 
    id,
    order_number,
    customer_id,
    customer_email,
    status,
    total,
    created_at
FROM orders 
ORDER BY created_at DESC 
LIMIT 10;

-- Step 3: Check RLS policies on orders table
SELECT 
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'orders';

-- Step 4: Check if RLS is enabled on orders table
SELECT 
    relname as table_name,
    relrowsecurity as rls_enabled
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' 
AND c.relname = 'orders';

-- Step 5: Check for any orders with specific customer IDs
SELECT 
    customer_id,
    COUNT(*) as order_count,
    MAX(created_at) as latest_order
FROM orders 
GROUP BY customer_id 
ORDER BY latest_order DESC;

-- Step 6: Check order_items table
SELECT 
    'Order Items Check' as check_type,
    COUNT(*) as total_items
FROM order_items;

-- Step 7: Check recent order items
SELECT 
    oi.id,
    oi.order_id,
    oi.product_id,
    oi.quantity,
    o.order_number,
    o.created_at
FROM order_items oi
JOIN orders o ON o.id = oi.order_id
ORDER BY o.created_at DESC 
LIMIT 10;
