// SQL Functions for Best Brightness E-Commerce Platform
// These functions can be executed via Supabase RPC calls

export const SQL_FUNCTIONS = {
  // Function to execute raw SQL
  EXEC_SQL: `
    CREATE OR REPLACE FUNCTION exec_sql(sql text)
    RETURNS text AS $$
    BEGIN
      EXECUTE sql;
      RETURN 'Success';
    EXCEPTION
      WHEN OTHERS THEN
        RETURN 'Error: ' || SQLERRM;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
  `,

  // Sales Analytics Function
  GET_SALES_ANALYTICS: `
    CREATE OR REPLACE FUNCTION get_sales_analytics()
    RETURNS JSON AS $$
    DECLARE
      result JSON;
    BEGIN
      SELECT json_build_object(
        'total_sales', COALESCE(SUM(total_amount), 0),
        'total_orders', COUNT(*),
        'average_order_value', COALESCE(AVG(total_amount), 0),
        'sales_today', COALESCE(
          (SELECT SUM(total_amount) 
           FROM orders 
           WHERE DATE(created_at) = CURRENT_DATE), 0
        ),
        'sales_this_month', COALESCE(
          (SELECT SUM(total_amount) 
           FROM orders 
           WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)), 0
        ),
        'sales_this_year', COALESCE(
          (SELECT SUM(total_amount) 
           FROM orders 
           WHERE DATE_TRUNC('year', created_at) = DATE_TRUNC('year', CURRENT_DATE)), 0
        )
      ) INTO result
      FROM orders
      WHERE status IN ('confirmed', 'processing', 'shipped', 'delivered');
      
      RETURN result;
    END;
    $$ LANGUAGE plpgsql;
  `,

  // Product Analytics Function
  GET_PRODUCT_ANALYTICS: `
    CREATE OR REPLACE FUNCTION get_product_analytics()
    RETURNS JSON AS $$
    DECLARE
      result JSON;
    BEGIN
      SELECT json_build_object(
        'total_products', COUNT(*),
        'active_products', COUNT(*) FILTER (WHERE status = 'active'),
        'out_of_stock', COUNT(*) FILTER (WHERE stock_quantity <= 0),
        'low_stock', COUNT(*) FILTER (WHERE stock_quantity <= low_stock_threshold AND stock_quantity > 0),
        'featured_products', COUNT(*) FILTER (WHERE is_featured = true),
        'average_price', COALESCE(AVG(price), 0),
        'total_inventory_value', COALESCE(SUM(price * stock_quantity), 0)
      ) INTO result
      FROM products;
      
      RETURN result;
    END;
    $$ LANGUAGE plpgsql;
  `,

  // Customer Analytics Function
  GET_CUSTOMER_ANALYTICS: `
    CREATE OR REPLACE FUNCTION get_customer_analytics()
    RETURNS JSON AS $$
    DECLARE
      result JSON;
    BEGIN
      SELECT json_build_object(
        'total_customers', COUNT(*),
        'active_customers', COUNT(*) FILTER (WHERE is_active = true),
        'customers_with_orders', (
          SELECT COUNT(DISTINCT customer_id) FROM orders
        ),
        'average_loyalty_points', COALESCE(AVG(loyalty_points), 0),
        'average_total_spent', COALESCE(AVG(total_spent), 0),
        'top_spenders', (
          SELECT json_agg(
            json_build_object(
              'id', id,
              'first_name', first_name,
              'last_name', last_name,
              'total_spent', total_spent
            )
          )
          FROM (
            SELECT id, first_name, last_name, total_spent
            FROM user_profiles
            WHERE role = 'customer'
            ORDER BY total_spent DESC
            LIMIT 5
          ) top_customers
        )
      ) INTO result
      FROM user_profiles
      WHERE role = 'customer';
      
      RETURN result;
    END;
    $$ LANGUAGE plpgsql;
  `,

  // Get Best Selling Products
  GET_BEST_SELLING_PRODUCTS: `
    CREATE OR REPLACE FUNCTION get_best_selling_products(limit_count integer DEFAULT 10)
    RETURNS TABLE(
      product_id UUID,
      product_name VARCHAR,
      total_quantity INTEGER,
      total_revenue DECIMAL,
      order_count INTEGER
    ) AS $$
    BEGIN
      RETURN QUERY
      SELECT 
        oi.product_id,
        oi.product_name,
        SUM(oi.quantity)::INTEGER as total_quantity,
        SUM(oi.total_price) as total_revenue,
        COUNT(DISTINCT oi.order_id)::INTEGER as order_count
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE o.status IN ('confirmed', 'processing', 'shipped', 'delivered')
        AND oi.product_id IS NOT NULL
      GROUP BY oi.product_id, oi.product_name
      ORDER BY total_quantity DESC
      LIMIT limit_count;
    END;
    $$ LANGUAGE plpgsql;
  `,

  // Sales by Category Function
  GET_SALES_BY_CATEGORY: `
    CREATE OR REPLACE FUNCTION get_sales_by_category()
    RETURNS TABLE(
      category_id UUID,
      category_name VARCHAR,
      total_sales DECIMAL,
      order_count INTEGER,
      product_count INTEGER
    ) AS $$
    BEGIN
      RETURN QUERY
      SELECT 
        c.id as category_id,
        c.name as category_name,
        COALESCE(SUM(oi.total_price), 0) as total_sales,
        COUNT(DISTINCT oi.order_id)::INTEGER as order_count,
        COUNT(DISTINCT p.id)::INTEGER as product_count
      FROM categories c
      LEFT JOIN products p ON c.id = p.category_id
      LEFT JOIN order_items oi ON p.id = oi.product_id
      LEFT JOIN orders o ON oi.order_id = o.id AND o.status IN ('confirmed', 'processing', 'shipped', 'delivered')
      WHERE c.is_active = true
      GROUP BY c.id, c.name
      ORDER BY total_sales DESC;
    END;
    $$ LANGUAGE plpgsql;
  `,

  // Calculate Cart Total with Promotions
  CALCULATE_CART_TOTAL: `
    CREATE OR REPLACE FUNCTION calculate_cart_total(
      customer_id UUID,
      cart_items JSON
    ) RETURNS JSON AS $$
    DECLARE
      item JSON;
      product_record RECORD;
      promotion_record RECORD;
      subtotal DECIMAL := 0;
      total_discount DECIMAL := 0;
      tax_amount DECIMAL := 0;
      final_total DECIMAL := 0;
      result JSON;
    BEGIN
      -- Process each cart item
      FOR item IN SELECT * FROM json_array_elements(cart_items)
      LOOP
        -- Get product details
        SELECT * INTO product_record
        FROM products
        WHERE id = (item->>'product_id')::UUID;
        
        IF FOUND THEN
          -- Calculate item subtotal
          subtotal := subtotal + (product_record.price * (item->>'quantity')::INTEGER);
          
          -- Check for applicable promotions
          SELECT p.* INTO promotion_record
          FROM promotions p
          JOIN promotion_products pp ON p.id = pp.promotion_id
          WHERE pp.product_id = product_record.id
            AND p.status = 'active'
            AND p.starts_at <= NOW()
            AND (p.ends_at IS NULL OR p.ends_at > NOW())
          ORDER BY p.priority DESC
          LIMIT 1;
          
          IF FOUND THEN
            CASE promotion_record.discount_type
              WHEN 'percentage' THEN
                total_discount := total_discount + 
                  (product_record.price * (item->>'quantity')::INTEGER * promotion_record.discount_value / 100);
              WHEN 'fixed_amount' THEN
                total_discount := total_discount + 
                  (promotion_record.discount_value * (item->>'quantity')::INTEGER);
            END CASE;
          END IF;
        END IF;
      END LOOP;
      
      -- Calculate tax (15% on discounted amount)
      tax_amount := (subtotal - total_discount) * 0.15;
      
      -- Calculate final total
      final_total := subtotal - total_discount + tax_amount;
      
      -- Build result
      result := json_build_object(
        'subtotal', subtotal,
        'discount_amount', total_discount,
        'tax_amount', tax_amount,
        'total_amount', final_total
      );
      
      RETURN result;
    END;
    $$ LANGUAGE plpgsql;
  `,

  // Check Promotion Eligibility
  CHECK_PROMOTION_ELIGIBILITY: `
    CREATE OR REPLACE FUNCTION check_promotion_eligibility(
      customer_id UUID,
      promotion_id UUID,
      cart_items JSON
    ) RETURNS JSON AS $$
    DECLARE
      promotion_record RECORD;
      usage_count INTEGER := 0;
      cart_total DECIMAL := 0;
      eligible BOOLEAN := false;
      reason TEXT := '';
      result JSON;
    BEGIN
      -- Get promotion details
      SELECT * INTO promotion_record
      FROM promotions
      WHERE id = promotion_id;
      
      IF NOT FOUND THEN
        result := json_build_object(
          'eligible', false,
          'reason', 'Promotion not found'
        );
        RETURN result;
      END IF;
      
      -- Check if promotion is active
      IF promotion_record.status != 'active' OR 
         promotion_record.starts_at > NOW() OR 
         (promotion_record.ends_at IS NOT NULL AND promotion_record.ends_at < NOW()) THEN
        result := json_build_object(
          'eligible', false,
          'reason', 'Promotion is not currently active'
        );
        RETURN result;
      END IF;
      
      -- Check usage limits
      IF promotion_record.usage_limit_per_customer IS NOT NULL THEN
        SELECT COUNT(*) INTO usage_count
        FROM customer_promotions_usage
        WHERE customer_id = check_promotion_eligibility.customer_id
          AND promotion_id = check_promotion_eligibility.promotion_id;
          
        IF usage_count >= promotion_record.usage_limit_per_customer THEN
          result := json_build_object(
            'eligible', false,
            'reason', 'Usage limit exceeded for this customer'
          );
          RETURN result;
        END IF;
      END IF;
      
      -- Check minimum order amount
      IF promotion_record.minimum_order_amount IS NOT NULL THEN
        -- Calculate cart total (simplified)
        SELECT SUM(p.price * (item->>'quantity')::INTEGER) INTO cart_total
        FROM json_array_elements(cart_items) item
        JOIN products p ON p.id = (item->>'product_id')::UUID;
        
        IF cart_total < promotion_record.minimum_order_amount THEN
          result := json_build_object(
            'eligible', false,
            'reason', 'Minimum order amount not met'
          );
          RETURN result;
        END IF;
      END IF;
      
      -- If we get here, promotion is eligible
      result := json_build_object(
        'eligible', true,
        'reason', 'Promotion is eligible'
      );
      
      RETURN result;
    END;
    $$ LANGUAGE plpgsql;
  `,

  // Update Stock Levels
  UPDATE_STOCK_LEVELS: `
    CREATE OR REPLACE FUNCTION update_stock_levels(
      order_id UUID
    ) RETURNS BOOLEAN AS $$
    DECLARE
      item_record RECORD;
      success BOOLEAN := true;
    BEGIN
      -- Update stock for each order item
      FOR item_record IN 
        SELECT product_id, quantity
        FROM order_items
        WHERE order_id = update_stock_levels.order_id
          AND product_id IS NOT NULL
      LOOP
        UPDATE products
        SET stock_quantity = stock_quantity - item_record.quantity
        WHERE id = item_record.product_id
          AND stock_quantity >= item_record.quantity;
        
        -- Check if update was successful
        IF NOT FOUND THEN
          success := false;
        END IF;
      END LOOP;
      
      RETURN success;
    END;
    $$ LANGUAGE plpgsql;
  `
};

// Function to install all SQL functions
export async function installSQLFunctions(supabase: any) {
  console.log('Installing SQL functions...');
  
  for (const [name, sql] of Object.entries(SQL_FUNCTIONS)) {
    try {
      const { error } = await supabase.rpc('exec_sql', { sql });
      if (error) {
        console.error(`Error installing ${name}:`, error);
      } else {
        console.log(`✓ Installed ${name}`);
      }
    } catch (error) {
      console.error(`Error installing ${name}:`, error);
    }
  }
  
  console.log('SQL functions installation completed');
}