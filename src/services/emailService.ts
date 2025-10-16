import emailjs from '@emailjs/browser';

// EmailJS configuration
const EMAILJS_CONFIG = {
  serviceId: 'service_u25vulc',
  templateId: 'template_k3jvli8', // Stock notification template
  orderConfirmationTemplateId: 'template_ybjvsvy', // Order confirmation template (use minimal version)
  publicKey: '4S229zBwfW7pedtoD'
};

// Initialize EmailJS
emailjs.init(EMAILJS_CONFIG.publicKey);

export interface StockNotificationEmailData {
  email: string;
  to_name: string;
  product_name: string;
  product_image: string;
  product_price: number;
  product_url: string;
  company_name: string;
  unsubscribe_url: string;
}

export interface OrderItem {
  name: string;
  sku: string;
  quantity: number;
  price: number;
  image_url: string;
}

export interface OrderConfirmationEmailData {
  email: string;
  customer_name: string;
  order_number: string;
  order_date: string;
  order_status: string;
  payment_method: string;
  estimated_delivery: string;
  total_items: number;
  order_items: OrderItem[];
  subtotal: number;
  shipping_cost: number;
  discount_amount?: number;
  discount_code?: string;
  tax_amount: number;
  total_amount: number;
  shipping_name: string;
  shipping_address_line1: string;
  shipping_address_line2?: string;
  shipping_city: string;
  shipping_state: string;
  shipping_zip: string;
  shipping_country: string;
  delivery_timeframe: string;
  track_order_url: string;
  shop_url: string;
  contact_url: string;
  privacy_url: string;
  terms_url: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send stock availability notification email
 */
export const sendStockAvailabilityEmail = async (
  emailData: StockNotificationEmailData
): Promise<EmailResult> => {
  try {
    const templateParams = {
      email: emailData.email,
      to_name: emailData.to_name,
      product_name: emailData.product_name,
      product_image: emailData.product_image,
      product_price: emailData.product_price,
      product_url: emailData.product_url,
      company_name: emailData.company_name,
      unsubscribe_url: emailData.unsubscribe_url,
      // Additional template variables
      current_year: new Date().getFullYear(),
      notification_date: new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    };

    const response = await emailjs.send(
      EMAILJS_CONFIG.serviceId,
      EMAILJS_CONFIG.templateId,
      templateParams
    );

    console.log('Email sent successfully:', response);
    
    return {
      success: true,
      messageId: response.text
    };
  } catch (error) {
    console.error('Error sending email:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

/**
 * Send bulk stock availability notifications
 */
export const sendBulkStockNotifications = async (
  notifications: StockNotificationEmailData[]
): Promise<{ success: number; failed: number; errors: string[] }> => {
  let successCount = 0;
  let failedCount = 0;
  const errors: string[] = [];

  // Process emails in batches to avoid rate limiting
  const batchSize = 5;
  const batches = [];
  
  for (let i = 0; i < notifications.length; i += batchSize) {
    batches.push(notifications.slice(i, i + batchSize));
  }

  for (const batch of batches) {
    const promises = batch.map(async (notification) => {
      const result = await sendStockAvailabilityEmail(notification);
      
      if (result.success) {
        successCount++;
      } else {
        failedCount++;
        errors.push(`Failed to send to ${notification.to_email}: ${result.error}`);
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

  return {
    success: successCount,
    failed: failedCount,
    errors
  };
};

/**
 * Send order confirmation email
 */
export const sendOrderConfirmationEmail = async (
  orderData: OrderConfirmationEmailData
): Promise<EmailResult> => {
  try {
    // Create a simplified order items list for the email template
    const orderItemsList = orderData.order_items.map(item => 
      `${item.quantity}x ${item.name} - R${item.price.toFixed(2)}`
    ).join('\n');

    // Use only the variables that are actually used in the email template
    const templateParams = {
      email: orderData.email || 'customer@example.com',
      customer_name: orderData.customer_name || 'Customer',
      order_number: orderData.order_number || 'Unknown',
      order_date: orderData.order_date || new Date().toLocaleDateString(),
      order_status: orderData.order_status || 'Processing',
      payment_method: orderData.payment_method || 'Credit Card',
      estimated_delivery: orderData.estimated_delivery || '3-5 business days',
      total_items: orderData.total_items?.toString() || '1',
      order_items_list: orderItemsList || 'Order items',
      subtotal: orderData.subtotal?.toFixed(2) || '0.00',
      shipping_cost: orderData.shipping_cost?.toFixed(2) || '0.00',
      tax_amount: orderData.tax_amount?.toFixed(2) || '0.00',
      total_amount: orderData.total_amount?.toFixed(2) || '0.00',
      shipping_name: orderData.shipping_name || 'Customer',
      shipping_address_line1: orderData.shipping_address_line1 || 'Address',
      shipping_city: orderData.shipping_city || 'City',
      shipping_state: orderData.shipping_state || 'State',
      shipping_zip: orderData.shipping_zip || 'ZIP',
      shipping_country: orderData.shipping_country || 'Country',
      shop_url: orderData.shop_url || 'https://example.com/shop',
      contact_url: orderData.contact_url || 'https://example.com/contact',
      privacy_url: orderData.privacy_url || 'https://example.com/privacy',
      terms_url: orderData.terms_url || 'https://example.com/terms',
      current_year: new Date().getFullYear().toString()
    };

    console.log('📧 Sending email with template params:', templateParams);
    console.log('📧 Template ID:', EMAILJS_CONFIG.orderConfirmationTemplateId);
    console.log('📧 Service ID:', EMAILJS_CONFIG.serviceId);

    const response = await emailjs.send(
      EMAILJS_CONFIG.serviceId,
      EMAILJS_CONFIG.orderConfirmationTemplateId,
      templateParams
    );

    console.log('Order confirmation email sent successfully:', response);
    
    return {
      success: true,
      messageId: response.text
    };
  } catch (error) {
    console.error('Error sending order confirmation email:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

/**
 * Test email configuration
 */
export const testEmailConfiguration = async (): Promise<EmailResult> => {
  const testData: StockNotificationEmailData = {
    email: 'test@example.com',
    to_name: 'Test User',
    product_name: 'Test Product',
    product_image: 'https://via.placeholder.com/300x300',
    product_price: 29.99,
    product_url: 'https://example.com/product/test',
    company_name: 'Best Brightness',
    unsubscribe_url: 'https://example.com/unsubscribe'
  };

  return await sendStockAvailabilityEmail(testData);
};

/**
 * Test order confirmation email configuration
 */
export const testOrderConfirmationEmail = async (): Promise<EmailResult> => {
  const testOrderData: OrderConfirmationEmailData = {
    email: 'test@example.com',
    customer_name: 'Test Customer',
    order_number: 'BB-2024-001',
    order_date: new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }),
    order_status: 'Processing',
    payment_method: 'Credit Card',
    estimated_delivery: '3-5 business days',
    total_items: 2,
    order_items: [
      {
        name: 'Test Product 1',
        sku: 'TEST-001',
        quantity: 1,
        price: 29.99,
        image_url: 'https://via.placeholder.com/300x300'
      },
      {
        name: 'Test Product 2',
        sku: 'TEST-002',
        quantity: 2,
        price: 19.99,
        image_url: 'https://via.placeholder.com/300x300'
      }
    ],
    subtotal: 69.97,
    shipping_cost: 9.99,
    discount_amount: 5.00,
    discount_code: 'WELCOME5',
    tax_amount: 6.00,
    total_amount: 80.96,
    shipping_name: 'Test Customer',
    shipping_address_line1: '123 Test Street',
    shipping_address_line2: 'Apt 1',
    shipping_city: 'Test City',
    shipping_state: 'TS',
    shipping_zip: '12345',
    shipping_country: 'United States',
    delivery_timeframe: '3-5 business days',
    track_order_url: 'https://example.com/track/BB-2024-001',
    shop_url: 'https://example.com/shop',
    contact_url: 'https://example.com/contact',
    privacy_url: 'https://example.com/privacy',
    terms_url: 'https://example.com/terms'
  };

  return await sendOrderConfirmationEmail(testOrderData);
};
