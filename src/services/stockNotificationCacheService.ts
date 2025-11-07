import { supabase } from '../lib/supabase';
import { StockNotification } from './stockNotificationService';
import { sendStockAvailabilityEmail, StockNotificationEmailData } from './emailService';

/**
 * Local cache service for stock notifications
 * Pre-loads all pending notifications to avoid database queries when stock is updated
 */
class StockNotificationCacheService {
  private cache: Map<string, StockNotification[]> = new Map();
  private productDetailsCache: Map<string, { name: string; price: number; image_url?: string }> = new Map();
  private isInitialized = false;
  private initializationPromise: Promise<void> | null = null;

  /**
   * Initialize the cache by loading all pending notifications
   */
  async initialize(): Promise<void> {
    // If already initialized, return
    if (this.isInitialized) {
      return;
    }

    // If initialization is in progress, wait for it
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    // Start initialization
    this.initializationPromise = this.loadAllPendingNotifications();
    await this.initializationPromise;
    this.isInitialized = true;
    this.initializationPromise = null;
  }

  /**
   * Load all pending notifications from the database
   */
  private async loadAllPendingNotifications(): Promise<void> {
    try {
      console.log('🔄 Loading all pending stock notifications into cache...');
      
      const { data, error } = await supabase
        .from('stock_notifications')
        .select('*')
        .eq('is_notified', false);

      if (error) {
        console.error('Error loading pending notifications:', error);
        return;
      }

      // Clear existing cache
      this.cache.clear();

      // Group notifications by product_id
      if (data) {
        for (const notification of data) {
          const productId = notification.product_id;
          if (!this.cache.has(productId)) {
            this.cache.set(productId, []);
          }
          this.cache.get(productId)!.push(notification);
        }
      }

      console.log(`✅ Loaded ${data?.length || 0} pending notifications for ${this.cache.size} products`);
    } catch (error) {
      console.error('Error initializing notification cache:', error);
    }
  }

  /**
   * Get all pending notifications for a specific product (from cache)
   */
  getNotificationsForProduct(productId: string): StockNotification[] {
    return this.cache.get(productId) || [];
  }

  /**
   * Check if a product has pending notifications
   */
  hasPendingNotifications(productId: string): boolean {
    const notifications = this.cache.get(productId);
    return notifications ? notifications.length > 0 : false;
  }

  /**
   * Add a notification to the cache
   */
  addNotification(notification: StockNotification): void {
    const productId = notification.product_id;
    if (!this.cache.has(productId)) {
      this.cache.set(productId, []);
    }
    this.cache.get(productId)!.push(notification);
  }

  /**
   * Remove a notification from the cache
   */
  removeNotification(notificationId: string, productId?: string): void {
    if (productId) {
      const notifications = this.cache.get(productId);
      if (notifications) {
        const filtered = notifications.filter(n => n.id !== notificationId);
        if (filtered.length === 0) {
          this.cache.delete(productId);
        } else {
          this.cache.set(productId, filtered);
        }
      }
    } else {
      // If productId not provided, search all products
      for (const [pid, notifications] of this.cache.entries()) {
        const filtered = notifications.filter(n => n.id !== notificationId);
        if (filtered.length === 0) {
          this.cache.delete(pid);
        } else {
          this.cache.set(pid, filtered);
        }
      }
    }
  }

  /**
   * Mark a notification as sent and remove from cache
   */
  markNotificationAsSent(notificationId: string, productId: string): void {
    this.removeNotification(notificationId, productId);
  }

  /**
   * Refresh the cache for a specific product
   */
  async refreshProductNotifications(productId: string): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('stock_notifications')
        .select('*')
        .eq('product_id', productId)
        .eq('is_notified', false);

      if (error) {
        console.error('Error refreshing product notifications:', error);
        return;
      }

      if (data && data.length > 0) {
        this.cache.set(productId, data);
      } else {
        this.cache.delete(productId);
      }
    } catch (error) {
      console.error('Error refreshing product notifications:', error);
    }
  }

  /**
   * Refresh the entire cache
   */
  async refresh(): Promise<void> {
    await this.loadAllPendingNotifications();
  }

  /**
   * Get product details (with caching)
   */
  async getProductDetails(productId: string): Promise<{ name: string; price: number; image_url?: string } | null> {
    // Check cache first
    if (this.productDetailsCache.has(productId)) {
      return this.productDetailsCache.get(productId)!;
    }

    try {
      const { data, error } = await supabase
        .from('products')
        .select('name, price, images')
        .eq('id', productId)
        .single();

      if (error || !data) {
        return null;
      }

      // Get first image from images array
      const imageUrl = Array.isArray(data.images) && data.images.length > 0 
        ? data.images[0] 
        : undefined;

      const details = {
        name: data.name,
        price: data.price,
        image_url: imageUrl
      };

      // Cache the details
      this.productDetailsCache.set(productId, details);
      return details;
    } catch (error) {
      console.error('Error fetching product details:', error);
      return null;
    }
  }

  /**
   * Clear product details cache (call when product is updated)
   */
  clearProductDetailsCache(productId: string): void {
    this.productDetailsCache.delete(productId);
  }

  /**
   * Send notifications for a product when stock becomes available
   * This uses the pre-loaded cache for instant access
   */
  async sendNotificationsForProduct(
    productId: string,
    oldStock: number,
    newStock: number
  ): Promise<{ sent: number; failed: number; errors: string[] }> {
    // Only send if stock went from 0 or less to greater than 0
    if (oldStock > 0 || newStock <= 0) {
      return { sent: 0, failed: 0, errors: [] };
    }

    // Get notifications from cache (instant, no DB query)
    const notifications = this.getNotificationsForProduct(productId);
    
    if (notifications.length === 0) {
      return { sent: 0, failed: 0, errors: [] };
    }

    // Get product details
    const productDetails = await this.getProductDetails(productId);
    if (!productDetails) {
      return {
        sent: 0,
        failed: notifications.length,
        errors: ['Product not found']
      };
    }

    // Prepare email data
    const emailData: StockNotificationEmailData[] = notifications.map(notification => ({
      email: notification.email,
      to_name: notification.email.split('@')[0],
      product_name: productDetails.name,
      product_image: productDetails.image_url || 'https://via.placeholder.com/300x300?text=Product+Image',
      product_price: productDetails.price,
      product_url: `${window.location.origin}/product/${productId}`,
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
        // Mark notification as sent in database
        try {
          await supabase
            .from('stock_notifications')
            .update({
              is_notified: true,
              notified_at: new Date().toISOString()
            })
            .eq('id', notification.id);

          // Remove from cache
          this.markNotificationAsSent(notification.id, productId);
          sentCount++;
        } catch (error) {
          console.error('Error marking notification as sent:', error);
          failedCount++;
          errors.push(`Failed to mark notification ${notification.id} as sent`);
        }
      } else {
        failedCount++;
        const error = result.status === 'rejected' 
          ? result.reason 
          : result.value.error;
        errors.push(`Failed to send to ${notification.email}: ${error}`);
      }
    }

    console.log(`📧 Sent ${sentCount} stock notifications for product ${productId}, ${failedCount} failed`);

    return {
      sent: sentCount,
      failed: failedCount,
      errors
    };
  }

  /**
   * Get cache statistics
   */
  getStats(): { productCount: number; totalNotifications: number } {
    let totalNotifications = 0;
    for (const notifications of this.cache.values()) {
      totalNotifications += notifications.length;
    }
    return {
      productCount: this.cache.size,
      totalNotifications
    };
  }
}

// Export singleton instance
export const stockNotificationCache = new StockNotificationCacheService();

