# Stock Notification System - Troubleshooting Guide

## Problem: Stock notifications not being sent to customers

### Root Cause
The automatic notification processing was not started when the app loads, so notifications were being queued but never processed.

### Solution Applied

1. **✅ Fixed Automatic Processing**: Added automatic notification processing to the main App component that runs every 30 seconds
2. **✅ Manual Processing Available**: Created a manual script to process pending notifications immediately
3. **✅ Admin Dashboard Integration**: The StockNotificationManager is already available in the admin dashboard

## How It Works Now

### Automatic Processing
- **When**: Every 30 seconds automatically
- **What**: Processes up to 10 pending notifications at a time
- **Where**: Started in `src/App.tsx` when the app loads

### Manual Processing
- **Admin Dashboard**: Go to Admin → Stock Notifications tab
- **Command Line**: Run `npm run process-notifications`
- **What**: Immediately processes all pending notifications

## Testing the Fix

### 1. Check if automatic processing is running
```bash
# Look for this in the browser console:
🔄 Starting automatic notification processing...
```

### 2. Test the notification flow
1. Go to Admin Dashboard → Stock Notifications tab
2. Check the queue status
3. If there are pending notifications, click "Process Queue"
4. Verify emails are sent

### 3. Manual processing (if needed)
```bash
# Run this command to immediately process pending notifications
npm run process-notifications
```

## Admin Dashboard Access

1. **Login as Admin**: Use an admin account
2. **Navigate**: Go to `/admin` 
3. **Stock Notifications Tab**: Click on the "Stock Notifications" tab
4. **Available Actions**:
   - View queue status
   - Process pending notifications manually
   - Retry failed notifications
   - Clear failed notifications
   - Test email functionality

## Database Tables Involved

- `stock_notifications`: Customer requests to be notified
- `notification_queue`: Queued notifications waiting to be sent
- `stock_notification_log`: Log of trigger activations

## Email Configuration

The system uses EmailJS with these templates:
- **Service ID**: `service_u25vulc`
- **Template ID**: `template_k3jvli8` (Stock notification template)
- **Public Key**: `4S229zBwfW7pedtoD`

## Troubleshooting Steps

### If notifications still aren't being sent:

1. **Check Console Logs**:
   ```bash
   # Look for these messages in browser console:
   🔄 Starting automatic notification processing...
   Processed X notifications: Y sent, Z failed
   ```

2. **Check Queue Status**:
   - Go to Admin Dashboard → Stock Notifications
   - Look at the queue statistics
   - If there are pending notifications, try manual processing

3. **Check EmailJS Configuration**:
   - Verify EmailJS service is active
   - Check template exists and is properly configured
   - Test with a single email first

4. **Check Database Triggers**:
   ```sql
   -- Verify the trigger exists
   SELECT * FROM information_schema.triggers 
   WHERE trigger_name = 'stock_update_notification_trigger';
   ```

5. **Manual Processing**:
   ```bash
   npm run process-notifications
   ```

## Files Modified

- `src/App.tsx`: Added automatic processing startup
- `src/scripts/process-pending-notifications.js`: New manual processing script
- `package.json`: Added `process-notifications` script command

## Next Steps

1. **Restart the app** to activate automatic processing
2. **Test by updating stock** on a product with pending notifications
3. **Check admin dashboard** to verify notifications are being processed
4. **Monitor console logs** for processing activity

The system should now automatically send stock availability emails to customers within 30 seconds of stock being updated!
