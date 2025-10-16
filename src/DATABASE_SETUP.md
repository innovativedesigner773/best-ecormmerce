# Best Brightness Database Setup

This document contains all the SQL scripts required to set up the complete database schema for the Best Brightness e-commerce platform.

## Overview

The Best Brightness platform requires a comprehensive database schema to support:
- **Multi-role user management** (Customer, Cashier, Staff, Manager, Admin)
- **Product catalog** with categories and inventory tracking
- **Shopping cart** and order management
- **Promotions** and discount systems
- **Barcode scanning** integration
- **POS system** functionality
- **Audit logging** and analytics

## Database Schema

### 1. Core Tables

Run these scripts in your Supabase SQL Editor in the following order:

#### 1.1 User Profiles Table

```sql
-- User profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'cashier', 'staff', 'manager', 'admin')),
    phone TEXT,
    address JSONB DEFAULT '{}',
    preferences JSONB DEFAULT '{}',
    loyalty_points INTEGER DEFAULT 100, -- Welcome bonus
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_active ON user_profiles(is_active);
```

#### 1.2 Categories Table

```sql
-- Product categories table
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    image_url TEXT,
    parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_active ON categories(is_active);

-- Insert default categories
INSERT INTO categories (name, slug, description) VALUES 
('Equipment', 'equipment', 'Professional cleaning equipment and machinery'),
('Detergents', 'detergents', 'Industrial and commercial cleaning detergents'),
('Supplies', 'supplies', 'Essential cleaning supplies and accessories')
ON CONFLICT (slug) DO NOTHING;
```

#### 1.3 Products Table

```sql
-- Products table
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    short_description TEXT,
    sku TEXT UNIQUE,
    barcode TEXT UNIQUE,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    cost_price DECIMAL(10,2) CHECK (cost_price >= 0),
    compare_at_price DECIMAL(10,2) CHECK (compare_at_price >= 0),
    currency TEXT DEFAULT 'USD',
    images JSONB DEFAULT '[]',
    specifications JSONB DEFAULT '{}',
    features JSONB DEFAULT '[]',
    tags TEXT[] DEFAULT '{}',
    weight_kg DECIMAL(8,3),
    dimensions JSONB DEFAULT '{}', -- {length, width, height}
    is_active BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    stock_tracking BOOLEAN DEFAULT true,
    requires_shipping BOOLEAN DEFAULT true,
    meta_title TEXT,
    meta_description TEXT,
    created_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(is_featured);
CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);
CREATE INDEX IF NOT EXISTS idx_products_tags ON products USING GIN(tags);

-- Full text search index
CREATE INDEX IF NOT EXISTS idx_products_search ON products USING GIN(
    to_tsvector('english', name || ' ' || COALESCE(description, '') || ' ' || COALESCE(short_description, ''))
);
```

#### 1.4 Inventory Table

```sql
-- Inventory tracking table
CREATE TABLE IF NOT EXISTS inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    location TEXT DEFAULT 'main_warehouse',
    quantity_available INTEGER NOT NULL DEFAULT 0 CHECK (quantity_available >= 0),
    quantity_reserved INTEGER NOT NULL DEFAULT 0 CHECK (quantity_reserved >= 0),
    quantity_incoming INTEGER NOT NULL DEFAULT 0 CHECK (quantity_incoming >= 0),
    reorder_point INTEGER DEFAULT 10,
    reorder_quantity INTEGER DEFAULT 50,
    last_restocked_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(product_id, location)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_inventory_product ON inventory(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_location ON inventory(location);
CREATE INDEX IF NOT EXISTS idx_inventory_low_stock ON inventory(quantity_available);
```

#### 1.5 Orders Table

