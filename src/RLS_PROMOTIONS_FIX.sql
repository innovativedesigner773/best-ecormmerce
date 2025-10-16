-- ============================================
-- PROMOTIONS RLS POLICIES FIX
-- ============================================
-- Run this script in your Supabase SQL editor to fix the RLS issue

-- 1. Drop existing policies if they exist (in case of conflicts)
DROP POLICY IF EXISTS "Admins can manage promotions" ON promotions;
DROP POLICY IF EXISTS "Users can view active promotions" ON promotions;
DROP POLICY IF EXISTS "Admins can manage promotion_products" ON promotion_products;
DROP POLICY IF EXISTS "Admins can manage promotion_categories" ON promotion_categories;
DROP POLICY IF EXISTS "Admins can manage inventory" ON inventory;

-- 2. Ensure RLS is enabled on all promotion tables
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotion_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotion_categories ENABLE ROW LEVEL SECURITY;

-- 3. Create policies for promotions table
-- Allow admins (role = 'admin') to do everything
CREATE POLICY "Admins can manage promotions" ON promotions
    FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Allow all authenticated users to view active promotions
CREATE POLICY "Users can view active promotions" ON promotions
    FOR SELECT 
    USING (is_active = true AND auth.role() = 'authenticated');

-- 4. Create policies for promotion_products table
CREATE POLICY "Admins can manage promotion_products" ON promotion_products
    FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Allow authenticated users to view promotion products
CREATE POLICY "Users can view promotion_products" ON promotion_products
    FOR SELECT 
    USING (auth.role() = 'authenticated');

-- 5. Create policies for promotion_categories table
CREATE POLICY "Admins can manage promotion_categories" ON promotion_categories
    FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Allow authenticated users to view promotion categories
CREATE POLICY "Users can view promotion_categories" ON promotion_categories
    FOR SELECT 
    USING (auth.role() = 'authenticated');

-- 6. If inventory table exists, set its policies
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'inventory') THEN
        ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "Admins can manage inventory" ON inventory;
        CREATE POLICY "Admins can manage inventory" ON inventory
            FOR ALL 
            USING (
                EXISTS (
                    SELECT 1 FROM user_profiles 
                    WHERE id = auth.uid() AND role = 'admin'
                )
            );
    END IF;
END
$$;

-- 7. Grant necessary permissions to authenticated users
GRANT SELECT ON promotions TO authenticated;
GRANT SELECT ON promotion_products TO authenticated;
GRANT SELECT ON promotion_categories TO authenticated;

-- Grant full access to admins (this is handled by RLS policies above)
-- The auth.uid() function will ensure only proper admin users can write

-- 8. Verify the setup with a test query
-- This should show existing promotions if any
-- SELECT * FROM promotions WHERE is_active = true;

COMMIT;
