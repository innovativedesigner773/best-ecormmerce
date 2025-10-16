-- ============================================
-- COMPLETE PROMOTIONS SYSTEM SETUP
-- ============================================
-- This script will create all necessary tables and policies
-- Run this in your Supabase SQL editor

-- 1. Create or update promotions table
CREATE TABLE IF NOT EXISTS promotions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT UNIQUE,
    description TEXT,
    type TEXT NOT NULL CHECK (type IN ('percentage', 'fixed_amount', 'buy_x_get_y', 'free_shipping')),
    value DECIMAL(10,2) NOT NULL,
    minimum_order_amount DECIMAL(10,2) DEFAULT 0,
    maximum_discount_amount DECIMAL(10,2),
    usage_limit INTEGER,
    usage_limit_per_customer INTEGER DEFAULT 1,
    current_usage_count INTEGER DEFAULT 0,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    applies_to TEXT NOT NULL DEFAULT 'all' CHECK (applies_to IN ('all', 'specific_products', 'specific_categories')),
    conditions JSONB DEFAULT '{}',
    created_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create promotion_products junction table
CREATE TABLE IF NOT EXISTS promotion_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    promotion_id UUID NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(promotion_id, product_id)
);

-- 3. Create promotion_categories junction table
CREATE TABLE IF NOT EXISTS promotion_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    promotion_id UUID NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(promotion_id, category_id)
);

-- 4. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_promotions_active ON promotions(is_active);
CREATE INDEX IF NOT EXISTS idx_promotions_dates ON promotions(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_promotions_code ON promotions(code);
CREATE INDEX IF NOT EXISTS idx_promotions_type ON promotions(type);
CREATE INDEX IF NOT EXISTS idx_promotion_products_promotion ON promotion_products(promotion_id);
CREATE INDEX IF NOT EXISTS idx_promotion_products_product ON promotion_products(product_id);
CREATE INDEX IF NOT EXISTS idx_promotion_categories_promotion ON promotion_categories(promotion_id);
CREATE INDEX IF NOT EXISTS idx_promotion_categories_category ON promotion_categories(category_id);

-- 5. Enable RLS on all tables
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotion_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotion_categories ENABLE ROW LEVEL SECURITY;

-- 6. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Admins can manage promotions" ON promotions;
DROP POLICY IF EXISTS "Users can view active promotions" ON promotions;
DROP POLICY IF EXISTS "Admins can manage promotion_products" ON promotion_products;
DROP POLICY IF EXISTS "Users can view promotion_products" ON promotion_products;
DROP POLICY IF EXISTS "Admins can manage promotion_categories" ON promotion_categories;
DROP POLICY IF EXISTS "Users can view promotion_categories" ON promotion_categories;

-- 7. Create comprehensive RLS policies

-- Promotions table policies
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
    USING (
        is_active = true 
        AND start_date <= NOW() 
        AND (end_date IS NULL OR end_date >= NOW())
    );

-- Promotion products policies
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
    USING (
        EXISTS (
            SELECT 1 FROM promotions p 
            WHERE p.id = promotion_products.promotion_id 
            AND p.is_active = true 
            AND p.start_date <= NOW() 
            AND (p.end_date IS NULL OR p.end_date >= NOW())
        )
    );

-- Promotion categories policies
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
    USING (
        EXISTS (
            SELECT 1 FROM promotions p 
            WHERE p.id = promotion_categories.promotion_id 
            AND p.is_active = true 
            AND p.start_date <= NOW() 
            AND (p.end_date IS NULL OR p.end_date >= NOW())
        )
    );

-- 8. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON promotions TO authenticated;
GRANT SELECT ON promotion_products TO authenticated;
GRANT SELECT ON promotion_categories TO authenticated;

-- 9. Create useful functions for promotion management

-- Function to validate promotion
CREATE OR REPLACE FUNCTION validate_promotion(
    promotion_code TEXT,
    order_amount DECIMAL DEFAULT 0,
    user_id UUID DEFAULT NULL
) RETURNS TABLE (
    valid BOOLEAN,
    promotion_id UUID,
    discount_amount DECIMAL,
    message TEXT
) AS $$
DECLARE
    promo RECORD;
    usage_count INTEGER;
    calculated_discount DECIMAL;
BEGIN
    -- Find the promotion
    SELECT * INTO promo 
    FROM promotions 
    WHERE code = promotion_code 
    AND is_active = true 
    AND start_date <= NOW() 
    AND (end_date IS NULL OR end_date >= NOW());
    
    -- Check if promotion exists
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, NULL::UUID, 0::DECIMAL, 'Invalid or expired promotion code';
        RETURN;
    END IF;
    
    -- Check minimum order amount
    IF order_amount < promo.minimum_order_amount THEN
        RETURN QUERY SELECT false, promo.id, 0::DECIMAL, 
            format('Minimum order amount is $%.2f', promo.minimum_order_amount);
        RETURN;
    END IF;
    
    -- Check usage limits
    IF promo.usage_limit IS NOT NULL AND promo.current_usage_count >= promo.usage_limit THEN
        RETURN QUERY SELECT false, promo.id, 0::DECIMAL, 'Promotion usage limit reached';
        RETURN;
    END IF;
    
    -- Calculate discount
    calculated_discount := CASE 
        WHEN promo.type = 'percentage' THEN 
            LEAST(order_amount * promo.value / 100, COALESCE(promo.maximum_discount_amount, order_amount))
        WHEN promo.type = 'fixed_amount' THEN 
            LEAST(promo.value, order_amount)
        WHEN promo.type = 'free_shipping' THEN 
            promo.value  -- Shipping cost should be passed as value
        ELSE 0
    END;
    
    RETURN QUERY SELECT true, promo.id, calculated_discount, 'Promotion applied successfully';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to apply promotion (increment usage)
CREATE OR REPLACE FUNCTION apply_promotion(promotion_code TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE promotions 
    SET current_usage_count = current_usage_count + 1,
        updated_at = NOW()
    WHERE code = promotion_code 
    AND is_active = true;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Insert sample promotions for testing
INSERT INTO promotions (name, code, description, type, value, minimum_order_amount, start_date, end_date, applies_to)
VALUES 
    (
        'Welcome Bonus', 
        'WELCOME25', 
        'Get 25% off your first order!', 
        'percentage', 
        25.00, 
        50.00, 
        NOW(), 
        NOW() + INTERVAL '30 days', 
        'all'
    ),
    (
        'Free Shipping Special', 
        'FREESHIP100', 
        'Free shipping on orders over $100', 
        'free_shipping', 
        15.00, 
        100.00, 
        NOW(), 
        NOW() + INTERVAL '14 days', 
        'all'
    ),
    (
        'Flash Sale', 
        'FLASH50', 
        '$50 off orders over $200', 
        'fixed_amount', 
        50.00, 
        200.00, 
        NOW(), 
        NOW() + INTERVAL '7 days', 
        'all'
    )
ON CONFLICT (code) DO NOTHING;

-- Commit the changes
COMMIT;

-- Success message
SELECT 'Promotions system setup completed successfully!' as status;