```sql
-- Orders table
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number TEXT NOT NULL UNIQUE,
    customer_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    customer_email TEXT NOT NULL,
    customer_info JSONB NOT NULL DEFAULT '{}', -- name, phone, etc.
    billing_address JSONB NOT NULL DEFAULT '{}',
    shipping_address JSONB DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'
    )),
    payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN (
        'pending', 'paid', 'failed', 'refunded', 'partially_refunded'
    )),
    payment_method TEXT,
    payment_details JSONB DEFAULT '{}',
    subtotal DECIMAL(10,2) NOT NULL CHECK (subtotal >= 0),
    tax_amount DECIMAL(10,2) DEFAULT 0 CHECK (tax_amount >= 0),
    shipping_amount DECIMAL(10,2) DEFAULT 0 CHECK (shipping_amount >= 0),
    discount_amount DECIMAL(10,2) DEFAULT 0 CHECK (discount_amount >= 0),
    total DECIMAL(10,2) NOT NULL CHECK (total >= 0),
    currency TEXT DEFAULT 'USD',
    notes TEXT,
    tracking_number TEXT,
    processed_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    processed_at TIMESTAMPTZ,
    shipped_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_email ON orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);
```

#### 1.6 Order Items Table

```sql
-- Order items table
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    product_snapshot JSONB NOT NULL, -- Store product details at time of order
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
    total_price DECIMAL(10,2) NOT NULL CHECK (total_price >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id);
```

#### 1.7 Cart Items Table

```sql
-- Shopping cart items table
CREATE TABLE IF NOT EXISTS cart_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    session_id TEXT, -- For guest users
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, product_id),
    UNIQUE(session_id, product_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_cart_items_user ON cart_items(user_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_session ON cart_items(session_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_product ON cart_items(product_id);
```

#### 1.8 Favourites Table

```sql
-- User favourites/wishlist table
CREATE TABLE IF NOT EXISTS favourites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, product_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_favourites_user ON favourites(user_id);
CREATE INDEX IF NOT EXISTS idx_favourites_product ON favourites(product_id);
```

#### 1.9 Promotions Table

```sql
-- Promotions table
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_promotions_code ON promotions(code);
CREATE INDEX IF NOT EXISTS idx_promotions_active ON promotions(is_active);
CREATE INDEX IF NOT EXISTS idx_promotions_dates ON promotions(start_date, end_date);
```

#### 1.10 Promotion Products Table

```sql
-- Many-to-many relationship between promotions and products
CREATE TABLE IF NOT EXISTS promotion_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    promotion_id UUID NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(promotion_id, product_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_promotion_products_promotion ON promotion_products(promotion_id);
CREATE INDEX IF NOT EXISTS idx_promotion_products_product ON promotion_products(product_id);
```

#### 1.11 Barcode Scans Table

```sql
-- Barcode scanning history table
CREATE TABLE IF NOT EXISTS barcode_scans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barcode TEXT NOT NULL,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    scanned_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    scan_type TEXT DEFAULT 'lookup' CHECK (scan_type IN ('lookup', 'inventory', 'pos_sale')),
    context JSONB DEFAULT '{}', -- Additional context data
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_barcode_scans_barcode ON barcode_scans(barcode);
CREATE INDEX IF NOT EXISTS idx_barcode_scans_product ON barcode_scans(product_id);
CREATE INDEX IF NOT EXISTS idx_barcode_scans_user ON barcode_scans(scanned_by);
CREATE INDEX IF NOT EXISTS idx_barcode_scans_created ON barcode_scans(created_at);
```

#### 1.12 Audit Logs Table

```sql
-- Audit logs for tracking system changes
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,
    record_id UUID,
    action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_values JSONB,
    new_values JSONB,
    changed_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    changed_at TIMESTAMPTZ DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_table ON audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_record ON audit_logs(record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(changed_by);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(changed_at);
```

### 2. Database Functions

#### 2.1 Update Timestamps Function

```sql
-- Function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the trigger to tables with updated_at columns
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at
    BEFORE UPDATE ON categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inventory_updated_at
    BEFORE UPDATE ON inventory
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cart_items_updated_at
    BEFORE UPDATE ON cart_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_promotions_updated_at
    BEFORE UPDATE ON promotions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

#### 2.2 User Profile Creation Function

```sql
-- Function to create user profile when a new user signs up
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_profiles (
        id,
        email,
        first_name,
        last_name,
        role
    )
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'role', 'customer')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create user profile
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_user_profile();
```

#### 2.3 Order Number Generation Function

```sql
-- Function to generate unique order numbers
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
DECLARE
    order_num TEXT;
    counter INTEGER;
