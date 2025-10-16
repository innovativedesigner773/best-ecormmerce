-- ============================================
-- EXACT SCHEMA SETUP FOR BEST BRIGHTNESS
-- ============================================
-- This SQL script sets up the database exactly as specified
-- for the clean signup implementation

-- Step 1: Create user_profiles table with your exact schema
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id uuid NOT NULL,
  email text NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  role text NOT NULL DEFAULT 'customer'::text,
  phone text NULL,
  address jsonb NULL DEFAULT '{}'::jsonb,
  preferences jsonb NULL DEFAULT '{}'::jsonb,
  loyalty_points integer NULL DEFAULT 100,
  is_active boolean NULL DEFAULT true,
  last_login_at timestamp with time zone NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  
  -- Constraints exactly as specified
  CONSTRAINT user_profiles_pkey PRIMARY KEY (id),
  CONSTRAINT user_profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users (id) ON DELETE CASCADE,
  CONSTRAINT user_profiles_role_check CHECK (
    role = ANY (ARRAY['customer','cashier','staff','manager','admin'])
  )
);

-- Step 2: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_active ON public.user_profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_user_profiles_created_at ON public.user_profiles(created_at);

-- Step 3: Enable Row Level Security
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Step 4: Drop existing policies to recreate them
DROP POLICY IF EXISTS "Users can view their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Allow profile creation during signup" ON public.user_profiles;
DROP POLICY IF EXISTS "Staff can view all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.user_profiles;

-- Step 5: Create comprehensive RLS policies

-- Allow profile creation during signup (very permissive for INSERT)
CREATE POLICY "Allow profile creation during signup"
  ON public.user_profiles FOR INSERT
  WITH CHECK (true);

-- Users can view their own profile
CREATE POLICY "Users can view their own profile"
  ON public.user_profiles FOR SELECT
  USING (
    auth.uid() = id 
    OR 
    EXISTS (
      SELECT 1 FROM public.user_profiles up 
      WHERE up.id = auth.uid() 
      AND up.role IN ('staff', 'manager', 'admin')
    )
  );

-- Users can update their own profile
CREATE POLICY "Users can update their own profile"
  ON public.user_profiles FOR UPDATE
  USING (
    auth.uid() = id 
    OR 
    EXISTS (
      SELECT 1 FROM public.user_profiles up 
      WHERE up.id = auth.uid() 
      AND up.role IN ('admin', 'manager')
    )
  );

-- Staff can view all profiles (for management purposes)
CREATE POLICY "Staff can view all profiles"
  ON public.user_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up 
      WHERE up.id = auth.uid() 
      AND up.role IN ('staff', 'manager', 'admin')
    )
  );

-- Admins can manage all profiles
CREATE POLICY "Admins can manage all profiles"
  ON public.user_profiles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up 
      WHERE up.id = auth.uid() 
      AND up.role IN ('admin', 'manager')
    )
  );

-- Step 6: Create or replace the user profile creation trigger function
CREATE OR REPLACE FUNCTION public.create_user_profile()
RETURNS TRIGGER AS $$
DECLARE
    user_role TEXT;
    user_first_name TEXT;
    user_last_name TEXT;
    user_phone TEXT;
    profile_exists BOOLEAN;
BEGIN
    -- Check if profile already exists to prevent duplicates
    SELECT EXISTS(
        SELECT 1 FROM public.user_profiles 
        WHERE id = NEW.id
    ) INTO profile_exists;
    
    IF profile_exists THEN
        RAISE NOTICE 'Profile already exists for user %, skipping creation', NEW.id;
        RETURN NEW;
    END IF;

    -- Extract metadata with safe defaults
    user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'customer');
    user_first_name := COALESCE(NEW.raw_user_meta_data->>'first_name', 'User');
    user_last_name := COALESCE(NEW.raw_user_meta_data->>'last_name', '');
    user_phone := COALESCE(NEW.raw_user_meta_data->>'phone', NULL);

    -- Validate role - if invalid, default to customer
    IF user_role NOT IN ('customer', 'cashier', 'staff', 'manager', 'admin') THEN
        user_role := 'customer';
    END IF;

    -- Insert user profile with comprehensive error handling
    BEGIN
        INSERT INTO public.user_profiles (
            id,
            email,
            first_name,
            last_name,
            role,
            phone,
            address,
            preferences,
            loyalty_points,
            is_active,
            created_at,
            updated_at
        )
        VALUES (
            NEW.id,
            COALESCE(NEW.email, ''),
            user_first_name,
            user_last_name,
            user_role,
            user_phone,
            '{}'::jsonb,  -- Default empty address
            '{}'::jsonb,  -- Default empty preferences
            CASE WHEN user_role = 'customer' THEN 100 ELSE 0 END, -- Welcome bonus for customers
            true,
            NOW(),
            NOW()
        );
        
        RAISE NOTICE 'Successfully created profile for user % with role %', NEW.id, user_role;
        
    EXCEPTION 
        WHEN unique_violation THEN
            RAISE NOTICE 'Profile already exists for user %, ignoring duplicate', NEW.id;
        WHEN foreign_key_violation THEN
            RAISE WARNING 'Foreign key violation creating profile for user %: %', NEW.id, SQLERRM;
        WHEN check_violation THEN
            RAISE WARNING 'Check constraint violation creating profile for user %: %', NEW.id, SQLERRM;
        WHEN OTHERS THEN
            RAISE WARNING 'Unexpected error creating profile for user %: %', NEW.id, SQLERRM;
    END;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 7: Drop existing trigger and create new one
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.create_user_profile();

