import { supabase } from '../lib/supabase';
import { sendStockAvailabilityEmail, StockNotificationEmailData } from './emailService';

export interface NotificationQueueItem {
  id: string;
  notification_id: string;
  product_id: string;
  email_data: any;
  status: 'pending' | 'processing' | 'sent' | 'failed';
  attempts: number;
  max_attempts: number;
  error_message?: string;
  created_at: string;
  processed_at?: string;
  sent_at?: string;
}

export interface QueueStatus {
  pending_count: number;
  processing_count: number;
  sent_count: number;
  failed_count: number;
  total_count: number;
}

export interface ProcessResult {
  processed_count: number;
  success_count: number;
  failed_count: number;
  errors: string[];
}

/**
 * Get notification queue status
 */
export const getNotificationQueueStatus = async (): Promise<QueueStatus | null> => {
  try {
    const { data, error } = await supabase.rpc('get_notification_queue_status');

    if (error) {
      console.error('Error getting queue status:', error);
      return null;
    }

    return data?.[0] || {
      pending_count: 0,
      processing_count: 0,
      sent_count: 0,
      failed_count: 0,
      total_count: 0
    };
  } catch (error) {
    console.error('Error getting queue status:', error);
    return null;
  }
};

/**
 * Process notification queue manually
 */
export const processNotificationQueue = async (): Promise<ProcessResult> => {
  try {
    const { data, error } = await supabase.rpc('process_notification_queue');

    if (error) {
      console.error('Error processing queue:', error);
      return {
        processed_count: 0,
        success_count: 0,
        failed_count: 0,
        errors: [error.message]
      };
    }

    const result = data?.[0];
    return {
      processed_count: result?.processed_count || 0,
      success_count: result?.success_count || 0,
      failed_count: result?.failed_count || 0,
      errors: []
    };
  } catch (error) {
    console.error('Error processing queue:', error);
    return {
      processed_count: 0,
      success_count: 0,
      failed_count: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error']
    };
  }
};

/**
 * Process notifications with EmailJS integration
 */
export const processNotificationsWithEmailJS = async (): Promise<ProcessResult> => {
  try {
    // Check if user is authenticated before making API calls
    const { data: { user } } = await supabase.auth.getUser();
    
    // If no user is authenticated, skip processing to avoid 401 errors
    if (!user) {
      return {
        processed_count: 0,
        success_count: 0,
        failed_count: 0,
        errors: ['User not authenticated - skipping notification processing']
      };
    }

    // Check if user has admin privileges for notification processing
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    // Only allow admin users to process notifications
    if (!profile || profile.role !== 'admin') {
      return {
        processed_count: 0,
        success_count: 0,
        failed_count: 0,
        errors: ['Admin privileges required for notification processing']
      };
    }

    // Get pending notifications from queue
    const { data: queueItems, error: fetchError } = await supabase
      .from('notification_queue')
      .select('*')
      .eq('status', 'pending')
      .lt('attempts', 3) // Max 3 attempts
      .order('created_at', { ascending: true })
      .limit(10); // Process 10 at a time

    if (fetchError) {
      // Don't log 401 errors as they're expected when not authenticated
      if (fetchError.message.includes('401') || fetchError.message.includes('Unauthorized')) {
        return {
          processed_count: 0,
          success_count: 0,
          failed_count: 0,
          errors: ['Authentication required for notification processing']
        };
      }
      
      console.error('Error fetching queue items:', fetchError);
      return {
        processed_count: 0,
        success_count: 0,
        failed_count: 0,
        errors: [fetchError.message]
      };
    }

    if (!queueItems || queueItems.length === 0) {
      return {
        processed_count: 0,
        success_count: 0,
        failed_count: 0,
        errors: []
      };
    }

    let successCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    // Process each notification
    for (const item of queueItems) {
      try {
        // Mark as processing
        await supabase
          .from('notification_queue')
          .update({
            status: 'processing',
            attempts: item.attempts + 1,
            processed_at: new Date().toISOString()
          })
          .eq('id', item.id);

        // Prepare email data
        const emailData: StockNotificationEmailData = {
          email: item.email_data.email,
          to_name: item.email_data.email.split('@')[0],
          product_name: item.email_data.product_name,
          product_image: item.email_data.product_image || 'https://via.placeholder.com/300x300?text=Product+Image',
          product_price: item.email_data.product_price,
          product_url: `${window.location.origin}/product/${item.product_id}`,
          company_name: 'Best Brightness',
          unsubscribe_url: `${window.location.origin}/unsubscribe?token=${item.notification_id}`
        };

        // Send email
        const emailResult = await sendStockAvailabilityEmail(emailData);

        if (emailResult.success) {
          // Mark as sent
          await supabase
            .from('notification_queue')
            .update({
              status: 'sent',
              sent_at: new Date().toISOString()
            })
            .eq('id', item.id);

          // Mark original notification as sent
          await supabase
            .from('stock_notifications')
            .update({
              is_notified: true,
              notified_at: new Date().toISOString()
            })
            .eq('id', item.notification_id);

          successCount++;
        } else {
          // Mark as failed
          await supabase
            .from('notification_queue')
            .update({
              status: 'failed',
              error_message: emailResult.error || 'Unknown error'
            })
            .eq('id', item.id);

          failedCount++;
          errors.push(`Failed to send to ${item.email_data.email}: ${emailResult.error}`);
        }

        // Add delay between emails to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (itemError) {
        console.error('Error processing notification item:', itemError);
        
        // Mark as failed
        await supabase
          .from('notification_queue')
          .update({
            status: 'failed',
            error_message: itemError instanceof Error ? itemError.message : 'Unknown error'
          })
          .eq('id', item.id);

        failedCount++;
        errors.push(`Error processing notification ${item.id}: ${itemError}`);
      }
    }

    return {
      processed_count: queueItems.length,
      success_count: successCount,
      failed_count: failedCount,
      errors
    };

  } catch (error) {
    console.error('Error processing notifications with EmailJS:', error);
    return {
      processed_count: 0,
      success_count: 0,
      failed_count: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error']
    };
  }
};

