# 📧 Email Notifications Setup Guide

This guide explains how to set up and use the EmailJS stock availability notification system for Best Brightness.

## 🚀 Quick Setup

### 1. Database Setup

Run the following SQL scripts in your Supabase database:

```sql
-- First, run the stock notifications setup
\i src/STOCK_NOTIFICATIONS_SETUP.sql

-- Then, run the trigger setup for automatic notifications
\i src/STOCK_NOTIFICATION_TRIGGER.sql
```

### 2. EmailJS Configuration

The system is already configured with the provided EmailJS credentials:
- **Service ID**: `service_u25vulc`
- **Template ID**: `template_k3jvli8`
- **Public Key**: `4S229zBwfW7pedtoD`

### 3. Email Template Setup

1. Go to your EmailJS dashboard
2. Create a new email template with ID `template_k3vli8`
3. Use the HTML template from `src/templates/stock-availability-email.html`

#### Email Template Configuration:

**Subject Line:**
```
🎉 Great News! {{product_name}} is Back in Stock at Best Brightness
```

**To Email:**
```
{{email}}
```

**From Name:**
```
Best Brightness
```

**Template Variables:**
   - `{{email}}` - Recipient email address
   - `{{to_name}}` - Recipient name (derived from email)
   - `{{product_name}}` - Product name
   - `{{product_image}}` - Product image URL
   - `{{product_price}}` - Product price
   - `{{product_url}}` - Product page URL
   - `{{company_name}}` - Company name (Best Brightness)
   - `{{unsubscribe_url}}` - Unsubscribe link
   - `{{current_year}}` - Current year
   - `{{notification_date}}` - Date when notification was sent

#### EmailJS Template Setup Steps:

1. **Login to EmailJS Dashboard**
   - Go to https://dashboard.emailjs.com/
   - Navigate to Email Templates

2. **Create New Template**
   - Click "Create New Template"
   - Set Template ID: `template_k3jvli8`

3. **Configure Template Settings**
   - **Subject**: `🎉 Great News! {{product_name}} is Back in Stock at Best Brightness`
   - **To Email**: `{{email}}`
   - **From Name**: `Best Brightness`
   - **From Email**: Your verified sender email

4. **Add Template Content**
   - Copy the HTML content from `src/templates/stock-availability-email.html`
   - Paste into the template editor
   - Save the template

5. **Test Template**
   - Use the test functionality in the admin dashboard
   - Send a test email to verify formatting

## 📋 How It Works

### Automatic Notifications

1. **Database Trigger**: When a product's stock quantity increases (comes back in stock), a database trigger automatically:
   - Detects the stock increase
   - Queues notifications for all users who requested to be notified
   - Logs the trigger event

2. **Queue Processing**: The system processes the notification queue:
   - Sends emails using EmailJS
   - Tracks success/failure status
   - Retries failed notifications (up to 3 attempts)
   - Marks notifications as sent in the database

### Manual Notifications

Admins can manually trigger notifications through the admin dashboard:
- **Send All Notifications**: Sends notifications for all products that are back in stock
- **Process Queue**: Processes pending notifications in the queue
- **Retry Failed**: Retries notifications that previously failed
- **Clear Failed**: Removes failed notifications from the queue

## 🎛️ Admin Interface

Access the stock notification manager through:
**Admin Dashboard → Stock Notifications Tab**

### Features:
- **Statistics Dashboard**: View pending, sent, and failed notification counts
- **Queue Management**: Monitor and manage the notification queue
- **Manual Controls**: Send notifications manually or process the queue
- **Test Functionality**: Test email sending with a test email address
- **Real-time Updates**: Refresh data to see current status

### Key Metrics:
- **Pending Notifications**: Users waiting to be notified
- **Queue Status**: Current state of the notification processing queue
- **Success/Failure Rates**: Track email delivery success
- **Product Status**: Which products have pending notifications

## 🔧 Configuration Options

### EmailJS Settings
Located in `src/services/emailService.ts`:
```typescript
const EMAILJS_CONFIG = {
  serviceId: 'service_u25vulc',
  templateId: 'template_k3jvli8',
  publicKey: '4S229zBwfW7pedtoD'
};
```

### Queue Processing
- **Batch Size**: Process 10 notifications at a time
- **Retry Attempts**: Maximum 3 attempts per notification
- **Rate Limiting**: 1 second delay between emails
- **Auto Processing**: Can be enabled to run every 60 seconds

## 📊 Database Tables

### `stock_notifications`
Stores user requests for stock notifications:
- `user_id`: User who requested notification
- `product_id`: Product to be notified about
- `email`: Email address for notification
- `is_notified`: Whether notification was sent
- `created_at`: When notification was requested
- `notified_at`: When notification was sent

### `notification_queue`
Queue for processing notifications:
- `notification_id`: Reference to stock_notifications
- `product_id`: Product ID
- `email_data`: JSON data for email template
- `status`: pending/processing/sent/failed
- `attempts`: Number of sending attempts
- `error_message`: Error details if failed

### `stock_notification_log`
Log of trigger events:
- `product_id`: Product that came back in stock
- `old_stock`: Previous stock quantity
- `new_stock`: New stock quantity
- `notifications_queued`: Number of notifications queued
- `triggered_at`: When the trigger fired

## 🚨 Troubleshooting

### Common Issues:

1. **Emails Not Sending**
   - Check EmailJS configuration
   - Verify template ID and service ID
   - Check email template variables
   - Review queue status in admin dashboard

2. **Notifications Not Triggering**
   - Verify database trigger is installed
   - Check if stock quantity actually increased
   - Review stock_notification_log table

3. **Queue Processing Issues**
   - Check notification_queue table for failed items
   - Review error messages in queue items
   - Use retry functionality in admin dashboard

### Debug Steps:

1. **Check Queue Status**:
   ```sql
   SELECT * FROM notification_queue ORDER BY created_at DESC LIMIT 10;
   ```

2. **Check Trigger Log**:
   ```sql
   SELECT * FROM stock_notification_log ORDER BY triggered_at DESC LIMIT 10;
   ```

3. **Test Email Sending**:
   Use the test email functionality in the admin dashboard

## 🔄 Maintenance

### Regular Tasks:
- Monitor queue status for failed notifications
- Clear old sent notifications periodically
- Review email delivery rates
- Update email template as needed

### Performance Optimization:
- The system processes notifications in batches
- Rate limiting prevents overwhelming EmailJS
- Failed notifications are automatically retried
- Queue can be processed manually or automatically

## 📈 Monitoring

### Key Metrics to Watch:
- **Queue Pending Count**: Should stay low
- **Failed Notification Rate**: Should be minimal
- **Email Delivery Success**: Should be high (>95%)
- **Processing Time**: Should be reasonable

### Alerts to Set Up:
- High failed notification rate
- Queue processing delays
- EmailJS quota limits
- Database trigger failures

## 🎯 Best Practices

1. **Email Template**: Keep the template professional and branded
2. **Rate Limiting**: Don't overwhelm EmailJS with too many requests
3. **Error Handling**: Monitor and retry failed notifications
4. **User Experience**: Provide clear unsubscribe options
5. **Testing**: Always test with a real email before going live

## 📞 Support

If you encounter issues:
1. Check the admin dashboard for queue status
2. Review error messages in the notification queue
3. Test email functionality with a test address
4. Check database logs for trigger events
5. Verify EmailJS configuration and quotas

---

**Note**: This system is designed to be reliable and scalable. The queue-based approach ensures that notifications are not lost even if there are temporary issues with email delivery.