-- Step 8: Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 9: Create updated_at trigger for user_profiles
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Step 10: Create other essential tables if they don't exist
-- Categories table
CREATE TABLE IF NOT EXISTS public.categories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    slug text NOT NULL UNIQUE,
    description text,
    image_url text,
    parent_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
    sort_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT NOW(),
    updated_at timestamptz DEFAULT NOW()
);

-- Products table
CREATE TABLE IF NOT EXISTS public.products (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    slug text NOT NULL UNIQUE,
    description text,
    short_description text,
    sku text UNIQUE,
    barcode text UNIQUE,
    category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
    price decimal(10,2) NOT NULL CHECK (price >= 0),
    cost_price decimal(10,2) CHECK (cost_price >= 0),
    compare_at_price decimal(10,2) CHECK (compare_at_price >= 0),
    currency text DEFAULT 'USD',
    images jsonb DEFAULT '[]',
    specifications jsonb DEFAULT '{}',
    features jsonb DEFAULT '[]',
    tags text[] DEFAULT '{}',
    is_active boolean DEFAULT true,
    is_featured boolean DEFAULT false,
    stock_tracking boolean DEFAULT true,
    created_at timestamptz DEFAULT NOW(),
    updated_at timestamptz DEFAULT NOW()
);

-- Enable RLS on public tables
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Create public access policies for categories and products
DROP POLICY IF EXISTS "Anyone can view active categories" ON public.categories;
DROP POLICY IF EXISTS "Anyone can view active products" ON public.products;
DROP POLICY IF EXISTS "Staff can manage categories" ON public.categories;
DROP POLICY IF EXISTS "Staff can manage products" ON public.products;

-- Public read access for active items
CREATE POLICY "Anyone can view active categories"
    ON public.categories FOR SELECT
    USING (is_active = true);

CREATE POLICY "Anyone can view active products"
    ON public.products FOR SELECT
    USING (is_active = true);

-- Staff can manage categories and products
CREATE POLICY "Staff can manage categories"
    ON public.categories FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles up 
            WHERE up.id = auth.uid() 
            AND up.role IN ('staff', 'manager', 'admin')
        )
    );

CREATE POLICY "Staff can manage products"
    ON public.products FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles up 
            WHERE up.id = auth.uid() 
            AND up.role IN ('staff', 'manager', 'admin')
        )
    );

-- Step 11: Insert sample data
INSERT INTO public.categories (name, slug, description) VALUES 
('Equipment', 'equipment', 'Professional cleaning equipment and machinery'),
('Detergents', 'detergents', 'Industrial and commercial cleaning detergents'),
('Supplies', 'supplies', 'Essential cleaning supplies and accessories')
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    updated_at = NOW();

INSERT INTO public.products (name, slug, description, short_description, sku, barcode, category_id, price, cost_price, compare_at_price) VALUES 
(
    'Professional Vacuum Cleaner Pro-X1',
    'professional-vacuum-cleaner-pro-x1',
    'High-performance commercial vacuum cleaner designed for heavy-duty cleaning operations with HEPA filtration system.',
    'Commercial-grade vacuum with HEPA filtration',
    'VAC-PRO-X1-001',
    '1234567890123',
    (SELECT id FROM public.categories WHERE slug = 'equipment'),
    499.99,
    299.99,
    599.99
),
(
    'Multi-Surface Disinfectant 5L',
    'multi-surface-disinfectant-5l',
    'Hospital-grade disinfectant effective against 99.9% of bacteria and viruses. Safe for all surfaces.',
    'Hospital-grade disinfectant, 5L bottle',
    'DIS-MULTI-5L-001',
    '2345678901234',
    (SELECT id FROM public.categories WHERE slug = 'detergents'),
    89.99,
    45.00,
    109.99
),
(
    'Microfiber Cleaning Cloths (Pack of 50)',
    'microfiber-cleaning-cloths-pack-50',
    'Premium microfiber cleaning cloths perfect for dusting, polishing, and general cleaning. Lint-free and reusable.',
    'Premium microfiber cloths, 50-pack',
    'CLO-MICRO-50-001',
    '3456789012345',
    (SELECT id FROM public.categories WHERE slug = 'supplies'),
    24.99,
    12.50,
    34.99
)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    short_description = EXCLUDED.short_description,
    price = EXCLUDED.price,
    cost_price = EXCLUDED.cost_price,
    compare_at_price = EXCLUDED.compare_at_price,
    updated_at = NOW();

-- Step 12: Create updated_at triggers for other tables
DROP TRIGGER IF EXISTS update_categories_updated_at ON public.categories;
CREATE TRIGGER update_categories_updated_at
    BEFORE UPDATE ON public.categories
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_products_updated_at ON public.products;
CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON public.products
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Step 13: Final verification
SELECT 
    'Database setup complete' as status,
    (SELECT COUNT(*) FROM public.categories) as categories_count,
    (SELECT COUNT(*) FROM public.products) as products_count,
    (SELECT COUNT(*) FROM public.user_profiles) as user_profiles_count,
    (
        SELECT COUNT(*) 
        FROM information_schema.triggers 
        WHERE trigger_name = 'on_auth_user_created'
        AND event_object_schema = 'auth'
        AND event_object_table = 'users'
    ) as trigger_exists,
    (
        SELECT rowsecurity 
        FROM pg_tables 
        WHERE tablename = 'user_profiles' 
        AND schemaname = 'public'
    ) as rls_enabled;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Database setup completed successfully!';
    RAISE NOTICE '📋 Tables created: user_profiles, categories, products';
    RAISE NOTICE '🔐 RLS enabled with proper policies';
    RAISE NOTICE '⚡ Triggers created for profile creation and updated_at';
    RAISE NOTICE '📊 Sample data inserted';
    RAISE NOTICE '🚀 Ready for user registration!';
END $$;