BEGIN
    -- Format: BB-YYYYMMDD-NNNN (BB = Best Brightness)
    SELECT COUNT(*) + 1 INTO counter
    FROM orders
    WHERE DATE(created_at) = CURRENT_DATE;
    
    order_num := 'BB-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(counter::TEXT, 4, '0');
    
    RETURN order_num;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate order numbers
CREATE OR REPLACE FUNCTION set_order_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
        NEW.order_number := generate_order_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_order_number_trigger
    BEFORE INSERT ON orders
    FOR EACH ROW
    EXECUTE FUNCTION set_order_number();
```

#### 2.4 Inventory Management Functions

```sql
-- Function to check product availability
CREATE OR REPLACE FUNCTION check_product_availability(
    p_product_id UUID,
    p_quantity INTEGER DEFAULT 1,
    p_location TEXT DEFAULT 'main_warehouse'
)
RETURNS BOOLEAN AS $$
DECLARE
    available_qty INTEGER;
BEGIN
    SELECT quantity_available - quantity_reserved
    INTO available_qty
    FROM inventory
    WHERE product_id = p_product_id
    AND location = p_location;
    
    RETURN COALESCE(available_qty, 0) >= p_quantity;
END;
$$ LANGUAGE plpgsql;

-- Function to reserve inventory
CREATE OR REPLACE FUNCTION reserve_inventory(
    p_product_id UUID,
    p_quantity INTEGER,
    p_location TEXT DEFAULT 'main_warehouse'
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if enough inventory is available
    IF NOT check_product_availability(p_product_id, p_quantity, p_location) THEN
        RETURN FALSE;
    END IF;
    
    -- Reserve the inventory
    UPDATE inventory
    SET quantity_reserved = quantity_reserved + p_quantity,
        updated_at = NOW()
    WHERE product_id = p_product_id
    AND location = p_location;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to release reserved inventory
CREATE OR REPLACE FUNCTION release_inventory(
    p_product_id UUID,
    p_quantity INTEGER,
    p_location TEXT DEFAULT 'main_warehouse'
)
RETURNS VOID AS $$
BEGIN
    UPDATE inventory
    SET quantity_reserved = GREATEST(0, quantity_reserved - p_quantity),
        updated_at = NOW()
    WHERE product_id = p_product_id
    AND location = p_location;
END;
$$ LANGUAGE plpgsql;

-- Function to fulfill inventory (convert reserved to sold)
CREATE OR REPLACE FUNCTION fulfill_inventory(
    p_product_id UUID,
    p_quantity INTEGER,
    p_location TEXT DEFAULT 'main_warehouse'
)
RETURNS VOID AS $$
BEGIN
    UPDATE inventory
    SET quantity_available = quantity_available - p_quantity,
        quantity_reserved = GREATEST(0, quantity_reserved - p_quantity),
        updated_at = NOW()
    WHERE product_id = p_product_id
    AND location = p_location;
END;
$$ LANGUAGE plpgsql;
```

### 3. Row Level Security (RLS) Policies

#### 3.1 Enable RLS on all tables

```sql
-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE favourites ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotion_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE barcode_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
```

#### 3.2 User Profiles Policies

```sql
-- User profiles policies
CREATE POLICY "Users can view their own profile"
    ON user_profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON user_profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Staff can view all profiles"
    ON user_profiles FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid()
            AND role IN ('staff', 'manager', 'admin')
        )
    );

CREATE POLICY "Admins can manage all profiles"
    ON user_profiles FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid()
            AND role IN ('admin', 'manager')
        )
    );
```

#### 3.3 Products and Categories Policies

```sql
-- Categories policies (public read, staff+ write)
CREATE POLICY "Anyone can view active categories"
    ON categories FOR SELECT
    USING (is_active = true);

CREATE POLICY "Staff can manage categories"
    ON categories FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid()
            AND role IN ('staff', 'manager', 'admin')
        )
    );

-- Products policies (public read, staff+ write)
CREATE POLICY "Anyone can view active products"
    ON products FOR SELECT
    USING (is_active = true);

