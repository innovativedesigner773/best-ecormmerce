import { supabase } from '../lib/supabase';
import { sendStockAvailabilityEmail, StockNotificationEmailData } from './emailService';

export interface StockNotification {
  id: string;
  user_id: string;
  product_id: string;
  email: string;
  is_notified: boolean;
  created_at: string;
  notified_at?: string;
}

export interface ProductDetails {
  id: string;
  name: string;
  price: number;
  image_url?: string;
  stock_quantity: number;
}

/**
 * Get all pending stock notifications for a specific product
 */
export const getPendingNotificationsForProduct = async (productId: string): Promise<StockNotification[]> => {
  try {
    const { data, error } = await supabase
      .from('stock_notifications')
      .select('*')
      .eq('product_id', productId)
      .eq('is_notified', false);

    if (error) {
      console.error('Error fetching pending notifications:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching pending notifications:', error);
    return [];
  }
};

/**
 * Get product details for email notifications
 */
export const getProductDetails = async (productId: string): Promise<ProductDetails | null> => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('id, name, price, image_url, stock_quantity')
      .eq('id', productId)
      .single();

    if (error) {
      console.error('Error fetching product details:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error fetching product details:', error);
    return null;
  }
};

/**
 * Send stock availability notifications for a product
 */
export const sendStockAvailabilityNotifications = async (productId: string): Promise<{
  success: boolean;
  sent: number;
  failed: number;
  errors: string[];
}> => {
  try {
    // Get pending notifications for this product
    const notifications = await getPendingNotificationsForProduct(productId);
    
    if (notifications.length === 0) {
      return {
        success: true,
        sent: 0,
        failed: 0,
        errors: []
      };
    }

    // Get product details
    const product = await getProductDetails(productId);
    if (!product) {
      return {
        success: false,
        sent: 0,
        failed: notifications.length,
        errors: ['Product not found']
      };
    }

    // Prepare email data for each notification
    const emailData: StockNotificationEmailData[] = notifications.map(notification => ({
      email: notification.email,
      to_name: notification.email.split('@')[0], // Use email prefix as name
      product_name: product.name,
      product_image: product.image_url || 'https://via.placeholder.com/300x300?text=Product+Image',
      product_price: product.price,
      product_url: `${window.location.origin}/product/${product.id}`,
      company_name: 'Best Brightness',
      unsubscribe_url: `${window.location.origin}/unsubscribe?token=${notification.id}`
    }));

    // Send emails
    const emailResults = await Promise.allSettled(
      emailData.map(data => sendStockAvailabilityEmail(data))
    );

    let sentCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    // Process results and update database
    for (let i = 0; i < emailResults.length; i++) {
      const result = emailResults[i];
      const notification = notifications[i];

      if (result.status === 'fulfilled' && result.value.success) {
        // Mark notification as sent
        await markNotificationAsSent(notification.id);
        sentCount++;
      } else {
        failedCount++;
        const error = result.status === 'rejected' 
          ? result.reason 
          : result.value.error;
        errors.push(`Failed to send to ${notification.email}: ${error}`);
      }
    }

    return {
      success: sentCount > 0,
      sent: sentCount,
      failed: failedCount,
      errors
    };

  } catch (error) {
    console.error('Error sending stock availability notifications:', error);
    return {
      success: false,
      sent: 0,
      failed: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error']
    };
  }
};

/**
 * Mark a notification as sent
 */
export const markNotificationAsSent = async (notificationId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('stock_notifications')
      .update({
        is_notified: true,
        notified_at: new Date().toISOString()
      })
      .eq('id', notificationId);

    if (error) {
      console.error('Error marking notification as sent:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error marking notification as sent:', error);
    return false;
  }
};

/**
 * Send notifications for all products that just came back in stock
 */
export const sendNotificationsForRestockedProducts = async (): Promise<{
  totalSent: number;
  totalFailed: number;
  productResults: Array<{
    productId: string;
    productName: string;
    sent: number;
    failed: number;
  }>;
}> => {
  try {
    // Get all products that have pending notifications and are in stock
    const { data: products, error } = await supabase
      .from('products')
      .select(`
        id,
        name,
        stock_quantity,
        stock_notifications!inner(id, is_notified)
      `)
      .gt('stock_quantity', 0)
      .eq('stock_notifications.is_notified', false);

    if (error) {
      console.error('Error fetching restocked products:', error);
      return {
        totalSent: 0,
        totalFailed: 0,
        productResults: []
      };
    }

    if (!products || products.length === 0) {
      return {
        totalSent: 0,
        totalFailed: 0,
        productResults: []
      };
    }

    let totalSent = 0;
    let totalFailed = 0;
    const productResults: Array<{
      productId: string;
      productName: string;
      sent: number;
      failed: number;
    }> = [];

    // Send notifications for each product
    for (const product of products) {
      const result = await sendStockAvailabilityNotifications(product.id);
      
      totalSent += result.sent;
      totalFailed += result.failed;
      
      productResults.push({
        productId: product.id,
        productName: product.name,
        sent: result.sent,
        failed: result.failed
      });
    }

    return {
      totalSent,
      totalFailed,
      productResults
    };

  } catch (error) {
    console.error('Error sending notifications for restocked products:', error);
    return {
      totalSent: 0,
      totalFailed: 0,
      productResults: []
    };
  }
};

/**
 * Reset stock notifications for a product when it's updated
 * This makes notifications show up again in the customer's notification icon
 */
export const resetNotificationsForProductUpdate = async (productId: string): Promise<{
  success: boolean;
  resetCount: number;
}> => {
  try {
    // Find all notifications for this product that were already notified
    const { data: notifiedNotifications, error: fetchError } = await supabase
      .from('stock_notifications')
      .select('id')
      .eq('product_id', productId)
      .eq('is_notified', true);

    if (fetchError) {
      console.error('Error fetching notified notifications:', fetchError);
      return {
        success: false,
        resetCount: 0
      };
    }

    if (!notifiedNotifications || notifiedNotifications.length === 0) {
      return {
        success: true,
        resetCount: 0
      };
    }

    // Reset is_notified to false and clear notified_at for all notified notifications
    // We need to update based on the IDs we found, not by querying again
    const notificationIds = notifiedNotifications.map(n => n.id);
    const { error: updateError } = await supabase
      .from('stock_notifications')
      .update({
        is_notified: false,
        notified_at: null
      })
      .in('id', notificationIds);

    if (updateError) {
      console.error('Error resetting notifications:', updateError);
      return {
        success: false,
        resetCount: 0
      };
    }

    console.log(`✅ Reset ${notifiedNotifications.length} notification(s) for product ${productId} after product update`);
    
    return {
      success: true,
      resetCount: notifiedNotifications.length
    };
  } catch (error) {
    console.error('Error resetting notifications for product update:', error);
    return {
      success: false,
      resetCount: 0
    };
  }
};

/**
 * Test email functionality
 */
export const testStockNotificationEmail = async (testEmail: string): Promise<boolean> => {
  try {
    const testData: StockNotificationEmailData = {
      email: testEmail,
      to_name: 'Test User',
      product_name: 'Test Product - Stock Available',
      product_image: 'https://via.placeholder.com/300x300?text=Test+Product',
      product_price: 29.99,
      product_url: `${window.location.origin}/product/test`,
      company_name: 'Best Brightness',
      unsubscribe_url: `${window.location.origin}/unsubscribe?token=test`
    };

    const result = await sendStockAvailabilityEmail(testData);
    return result.success;
  } catch (error) {
    console.error('Error testing stock notification email:', error);
    return false;
  }
};
