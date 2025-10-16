-- ============================================
-- SHARED CART RLS POLICY FIX
-- ============================================
-- This script fixes the RLS policy for orders table to allow shared cart checkout
-- while maintaining security for regular orders.

-- Drop the existing restrictive policies
DROP POLICY IF EXISTS "Users can create own orders" ON orders;
DROP POLICY IF EXISTS "Users can create orders" ON orders;
DROP POLICY IF EXISTS "Users can create orders for themselves or via shareable carts" ON orders;

-- Create a new policy that allows:
-- 1. Users to create orders for themselves (original behavior)
-- 2. Users to create orders for others via valid shareable carts
-- 3. Anonymous users to create orders via shared cart checkout (customer_id = null)
CREATE POLICY "Users can create orders for themselves or via shareable carts"
    ON orders FOR INSERT
    WITH CHECK (
        -- Allow users to create orders for themselves
        customer_id = auth.uid() 
        OR 
        -- Allow users to create orders for others via valid shareable carts
        (
            customer_id IS NOT NULL 
            AND EXISTS (
                SELECT 1 FROM shareable_carts 
                WHERE original_user_id = customer_id 
                AND status = 'active' 
                AND expires_at > NOW()
                AND share_token IS NOT NULL
            )
        )
        OR
        -- Allow anonymous users to create orders via shared cart checkout
        (
            customer_id IS NULL
            AND customer_email IS NOT NULL
        )
    );

-- Also update the SELECT policy to allow viewing orders created via shareable carts
DROP POLICY IF EXISTS "Users can view own orders" ON orders;
DROP POLICY IF EXISTS "Users can view own orders and orders created via their shareable carts" ON orders;

CREATE POLICY "Users can view own orders and orders created via their shareable carts"
    ON orders FOR SELECT
    USING (
        -- Users can view their own orders
        customer_id = auth.uid()
        OR
        -- Users can view orders created via their shareable carts
        EXISTS (
            SELECT 1 FROM shareable_carts 
            WHERE original_user_id = customer_id 
            AND status = 'paid'
            AND share_token IS NOT NULL
        )
        OR
        -- Allow viewing orders with null customer_id (shared cart orders)
        customer_id IS NULL
    );

-- Verify the policies are created
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
WHERE tablename = 'orders' 
ORDER BY policyname;
