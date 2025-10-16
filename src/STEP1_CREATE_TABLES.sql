-- ============================================
-- STEP 1: CREATE MISSING PROMOTION TABLES
-- ============================================
-- Run this script first to create all required tables

-- Create promotion_categories table (this was missing)
CREATE TABLE IF NOT EXISTS promotion_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    promotion_id UUID NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(promotion_id, category_id)
);

-- Create promotion_products table (this might also be missing)
CREATE TABLE IF NOT EXISTS promotion_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    promotion_id UUID NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(promotion_id, product_id)
);

-- Add any missing columns to promotions table
ALTER TABLE promotions ADD COLUMN IF NOT EXISTS applies_to TEXT DEFAULT 'all' 
    CHECK (applies_to IN ('all', 'specific_products', 'specific_categories'));
ALTER TABLE promotions ADD COLUMN IF NOT EXISTS conditions JSONB DEFAULT '{}';
ALTER TABLE promotions ADD COLUMN IF NOT EXISTS current_usage_count INTEGER DEFAULT 0;
ALTER TABLE promotions ADD COLUMN IF NOT EXISTS usage_limit_per_customer INTEGER DEFAULT 1;
ALTER TABLE promotions ADD COLUMN IF NOT EXISTS maximum_discount_amount DECIMAL(10,2);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_promotions_active ON promotions(is_active);
CREATE INDEX IF NOT EXISTS idx_promotions_dates ON promotions(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_promotions_code ON promotions(code);
CREATE INDEX IF NOT EXISTS idx_promotion_products_promotion ON promotion_products(promotion_id);
CREATE INDEX IF NOT EXISTS idx_promotion_categories_promotion ON promotion_categories(promotion_id);

COMMIT;

SELECT 'Step 1 completed: All promotion tables created' as status;
