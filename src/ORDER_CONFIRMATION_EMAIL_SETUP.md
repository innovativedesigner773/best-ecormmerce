# 📧 Order Confirmation Email Setup Guide

This guide explains how to set up and use the EmailJS order confirmation email system for Best Brightness.

## 🚀 Quick Setup

### 1. EmailJS Template Configuration

The system is configured with the provided EmailJS credentials:
- **Service ID**: `service_u25vulc`
- **Template ID**: `template_ybjvsvy` (Order Confirmation)
- **Public Key**: `4S229zBwfW7pedtoD`

### 2. EmailJS Dashboard Setup

#### Step 1: Login to EmailJS Dashboard
1. Go to https://dashboard.emailjs.com/
2. Navigate to **Email Templates**
3. Click **"Create New Template"**

#### Step 2: Configure Template Settings
- **Template ID**: `template_ybjvsvy`
- **Template Name**: "Best Brightness Order Confirmation"

#### Step 3: Set Email Configuration
- **Subject Line**: `🎉 Order Confirmed! Order #{{order_number}} - Best Brightness`
- **To Email**: `{{email}}`
- **From Name**: `Best Brightness`
- **From Email**: Your verified sender email

#### Step 4: Add Template Content
1. Copy the HTML content from `src/templates/order-confirmation-email.html`
2. Paste into the EmailJS template editor
3. Save the template

## 📋 EmailJS Template Configuration Summary

### Exact Template Settings for EmailJS Dashboard:

**Template ID**: `template_ybjvsvy`

**Subject Line**:
```
🎉 Order Confirmed! Order #{{order_number}} - Best Brightness
```

**To Email**:
```
{{email}}
```

**From Name**:
```
Best Brightness
```

**From Email**: (Your verified sender email address)

**Template Content**: Copy the entire HTML from `src/templates/order-confirmation-email-simple.html`

**Note**: Use the simplified template (`order-confirmation-email-simple.html`) as it works better with EmailJS. The complex template may cause "corrupted variables" errors.

### 3. Template Variables

The order confirmation email template uses the following variables:

#### Customer Information
- `{{email}}` - Customer email address
- `{{customer_name}}` - Customer's full name
- `{{order_number}}` - Unique order number
- `{{order_date}}` - Date when order was placed
- `{{order_status}}` - Current order status

#### Order Details
- `{{payment_method}}` - Payment method used
- `{{estimated_delivery}}` - Estimated delivery timeframe
- `{{total_items}}` - Total number of items in order
- `{{order_items}}` - JSON string of order items array

#### Pricing Information
- `{{subtotal}}` - Order subtotal
- `{{shipping_cost}}` - Shipping cost
- `{{discount_amount}}` - Discount amount (optional)
- `{{discount_code}}` - Discount code used (optional)
- `{{tax_amount}}` - Tax amount
- `{{total_amount}}` - Final total amount

#### Shipping Information
- `{{shipping_name}}` - Shipping recipient name
- `{{shipping_address_line1}}` - Primary address line
- `{{shipping_address_line2}}` - Secondary address line (optional)
- `{{shipping_city}}` - City
- `{{shipping_state}}` - State/Province
- `{{shipping_zip}}` - ZIP/Postal code
- `{{shipping_country}}` - Country
- `{{delivery_timeframe}}` - Delivery timeframe

#### URLs and Links
- `{{track_order_url}}` - Link to track order
- `{{shop_url}}` - Link to continue shopping
- `{{contact_url}}` - Contact support link
- `{{privacy_url}}` - Privacy policy link
- `{{terms_url}}` - Terms of service link

#### Additional Variables
- `{{current_year}}` - Current year for copyright

## 📋 How to Use

### 1. Basic Usage

```typescript
import { sendOrderConfirmation } from '../utils/order-email-integration';

// Example order data
const orderData = {
  id: 'order-123',
  customer_email: 'customer@example.com',
  customer_name: 'John Doe',
  order_number: 'BB-2024-001',
  order_date: 'January 15, 2024',
  status: 'Processing',
  payment_method: 'Credit Card',
  items: [
    {
      product_id: 'prod-1',
      name: 'Premium Cleaning Solution',
      sku: 'BB-CLEAN-001',
      quantity: 2,
      price: 24.99,
      image_url: 'https://example.com/image.jpg'
    }
  ],
  subtotal: 49.98,
  shipping_cost: 9.99,
  tax_amount: 4.80,
  total_amount: 64.77,
  shipping_address: {
    name: 'John Doe',
    line1: '123 Main St',
    city: 'Anytown',
    state: 'CA',
    zip: '12345',
    country: 'United States'
  }
};

// Send confirmation email
const result = await sendOrderConfirmation(orderData);

if (result.success) {
  console.log('Order confirmation sent successfully!');
} else {
  console.error('Failed to send confirmation:', result.error);
}
```

### 2. Integration with Order Processing

