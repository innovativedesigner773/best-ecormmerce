import { sendOrderConfirmationEmail, OrderConfirmationEmailData, OrderItem } from '../services/emailService';

/**
 * Order Email Integration Utility
 * 
 * This utility provides functions to send order confirmation emails
 * integrated with your Best Brightness order processing system.
 */

export interface OrderData {
  id: string;
  customer_email: string;
  customer_name: string;
  order_number: string;
  order_date: string;
  status: string;
  payment_method: string;
  items: Array<{
    product_id: string;
    name: string;
    sku: string;
    quantity: number;
    price: number;
    image_url?: string;
  }>;
  subtotal: number;
  shipping_cost: number;
  discount_amount?: number;
  discount_code?: string;
  tax_amount: number;
  total_amount: number;
  shipping_address: {
    name: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  estimated_delivery_days?: number;
}

/**
 * Convert order data to email template format
 */
export const convertOrderToEmailData = (order: OrderData): OrderConfirmationEmailData => {
  const orderItems: OrderItem[] = order.items.map(item => ({
    name: item.name,
    sku: item.sku,
    quantity: item.quantity,
    price: item.price,
    image_url: item.image_url || 'https://via.placeholder.com/300x300?text=Product+Image'
  }));

  const estimatedDelivery = order.estimated_delivery_days 
    ? `${order.estimated_delivery_days}-${order.estimated_delivery_days + 2} business days`
    : '3-5 business days';

  return {
    email: order.customer_email,
    customer_name: order.customer_name,
    order_number: order.order_number,
    order_date: order.order_date,
    order_status: order.status,
    payment_method: order.payment_method,
    estimated_delivery: estimatedDelivery,
    total_items: order.items.length,
    order_items: orderItems,
    subtotal: order.subtotal,
    shipping_cost: order.shipping_cost,
    discount_amount: order.discount_amount,
    discount_code: order.discount_code,
    tax_amount: order.tax_amount,
    total_amount: order.total_amount,
    shipping_name: order.shipping_address.name,
    shipping_address_line1: order.shipping_address.line1,
    shipping_address_line2: order.shipping_address.line2,
    shipping_city: order.shipping_address.city,
    shipping_state: order.shipping_address.state,
    shipping_zip: order.shipping_address.zip,
    shipping_country: order.shipping_address.country,
    delivery_timeframe: estimatedDelivery,
    track_order_url: `${window.location.origin}/orders/${order.id}`,
    shop_url: `${window.location.origin}/shop`,
    contact_url: `${window.location.origin}/contact`,
    privacy_url: `${window.location.origin}/privacy`,
    terms_url: `${window.location.origin}/terms`
  };
};

/**
 * Send order confirmation email for a completed order
 */
export const sendOrderConfirmation = async (order: OrderData): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> => {
  try {
    console.log('Sending order confirmation email for order:', order.order_number);
    
    const emailData = convertOrderToEmailData(order);
    const result = await sendOrderConfirmationEmail(emailData);
    
    if (result.success) {
      console.log('Order confirmation email sent successfully:', result.messageId);
    } else {
      console.error('Failed to send order confirmation email:', result.error);
    }
    
    return result;
  } catch (error) {
    console.error('Error in sendOrderConfirmation:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

/**
 * Send order confirmation email with custom URLs
 */
export const sendOrderConfirmationWithCustomUrls = async (
  order: OrderData,
  customUrls: {
    track_order_url?: string;
    shop_url?: string;
    contact_url?: string;
    privacy_url?: string;
    terms_url?: string;
  }
): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> => {
  try {
    console.log('Sending order confirmation email with custom URLs for order:', order.order_number);
    
    const emailData = convertOrderToEmailData(order);
    
    // Override URLs with custom ones if provided
    if (customUrls.track_order_url) emailData.track_order_url = customUrls.track_order_url;
    if (customUrls.shop_url) emailData.shop_url = customUrls.shop_url;
    if (customUrls.contact_url) emailData.contact_url = customUrls.contact_url;
    if (customUrls.privacy_url) emailData.privacy_url = customUrls.privacy_url;
    if (customUrls.terms_url) emailData.terms_url = customUrls.terms_url;
    
    const result = await sendOrderConfirmationEmail(emailData);
    
    if (result.success) {
      console.log('Order confirmation email sent successfully:', result.messageId);
    } else {
      console.error('Failed to send order confirmation email:', result.error);
    }
    
    return result;
  } catch (error) {
    console.error('Error in sendOrderConfirmationWithCustomUrls:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

/**
 * Batch send order confirmation emails
 */
export const sendBatchOrderConfirmations = async (orders: OrderData[]): Promise<{
  success: number;
  failed: number;
  errors: string[];
}> => {
  let successCount = 0;
  let failedCount = 0;
  const errors: string[] = [];

  console.log(`Sending batch order confirmations for ${orders.length} orders`);

  // Process emails in batches to avoid rate limiting
  const batchSize = 3;
  const batches = [];
  
  for (let i = 0; i < orders.length; i += batchSize) {
    batches.push(orders.slice(i, i + batchSize));
  }

  for (const batch of batches) {
    const promises = batch.map(async (order) => {
      const result = await sendOrderConfirmation(order);
      
      if (result.success) {
        successCount++;
      } else {
        failedCount++;
        errors.push(`Failed to send confirmation for order ${order.order_number}: ${result.error}`);
      }
      
      // Add delay between emails to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    });

    await Promise.all(promises);
    
    // Add delay between batches
    if (batches.indexOf(batch) < batches.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  console.log(`Batch order confirmations completed: ${successCount} success, ${failedCount} failed`);

  return {
    success: successCount,
    failed: failedCount,
    errors
  };
};

/**
 * Example usage function for testing
 */
export const testOrderConfirmationIntegration = async (): Promise<void> => {
  const testOrder: OrderData = {
    id: 'test-order-123',
    customer_email: 'test@example.com',
    customer_name: 'Test Customer',
    order_number: 'BB-2024-TEST-001',
    order_date: new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }),
    status: 'Processing',
    payment_method: 'Credit Card',
    items: [
      {
        product_id: 'prod-1',
        name: 'Premium Cleaning Solution',
        sku: 'BB-CLEAN-001',
        quantity: 2,
        price: 24.99,
        image_url: 'https://via.placeholder.com/300x300?text=Cleaning+Solution'
      },
      {
        product_id: 'prod-2',
        name: 'Microfiber Cloth Set',
        sku: 'BB-CLOTH-002',
        quantity: 1,
        price: 19.99,
        image_url: 'https://via.placeholder.com/300x300?text=Microfiber+Cloth'
      }
    ],
    subtotal: 69.97,
    shipping_cost: 9.99,
    discount_amount: 5.00,
    discount_code: 'WELCOME5',
    tax_amount: 6.00,
    total_amount: 80.96,
    shipping_address: {
      name: 'Test Customer',
      line1: '123 Test Street',
      line2: 'Apt 1',
      city: 'Test City',
      state: 'TS',
      zip: '12345',
      country: 'United States'
    },
    estimated_delivery_days: 3
  };

  console.log('Testing order confirmation integration...');
  const result = await sendOrderConfirmation(testOrder);
  
  if (result.success) {
    console.log('✅ Test order confirmation email sent successfully!');
  } else {
    console.error('❌ Test order confirmation email failed:', result.error);
  }
};

// Export types for use in other parts of the application
export type { OrderData, OrderConfirmationEmailData, OrderItem };
