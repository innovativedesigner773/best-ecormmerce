#!/usr/bin/env node

/**
 * Manual Stock Notification Processor
 * 
 * This script manually processes any pending stock notifications in the queue.
 * Run this if you need to immediately send notifications without waiting for the automatic processing.
 * 
 * Usage:
 *   node src/scripts/process-pending-notifications.js
 * 
 * Or from the project root:
 *   npm run process-notifications
 */

const { createClient } = require('@supabase/supabase-js');
const emailjs = require('@emailjs/browser');

// EmailJS configuration
const EMAILJS_CONFIG = {
  serviceId: 'service_u25vulc',
  templateId: 'template_k3jvli8', // Stock notification template
  publicKey: '4S229zBwfW7pedtoD'
};

// Initialize EmailJS
emailjs.init(EMAILJS_CONFIG.publicKey);

// Supabase configuration
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('your-project') || supabaseKey.includes('your-anon')) {
  console.error('❌ Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables');
  console.error('   You can find these in your Supabase project settings');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Send stock availability email using EmailJS
 */
async function sendStockAvailabilityEmail(emailData) {
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

    console.log(`✅ Email sent successfully to ${emailData.email}:`, response.text);
    return { success: true, messageId: response.text };
  } catch (error) {
    console.error(`❌ Failed to send email to ${emailData.email}:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Process pending notifications from the queue
 */
async function processPendingNotifications() {
  try {
    console.log('🔄 Checking for pending notifications...');

    // Get pending notifications from queue
    const { data: queueItems, error: fetchError } = await supabase
      .from('notification_queue')
      .select('*')
      .eq('status', 'pending')
      .lt('attempts', 3) // Max 3 attempts
      .order('created_at', { ascending: true })
      .limit(10); // Process 10 at a time

    if (fetchError) {
      console.error('❌ Error fetching queue items:', fetchError.message);
      return;
    }

    if (!queueItems || queueItems.length === 0) {
      console.log('✅ No pending notifications to process');
      return;
    }

    console.log(`📧 Found ${queueItems.length} pending notifications to process`);

    let successCount = 0;
    let failedCount = 0;

    // Process each notification
    for (const item of queueItems) {
      try {
        console.log(`\n🔄 Processing notification for ${item.email_data.email}...`);

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
        const emailData = {
          email: item.email_data.email,
          to_name: item.email_data.email.split('@')[0],
          product_name: item.email_data.product_name,
          product_image: item.email_data.product_image || 'https://via.placeholder.com/300x300?text=Product+Image',
          product_price: item.email_data.product_price,
          product_url: `https://your-domain.com/product/${item.product_id}`, // Update with your domain
          company_name: 'Best Brightness',
          unsubscribe_url: `https://your-domain.com/unsubscribe?token=${item.notification_id}` // Update with your domain
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
          console.log(`✅ Successfully sent notification to ${item.email_data.email}`);
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
          console.log(`❌ Failed to send notification to ${item.email_data.email}: ${emailResult.error}`);
        }

        // Add delay between emails to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (itemError) {
        console.error(`❌ Error processing notification ${item.id}:`, itemError.message);
        
        // Mark as failed
        await supabase
          .from('notification_queue')
          .update({
            status: 'failed',
            error_message: itemError.message
          })
          .eq('id', item.id);

        failedCount++;
      }
    }

    console.log(`\n📊 Processing complete:`);
    console.log(`   ✅ Successfully sent: ${successCount}`);
    console.log(`   ❌ Failed: ${failedCount}`);
    console.log(`   📧 Total processed: ${queueItems.length}`);

  } catch (error) {
    console.error('❌ Error processing notifications:', error.message);
  }
}

/**
 * Get notification queue status
 */
async function getQueueStatus() {
  try {
    const { data, error } = await supabase.rpc('get_notification_queue_status');

    if (error) {
      console.error('❌ Error getting queue status:', error.message);
      return;
    }

    const stats = data?.[0];
    if (stats) {
      console.log('\n📊 Notification Queue Status:');
      console.log(`   ⏳ Pending: ${stats.pending_count}`);
      console.log(`   🔄 Processing: ${stats.processing_count}`);
      console.log(`   ✅ Sent: ${stats.sent_count}`);
      console.log(`   ❌ Failed: ${stats.failed_count}`);
      console.log(`   📧 Total: ${stats.total_count}`);
    }
  } catch (error) {
    console.error('❌ Error getting queue status:', error.message);
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Manual Stock Notification Processor');
  console.log('=====================================\n');

  // Check queue status first
  await getQueueStatus();

  // Process pending notifications
  await processPendingNotifications();

  // Check final status
  console.log('\n📊 Final Status:');
  await getQueueStatus();

  console.log('\n✅ Processing complete!');
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  processPendingNotifications,
  getQueueStatus,
  sendStockAvailabilityEmail
};