```typescript
// In your order processing workflow
export const processOrder = async (orderData: OrderData) => {
  try {
    // 1. Save order to database
    const savedOrder = await saveOrderToDatabase(orderData);
    
    // 2. Process payment
    const paymentResult = await processPayment(orderData);
    
    if (paymentResult.success) {
      // 3. Send order confirmation email
      const emailResult = await sendOrderConfirmation(savedOrder);
      
      if (emailResult.success) {
        console.log('Order processed and confirmation sent');
        return { success: true, orderId: savedOrder.id };
      } else {
        console.warn('Order processed but email failed:', emailResult.error);
        // You might want to queue the email for retry
        return { success: true, orderId: savedOrder.id, emailQueued: true };
      }
    }
  } catch (error) {
    console.error('Order processing failed:', error);
    return { success: false, error: error.message };
  }
};
```

### 3. Batch Processing

```typescript
import { sendBatchOrderConfirmations } from '../utils/order-email-integration';

// Send confirmations for multiple orders
const orders = [order1, order2, order3];
const result = await sendBatchOrderConfirmations(orders);

console.log(`Sent ${result.success} confirmations, ${result.failed} failed`);
if (result.errors.length > 0) {
  console.error('Errors:', result.errors);
}
```

### 4. Custom URLs

```typescript
import { sendOrderConfirmationWithCustomUrls } from '../utils/order-email-integration';

const result = await sendOrderConfirmationWithCustomUrls(orderData, {
  track_order_url: 'https://yourdomain.com/track/BB-2024-001',
  shop_url: 'https://yourdomain.com/shop',
  contact_url: 'https://yourdomain.com/contact',
  privacy_url: 'https://yourdomain.com/privacy',
  terms_url: 'https://yourdomain.com/terms'
});
```

## 🧪 Testing

### 1. Test Email Configuration

```typescript
import { testOrderConfirmationEmail } from '../services/emailService';

// Test the email configuration
const result = await testOrderConfirmationEmail();

if (result.success) {
  console.log('✅ Email configuration is working!');
} else {
  console.error('❌ Email configuration failed:', result.error);
}
```

### 2. Test Integration

```typescript
import { testOrderConfirmationIntegration } from '../utils/order-email-integration';

// Test the complete integration
await testOrderConfirmationIntegration();
```

## 🎨 Email Template Customization

### 1. Colors and Branding

The email template uses your Best Brightness brand colors:
- **Primary Blue**: `#4682B4`
- **Dark Navy**: `#2C3E50`
- **Light Blue**: `#87CEEB`
- **Fresh Blue**: `#B0E0E6`
- **Success Green**: `#28A745`
- **Alert Orange**: `#FF6B35`

### 2. Customizing the Template

To customize the email template:

1. Edit `src/templates/order-confirmation-email.html`
2. Update the EmailJS template with your changes
3. Test with the test functions

### 3. Adding New Variables

To add new template variables:

1. Update the `OrderConfirmationEmailData` interface in `src/services/emailService.ts`
2. Add the variable to the `sendOrderConfirmationEmail` function
3. Update the email template HTML
4. Update the EmailJS template

## 🔧 Configuration Options

### 1. Rate Limiting

The system includes built-in rate limiting:
- **Batch Size**: 3 emails per batch
- **Email Delay**: 1 second between emails
- **Batch Delay**: 2 seconds between batches

### 2. Error Handling

The system includes comprehensive error handling:
- Automatic retry logic
- Detailed error logging
- Graceful failure handling

### 3. URL Configuration

URLs are automatically generated based on your domain, but can be customized:
- Track order URLs
- Shop URLs
- Contact URLs
- Privacy/Terms URLs

## 🚨 Troubleshooting

### Common Issues:

1. **Emails Not Sending**
   - Check EmailJS configuration
   - Verify template ID and service ID
   - Check email template variables
   - Review EmailJS quotas

2. **Template Variables Not Working**
   - Ensure all required variables are provided
   - Check variable names match exactly
   - Verify JSON formatting for complex variables

3. **Rate Limiting Issues**
   - Reduce batch size
   - Increase delays between emails
   - Check EmailJS quota limits

### Debug Steps:

1. **Test Email Configuration**:
   ```typescript
   await testOrderConfirmationEmail();
   ```

2. **Check EmailJS Dashboard**:
   - Verify template is active
   - Check email logs
   - Review quota usage

3. **Test with Simple Data**:
   ```typescript
   await testOrderConfirmationIntegration();
   ```

## 📊 Monitoring

### Key Metrics to Watch:
- **Email Delivery Success Rate**: Should be >95%
- **Template Variable Errors**: Should be minimal
- **Rate Limiting**: Monitor EmailJS quotas
- **Processing Time**: Should be reasonable

### Logging:
The system logs all email sending attempts:
- Success messages with message IDs
- Error messages with details
- Batch processing results

## 🎯 Best Practices

1. **Always Test**: Test email templates before going live
2. **Handle Failures**: Implement retry logic for failed emails
3. **Monitor Quotas**: Keep track of EmailJS usage
4. **Customize URLs**: Use your actual domain URLs
5. **Error Handling**: Log errors for debugging
6. **Rate Limiting**: Don't overwhelm EmailJS with requests

## 📞 Support

If you encounter issues:

1. Check the EmailJS dashboard for template status
2. Test with the provided test functions
3. Review error logs in the console
4. Verify all template variables are provided
5. Check EmailJS quota limits

---

**Note**: This system is designed to be reliable and scalable. The batch processing approach ensures that order confirmations are sent efficiently while respecting EmailJS rate limits.
