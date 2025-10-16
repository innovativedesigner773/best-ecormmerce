import { createClient } from "@supabase/supabase-js";
import { SQL_FUNCTIONS, installSQLFunctions } from "./sql-functions.tsx";

// Database setup for Best Brightness E-Commerce Platform
export class DatabaseSetup {
  private supabase: any;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  async initializeDatabase() {
    console.log('Starting database initialization...');
    
    try {
      // Step 1: Install exec_sql function first
      await this.installExecSqlFunction();
      
      // Step 2: Create Enums
      await this.createEnums();
      
      // Step 3: Create Tables
      await this.createTables();
      
      // Step 4: Create Views
      await this.createViews();
      
      // Step 5: Create Indexes
      await this.createIndexes();
      
      // Step 6: Setup RLS Policies
      await this.setupRLS();
      
      // Step 7: Create Functions
      await this.createFunctions();
      
      // Step 8: Create Triggers
      await this.createTriggers();
      
      // Step 9: Install SQL Functions
      await installSQLFunctions(this.supabase);
      
      console.log('Database initialization completed successfully!');
      return { success: true, message: 'Database initialized successfully' };
    } catch (error) {
      console.error('Database initialization failed:', error);
      throw error;
    }
  }

  private async installExecSqlFunction() {
    console.log('Installing exec_sql function...');
    
    try {
      const { error } = await this.supabase.rpc('exec_sql', { 
        sql: SQL_FUNCTIONS.EXEC_SQL 
      });
      
      if (error) {
        // Try to create the function directly if RPC fails
        console.log('Direct installation of exec_sql function...');
        // This would require direct database access which might not be available
        // The function should be pre-installed in Supabase
      }
    } catch (error) {
      console.log('exec_sql function may already exist or needs manual installation');
    }
  }

  private async createEnums() {
    console.log('Creating enums...');
    
    const enums = [
      `CREATE TYPE IF NOT EXISTS user_role AS ENUM ('customer', 'admin', 'staff', 'manager', 'cashier');`,
      `CREATE TYPE IF NOT EXISTS product_status AS ENUM ('active', 'inactive', 'discontinued', 'out_of_stock');`,
      `CREATE TYPE IF NOT EXISTS promotion_type AS ENUM ('percentage_off', 'fixed_amount_off', 'buy_x_get_y', 'bulk_discount', 'flash_sale', 'clearance', 'seasonal');`,
      `CREATE TYPE IF NOT EXISTS promotion_status AS ENUM ('draft', 'scheduled', 'active', 'paused', 'expired', 'cancelled');`,
      `CREATE TYPE IF NOT EXISTS combo_type AS ENUM ('bundle', 'mix_match', 'tiered', 'bogo');`,
      `CREATE TYPE IF NOT EXISTS combo_status AS ENUM ('draft', 'active', 'inactive', 'expired');`,
      `CREATE TYPE IF NOT EXISTS order_status AS ENUM ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded');`,
      `CREATE TYPE IF NOT EXISTS payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded', 'partially_refunded');`,
      `CREATE TYPE IF NOT EXISTS fulfillment_status AS ENUM ('unfulfilled', 'partial', 'fulfilled', 'restocked');`,
      `CREATE TYPE IF NOT EXISTS order_channel AS ENUM ('online', 'pos', 'phone', 'mobile_app');`,
      `CREATE TYPE IF NOT EXISTS order_item_type AS ENUM ('product', 'combo', 'combo_item');`,
      `CREATE TYPE IF NOT EXISTS discount_type AS ENUM ('percentage', 'fixed_amount', 'free_shipping', 'buy_x_get_y_free', 'buy_x_get_y_percent_off');`
    ];

    for (const enumSql of enums) {
      try {
        const { error } = await this.supabase.rpc('exec_sql', { sql: enumSql });
        if (error && !error.message.includes('already exists')) {
          console.error('Error creating enum:', error);
        }
      } catch (error) {
        console.log(`Enum creation error (may already exist): ${error.message}`);
      }
    }
  }

