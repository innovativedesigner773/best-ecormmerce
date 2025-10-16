import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { handle } from 'hono/vercel';
import { createClient } from '@supabase/supabase-js';
import * as kv from './kv_store.tsx';

const app = new Hono();

// Enhanced CORS configuration
app.use('*', cors({
  origin: ['http://localhost:3000', 'https://www.figma.com', 'https://figma.com'],
  allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
}));

// Enable logging for debugging
app.use('*', logger(console.log));

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Health check endpoint - completely public, no auth required
app.get('/make-server-8880f2f2/health', (c) => {
  console.log('🩺 Health check requested at:', new Date().toISOString());
  
  return c.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    message: 'Best Brightness server is running',
    version: '1.0.0',
    endpoints: {
      health: '/make-server-8880f2f2/health',
      products: '/make-server-8880f2f2/products',
      barcode_lookup: '/make-server-8880f2f2/barcode/lookup',
      barcode_check: '/make-server-8880f2f2/barcode/check/:barcode',
      init_database: '/make-server-8880f2f2/init-database (requires auth)',
      add_product: '/make-server-8880f2f2/barcode/add-product (requires auth)',
      stripe_create_payment_intent: '/make-server-8880f2f2/stripe/create-payment-intent',
      stripe_confirm_payment: '/make-server-8880f2f2/stripe/confirm-payment'
    }
  });
});

