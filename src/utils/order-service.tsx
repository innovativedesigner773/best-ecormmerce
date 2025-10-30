import { supabase } from '../lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { generateUniqueId } from './id-generator';

export interface OrderItem {
  product_id: string;
  product_snapshot: any; // Store product details at time of order
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface OrderData {
  customer_id?: string;
  customer_email: string;
  customer_info: any;
  billing_address: any;
  shipping_address: any;
  payment_method?: string;
  payment_details?: any;
  subtotal: number;
  tax_amount?: number;
  shipping_amount: number;
  discount_amount: number;
  total_amount: number; // This will be mapped to 'total' in the database
  currency?: string;
  notes?: string;
  items: OrderItem[];
  order_number?: string; // Optional - will be generated if not provided
  isSharedCartOrder?: boolean; // Flag to indicate if this is a shared cart order
  isCashierOrder?: boolean; // Flag to indicate if this is a cashier POS order
}

export interface OrderResult {
  success: boolean;
  data?: any;
  error?: string;
}

export class OrderService {
  /**
   * Create a Supabase client with service role key for admin operations
   * Note: For security reasons, service role operations should be handled server-side
   * This method is kept for compatibility but will use the regular client
   */
  private static getServiceRoleClient() {
    // For security reasons, we don't use service role key in frontend
    // Instead, we use the regular client and rely on RLS policies
    console.warn('⚠️ Service role client requested in frontend - using regular client instead');
    return supabase;
  }