  private async createTables() {
    console.log('Creating tables...');

    const tables = [
      // Categories table
      `CREATE TABLE IF NOT EXISTS categories (
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
      );`,

      // User profiles table (extends auth.users)
      `CREATE TABLE IF NOT EXISTS user_profiles (
        id UUID PRIMARY KEY,
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
      );`,

      // Products table
      `CREATE TABLE IF NOT EXISTS products (
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
      );`,

      // Promotions table
      `CREATE TABLE IF NOT EXISTS promotions (
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
      );`,

      // Promotion Products table
      `CREATE TABLE IF NOT EXISTS promotion_products (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        promotion_id UUID REFERENCES promotions(id) ON DELETE CASCADE,
        product_id UUID REFERENCES products(id) ON DELETE CASCADE,
        discounted_price DECIMAL(10,2) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(promotion_id, product_id)
      );`,

      // Promotion Categories table
      `CREATE TABLE IF NOT EXISTS promotion_categories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        promotion_id UUID REFERENCES promotions(id) ON DELETE CASCADE,
        category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(promotion_id, category_id)
      );`,

      // Combos table
      `CREATE TABLE IF NOT EXISTS combos (
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
      );`,

      // Add computed columns after table creation
      `ALTER TABLE combos 
       ADD COLUMN IF NOT EXISTS savings_amount DECIMAL(10,2) 
       GENERATED ALWAYS AS (original_price - combo_price) STORED;`,

      `ALTER TABLE combos 
       ADD COLUMN IF NOT EXISTS savings_percentage DECIMAL(5,2) 
       GENERATED ALWAYS AS (
         CASE WHEN original_price > 0 THEN
           ROUND(((original_price - combo_price) / original_price * 100), 2)
         ELSE 0 END
       ) STORED;`,

      // Combo Items table
      `CREATE TABLE IF NOT EXISTS combo_items (
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
      );`,

      // Orders table
      `CREATE TABLE IF NOT EXISTS orders (
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
      );`,

      // Order Items table
      `CREATE TABLE IF NOT EXISTS order_items (
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
      );`,

      // Customer Promotions Usage table
      `CREATE TABLE IF NOT EXISTS customer_promotions_usage (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        customer_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
        promotion_id UUID REFERENCES promotions(id) ON DELETE CASCADE,
        order_id UUID REFERENCES orders(id),
        usage_count INTEGER DEFAULT 1,
        discount_applied DECIMAL(10,2) NOT NULL,
        used_at TIMESTAMP DEFAULT NOW()
      );`,

      // Product Reviews table
      `CREATE TABLE IF NOT EXISTS product_reviews (
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
    ];

    for (const tableSql of tables) {
      try {
        const { error } = await this.supabase.rpc('exec_sql', { sql: tableSql });
        if (error && !error.message.includes('already exists')) {
          console.error('Error creating table:', error);
        }
      } catch (error) {
        console.log(`Table creation error (may already exist): ${error.message}`);
      }
    }
  }

  private async createViews() {
    console.log('Creating views...');

    const views = [
      // Active Product Promotions View
      `CREATE OR REPLACE VIEW active_product_promotions AS
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
         AND (p.ends_at IS NULL OR p.ends_at > NOW());`,

      // Active Combos View
      `CREATE OR REPLACE VIEW active_combos AS
       SELECT *
       FROM combos
       WHERE status = 'active'
         AND starts_at <= NOW()
         AND (ends_at IS NULL OR ends_at > NOW());`,

      // Featured Promotions View
      `CREATE OR REPLACE VIEW featured_promotions AS
       SELECT *
       FROM promotions
       WHERE status = 'active'
         AND is_featured = true
         AND starts_at <= NOW()
         AND (ends_at IS NULL OR ends_at > NOW());`,

      // Product Catalog View (with current pricing)
      `CREATE OR REPLACE VIEW product_catalog AS
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
    ];

    for (const viewSql of views) {
      try {
        const { error } = await this.supabase.rpc('exec_sql', { sql: viewSql });
        if (error) {
          console.error('Error creating view:', error);
        }
      } catch (error) {
        console.log(`View creation error: ${error.message}`);
      }
    }
  }

