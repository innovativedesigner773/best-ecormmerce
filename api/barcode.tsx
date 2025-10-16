import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { createClient } from '@supabase/supabase-js';
import * as kv from './kv_store.tsx';

const app = new Hono();

app.use('*', cors({
  origin: '*',
  allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Lookup product by barcode using Barcode Lookup API
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
    
    console.log(`Looking up barcode: ${barcode}`);
    
    const response = await fetch(apiUrl);
    const data = await response.json();

    if (!response.ok) {
      console.log('API Error:', data);
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

    return c.json({ product: mappedProduct });

  } catch (error) {
    console.log('Barcode lookup error:', error);
    return c.json({ error: 'Internal server error during barcode lookup' }, 500);
  }
});

// Check if product already exists by barcode
app.get('/make-server-8880f2f2/barcode/check/:barcode', async (c) => {
  try {
    const barcode = c.req.param('barcode');
    
    // Check if product exists in KV store
    const existingProducts = await kv.getByPrefix('product:');
    const existingProduct = existingProducts.find(p => p.value.barcode === barcode);
    
    return c.json({ exists: !!existingProduct, product: existingProduct?.value || null });

  } catch (error) {
    console.log('Barcode check error:', error);
    return c.json({ error: 'Failed to check existing product' }, 500);
  }
});

// Add product to database
app.post('/make-server-8880f2f2/barcode/add-product', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);
    
    if (!user || userError) {
      return c.json({ error: 'Unauthorized' }, 401);
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
    
    console.log(`Product added via barcode: ${product.name} (${product.barcode})`);
    
    return c.json({ success: true, product });

  } catch (error) {
    console.log('Add product error:', error);
    return c.json({ error: 'Failed to add product' }, 500);
  }
});

export default app;