# Quick Fix Guide - Database & Server Setup

The console logs show several critical issues that need to be resolved. Follow these steps in order to get Best Brightness working.

## 🚨 Critical Issues Identified

1. **Database Error**: `Database error saving new user` - Database schema not set up
2. **Server 401 Error**: Edge functions not deployed or configured
3. **Registration Failure**: User profile creation trigger missing

## 🔧 Step 1: Database Setup (CRITICAL)

### 1.1 Run Database Schema in Supabase

1. **Open Supabase Dashboard** → Go to your project: `yusvpxltvvlhubwqeuzi`
2. **Navigate to SQL Editor** → Click "SQL Editor" in the left sidebar
3. **Run the Database Schema** → Copy and paste the following script:

```sql
-- STEP 1: Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'cashier', 'staff', 'manager', 'admin')),
    phone TEXT,
    address JSONB DEFAULT '{}',
    preferences JSONB DEFAULT '{}',
    loyalty_points INTEGER DEFAULT 100,
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- STEP 2: Create indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_active ON user_profiles(is_active);

-- STEP 3: Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- STEP 4: Create RLS policies
CREATE POLICY "Users can view their own profile"
    ON user_profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON user_profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Allow profile creation during signup"
    ON user_profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- STEP 5: Create automatic user profile creation function
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

-- STEP 6: Create trigger for automatic profile creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_user_profile();

-- STEP 7: Create categories table
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

-- Insert default categories
INSERT INTO categories (name, slug, description) VALUES 
('Equipment', 'equipment', 'Professional cleaning equipment and machinery'),
('Detergents', 'detergents', 'Industrial and commercial cleaning detergents'),
('Supplies', 'supplies', 'Essential cleaning supplies and accessories')
ON CONFLICT (slug) DO NOTHING;

-- STEP 8: Create products table (basic version for now)
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
    is_active BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    stock_tracking BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable public read access for products and categories
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active categories"
    ON categories FOR SELECT
    USING (is_active = true);

CREATE POLICY "Anyone can view active products"
    ON products FOR SELECT
    USING (is_active = true);

-- Insert sample products
INSERT INTO products (name, slug, description, short_description, sku, barcode, category_id, price, cost_price, compare_at_price) VALUES 
(
    'Professional Vacuum Cleaner Pro-X1',
    'professional-vacuum-cleaner-pro-x1',
    'High-performance commercial vacuum cleaner designed for heavy-duty cleaning operations.',
    'Commercial-grade vacuum with HEPA filtration',
    'VAC-PRO-X1-001',
    '1234567890123',
    (SELECT id FROM categories WHERE slug = 'equipment'),
    499.99,
    299.99,
    599.99
),
(
    'Multi-Surface Disinfectant 5L',
    'multi-surface-disinfectant-5l',
    'Hospital-grade disinfectant effective against 99.9% of bacteria and viruses.',
    'Hospital-grade disinfectant, 5L bottle',
    'DIS-MULTI-5L-001',
    '2345678901234',
    (SELECT id FROM categories WHERE slug = 'detergents'),
    89.99,
    45.00,
    109.99
),
(
    'Microfiber Cleaning Cloths (Pack of 50)',
    'microfiber-cleaning-cloths-pack-50',
    'Premium microfiber cleaning cloths perfect for dusting, polishing, and general cleaning.',
    'Premium microfiber cloths, 50-pack',
    'CLO-MICRO-50-001',
    '3456789012345',
    (SELECT id FROM categories WHERE slug = 'supplies'),
    24.99,
    12.50,
    34.99
)
ON CONFLICT (slug) DO NOTHING;
```

4. **Click "Run"** to execute the script
5. **Verify Success** → You should see "Success. No rows returned" for each statement

### 1.2 Verify Database Setup

Run this verification query in the SQL Editor:

```sql
-- Check if tables were created successfully
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
ORDER BY table_name;
```

You should see:
- `categories: 3`
- `products: 3` 
- `user_profiles: 0` (will increase after users register)

## 🚀 Step 2: Fix Edge Functions (Server Setup)

### 2.1 Check if Edge Functions are Deployed

1. **Go to Supabase Dashboard** → Functions tab
2. **Look for `make-server-8880f2f2`** function
3. **If it doesn't exist**, you need to deploy it

### 2.2 Deploy Edge Functions (if needed)

If you have Supabase CLI installed:

```bash
# Deploy the edge function
supabase functions deploy make-server-8880f2f2 --project-ref yusvpxltvvlhubwqeuzi
```

If you don't have CLI, create the function manually:

1. **Go to Functions** → Click "Create a new function"
2. **Function name**: `make-server-8880f2f2`
3. **Copy the content from** `/supabase/functions/server/index.tsx`

### 2.3 Set Environment Variables

1. **Go to Settings** → Environment Variables
2. **Add these variables**:
   ```
   SUPABASE_URL=https://yusvpxltvvlhubwqeuzi.supabase.co
   SUPABASE_ANON_KEY=<your-anon-key>
   SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
   ```

## 🔐 Step 3: Test Authentication Setup

### 3.1 Enable Email Confirmation (Optional)

1. **Go to Authentication** → Settings
2. **Email Templates** → Confirm signup
3. **Set redirect URL**: `http://localhost:3000/auth/confirm`

### 3.2 Test Registration

1. **Open your app** → Go to `/register`
2. **Try registering** with a new email
3. **Check console** → Should not show database errors anymore

## 🧪 Step 4: Quick Test Checklist

After completing the above steps, verify:

- [ ] ✅ Database tables exist (`user_profiles`, `categories`, `products`)
- [ ] ✅ Sample data is loaded (3 categories, 3 products)
- [ ] ✅ User registration works without database errors
- [ ] ✅ Server health check returns 200 (not 401)
- [ ] ✅ User can register and receive email confirmation
- [ ] ✅ User can login after email confirmation

## 🐛 Common Issues & Solutions

### Issue 1: "Database error saving new user"
**Cause**: User profiles table doesn't exist or trigger is missing
**Solution**: Run Step 1.1 database schema script

### Issue 2: "Server responded with status 401"
**Cause**: Edge functions not deployed or environment variables missing
**Solution**: Complete Step 2 (Edge Functions setup)

### Issue 3: "Invalid login credentials"
**Cause**: User registration failed, so no user exists to login
**Solution**: Fix registration first (Steps 1-2), then try login

### Issue 4: "Failed to fetch"
**Cause**: Network issues or server not running
**Solution**: Check Supabase project status and edge function deployment

## 📝 After Setup Verification

Once everything is working, you should see:

```
✅ Supabase client initialized successfully
✅ Database is set up  
✅ Server health check passed
✅ User registration successful
✅ Email confirmation sent
✅ Login successful
```

## 🎯 Next Steps

After fixing these core issues:

1. **Complete the full database schema** using `DATABASE_SETUP.md`
2. **Set up email templates** for better user experience
3. **Deploy edge functions** for full backend functionality
4. **Test all user roles** (customer, cashier, staff, admin)
5. **Configure production environment** variables

## 🆘 Still Having Issues?

If problems persist:

1. **Check Supabase project status** → Dashboard → Settings
2. **Review console logs** for specific error messages
3. **Verify environment variables** are set correctly
4. **Test database connection** with simple queries
5. **Check edge function logs** in Supabase Functions tab

The most critical step is **Step 1 (Database Setup)** - this must be completed first before anything else will work.