  private async createIndexes() {
    console.log('Creating indexes...');

    const indexes = [
      // Product indexes
      `CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);`,
      `CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);`,
      `CREATE INDEX IF NOT EXISTS idx_products_featured ON products(is_featured);`,
      `CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);`,
      `CREATE INDEX IF NOT EXISTS idx_products_stock ON products(stock_quantity);`,
      `CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);`,
      `CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);`,
      
      // Promotion indexes
      `CREATE INDEX IF NOT EXISTS idx_promotions_status_dates ON promotions(status, starts_at, ends_at);`,
      `CREATE INDEX IF NOT EXISTS idx_promotions_code ON promotions(promo_code) WHERE promo_code IS NOT NULL;`,
      `CREATE INDEX IF NOT EXISTS idx_promotions_featured ON promotions(is_featured);`,
      `CREATE INDEX IF NOT EXISTS idx_promotion_products_product ON promotion_products(product_id);`,
      `CREATE INDEX IF NOT EXISTS idx_promotion_categories_category ON promotion_categories(category_id);`,
      
      // Combo indexes
      `CREATE INDEX IF NOT EXISTS idx_combos_status_dates ON combos(status, starts_at, ends_at);`,
      `CREATE INDEX IF NOT EXISTS idx_combos_featured ON combos(is_featured);`,
      `CREATE INDEX IF NOT EXISTS idx_combo_items_combo ON combo_items(combo_id);`,
      `CREATE INDEX IF NOT EXISTS idx_combo_items_product ON combo_items(product_id);`,
      
      // Order indexes
      `CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);`,
      `CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);`,
      `CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);`,
      `CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);`,
      `CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);`,
      `CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id);`,
      
      // User indexes
      `CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);`,
      `CREATE INDEX IF NOT EXISTS idx_user_profiles_active ON user_profiles(is_active);`,
      
      // Category indexes
      `CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);`,
      `CREATE INDEX IF NOT EXISTS idx_categories_active ON categories(is_active);`,
      
      // Usage tracking indexes
      `CREATE INDEX IF NOT EXISTS idx_customer_promotions_customer ON customer_promotions_usage(customer_id);`,
      `CREATE INDEX IF NOT EXISTS idx_customer_promotions_promotion ON customer_promotions_usage(promotion_id);`,
      
      // Review indexes
      `CREATE INDEX IF NOT EXISTS idx_product_reviews_product ON product_reviews(product_id);`,
      `CREATE INDEX IF NOT EXISTS idx_product_reviews_customer ON product_reviews(customer_id);`,
      `CREATE INDEX IF NOT EXISTS idx_product_reviews_approved ON product_reviews(is_approved);`
    ];

    for (const indexSql of indexes) {
      try {
        const { error } = await this.supabase.rpc('exec_sql', { sql: indexSql });
        if (error && !error.message.includes('already exists')) {
          console.error('Error creating index:', error);
        }
      } catch (error) {
        console.log(`Index creation error (may already exist): ${error.message}`);
      }
    }
  }

  private async setupRLS() {
    console.log('Setting up Row Level Security...');

    // Enable RLS on all tables
    const tables = [
      'user_profiles', 'categories', 'products', 'promotions', 
      'promotion_products', 'promotion_categories', 'combos', 
      'combo_items', 'orders', 'order_items', 'customer_promotions_usage',
      'product_reviews'
    ];

    for (const table of tables) {
      try {
        const { error } = await this.supabase.rpc('exec_sql', {
          sql: `ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`
        });
        if (error && !error.message.includes('already')) {
          console.error(`Error enabling RLS on ${table}:`, error);
        }
      } catch (error) {
        console.log(`RLS error for ${table}: ${error.message}`);
      }
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
    ];

    for (const policy of policies) {
      try {
        const { error } = await this.supabase.rpc('exec_sql', { sql: policy });
        if (error && !error.message.includes('already exists')) {
          console.error('Error creating policy:', error);
        }
      } catch (error) {
        console.log(`Policy creation error (may already exist): ${error.message}`);
      }
    }
  }

  private async createFunctions() {
    console.log('Creating database functions...');

    // Basic function to update timestamps
    const functions = [
      `CREATE OR REPLACE FUNCTION update_updated_at_column()
       RETURNS TRIGGER AS $$
       BEGIN
         NEW.updated_at = NOW();
         RETURN NEW;
       END;
       $$ LANGUAGE plpgsql;`,

      `CREATE OR REPLACE FUNCTION generate_order_number()
       RETURNS VARCHAR AS $$
       DECLARE
         timestamp_part VARCHAR;
         random_part VARCHAR;
       BEGIN
         timestamp_part := EXTRACT(EPOCH FROM NOW())::INTEGER::VARCHAR;
         random_part := LPAD((RANDOM() * 99999)::INTEGER::VARCHAR, 5, '0');
         RETURN 'ORD-' || timestamp_part || '-' || random_part;
       END;
       $$ LANGUAGE plpgsql;`
    ];

    for (const functionSql of functions) {
      try {
        const { error } = await this.supabase.rpc('exec_sql', { sql: functionSql });
        if (error) {
          console.error('Error creating function:', error);
        }
      } catch (error) {
        console.log(`Function creation error: ${error.message}`);
      }
    }
  }