  /**
   * Check if there's sufficient stock for all items in the order
   */
  static async checkStockAvailability(items: OrderItem[]): Promise<OrderResult> {
    try {
      console.log('🔍 Checking stock availability for order items');

      for (const item of items) {
        const { data: product, error } = await supabase
          .from('products')
          .select('stock_quantity, name')
          .eq('id', item.product_id)
          .single();

        if (error) {
          console.error(`❌ Error checking stock for product ${item.product_id}:`, error);
          return {
            success: false,
            error: `Failed to check stock for product: ${error.message}`
          };
        }

        if (!product) {
          return {
            success: false,
            error: `Product not found: ${item.product_id}`
          };
        }

        const availableStock = product.stock_quantity || 0;
        if (availableStock < item.quantity) {
          return {
            success: false,
            error: `Insufficient stock for ${product.name}. Available: ${availableStock}, Required: ${item.quantity}`
          };
        }
      }

      console.log('✅ All items have sufficient stock');
      return { success: true };

    } catch (error) {
      console.error('❌ Unexpected error checking stock availability:', error);
      return {
        success: false,
        error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Create a new order in the database
   */
  static async createOrder(orderData: OrderData): Promise<OrderResult> {
    try {
      console.log('🛒 Creating order:', orderData);

      // Generate unique order number if not provided
      const orderNumber = orderData.order_number || generateUniqueId('ORDER');
      console.log('📋 Generated order number:', orderNumber);

      // First, check stock availability
      if (orderData.items && orderData.items.length > 0) {
        const stockCheck = await this.checkStockAvailability(orderData.items);
        if (!stockCheck.success) {
          return {
            success: false,
            error: stockCheck.error || 'Stock check failed'
          };
        }
      }

      // For shared cart orders or cashier orders, we need to handle RLS differently
      // The issue is that RLS policies require auth.uid() to be not null
      // But shared cart orders might have customer_id = null
      
      if (orderData.isSharedCartOrder) {
        console.log('🔑 Processing shared cart order - will use special RLS handling');
      } else if (orderData.isCashierOrder) {
        console.log('🔑 Processing cashier POS order - will use special RLS handling');
      }

      // Create the order record (using only columns that exist in the actual database)
      const orderInsertData = {
        order_number: orderNumber,
        customer_id: orderData.customer_id,
        customer_email: orderData.customer_email,
        customer_info: orderData.customer_info,
        channel: orderData.isCashierOrder ? 'pos' : 'online',
        billing_address: orderData.billing_address || (orderData.isCashierOrder ? {
          name: orderData.customer_info?.name || 'POS Customer',
          email: orderData.customer_email,
          phone: orderData.customer_info?.phone || null,
          address_line_1: 'Store Location',
          address_line_2: null,
          city: 'Store City',
          state: 'Store State',
          postal_code: '00000',
          country: 'South Africa'
        } : null),
        shipping_address: orderData.shipping_address || (orderData.isCashierOrder ? {
          name: orderData.customer_info?.name || 'POS Customer',
          email: orderData.customer_email,
          phone: orderData.customer_info?.phone || null,
          address_line_1: 'Store Location',
          address_line_2: null,
          city: 'Store City',
          state: 'Store State',
          postal_code: '00000',
          country: 'South Africa'
        } : null),
        payment_method: orderData.payment_method,
        payment_details: orderData.payment_details,
        subtotal: orderData.subtotal,
        tax_amount: orderData.tax_amount || 0,
        shipping_amount: orderData.shipping_amount,
        discount_amount: orderData.discount_amount,
        total: orderData.total_amount, // Use 'total' to match actual database schema
        currency: orderData.currency || 'USD', // Use USD to match old schema default
        notes: orderData.notes,
        status: 'confirmed', // Set as confirmed immediately after checkout
        payment_status: 'paid',
        processed_at: new Date().toISOString(),
      };

      console.log('📝 Order insert data:', orderInsertData);

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert(orderInsertData)
        .select()
        .single();

      if (orderError) {
        console.error('❌ Error creating order:', orderError);
        console.error('❌ Order data that failed:', {
          customer_id: orderData.customer_id,
          customer_email: orderData.customer_email,
          subtotal: orderData.subtotal,
          total_amount: orderData.total_amount,
          items_count: orderData.items?.length || 0
        });
        return {
          success: false,
          error: `Failed to create order: ${orderError.message}`
        };
      }

      console.log('✅ Order created successfully:', order);

      // Then, create the order items
      if (orderData.items && orderData.items.length > 0) {
        const orderItems = orderData.items.map(item => ({
          order_id: order.id,
          product_id: item.product_id,
          product_snapshot: item.product_snapshot,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
        }));

        console.log('📦 Creating order items:', orderItems);
        
        const { error: itemsError } = await supabase
          .from('order_items')
          .insert(orderItems);

        if (itemsError) {
          console.error('❌ Error creating order items:', itemsError);
          console.error('❌ Order items data that failed:', orderItems);
          // Note: We don't rollback the order here, but we log the error
          // In a production system, you might want to implement transaction rollback
          return {
            success: false,
            error: `Order created but failed to add items: ${itemsError.message}`
          };
        }

        console.log('✅ Order items created successfully');
      }

      // Update stock levels when order is completed
      const stockResult = await this.updateStockLevels(order.id, supabase);
      if (!stockResult.success) {
        console.warn('⚠️ Order created but stock update failed:', stockResult.error);
        // Don't fail the order creation if stock update fails
      }

      return {
        success: true,
        data: {
          ...order,
          order_number: orderNumber
        }
      };

    } catch (error) {
      console.error('❌ Unexpected error creating order:', error);
      return {
        success: false,
        error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Update order status
   */
  static async updateOrderStatus(orderId: string, status: string, paymentStatus?: string): Promise<OrderResult> {
    try {
      const updateData: any = {
        status,
        updated_at: new Date().toISOString()
      };

      if (paymentStatus) {
        updateData.payment_status = paymentStatus;
      }

      const { data, error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId)
        .select()
        .single();

      if (error) {
        console.error('❌ Error updating order status:', error);
        return {
          success: false,
          error: `Failed to update order status: ${error.message}`
        };
      }

      return {
        success: true,
        data
      };

    } catch (error) {
      console.error('❌ Unexpected error updating order status:', error);
      return {
        success: false,
        error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Get orders for a specific customer
   */
  static async getCustomerOrders(customerId: string): Promise<OrderResult> {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (*)
        `)
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching customer orders:', error);
        return {
          success: false,
          error: `Failed to fetch orders: ${error.message}`
        };
      }

      return {
        success: true,
        data
      };

    } catch (error) {
      console.error('❌ Unexpected error fetching customer orders:', error);
      return {
        success: false,
        error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Get a specific order by ID
   */
  static async getOrder(orderId: string): Promise<OrderResult> {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (*)
        `)
        .eq('id', orderId)
        .single();

      if (error) {
        console.error('❌ Error fetching order:', error);
        return {
          success: false,
          error: `Failed to fetch order: ${error.message}`
        };
      }

      return {
        success: true,
        data
      };

    } catch (error) {
      console.error('❌ Unexpected error fetching order:', error);
      return {
        success: false,
        error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Update stock levels when order is completed
   */
  static async updateStockLevels(orderId: string, client?: any): Promise<OrderResult> {
    try {
      console.log('📦 Updating stock levels for order:', orderId);

      // Use provided client or default to regular supabase client
      const dbClient = client || supabase;
      
      // Get order items
      const { data: orderItems, error: itemsError } = await dbClient
        .from('order_items')
        .select('product_id, quantity')
        .eq('order_id', orderId);

      if (itemsError) {
        console.error('❌ Error fetching order items for stock update:', itemsError);
        return {
          success: false,
          error: `Failed to fetch order items: ${itemsError.message}`
        };
      }

      if (!orderItems || orderItems.length === 0) {
        console.log('ℹ️ No order items found for stock update');
        return { success: true };
      }

      // Update stock for each product
      let successCount = 0;
      let failCount = 0;

      for (const item of orderItems) {
        try {
          // First, check current stock
          const { data: product, error: fetchError } = await dbClient
            .from('products')
            .select('stock_quantity, name')
            .eq('id', item.product_id)
            .single();

          if (fetchError) {
            console.error(`❌ Error fetching product ${item.product_id}:`, fetchError);
            failCount++;
            continue;
          }

          if (!product) {
            console.error(`❌ Product ${item.product_id} not found`);
            failCount++;
            continue;
          }

          const currentStock = product.stock_quantity || 0;
          const newStock = Math.max(0, currentStock - item.quantity); // Don't go below 0

          if (currentStock < item.quantity) {
            console.warn(`⚠️ Insufficient stock for ${product.name}. Current: ${currentStock}, Required: ${item.quantity}`);
          }

          // Update stock
          const { error: stockError } = await dbClient
            .from('products')
            .update({
              stock_quantity: newStock,
              updated_at: new Date().toISOString()
            })
            .eq('id', item.product_id);

          if (stockError) {
            console.error(`❌ Error updating stock for product ${item.product_id}:`, stockError);
            failCount++;
          } else {
            console.log(`✅ Updated stock for ${product.name}: ${currentStock} → ${newStock}`);
            successCount++;
          }
        } catch (itemError) {
          console.error(`❌ Error processing item ${item.product_id}:`, itemError);
          failCount++;
        }
      }

      console.log(`📊 Stock update summary: ${successCount} successful, ${failCount} failed`);

      return {
        success: failCount === 0,
        data: { successCount, failCount }
      };

    } catch (error) {
      console.error('❌ Unexpected error updating stock levels:', error);
      return {
        success: false,
        error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}
