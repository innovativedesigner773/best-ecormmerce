import { offlineManager } from './offline-manager';
import { toast } from 'sonner';

// Mock delay to simulate network requests
const mockDelay = (ms: number = 500) => new Promise(resolve => setTimeout(resolve, ms));

export class MockAPI {
  // Products API
  static async getProducts() {
    await mockDelay();
    const products = offlineManager.getOfflineData('products');
    return {
      data: products,
      success: true,
      message: `Retrieved ${products.length} products from offline storage`
    };
  }

  static async getProductById(id: string) {
    await mockDelay();
    const products = offlineManager.getOfflineData('products');
    const product = products.find((p: any) => p.id === id);
    
    if (!product) {
      throw new Error(`Product with ID ${id} not found`);
    }
    
    return {
      data: product,
      success: true
    };
  }

  static async searchProducts(query: string) {
    await mockDelay();
    const products = offlineManager.getOfflineData('products');
    const filteredProducts = products.filter((product: any) =>
      product.name.toLowerCase().includes(query.toLowerCase()) ||
      product.brand.toLowerCase().includes(query.toLowerCase()) ||
      product.category.toLowerCase().includes(query.toLowerCase()) ||
      product.description.toLowerCase().includes(query.toLowerCase())
    );
    
    return {
      data: filteredProducts,
      success: true,
      message: `Found ${filteredProducts.length} products matching "${query}"`
    };
  }

  static async addProduct(productData: any) {
    await mockDelay();
    const products = offlineManager.getOfflineData('products');
    const newProduct = {
      ...productData,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const updatedProducts = [...products, newProduct];
    offlineManager.setOfflineData('products', updatedProducts);
    offlineManager.addToSyncQueue('add_product', newProduct);
    
    toast.success('✅ Product added offline. Will sync when online.');
    
    return {
      data: newProduct,
      success: true
    };
  }

  static async updateProduct(id: string, updates: any) {
    await mockDelay();
    const products = offlineManager.getOfflineData('products');
    const updatedProducts = products.map((product: any) =>
      product.id === id 
        ? { ...product, ...updates, updated_at: new Date().toISOString() }
        : product
    );
    
    offlineManager.setOfflineData('products', updatedProducts);
    offlineManager.addToSyncQueue('update_product', { id, updates });
    
    toast.success('✅ Product updated offline. Will sync when online.');
    
    const updatedProduct = updatedProducts.find((p: any) => p.id === id);
    return {
      data: updatedProduct,
      success: true
    };
  }

  static async deleteProduct(id: string) {
    await mockDelay();
    const products = offlineManager.getOfflineData('products');
    const updatedProducts = products.filter((product: any) => product.id !== id);
    
    offlineManager.setOfflineData('products', updatedProducts);
    offlineManager.addToSyncQueue('delete_product', { id });
    
    toast.success('✅ Product deleted offline. Will sync when online.');
    
    return {
      success: true,
      message: 'Product deleted successfully'
    };
  }

  // Barcode API
  static async lookupBarcode(barcode: string) {
    await mockDelay(1000);
    
    // Check if product already exists
    const products = offlineManager.getOfflineData('products');
    const existingProduct = products.find((p: any) => p.barcode === barcode);
    
    if (existingProduct) {
      return {
        data: existingProduct,
        success: true,
        message: 'Product found in offline database'
      };
    }

    // Mock barcode lookup response
    const mockBarcodeData: { [key: string]: any } = {
      '1234567890123': {
        name: 'All-Purpose Cleaner',
        brand: 'Generic Brand',
        category: 'Cleaning Supplies',
        description: 'Multi-surface cleaning solution',
        price: 12.99
      },
      '1234567890124': {
        name: 'Glass Cleaner',
        brand: 'Generic Brand',
        category: 'Cleaning Supplies',
        description: 'Streak-free glass cleaner',
        price: 8.99
      },
      '1234567890125': {
        name: 'Disinfectant Spray',
        brand: 'Generic Brand',
        category: 'Cleaning Supplies',
        description: 'Antibacterial surface spray',
        price: 15.99
      }
    };

    const productData = mockBarcodeData[barcode];
    
    if (!productData) {
      throw new Error(`Product not found for barcode: ${barcode}`);
    }

    const mappedProduct = {
      ...productData,
      barcode,
      image_url: `https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?w=300&q=80`,
      sku: `BB-${barcode}`,
      stock_quantity: 0,
      reorder_level: 10,
      cost_price: productData.price * 0.7 // Mock cost price
    };

    return {
      data: mappedProduct,
      success: true,
      message: 'Product data retrieved from barcode lookup (offline mode)'
    };
  }

  // User/Auth API
  static async createUserProfile(userData: any) {
    await mockDelay();
    const userProfiles = offlineManager.getOfflineData('userProfiles');
    const newProfile = {
      ...userData,
      id: crypto.randomUUID(),
      loyalty_points: 100,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const updatedProfiles = [...userProfiles, newProfile];
    offlineManager.setOfflineData('userProfiles', updatedProfiles);
    offlineManager.addToSyncQueue('create_user_profile', newProfile);
    
    return {
      data: newProfile,
      success: true
    };
  }

  // Orders API
  static async createOrder(orderData: any) {
    await mockDelay();
    const orders = offlineManager.getOfflineData('orders');
    const newOrder = {
      ...orderData,
      id: crypto.randomUUID(),
      order_number: `BB-${Date.now()}`,
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const updatedOrders = [...orders, newOrder];
    offlineManager.setOfflineData('orders', updatedOrders);
    offlineManager.addToSyncQueue('create_order', newOrder);
    
    toast.success('✅ Order placed offline. Will sync when online.');
    
    return {
      data: newOrder,
      success: true
    };
  }

  static async getUserOrders(userId: string) {
    await mockDelay();
    const orders = offlineManager.getOfflineData('orders');
    const userOrders = orders.filter((order: any) => order.user_id === userId);
    
    return {
      data: userOrders,
      success: true
    };
  }

  // Health Check
  static async healthCheck() {
    await mockDelay(200);
    return {
      status: 'healthy',
      mode: 'offline',
      timestamp: new Date().toISOString(),
      message: 'Mock API is running in offline mode'
    };
  }

  // Database Test
  static async testDatabase() {
    await mockDelay(300);
    const products = offlineManager.getOfflineData('products');
    const userProfiles = offlineManager.getOfflineData('userProfiles');
    const orders = offlineManager.getOfflineData('orders');
    
    return {
      status: 'success',
      message: 'Offline database connection successful',
      data: {
        products: products.length,
        userProfiles: userProfiles.length,
        orders: orders.length
      },
      timestamp: new Date().toISOString()
    };
  }
}