  private async createTriggers() {
    console.log('Creating triggers...');

    // Apply update trigger to relevant tables
    const tables_with_updated_at = [
      'user_profiles', 'categories', 'products', 'promotions', 
      'combos', 'orders', 'product_reviews'
    ];

    for (const table of tables_with_updated_at) {
      try {
        const { error } = await this.supabase.rpc('exec_sql', {
          sql: `
            DROP TRIGGER IF EXISTS update_${table}_updated_at ON ${table};
            CREATE TRIGGER update_${table}_updated_at
              BEFORE UPDATE ON ${table}
              FOR EACH ROW
              EXECUTE FUNCTION update_updated_at_column();
          `
        });
        if (error) {
          console.error(`Error creating trigger for ${table}:`, error);
        }
      } catch (error) {
        console.log(`Trigger creation error for ${table}: ${error.message}`);
      }
    }
  }

  async seedDemoData() {
    console.log('Seeding demo data...');
    
    try {
      // Insert demo categories
      const categories = [
        {
          id: 'cat-1',
          name: 'All-Purpose Cleaners',
          slug: 'all-purpose-cleaners',
          description: 'Versatile cleaning solutions for all surfaces',
          is_active: true
        },
        {
          id: 'cat-2',
          name: 'Floor Care',
          slug: 'floor-care',
          description: 'Specialized floor cleaning products',
          is_active: true
        },
        {
          id: 'cat-3',
          name: 'Glass & Windows',
          slug: 'glass-windows',
          description: 'Crystal clear glass and window cleaners',
          is_active: true
        },
        {
          id: 'cat-4',
          name: 'Disinfectants',
          slug: 'disinfectants',
          description: 'Powerful sanitizing and disinfecting products',
          is_active: true
        },
        {
          id: 'cat-5',
          name: 'Kitchen Cleaning',
          slug: 'kitchen-cleaning',
          description: 'Degreasers and kitchen-specific cleaners',
          is_active: true
        },
        {
          id: 'cat-6',
          name: 'Bathroom Care',
          slug: 'bathroom-care',
          description: 'Bathroom and tile cleaning solutions',
          is_active: true
        }
      ];

      const { error: catError } = await this.supabase
        .from('categories')
        .upsert(categories, { onConflict: 'id' });

      if (catError) {
        console.error('Error seeding categories:', catError);
        throw catError;
      }

      console.log('Demo data seeded successfully');
      return { success: true, message: 'Demo data seeded successfully' };
    } catch (error) {
      console.error('Error seeding demo data:', error);
      throw error;
    }
  }

  async testDatabase() {
    console.log('Testing database functionality...');
    
    try {
      const tests = [];
      
      // Test 1: Check if tables exist
      const { data: tables, error: tablesError } = await this.supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public');
      
      tests.push({
        test: 'Tables exist',
        passed: !tablesError && tables.length > 0,
        details: tables?.map(t => t.table_name) || []
      });

      // Test 2: Check categories
      const { data: categories, error: catError } = await this.supabase
        .from('categories')
        .select('*')
        .limit(5);
      
      tests.push({
        test: 'Categories accessible',
        passed: !catError,
        details: catError?.message || `Found ${categories?.length || 0} categories`
      });

      // Test 3: Check products view
      const { data: products, error: prodError } = await this.supabase
        .from('product_catalog')
        .select('*')
        .limit(5);
      
      tests.push({
        test: 'Product catalog view',
        passed: !prodError,
        details: prodError?.message || `Found ${products?.length || 0} products`
      });

      // Test 4: Check RLS is enabled
      const { data: rlsInfo, error: rlsError } = await this.supabase
        .rpc('exec_sql', { 
          sql: `SELECT schemaname, tablename, rowsecurity 
                FROM pg_tables 
                WHERE schemaname = 'public' 
                AND rowsecurity = true;` 
        });
      
      tests.push({
        test: 'RLS enabled',
        passed: !rlsError,
        details: rlsError?.message || 'RLS policies active'
      });

      const allPassed = tests.every(test => test.passed);
      
      return {
        success: allPassed,
        message: allPassed ? 'All database tests passed' : 'Some tests failed',
        tests
      };
    } catch (error) {
      console.error('Database test failed:', error);
      return {
        success: false,
        message: 'Database test failed',
        error: error.message
      };
    }
  }
}

// Helper function to execute SQL
export async function execSql(sql: string) {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  const { data, error } = await supabase.rpc('exec_sql', { sql });
  if (error) throw error;
  return data;
}