// Test database connection endpoint - public for debugging
app.get('/make-server-8880f2f2/test-db', async (c) => {
  try {
    console.log('🔍 Testing database connection...');
    
    // Test basic connection
    const { data, error } = await supabase
      .from('user_profiles')
      .select('count(*)')
      .limit(1);
    
    if (error) {
      console.log('❌ Database test failed:', error);
      return c.json({ 
        status: 'error',
        message: 'Database connection failed',
        error: error.message,
        timestamp: new Date().toISOString()
      }, 500);
    }
    
    console.log('✅ Database connection successful');
    return c.json({ 
      status: 'success',
      message: 'Database connection successful',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.log('❌ Database test exception:', error);
    return c.json({ 
      status: 'error',
      message: 'Database test failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, 500);
  }
});

// Test user creation endpoint - public for debugging
app.post('/make-server-8880f2f2/test-user-creation', async (c) => {
  try {
    const { email = 'test@example.com', role = 'customer' } = await c.req.json().catch(() => ({}));
    
    console.log('🧪 Testing user creation for:', email);
    
    // Test direct profile creation
    const testUserId = crypto.randomUUID();
    
    const { data, error } = await supabase
      .from('user_profiles')
      .insert({
        id: testUserId,
        email: email,
        first_name: 'Test',
        last_name: 'User',
        role: role,
        loyalty_points: 100,
        is_active: true
      })
      .select()
      .single();
    
    if (error) {
      console.log('❌ Test user creation failed:', error);
      return c.json({ 
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }, 400);
    }
    
    console.log('✅ Test user created successfully:', data);
    
    // Clean up test user
    await supabase
      .from('user_profiles')
      .delete()
      .eq('id', testUserId);
    
    return c.json({ 
      success: true,
      message: 'User creation test passed',
      user_data: data,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.log('❌ Test user creation exception:', error);
    return c.json({ 
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, 500);
  }
});

// Helper function to verify auth token
async function verifyAuthToken(authHeader: string | undefined) {
  if (!authHeader) {
    return { valid: false, error: 'No authorization header' };
  }
  
  const token = authHeader.replace('Bearer ', '');
  if (!token) {
    return { valid: false, error: 'No token provided' };
  }
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return { valid: false, error: error?.message || 'Invalid token' };
    }
    
    return { valid: true, user };
  } catch (error) {
    return { valid: false, error: 'Token verification failed' };
  }
}

// Database initialization endpoint - requires auth
app.post('/make-server-8880f2f2/init-database', async (c) => {
  try {
    const authResult = await verifyAuthToken(c.req.header('Authorization'));
    
    if (!authResult.valid) {
      console.log('🔒 Database init - unauthorized:', authResult.error);
      return c.json({ error: 'Unauthorized: ' + authResult.error }, 401);
    }

    console.log('🗄️ Initializing database with demo data...');

    // Initialize demo products
    const demoProducts = [
      {
        id: crypto.randomUUID(),
        name: 'All-Purpose Cleaner',
        brand: 'Best Brightness',
        category: 'Cleaning Supplies',
        description: 'Powerful all-purpose cleaner for multiple surfaces',
        barcode: '1234567890123',
        price: 12.99,
        cost_price: 8.50,
        stock_quantity: 50,
        reorder_level: 10,
        image_url: '',
        sku: 'BB-APC-001',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: crypto.randomUUID(),
        name: 'Glass Cleaner',
        brand: 'Best Brightness',
        category: 'Cleaning Supplies',
        description: 'Streak-free glass and window cleaner',
        barcode: '1234567890124',
        price: 8.99,
        cost_price: 5.50,
        stock_quantity: 30,
        reorder_level: 5,
        image_url: '',
        sku: 'BB-GC-002',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: crypto.randomUUID(),
        name: 'Disinfectant Spray',
        brand: 'Best Brightness',
        category: 'Cleaning Supplies',
        description: 'Kills 99.9% of germs and bacteria',
        barcode: '1234567890125',
        price: 15.99,
        cost_price: 10.00,
        stock_quantity: 25,
        reorder_level: 8,
        image_url: '',
        sku: 'BB-DS-003',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    // Save demo products
    for (const product of demoProducts) {
      await kv.set(`product:${product.id}`, product);
    }

    console.log(`✅ Initialized ${demoProducts.length} demo products`);

    return c.json({ 
      success: true, 
      message: 'Database initialized successfully',
      products_created: demoProducts.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.log('❌ Database initialization error:', error);
    return c.json({ 
      error: 'Failed to initialize database',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, 500);
  }
});

// Get all products - public endpoint
app.get('/make-server-8880f2f2/products', async (c) => {
  try {
    console.log('📦 Fetching products...');
    const products = await kv.getByPrefix('product:');
    console.log(`📦 Found ${products.length} products`);
    
    return c.json({ 
      products: products.map(p => p.value),
      count: products.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.log('❌ Get products error:', error);
    return c.json({ 
      error: 'Failed to fetch products',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, 500);
  }
});

// Barcode lookup endpoint - public endpoint
app.post('/make-server-8880f2f2/barcode/lookup', async (c) => {
  try {
    const { barcode } = await c.req.json();
    
    if (!barcode) {
      return c.json({ error: 'Barcode is required' }, 400);
    }

    const apiKey = process.env.BARCODE_LOOKUP_API_KEY;
    if (!apiKey) {
      return c.json({ error: 'Barcode Lookup API key not configured' }, 500);
    }

    // Call Barcode Lookup API
    const apiUrl = `https://api.barcodelookup.com/v3/products?barcode=${barcode}&key=${apiKey}&formatted=n`;
    
    console.log(`🔍 Looking up barcode: ${barcode}`);
    
    const response = await fetch(apiUrl);
    const data = await response.json();

    if (!response.ok) {
      console.log('❌ Barcode API Error:', data);
      return c.json({ error: data.message || 'Failed to lookup barcode' }, response.status);
    }

    if (!data.products || data.products.length === 0) {
      return c.json({ error: 'Product not found for this barcode' }, 404);
    }

    const product = data.products[0];
    
    // Map API response to our product schema
    const mappedProduct = {
      name: product.title || product.product_name || 'Unknown Product',
      brand: product.brand || product.manufacturer || '',
      category: product.category || 'General',
      description: product.description || '',
      barcode: barcode,
      price: parseFloat(product.price || '0'),
      image_url: product.images && product.images.length > 0 ? product.images[0] : '',
      sku: product.model || product.mpn || barcode,
      weight: product.weight || '',
      dimensions: product.dimension || '',
      ingredients: product.ingredients || '',
      features: product.features || []
    };

    return c.json({ 
      product: mappedProduct,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.log('❌ Barcode lookup error:', error);
    return c.json({ 
      error: 'Internal server error during barcode lookup',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, 500);
  }
});

// Check if product already exists by barcode - public endpoint
app.get('/make-server-8880f2f2/barcode/check/:barcode', async (c) => {
  try {
    const barcode = c.req.param('barcode');
    
    // Check if product exists in KV store
    const existingProducts = await kv.getByPrefix('product:');
    const existingProduct = existingProducts.find(p => p.value.barcode === barcode);
    
    return c.json({ 
      exists: !!existingProduct, 
      product: existingProduct?.value || null,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.log('❌ Barcode check error:', error);
    return c.json({ 
      error: 'Failed to check existing product',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, 500);
  }
});

// Add product to database - requires auth
app.post('/make-server-8880f2f2/barcode/add-product', async (c) => {
  try {
    const authResult = await verifyAuthToken(c.req.header('Authorization'));
    
    if (!authResult.valid) {
      console.log('🔒 Add product - unauthorized:', authResult.error);
      return c.json({ error: 'Unauthorized: ' + authResult.error }, 401);
    }

    const productData = await c.req.json();
    
    // Generate product ID
    const productId = crypto.randomUUID();
    
    // Add default fields
    const product = {
      id: productId,
      ...productData,
      stock_quantity: productData.stock_quantity || 0,
      reorder_level: productData.reorder_level || 10,
      supplier_id: productData.supplier_id || null,
      cost_price: productData.cost_price || productData.price,
      discount_percentage: 0,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Save to KV store
    await kv.set(`product:${productId}`, product);
    
    console.log(`✅ Product added via barcode: ${product.name} (${product.barcode})`);
    
    return c.json({ 
      success: true, 
      product,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.log('❌ Add product error:', error);
    return c.json({ 
      error: 'Failed to add product',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, 500);
  }
});

// ==================== STRIPE PAYMENT ENDPOINTS ====================

// Create Stripe payment intent
app.post('/make-server-8880f2f2/stripe/create-payment-intent', async (c) => {
  try {
    const { amount, currency, customerEmail, customerName } = await c.req.json();

    // Validate required fields
    if (!amount || !currency) {
      return c.json({ 
        success: false, 
        error: 'Missing required fields: amount and currency are required' 
      }, 400);
    }

    // Get Stripe secret key from environment
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    
    if (!stripeSecretKey) {
      console.error('❌ Stripe secret key not found in environment variables');
      return c.json({ 
        success: false, 
        error: 'Stripe configuration error' 
      }, 500);
    }

    // Dynamically import Stripe to avoid issues
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2024-12-18.acacia' });

    // Create a PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency.toLowerCase(),
      metadata: {
        customer_email: customerEmail || '',
        customer_name: customerName || '',
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    console.log('✅ Payment intent created:', paymentIntent.id);

    return c.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error: any) {
    console.error('❌ Error creating payment intent:', error);
    return c.json({ 
      success: false, 
      error: error.message || 'Failed to create payment intent' 
    }, 500);
  }
});

// Confirm Stripe payment
app.post('/make-server-8880f2f2/stripe/confirm-payment', async (c) => {
  try {
    const { paymentMethodId, amount, currency, customerEmail } = await c.req.json();

    if (!paymentMethodId || !amount || !currency) {
      return c.json({ 
        success: false, 
        error: 'Missing required fields' 
      }, 400);
    }

    // Get Stripe secret key from environment
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    
    if (!stripeSecretKey) {
      return c.json({ 
        success: false, 
        error: 'Stripe configuration error' 
      }, 500);
    }

    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2024-12-18.acacia' });

    // Create and confirm payment intent in one step
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: currency.toLowerCase(),
      payment_method: paymentMethodId,
      confirm: true,
      receipt_email: customerEmail,
      return_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/orders`,
    });

    console.log('✅ Payment confirmed:', paymentIntent.id, 'Status:', paymentIntent.status);

    return c.json({
      success: true,
      paymentIntent: {
        id: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
      },
    });
  } catch (error: any) {
    console.error('❌ Error confirming payment:', error);
    return c.json({ 
      success: false, 
      error: error.message || 'Failed to confirm payment' 
    }, 500);
  }
});

// Retrieve payment method details
app.post('/make-server-8880f2f2/stripe/payment-method-details', async (c) => {
  try {
    const { paymentMethodId } = await c.req.json();

    if (!paymentMethodId) {
      return c.json({ 
        success: false, 
        error: 'Payment method ID is required' 
      }, 400);
    }

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    
    if (!stripeSecretKey) {
      return c.json({ 
        success: false, 
        error: 'Stripe configuration error' 
      }, 500);
    }

    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2024-12-18.acacia' });

    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);

    console.log('✅ Payment method details retrieved:', paymentMethod.id);

    return c.json({
      success: true,
      paymentMethod: {
        id: paymentMethod.id,
        type: paymentMethod.type,
        card: paymentMethod.card ? {
          brand: paymentMethod.card.brand,
          last4: paymentMethod.card.last4,
          exp_month: paymentMethod.card.exp_month,
          exp_year: paymentMethod.card.exp_year,
        } : null,
      },
    });
  } catch (error: any) {
    console.error('❌ Error retrieving payment method:', error);
    return c.json({ 
      success: false, 
      error: error.message || 'Failed to retrieve payment method' 
    }, 500);
  }
});

// Stripe webhook handler
app.post('/make-server-8880f2f2/stripe/webhook', async (c) => {
  try {
    const sig = c.req.header('stripe-signature');
    const body = await c.req.text();

    if (!sig) {
      return c.json({ 
        success: false, 
        error: 'Missing stripe signature' 
      }, 400);
    }

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    if (!stripeSecretKey || !webhookSecret) {
      return c.json({ 
        success: false, 
        error: 'Stripe configuration error' 
      }, 500);
    }

    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2024-12-18.acacia' });

    // Verify webhook signature
    const event = stripe.webhooks.constructEvent(body, sig, webhookSecret);

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded':
        console.log('✅ Payment succeeded:', event.data.object.id);
        // TODO: Update order status in database
        break;
      case 'payment_intent.payment_failed':
        console.log('❌ Payment failed:', event.data.object.id);
        // TODO: Handle failed payment
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return c.json({ success: true, received: true });
  } catch (error: any) {
    console.error('❌ Webhook error:', error);
    return c.json({ 
      success: false, 
      error: error.message || 'Webhook handling failed' 
    }, 400);
  }
});

// Global error handler
app.onError((err, c) => {
  console.log('🚨 Server error:', err);
  return c.json({ 
    error: 'Internal server error',
    details: err.message,
    timestamp: new Date().toISOString()
  }, 500);
});

// 404 handler
app.notFound((c) => {
  console.log('🔍 Route not found:', c.req.url);
  return c.json({ 
    error: 'Route not found',
    available_routes: [
      '/make-server-8880f2f2/health',
      '/make-server-8880f2f2/test-db',
      '/make-server-8880f2f2/test-user-creation',
      '/make-server-8880f2f2/products',
      '/make-server-8880f2f2/barcode/lookup',
      '/make-server-8880f2f2/barcode/check/:barcode',
      '/make-server-8880f2f2/init-database',
      '/make-server-8880f2f2/barcode/add-product',
      '/make-server-8880f2f2/stripe/create-payment-intent',
      '/make-server-8880f2f2/stripe/confirm-payment',
      '/make-server-8880f2f2/stripe/payment-method-details',
      '/make-server-8880f2f2/stripe/webhook'
    ],
    timestamp: new Date().toISOString()
  }, 404);
});

console.log('🚀 Best Brightness server starting...');
console.log('📡 Available endpoints:');
console.log('  - GET  /make-server-8880f2f2/health (public)');
console.log('  - GET  /make-server-8880f2f2/test-db (public)');
console.log('  - POST /make-server-8880f2f2/test-user-creation (public)');
console.log('  - GET  /make-server-8880f2f2/products (public)');
console.log('  - POST /make-server-8880f2f2/barcode/lookup (public)');
console.log('  - GET  /make-server-8880f2f2/barcode/check/:barcode (public)');
console.log('  - POST /make-server-8880f2f2/init-database (requires auth)');
console.log('  - POST /make-server-8880f2f2/barcode/add-product (requires auth)');
console.log('  - POST /make-server-8880f2f2/stripe/create-payment-intent (public)');
console.log('  - POST /make-server-8880f2f2/stripe/confirm-payment (public)');
console.log('  - POST /make-server-8880f2f2/stripe/payment-method-details (public)');
console.log('  - POST /make-server-8880f2f2/stripe/webhook (public)');

// Export for Vercel using Hono's Vercel adapter
export default handle(app);