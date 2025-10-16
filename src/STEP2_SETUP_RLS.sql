-- ============================================
-- STEP 2: SET UP RLS POLICIES 
-- ============================================
-- Run this script AFTER Step 1 is successful

-- Enable RLS on all promotion tables
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotion_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotion_categories ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies to avoid conflicts
DROP POLICY IF EXISTS "Admins can manage promotions" ON promotions;
DROP POLICY IF EXISTS "Users can view active promotions" ON promotions;
DROP POLICY IF EXISTS "Admins can manage promotion_products" ON promotion_products;
DROP POLICY IF EXISTS "Users can view promotion_products" ON promotion_products;
DROP POLICY IF EXISTS "Admins can manage promotion_categories" ON promotion_categories;
DROP POLICY IF EXISTS "Users can view promotion_categories" ON promotion_categories;

-- Create policies for promotions table
CREATE POLICY "Admins can manage promotions" ON promotions
    FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Users can view active promotions" ON promotions
    FOR SELECT 
    USING (is_active = true);

-- Create policies for promotion_products table
CREATE POLICY "Admins can manage promotion_products" ON promotion_products
    FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Users can view promotion_products" ON promotion_products
    FOR SELECT 
    USING (true);

-- Create policies for promotion_categories table
CREATE POLICY "Admins can manage promotion_categories" ON promotion_categories
    FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Users can view promotion_categories" ON promotion_categories
    FOR SELECT 
    USING (true);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON promotions TO authenticated;
GRANT SELECT ON promotion_products TO authenticated;
GRANT SELECT ON promotion_categories TO authenticated;

COMMIT;

SELECT 'Step 2 completed: RLS policies configured' as status;