CREATE POLICY "Staff can manage products"
    ON products FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid()
            AND role IN ('staff', 'manager', 'admin')
        )
    );

-- Inventory policies (staff+ only)
CREATE POLICY "Staff can view inventory"
    ON inventory FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid()
            AND role IN ('cashier', 'staff', 'manager', 'admin')
        )
    );

CREATE POLICY "Staff can manage inventory"
    ON inventory FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid()
            AND role IN ('staff', 'manager', 'admin')
        )
    );
```

#### 3.4 Orders Policies

```sql
-- Orders policies
CREATE POLICY "Users can view their own orders"
    ON orders FOR SELECT
    USING (customer_id = auth.uid());

CREATE POLICY "Users can create orders"
    ON orders FOR INSERT
    WITH CHECK (customer_id = auth.uid() OR auth.uid() IS NULL);

CREATE POLICY "Staff can view all orders"
    ON orders FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid()
            AND role IN ('cashier', 'staff', 'manager', 'admin')
        )
    );

CREATE POLICY "Staff can manage orders"
    ON orders FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid()
            AND role IN ('cashier', 'staff', 'manager', 'admin')
        )
    );

-- Order items policies
CREATE POLICY "Users can view their order items"
    ON order_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM orders
            WHERE orders.id = order_items.order_id
            AND orders.customer_id = auth.uid()
        )
    );

CREATE POLICY "Staff can view all order items"
    ON order_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid()
            AND role IN ('cashier', 'staff', 'manager', 'admin')
        )
    );

CREATE POLICY "Anyone can create order items"
    ON order_items FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Staff can manage order items"
    ON order_items FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid()
            AND role IN ('staff', 'manager', 'admin')
        )
    );
```

#### 3.5 Cart and Favourites Policies

```sql
-- Cart items policies
CREATE POLICY "Users can manage their cart"
    ON cart_items FOR ALL
    USING (user_id = auth.uid());

CREATE POLICY "Guest cart items"
    ON cart_items FOR ALL
    USING (user_id IS NULL AND session_id IS NOT NULL);

-- Favourites policies
CREATE POLICY "Users can manage their favourites"
    ON favourites FOR ALL
    USING (user_id = auth.uid());
```

#### 3.6 Promotions Policies

```sql
-- Promotions policies
CREATE POLICY "Anyone can view active promotions"
    ON promotions FOR SELECT
    USING (is_active = true AND start_date <= NOW() AND (end_date IS NULL OR end_date >= NOW()));

CREATE POLICY "Staff can manage promotions"
    ON promotions FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid()
            AND role IN ('manager', 'admin')
        )
    );

-- Promotion products policies
CREATE POLICY "Anyone can view promotion products"
    ON promotion_products FOR SELECT
    USING (true);

CREATE POLICY "Staff can manage promotion products"
    ON promotion_products FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid()
            AND role IN ('manager', 'admin')
        )
    );
```

#### 3.7 Barcode Scans and Audit Logs Policies

```sql
-- Barcode scans policies
CREATE POLICY "Staff can view barcode scans"
    ON barcode_scans FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid()
            AND role IN ('cashier', 'staff', 'manager', 'admin')
        )
    );

CREATE POLICY "Staff can create barcode scans"
    ON barcode_scans FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid()
            AND role IN ('cashier', 'staff', 'manager', 'admin')
        )
    );

-- Audit logs policies (admin only)
CREATE POLICY "Admins can view audit logs"
    ON audit_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid()
            AND role = 'admin'
        )
    );

CREATE POLICY "System can create audit logs"
    ON audit_logs FOR INSERT
    WITH CHECK (true);
