import { createClient } from '@supabase/supabase-js';
import { toast } from 'sonner';

// Database setup utility for Best Brightness E-Commerce Platform
export class DatabaseSetup {
  private supabase: any;

  constructor() {
    // Use service role key for admin operations
    // Check multiple environment variable patterns
    const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || 
                       process.env.REACT_APP_SUPABASE_URL || 
                       process.env.VITE_SUPABASE_URL ||
                       process.env.SUPABASE_URL;
    
    const serviceRoleKey = import.meta.env?.VITE_SUPABASE_SERVICE_ROLE_KEY || 
                          process.env.REACT_APP_SUPABASE_SERVICE_ROLE_KEY || 
                          process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
                          process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Missing Supabase configuration:', {
        hasUrl: Boolean(supabaseUrl),
        hasServiceKey: Boolean(serviceRoleKey),
        availableEnvVars: Object.keys(import.meta.env || {}).filter(key => key.includes('SUPABASE'))
      });
      throw new Error('Missing Supabase configuration for database setup. Please check your environment variables.');
    }

    this.supabase = createClient(supabaseUrl, serviceRoleKey);
  }

  async initializeDatabase(progress?: (step: string, current: number, total: number) => void) {
    console.log('🚀 Starting Best Brightness database initialization...');
    const totalSteps = 8;
    let currentStep = 0;

    try {
      // Step 1: Create Enums
      progress?.('Creating database enums...', ++currentStep, totalSteps);
      await this.createEnums();
      
      // Step 2: Create Tables
      progress?.('Creating database tables...', ++currentStep, totalSteps);
      await this.createTables();
      
      // Step 3: Create Views
      progress?.('Creating database views...', ++currentStep, totalSteps);
      await this.createViews();
      
      // Step 4: Create Indexes
      progress?.('Creating database indexes...', ++currentStep, totalSteps);
      await this.createIndexes();
      
      // Step 5: Setup RLS Policies
      progress?.('Setting up security policies...', ++currentStep, totalSteps);
      await this.setupRLS();
      
      // Step 6: Create Functions
      progress?.('Creating database functions...', ++currentStep, totalSteps);
      await this.createFunctions();
      
      // Step 7: Create Triggers
      progress?.('Creating database triggers...', ++currentStep, totalSteps);
      await this.createTriggers();
      
      // Step 8: Seed Demo Data
      progress?.('Seeding demo data...', ++currentStep, totalSteps);
      await this.seedDemoData();
      
      console.log('✅ Database initialization completed successfully!');
      toast.success('Database setup completed successfully!');
      return { success: true, message: 'Database initialized successfully' };
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      toast.error('Database setup failed. Check console for details.');
      throw error;
    }
  }

  private async executeSQL(sql: string, description: string = '') {
    try {
      const { error } = await this.supabase.rpc('exec_sql', { sql });
      if (error && !error.message.includes('already exists')) {
        console.error(`Error ${description}:`, error);
        throw error;
      }
      return { success: true };
    } catch (error: any) {
      if (error.message?.includes('already exists') || error.message?.includes('does not exist')) {
        console.log(`${description} (already exists or not needed)`);
        return { success: true };
      }
      console.error(`Error ${description}:`, error);
      throw error;
    }
  }

  private async createEnums() {
    console.log('📊 Creating database enums...');
    
    const enums = [
      {
        name: 'user_role',
        sql: `CREATE TYPE user_role AS ENUM ('customer', 'admin', 'staff', 'manager', 'cashier');`
      },
      {
        name: 'product_status',
        sql: `CREATE TYPE product_status AS ENUM ('active', 'inactive', 'discontinued', 'out_of_stock');`
      },
      {
        name: 'promotion_type',
        sql: `CREATE TYPE promotion_type AS ENUM ('percentage_off', 'fixed_amount_off', 'buy_x_get_y', 'bulk_discount', 'flash_sale', 'clearance', 'seasonal');`
      },
      {
        name: 'promotion_status',
        sql: `CREATE TYPE promotion_status AS ENUM ('draft', 'scheduled', 'active', 'paused', 'expired', 'cancelled');`
      },
      {
        name: 'combo_type',
        sql: `CREATE TYPE combo_type AS ENUM ('bundle', 'mix_match', 'tiered', 'bogo');`
      },
      {
        name: 'combo_status',
        sql: `CREATE TYPE combo_status AS ENUM ('draft', 'active', 'inactive', 'expired');`
      },
      {
        name: 'order_status',
        sql: `CREATE TYPE order_status AS ENUM ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded');`
      },
      {
        name: 'payment_status',
        sql: `CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded', 'partially_refunded');`
      },
      {
        name: 'fulfillment_status',
        sql: `CREATE TYPE fulfillment_status AS ENUM ('unfulfilled', 'partial', 'fulfilled', 'restocked');`
      },
      {
        name: 'order_channel',
        sql: `CREATE TYPE order_channel AS ENUM ('online', 'pos', 'phone', 'mobile_app');`
      },
      {
        name: 'order_item_type',
        sql: `CREATE TYPE order_item_type AS ENUM ('product', 'combo', 'combo_item');`
      },
      {
        name: 'discount_type',
        sql: `CREATE TYPE discount_type AS ENUM ('percentage', 'fixed_amount', 'free_shipping', 'buy_x_get_y_free', 'buy_x_get_y_percent_off');`
      }
    ];

    for (const enumDef of enums) {
      try {
        await this.executeSQL(`DROP TYPE IF EXISTS ${enumDef.name} CASCADE;`, `dropping existing ${enumDef.name} enum`);
        await this.executeSQL(enumDef.sql, `creating ${enumDef.name} enum`);
        console.log(`✓ Created enum: ${enumDef.name}`);
      } catch (error) {
        console.warn(`Warning creating enum ${enumDef.name}:`, error);
      }
    }
  }

  private async createTables() {
    console.log('🏗️ Creating database tables...');

    const tables = [
      // Categories table
      {
        name: 'categories',
        sql: `CREATE TABLE IF NOT EXISTS categories (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL,
          slug VARCHAR(280) UNIQUE NOT NULL,
          description TEXT,
          image_url TEXT,
          parent_id UUID REFERENCES categories(id),
          sort_order INTEGER DEFAULT 0,
          is_active BOOLEAN DEFAULT TRUE,
          seo_title VARCHAR(200),
          seo_description TEXT,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );`
      },

      // User profiles table (extends auth.users)
      {
        name: 'user_profiles',
        sql: `CREATE TABLE IF NOT EXISTS user_profiles (
          id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
          role user_role NOT NULL DEFAULT 'customer',
          first_name VARCHAR(100),
          last_name VARCHAR(100),
          phone VARCHAR(20),
          avatar_url TEXT,
          is_active BOOLEAN DEFAULT TRUE,
          last_login TIMESTAMP,
          loyalty_points INTEGER DEFAULT 0,
          total_spent DECIMAL(12,2) DEFAULT 0,
          address JSONB DEFAULT '{}',
          preferences JSONB DEFAULT '{}',
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );`
      },

      // Products table
      {
        name: 'products',
        sql: `CREATE TABLE IF NOT EXISTS products (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          sku VARCHAR(50) UNIQUE NOT NULL,
          barcode VARCHAR(50) UNIQUE NOT NULL,
          name VARCHAR(255) NOT NULL,
          slug VARCHAR(280) UNIQUE NOT NULL,
          description TEXT,
          short_description TEXT,
          category_id UUID REFERENCES categories(id),
          brand VARCHAR(100),
          price DECIMAL(10,2) NOT NULL,
          cost_price DECIMAL(10,2),
          compare_at_price DECIMAL(10,2),
          weight DECIMAL(8,2),
          dimensions JSONB DEFAULT '{}',
          status product_status DEFAULT 'active',
          is_featured BOOLEAN DEFAULT FALSE,
          requires_shipping BOOLEAN DEFAULT TRUE,
          is_taxable BOOLEAN DEFAULT TRUE,
          tax_rate DECIMAL(5,4) DEFAULT 0.15,
          tags TEXT[],
          attributes JSONB DEFAULT '{}',
          images TEXT[] DEFAULT '{}',
          seo_title VARCHAR(200),
          seo_description TEXT,
          rating_average DECIMAL(3,2) DEFAULT 0,
          rating_count INTEGER DEFAULT 0,
          view_count INTEGER DEFAULT 0,
          stock_quantity INTEGER DEFAULT 0,
          low_stock_threshold INTEGER DEFAULT 10,
          is_combo_eligible BOOLEAN DEFAULT TRUE,
          min_quantity INTEGER DEFAULT 1,
          max_quantity_per_order INTEGER,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          created_by UUID REFERENCES user_profiles(id)
        );`
      },

      // Promotions table
      {
        name: 'promotions',
        sql: `CREATE TABLE IF NOT EXISTS promotions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL,
          description TEXT,
          type promotion_type NOT NULL,
          status promotion_status DEFAULT 'draft',
          priority INTEGER DEFAULT 0,
          discount_type discount_type NOT NULL,
          discount_value DECIMAL(10,2) NOT NULL,
          minimum_quantity INTEGER DEFAULT 1,
          maximum_quantity INTEGER,
          minimum_order_amount DECIMAL(10,2),
          maximum_discount_amount DECIMAL(10,2),
          usage_limit INTEGER,
          usage_limit_per_customer INTEGER DEFAULT 1,
          times_used INTEGER DEFAULT 0,
          requires_code BOOLEAN DEFAULT FALSE,
          promo_code VARCHAR(50) UNIQUE,
          stackable BOOLEAN DEFAULT FALSE,
          applies_to_sale_items BOOLEAN DEFAULT TRUE,
          customer_eligibility JSONB DEFAULT '{}',
          starts_at TIMESTAMP NOT NULL,
          ends_at TIMESTAMP,
          is_featured BOOLEAN DEFAULT FALSE,
          banner_image_url TEXT,
          terms_conditions TEXT,
          created_by UUID REFERENCES user_profiles(id),
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );`
      },

      // Promotion Products table
      {
        name: 'promotion_products',
        sql: `CREATE TABLE IF NOT EXISTS promotion_products (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          promotion_id UUID REFERENCES promotions(id) ON DELETE CASCADE,
          product_id UUID REFERENCES products(id) ON DELETE CASCADE,
          discounted_price DECIMAL(10,2) NOT NULL,
          created_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(promotion_id, product_id)
        );`
      },

      // Promotion Categories table
      {
        name: 'promotion_categories',
        sql: `CREATE TABLE IF NOT EXISTS promotion_categories (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          promotion_id UUID REFERENCES promotions(id) ON DELETE CASCADE,
          category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
          created_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(promotion_id, category_id)
        );`
      },

      // Combos table
      {
        name: 'combos',
        sql: `CREATE TABLE IF NOT EXISTS combos (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL,
          description TEXT,
          combo_type combo_type NOT NULL DEFAULT 'bundle',
          status combo_status DEFAULT 'active',
          original_price DECIMAL(10,2) NOT NULL,
          combo_price DECIMAL(10,2) NOT NULL,
          image_url TEXT,
          is_featured BOOLEAN DEFAULT FALSE,
          minimum_quantity INTEGER DEFAULT 1,
          maximum_quantity INTEGER DEFAULT 10,
          usage_limit INTEGER,
          times_purchased INTEGER DEFAULT 0,
          requires_all_items BOOLEAN DEFAULT TRUE,
          starts_at TIMESTAMP DEFAULT NOW(),
          ends_at TIMESTAMP,
          tags TEXT[],
          created_by UUID REFERENCES user_profiles(id),
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );`
      },

      // Combo Items table
      {
        name: 'combo_items',
        sql: `CREATE TABLE IF NOT EXISTS combo_items (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          combo_id UUID REFERENCES combos(id) ON DELETE CASCADE,
          product_id UUID REFERENCES products(id) ON DELETE CASCADE,
          quantity INTEGER NOT NULL DEFAULT 1,
          is_required BOOLEAN DEFAULT TRUE,
          can_substitute BOOLEAN DEFAULT FALSE,
          substitute_category_id UUID REFERENCES categories(id),
          sort_order INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(combo_id, product_id)
        );`
      },

      // Orders table
      {
        name: 'orders',
        sql: `CREATE TABLE IF NOT EXISTS orders (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          order_number VARCHAR(50) UNIQUE NOT NULL,
          customer_id UUID REFERENCES user_profiles(id),
          status order_status NOT NULL DEFAULT 'pending',
          payment_status payment_status NOT NULL DEFAULT 'pending',
          fulfillment_status fulfillment_status DEFAULT 'unfulfilled',
          channel order_channel NOT NULL DEFAULT 'online',
          currency VARCHAR(3) DEFAULT 'ZAR',
          subtotal DECIMAL(10,2) NOT NULL,
          tax_amount DECIMAL(10,2) DEFAULT 0,
          shipping_amount DECIMAL(10,2) DEFAULT 0,
          discount_amount DECIMAL(10,2) DEFAULT 0,
          promotion_discount DECIMAL(10,2) DEFAULT 0,
          combo_discount DECIMAL(10,2) DEFAULT 0,
          loyalty_points_used INTEGER DEFAULT 0,
          loyalty_discount DECIMAL(10,2) DEFAULT 0,
          total_amount DECIMAL(10,2) NOT NULL,
          notes TEXT,
          tags TEXT[],
          applied_promotions JSONB DEFAULT '[]',
          applied_combos JSONB DEFAULT '[]',
          billing_address JSONB,
          shipping_address JSONB,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          shipped_at TIMESTAMP,
          delivered_at TIMESTAMP,
          cancelled_at TIMESTAMP,
          cancellation_reason TEXT,
          processed_by UUID REFERENCES user_profiles(id)
        );`
      },

      // Order Items table
      {
        name: 'order_items',
        sql: `CREATE TABLE IF NOT EXISTS order_items (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
          product_id UUID REFERENCES products(id),
          combo_id UUID REFERENCES combos(id),
          item_type order_item_type NOT NULL DEFAULT 'product',
          product_name VARCHAR(255) NOT NULL,
          product_sku VARCHAR(50) NOT NULL,
          quantity INTEGER NOT NULL,
          unit_price DECIMAL(10,2) NOT NULL,
          original_unit_price DECIMAL(10,2) NOT NULL,
          discount_per_unit DECIMAL(10,2) DEFAULT 0,
          total_price DECIMAL(10,2) NOT NULL,
          tax_rate DECIMAL(5,4) DEFAULT 0,
          tax_amount DECIMAL(10,2) DEFAULT 0,
          promotion_id UUID REFERENCES promotions(id),
          promotion_discount DECIMAL(10,2) DEFAULT 0,
          product_snapshot JSONB,
          combo_snapshot JSONB,
          created_at TIMESTAMP DEFAULT NOW()
        );`
      },

      // Customer Promotions Usage table
      {
        name: 'customer_promotions_usage',
        sql: `CREATE TABLE IF NOT EXISTS customer_promotions_usage (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          customer_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
          promotion_id UUID REFERENCES promotions(id) ON DELETE CASCADE,
          order_id UUID REFERENCES orders(id),
          usage_count INTEGER DEFAULT 1,
          discount_applied DECIMAL(10,2) NOT NULL,
          used_at TIMESTAMP DEFAULT NOW()
        );`
      },

      // Product Reviews table
      {
        name: 'product_reviews',
        sql: `CREATE TABLE IF NOT EXISTS product_reviews (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          product_id UUID REFERENCES products(id) ON DELETE CASCADE,
          customer_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
          order_id UUID REFERENCES orders(id),
          rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
          title VARCHAR(255),
          review_text TEXT,
          is_verified_purchase BOOLEAN DEFAULT FALSE,
          is_approved BOOLEAN DEFAULT FALSE,
          helpful_votes INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(product_id, customer_id, order_id)
        );`
      }
    ];

    for (const table of tables) {
      await this.executeSQL(table.sql, `creating table ${table.name}`);
      console.log(`✓ Created table: ${table.name}`);
    }

    // Add computed columns for combos
    try {
      await this.executeSQL(`
        ALTER TABLE combos 
        ADD COLUMN IF NOT EXISTS savings_amount DECIMAL(10,2) 
        GENERATED ALWAYS AS (original_price - combo_price) STORED;
      `, 'adding savings_amount column to combos');

      await this.executeSQL(`
        ALTER TABLE combos 
        ADD COLUMN IF NOT EXISTS savings_percentage DECIMAL(5,2) 
        GENERATED ALWAYS AS (
          CASE WHEN original_price > 0 THEN
            ROUND(((original_price - combo_price) / original_price * 100), 2)
          ELSE 0 END
        ) STORED;
      `, 'adding savings_percentage column to combos');
    } catch (error) {
      console.log('Computed columns may already exist:', error);
    }
  }

  private async createViews() {
    console.log('👁️ Creating database views...');

    const views = [
      {
        name: 'active_product_promotions',
        sql: `CREATE OR REPLACE VIEW active_product_promotions AS
         SELECT 
           pp.promotion_id,
           pp.product_id,
           pp.discounted_price,
           p.name as promotion_name,
           p.type as promotion_type,
           p.starts_at,
           p.ends_at,
           p.priority
         FROM promotion_products pp
         JOIN promotions p ON pp.promotion_id = p.id
         WHERE p.status = 'active'
           AND p.starts_at <= NOW()
           AND (p.ends_at IS NULL OR p.ends_at > NOW());`
      },

      {
        name: 'active_combos',
        sql: `CREATE OR REPLACE VIEW active_combos AS
         SELECT *
         FROM combos
         WHERE status = 'active'
           AND starts_at <= NOW()
           AND (ends_at IS NULL OR ends_at > NOW());`
      },

      {
        name: 'featured_promotions',
        sql: `CREATE OR REPLACE VIEW featured_promotions AS
         SELECT *
         FROM promotions
         WHERE status = 'active'
           AND is_featured = true
           AND starts_at <= NOW()
           AND (ends_at IS NULL OR ends_at > NOW());`
      },

      {
        name: 'product_catalog',
        sql: `CREATE OR REPLACE VIEW product_catalog AS
         SELECT 
           p.*,
           c.name as category_name,
           COALESCE(
             (SELECT MIN(discounted_price) FROM active_product_promotions WHERE product_id = p.id),
             p.price
           ) as current_price,
           CASE 
             WHEN EXISTS (SELECT 1 FROM active_product_promotions WHERE product_id = p.id) 
             THEN true 
             ELSE false 
           END as has_promotion
         FROM products p
         LEFT JOIN categories c ON p.category_id = c.id
         WHERE p.status = 'active';`
      }
    ];

    for (const view of views) {
      await this.executeSQL(view.sql, `creating view ${view.name}`);
      console.log(`✓ Created view: ${view.name}`);
    }
  }

  private async createIndexes() {
    console.log('🗂️ Creating database indexes...');

    const indexes = [
      // Product indexes
      'CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);',
      'CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);',
      'CREATE INDEX IF NOT EXISTS idx_products_featured ON products(is_featured);',
      'CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);',
      'CREATE INDEX IF NOT EXISTS idx_products_stock ON products(stock_quantity);',
      'CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);',
      'CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);',
      
      // Promotion indexes
      'CREATE INDEX IF NOT EXISTS idx_promotions_status_dates ON promotions(status, starts_at, ends_at);',
      'CREATE INDEX IF NOT EXISTS idx_promotions_code ON promotions(promo_code) WHERE promo_code IS NOT NULL;',
      'CREATE INDEX IF NOT EXISTS idx_promotions_featured ON promotions(is_featured);',
      'CREATE INDEX IF NOT EXISTS idx_promotion_products_product ON promotion_products(product_id);',
      'CREATE INDEX IF NOT EXISTS idx_promotion_categories_category ON promotion_categories(category_id);',
      
      // Combo indexes
      'CREATE INDEX IF NOT EXISTS idx_combos_status_dates ON combos(status, starts_at, ends_at);',
      'CREATE INDEX IF NOT EXISTS idx_combos_featured ON combos(is_featured);',
      'CREATE INDEX IF NOT EXISTS idx_combo_items_combo ON combo_items(combo_id);',
      'CREATE INDEX IF NOT EXISTS idx_combo_items_product ON combo_items(product_id);',
      
      // Order indexes
      'CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);',
      'CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);',
      'CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);',
      'CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);',
      'CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);',
      'CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id);',
      
      // User indexes
      'CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);',
      'CREATE INDEX IF NOT EXISTS idx_user_profiles_active ON user_profiles(is_active);',
      
      // Category indexes
      'CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);',
      'CREATE INDEX IF NOT EXISTS idx_categories_active ON categories(is_active);',
      
      // Usage tracking indexes
      'CREATE INDEX IF NOT EXISTS idx_customer_promotions_customer ON customer_promotions_usage(customer_id);',
      'CREATE INDEX IF NOT EXISTS idx_customer_promotions_promotion ON customer_promotions_usage(promotion_id);',
      
      // Review indexes
      'CREATE INDEX IF NOT EXISTS idx_product_reviews_product ON product_reviews(product_id);',
      'CREATE INDEX IF NOT EXISTS idx_product_reviews_customer ON product_reviews(customer_id);',
      'CREATE INDEX IF NOT EXISTS idx_product_reviews_approved ON product_reviews(is_approved);'
    ];

    for (const indexSql of indexes) {
      await this.executeSQL(indexSql, `creating index`);
    }
    console.log(`✓ Created ${indexes.length} indexes`);
  }

  private async setupRLS() {
    console.log('🔒 Setting up Row Level Security...');

    // Enable RLS on all tables
    const tables = [
      'user_profiles', 'categories', 'products', 'promotions', 
      'promotion_products', 'promotion_categories', 'combos', 
      'combo_items', 'orders', 'order_items', 'customer_promotions_usage',
      'product_reviews'
    ];

    // Enable RLS
    for (const table of tables) {
      await this.executeSQL(
        `ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`,
        `enabling RLS on ${table}`
      );
    }

    // Create RLS policies
    const policies = [
      // Categories - public read access
      `CREATE POLICY IF NOT EXISTS "Categories are publicly readable" ON categories FOR SELECT TO authenticated, anon USING (is_active = true);`,
      
      // Products - public read access for active products
      `CREATE POLICY IF NOT EXISTS "Active products are publicly readable" ON products FOR SELECT TO authenticated, anon USING (status = 'active');`,
      
      // Promotions - public read access for active promotions
      `CREATE POLICY IF NOT EXISTS "Active promotions are publicly readable" ON promotions FOR SELECT TO authenticated, anon USING (
        status = 'active' AND starts_at <= NOW() AND (ends_at IS NULL OR ends_at > NOW())
      );`,
      
      // User profiles - users can only see their own data
      `CREATE POLICY IF NOT EXISTS "Users can view own profile" ON user_profiles FOR SELECT USING (auth.uid() = id);`,
      `CREATE POLICY IF NOT EXISTS "Users can update own profile" ON user_profiles FOR UPDATE USING (auth.uid() = id);`,
      
      // Orders - users can only see their own orders
      `CREATE POLICY IF NOT EXISTS "Users can view own orders" ON orders FOR SELECT USING (customer_id = auth.uid());`,
      `CREATE POLICY IF NOT EXISTS "Users can create own orders" ON orders FOR INSERT WITH CHECK (customer_id = auth.uid());`,
      
      // Order items follow order permissions
      `CREATE POLICY IF NOT EXISTS "Order items follow order permissions" ON order_items FOR SELECT USING (
        EXISTS (SELECT 1 FROM orders WHERE id = order_id AND customer_id = auth.uid())
      );`,
      
      // Reviews - users can manage their own reviews
      `CREATE POLICY IF NOT EXISTS "Users can view approved reviews" ON product_reviews FOR SELECT USING (is_approved = true);`,
      `CREATE POLICY IF NOT EXISTS "Users can manage own reviews" ON product_reviews FOR ALL USING (customer_id = auth.uid());`,

      // Admin policies for management tables
      `CREATE POLICY IF NOT EXISTS "Admins can manage all data" ON categories FOR ALL USING (
        EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
      );`,
      
      `CREATE POLICY IF NOT EXISTS "Staff can manage products" ON products FOR ALL USING (
        EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('admin', 'manager', 'staff'))
      );`,
      
      `CREATE POLICY IF NOT EXISTS "Managers can manage promotions" ON promotions FOR ALL USING (
        EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
      );`
    ];

    for (const policy of policies) {
      await this.executeSQL(policy, 'creating RLS policy');
    }
    console.log(`✓ Created RLS policies`);
  }

  private async createFunctions() {
    console.log('⚙️ Creating database functions...');

    const functions = [
      // Basic function to update timestamps
      `CREATE OR REPLACE FUNCTION update_updated_at_column()
       RETURNS TRIGGER AS $$
       BEGIN
         NEW.updated_at = NOW();
         RETURN NEW;
       END;
       $$ LANGUAGE plpgsql;`,

      // Generate order numbers
      `CREATE OR REPLACE FUNCTION generate_order_number()
       RETURNS VARCHAR AS $$
       DECLARE
         timestamp_part VARCHAR;
         random_part VARCHAR;
       BEGIN
         timestamp_part := EXTRACT(EPOCH FROM NOW())::INTEGER::VARCHAR;
         random_part := LPAD((RANDOM() * 99999)::INTEGER::VARCHAR, 5, '0');
         RETURN 'BB-' || timestamp_part || '-' || random_part;
       END;
       $$ LANGUAGE plpgsql;`,

      // Function to create user profile on signup
      `CREATE OR REPLACE FUNCTION handle_new_user()
       RETURNS TRIGGER AS $$
       BEGIN
         INSERT INTO public.user_profiles (id, role, first_name, last_name)
         VALUES (
           NEW.id,
           'customer',
           NEW.raw_user_meta_data->>'first_name',
           NEW.raw_user_meta_data->>'last_name'
         );
         RETURN NEW;
       END;
       $$ LANGUAGE plpgsql SECURITY DEFINER;`,

      // Function to calculate product ratings
      `CREATE OR REPLACE FUNCTION update_product_rating(product_uuid UUID)
       RETURNS VOID AS $$
       DECLARE
         avg_rating DECIMAL(3,2);
         review_count INTEGER;
       BEGIN
         SELECT 
           COALESCE(AVG(rating), 0),
           COUNT(*)
         INTO avg_rating, review_count
         FROM product_reviews
         WHERE product_id = product_uuid AND is_approved = true;
         
         UPDATE products
         SET rating_average = avg_rating, rating_count = review_count
         WHERE id = product_uuid;
       END;
       $$ LANGUAGE plpgsql;`
    ];

    for (const functionSql of functions) {
      await this.executeSQL(functionSql, 'creating function');
    }
    console.log(`✓ Created database functions`);
  }

  private async createTriggers() {
    console.log('🎯 Creating database triggers...');

    // Apply update trigger to relevant tables
    const tables_with_updated_at = [
      'user_profiles', 'categories', 'products', 'promotions', 
      'combos', 'orders', 'product_reviews'
    ];

    for (const table of tables_with_updated_at) {
      await this.executeSQL(`
        DROP TRIGGER IF EXISTS update_${table}_updated_at ON ${table};
        CREATE TRIGGER update_${table}_updated_at
          BEFORE UPDATE ON ${table}
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();
      `, `creating update trigger for ${table}`);
    }

    // Trigger for new user profile creation
    await this.executeSQL(`
      DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
      CREATE TRIGGER on_auth_user_created
        AFTER INSERT ON auth.users
        FOR EACH ROW EXECUTE FUNCTION handle_new_user();
    `, 'creating user profile trigger');

    // Trigger to update product ratings when reviews change
    await this.executeSQL(`
      DROP TRIGGER IF EXISTS update_product_rating_trigger ON product_reviews;
      CREATE TRIGGER update_product_rating_trigger
        AFTER INSERT OR UPDATE OR DELETE ON product_reviews
        FOR EACH ROW EXECUTE FUNCTION update_product_rating(
          CASE WHEN TG_OP = 'DELETE' THEN OLD.product_id ELSE NEW.product_id END
        );
    `, 'creating product rating update trigger');

    console.log(`✓ Created database triggers`);
  }

  private async seedDemoData() {
    console.log('🌱 Seeding demo data...');
    
    try {
      // Insert demo categories
      const categories = [
        {
          id: 'cat-1',
          name: 'All-Purpose Cleaners',
          slug: 'all-purpose-cleaners',
          description: 'Versatile cleaning solutions for all surfaces',
          is_active: true,
          sort_order: 1
        },
        {
          id: 'cat-2',
          name: 'Floor Care',
          slug: 'floor-care',
          description: 'Specialized floor cleaning products',
          is_active: true,
          sort_order: 2
        },
        {
          id: 'cat-3',
          name: 'Glass & Windows',
          slug: 'glass-windows',
          description: 'Crystal clear glass and window cleaners',
          is_active: true,
          sort_order: 3
        },
        {
          id: 'cat-4',
          name: 'Disinfectants',
          slug: 'disinfectants',
          description: 'Powerful sanitizing and disinfecting products',
          is_active: true,
          sort_order: 4
        },
        {
          id: 'cat-5',
          name: 'Kitchen Cleaning',
          slug: 'kitchen-cleaning',
          description: 'Degreasers and kitchen-specific cleaners',
          is_active: true,
          sort_order: 5
        },
        {
          id: 'cat-6',
          name: 'Bathroom Care',
          slug: 'bathroom-care',
          description: 'Bathroom and tile cleaning solutions',
          is_active: true,
          sort_order: 6
        }
      ];

      const { error: catError } = await this.supabase
        .from('categories')
        .upsert(categories, { onConflict: 'id' });

      if (catError) {
        console.error('Error seeding categories:', catError);
      } else {
        console.log('✓ Seeded categories');
      }

      // Insert demo products
      const products = [
        {
          id: 'prod-1',
          sku: 'BB-APC-001',
          barcode: '1234567890123',
          name: 'Ultra Shine All-Purpose Cleaner',
          slug: 'ultra-shine-all-purpose-cleaner',
          description: 'Professional-grade all-purpose cleaner that cuts through grease and grime effortlessly.',
          short_description: 'Professional all-purpose cleaner',
          category_id: 'cat-1',
          brand: 'Best Brightness',
          price: 89.99,
          cost_price: 45.00,
          compare_at_price: 119.99,
          weight: 2.5,
          status: 'active',
          is_featured: true,
          stock_quantity: 150,
          low_stock_threshold: 20,
          images: [
            'https://images.unsplash.com/photo-1563453392212-326f5e854473?w=400',
            'https://images.unsplash.com/photo-1585421514738-01798e348b17?w=400'
          ],
          tags: ['all-purpose', 'professional', 'grease-cutting'],
          attributes: {
            volume: '2.5L',
            fragrance: 'Fresh Citrus',
            concentrate: false
          }
        },
        {
          id: 'prod-2',
          sku: 'BB-FC-001',
          barcode: '1234567890124',
          name: 'Premium Floor Polish',
          slug: 'premium-floor-polish',
          description: 'Long-lasting floor polish that provides superior shine and protection.',
          short_description: 'Professional floor polish',
          category_id: 'cat-2',
          brand: 'Best Brightness',
          price: 149.99,
          cost_price: 75.00,
          compare_at_price: 199.99,
          weight: 5.0,
          status: 'active',
          is_featured: true,
          stock_quantity: 85,
          low_stock_threshold: 15,
          images: [
            'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400'
          ],
          tags: ['floor-care', 'polish', 'protection'],
          attributes: {
            volume: '5L',
            coverage: '200 sqm',
            drying_time: '30 minutes'
          }
        },
        {
          id: 'prod-3',
          sku: 'BB-GW-001',
          barcode: '1234567890125',
          name: 'Crystal Clear Glass Cleaner',
          slug: 'crystal-clear-glass-cleaner',
          description: 'Streak-free glass cleaner for windows, mirrors, and glass surfaces.',
          short_description: 'Streak-free glass cleaner',
          category_id: 'cat-3',
          brand: 'Best Brightness',
          price: 49.99,
          cost_price: 25.00,
          stock_quantity: 200,
          status: 'active',
          images: [
            'https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?w=400'
          ],
          tags: ['glass', 'streak-free', 'mirrors'],
          attributes: {
            volume: '1L',
            spray_bottle: true,
            ammonia_free: true
          }
        },
        {
          id: 'prod-4',
          sku: 'BB-DIS-001',
          barcode: '1234567890126',
          name: 'Hospital Grade Disinfectant',
          slug: 'hospital-grade-disinfectant',
          description: 'Professional disinfectant that kills 99.9% of germs and viruses.',
          short_description: 'Hospital grade disinfectant',
          category_id: 'cat-4',
          brand: 'Best Brightness',
          price: 199.99,
          cost_price: 100.00,
          weight: 5.0,
          status: 'active',
          is_featured: true,
          stock_quantity: 120,
          images: [
            'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400'
          ],
          tags: ['disinfectant', 'hospital-grade', 'sanitizer'],
          attributes: {
            volume: '5L',
            kill_rate: '99.9%',
            contact_time: '1 minute'
          }
        }
      ];

      const { error: prodError } = await this.supabase
        .from('products')
        .upsert(products, { onConflict: 'id' });

      if (prodError) {
        console.error('Error seeding products:', prodError);
      } else {
        console.log('✓ Seeded products');
      }

      // Create sample promotion
      const promotions = [
        {
          id: 'promo-1',
          name: 'Spring Cleaning Sale',
          description: 'Get 20% off all cleaning products this spring!',
          type: 'percentage_off',
          status: 'active',
          priority: 1,
          discount_type: 'percentage',
          discount_value: 20.00,
          minimum_order_amount: 100.00,
          usage_limit: 1000,
          usage_limit_per_customer: 1,
          requires_code: false,
          stackable: false,
          applies_to_sale_items: true,
          starts_at: new Date('2024-01-01').toISOString(),
          ends_at: new Date('2024-12-31').toISOString(),
          is_featured: true,
          terms_conditions: 'Valid on all cleaning products. Cannot be combined with other offers.'
        }
      ];

      const { error: promoError } = await this.supabase
        .from('promotions')
        .upsert(promotions, { onConflict: 'id' });

      if (promoError) {
        console.error('Error seeding promotions:', promoError);
      } else {
        console.log('✓ Seeded promotions');
      }

      // Create sample combo
      const combos = [
        {
          id: 'combo-1',
          name: 'Complete Home Cleaning Kit',
          description: 'Everything you need for a spotless home - save 25% when you buy together!',
          combo_type: 'bundle',
          status: 'active',
          original_price: 289.97,
          combo_price: 217.48,
          is_featured: true,
          minimum_quantity: 1,
          maximum_quantity: 5,
          requires_all_items: true,
          tags: ['bundle', 'home-cleaning', 'value-pack']
        }
      ];

      const { error: comboError } = await this.supabase
        .from('combos')
        .upsert(combos, { onConflict: 'id' });

      if (comboError) {
        console.error('Error seeding combos:', comboError);
      } else {
        console.log('✓ Seeded combos');

        // Add combo items
        const comboItems = [
          {
            combo_id: 'combo-1',
            product_id: 'prod-1',
            quantity: 1,
            is_required: true,
            sort_order: 1
          },
          {
            combo_id: 'combo-1',
            product_id: 'prod-2',
            quantity: 1,
            is_required: true,
            sort_order: 2
          },
          {
            combo_id: 'combo-1',
            product_id: 'prod-3',
            quantity: 1,
            is_required: true,
            sort_order: 3
          }
        ];

        const { error: comboItemError } = await this.supabase
          .from('combo_items')
          .upsert(comboItems, { onConflict: 'combo_id,product_id' });

        if (comboItemError) {
          console.error('Error seeding combo items:', comboItemError);
        } else {
          console.log('✓ Seeded combo items');
        }
      }

      console.log('✅ Demo data seeded successfully');
    } catch (error) {
      console.error('❌ Error seeding demo data:', error);
      throw error;
    }
  }

  // Utility method to check if database is properly set up
  async checkDatabaseHealth(): Promise<{
    isHealthy: boolean;
    missingTables: string[];
    tableCount: number;
    hasData: boolean;
  }> {
    try {
      const requiredTables = [
        'categories', 'user_profiles', 'products', 'promotions',
        'promotion_products', 'promotion_categories', 'combos',
        'combo_items', 'orders', 'order_items', 'customer_promotions_usage',
        'product_reviews'
      ];

      const missingTables: string[] = [];
      let tableCount = 0;
      let hasData = false;

      // Check each table exists and has some structure
      for (const table of requiredTables) {
        try {
          const { data, error } = await this.supabase
            .from(table)
            .select('*', { count: 'exact', head: true });

          if (error) {
            // Check for specific error codes that indicate missing table
            if (error.code === '42P01' || error.code === 'PGRST205' || 
                error.message.includes('does not exist') || 
                error.message.includes('relation') && error.message.includes('does not exist')) {
              console.log(`Table ${table} does not exist`);
              missingTables.push(table);
            } else {
              console.error(`Table ${table} check failed:`, error);
              missingTables.push(table);
            }
          } else {
            tableCount++;
            // Check if categories table has demo data
            if (table === 'categories') {
              const { data: catData } = await this.supabase
                .from('categories')
                .select('id')
                .limit(1);
              if (catData && catData.length > 0) {
                hasData = true;
              }
            }
          }
        } catch (error: any) {
          console.error(`Error checking table ${table}:`, error);
          missingTables.push(table);
        }
      }

      console.log(`Database health check: ${tableCount}/${requiredTables.length} tables found`);
      if (missingTables.length > 0) {
        console.log('Missing tables:', missingTables);
      }

      return {
        isHealthy: missingTables.length === 0,
        missingTables,
        tableCount,
        hasData
      };
    } catch (error) {
      console.error('Database health check failed:', error);
      return {
        isHealthy: false,
        missingTables: [],
        tableCount: 0,
        hasData: false
      };
    }
  }
}

// Export helper function for easy use
export async function setupDatabase(progress?: (step: string, current: number, total: number) => void) {
  const setup = new DatabaseSetup();
  return await setup.initializeDatabase(progress);
}

export async function checkDatabaseHealth() {
  const setup = new DatabaseSetup();
  return await setup.checkDatabaseHealth();
}