/**
 * Get notification queue items for admin view
 */
export const getNotificationQueueItems = async (limit: number = 50): Promise<NotificationQueueItem[]> => {
  try {
    const { data, error } = await supabase
      .from('notification_queue')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching queue items:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching queue items:', error);
    return [];
  }
};

/**
 * Clear failed notifications (admin function)
 */
export const clearFailedNotifications = async (): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('notification_queue')
      .delete()
      .eq('status', 'failed');

    if (error) {
      console.error('Error clearing failed notifications:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error clearing failed notifications:', error);
    return false;
  }
};

/**
 * Retry failed notifications
 */
export const retryFailedNotifications = async (): Promise<ProcessResult> => {
  try {
    // Reset failed notifications to pending
    const { error: resetError } = await supabase
      .from('notification_queue')
      .update({
        status: 'pending',
        attempts: 0,
        error_message: null
      })
      .eq('status', 'failed')
      .lt('attempts', 3);

    if (resetError) {
      console.error('Error resetting failed notifications:', resetError);
      return {
        processed_count: 0,
        success_count: 0,
        failed_count: 0,
        errors: [resetError.message]
      };
    }

    // Process the queue
    return await processNotificationsWithEmailJS();
  } catch (error) {
    console.error('Error retrying failed notifications:', error);
    return {
      processed_count: 0,
      success_count: 0,
      failed_count: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error']
    };
  }
};

/**
 * Start automatic processing (call this periodically)
 * Only processes notifications when user is authenticated
 */
export const startAutomaticProcessing = (intervalMs: number = 60000): (() => void) => {
  let isProcessing = false;
  
  const interval = setInterval(async () => {
    // Prevent overlapping processing
    if (isProcessing) return;
    
    try {
      isProcessing = true;
      const result = await processNotificationsWithEmailJS();
      
      // Only log if there are actual notifications processed or if there are real errors
      if (result.processed_count > 0) {
        console.log(`📧 Processed ${result.processed_count} notifications: ${result.success_count} sent, ${result.failed_count} failed`);
      } else if (result.errors.length > 0 && 
                 !result.errors[0].includes('not authenticated') && 
                 !result.errors[0].includes('Authentication required') &&
                 !result.errors[0].includes('User not authenticated') &&
                 !result.errors[0].includes('Admin privileges required')) {
        // Only log non-authentication and non-authorization errors
        console.warn('⚠️ Notification processing warning:', result.errors[0]);
      }
    } catch (error) {
      // Only log unexpected errors, not authentication issues
      if (error instanceof Error && 
          !error.message.includes('401') && 
          !error.message.includes('Unauthorized') &&
          !error.message.includes('not authenticated') &&
          !error.message.includes('Admin privileges required')) {
        console.error('❌ Error in automatic processing:', error);
      }
    } finally {
      isProcessing = false;
    }
  }, intervalMs);

  return () => clearInterval(interval);
};