```

### 4. Sample Data

#### 4.1 Sample Products

```sql
-- Insert sample products for testing
INSERT INTO products (name, slug, description, short_description, sku, barcode, category_id, price, cost_price, compare_at_price, images, specifications, features, tags) VALUES 
(
    'Professional Vacuum Cleaner Pro-X1',
    'professional-vacuum-cleaner-pro-x1',
    'High-performance commercial vacuum cleaner designed for heavy-duty cleaning operations. Features HEPA filtration, powerful motor, and durable construction.',
    'Commercial-grade vacuum with HEPA filtration',
    'VAC-PRO-X1-001',
    '1234567890123',
    (SELECT id FROM categories WHERE slug = 'equipment'),
    499.99,
    299.99,
    599.99,
    '["https://example.com/vacuum1.jpg", "https://example.com/vacuum2.jpg"]',
    '{"motor_power": "1400W", "capacity": "10L", "filtration": "HEPA", "noise_level": "68dB"}',
    '["HEPA Filtration", "Commercial Grade", "10L Capacity", "Low Noise Operation"]',
    '{"industrial", "vacuum", "hepa", "commercial"}'
),
(
    'Multi-Surface Disinfectant 5L',
    'multi-surface-disinfectant-5l',
    'Hospital-grade disinfectant effective against 99.9% of bacteria and viruses. Safe for use on multiple surfaces including glass, metal, and plastic.',
    'Hospital-grade disinfectant, 5L bottle',
    'DIS-MULTI-5L-001',
    '2345678901234',
    (SELECT id FROM categories WHERE slug = 'detergents'),
    89.99,
    45.00,
    109.99,
    '["https://example.com/disinfectant1.jpg"]',
    '{"volume": "5L", "active_ingredient": "Quaternary Ammonium", "kill_rate": "99.9%", "contact_time": "30 seconds"}',
    '["99.9% Effective", "Multi-Surface", "Hospital Grade", "5L Economy Size"]',
    '{"disinfectant", "commercial", "hospital-grade", "multi-surface"}'
),
(
    'Microfiber Cleaning Cloths (Pack of 50)',
    'microfiber-cleaning-cloths-pack-50',
    'Premium microfiber cleaning cloths perfect for dusting, polishing, and general cleaning. Lint-free and reusable up to 500 washes.',
    'Premium microfiber cloths, 50-pack',
    'CLO-MICRO-50-001',
    '3456789012345',
    (SELECT id FROM categories WHERE slug = 'supplies'),
    24.99,
    12.50,
    34.99,
    '["https://example.com/cloths1.jpg"]',
    '{"material": "80% Polyester, 20% Polyamide", "size": "40x40cm", "gsm": "300", "wash_cycles": "500+"}',
    '["Lint-Free", "Reusable", "Premium Quality", "50 Pack"]',
    '{"microfiber", "cloths", "cleaning", "reusable"}'
)
ON CONFLICT (slug) DO NOTHING;

-- Insert inventory for sample products
INSERT INTO inventory (product_id, quantity_available, reorder_point, reorder_quantity) 
SELECT id, 25, 5, 20 FROM products
ON CONFLICT (product_id, location) DO NOTHING;
```

### 5. Setup Verification Queries

```sql
-- Query to verify database setup
SELECT 
    'user_profiles' as table_name,
    COUNT(*) as record_count
FROM user_profiles
UNION ALL
SELECT 
    'categories' as table_name,
    COUNT(*) as record_count
FROM categories
UNION ALL
SELECT 
    'products' as table_name,
    COUNT(*) as record_count
FROM products
UNION ALL
SELECT 
    'inventory' as table_name,
    COUNT(*) as record_count
FROM inventory
ORDER BY table_name;

-- Check RLS policies
SELECT schemaname, tablename, policyname, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

## Setup Instructions

1. **Create the database tables** by running the SQL scripts in order (1.1 through 1.12)
2. **Set up database functions** by running section 2 scripts
3. **Configure Row Level Security** by running section 3 scripts
4. **Insert sample data** by running section 4 scripts (optional)
5. **Verify setup** by running the verification queries in section 5

## Notes

- All tables include proper indexing for performance
- Row Level Security is configured for multi-role access control
- Automatic triggers handle timestamps and user profile creation
- The schema supports the complete Best Brightness feature set
- Sample data is provided for testing purposes

## Maintenance

Regular maintenance tasks:
- Monitor inventory levels and reorder points
- Clean up old barcode scan logs
- Archive completed orders
- Update promotion usage counts
- Review audit logs for security

This database schema provides a solid foundation for the Best Brightness e-commerce platform with room for future expansion and optimization.