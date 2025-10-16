# 🔧 EmailJS Troubleshooting Guide - "Corrupted Variables" Fix

## 🚨 Current Issue
Your emails are being sent successfully (status 200) but showing "One or more dynamic variables are corrupted" instead of the actual content.

## ✅ Step-by-Step Fix

### Step 1: Use the Minimal Template
1. **Go to EmailJS Dashboard**: https://dashboard.emailjs.com/
2. **Edit Template**: `template_ybjvsvy`
3. **Replace ALL HTML content** with the content from `src/templates/order-confirmation-email-minimal.html`
4. **Save the template**

### Step 2: Verify Template Configuration
Make sure your EmailJS template has these exact settings:

**Template ID**: `template_ybjvsvy`
**Subject**: `🎉 Order Confirmed! Order #{{order_number}} - Best Brightness`
**To Email**: `{{email}}`
**From Name**: `Best Brightness`

### Step 3: Test with Minimal Variables
The minimal template only uses these basic variables:
- `{{order_number}}`
- `{{customer_name}}`
- `{{order_date}}`
- `{{order_status}}`
- `{{payment_method}}`
- `{{total_items}}`
- `{{order_items_list}}`
- `{{subtotal}}`
- `{{shipping_cost}}`
- `{{tax_amount}}`
- `{{total_amount}}`
- `{{shipping_name}}`
- `{{shipping_address_line1}}`
- `{{shipping_city}}`
- `{{shipping_state}}`
- `{{shipping_zip}}`
- `{{shipping_country}}`
- `{{current_year}}`

### Step 4: Test the Fix
1. **Complete a test order** in your checkout
2. **Check browser console** for these logs:
   ```
   📧 Sending email with template params: {...}
   📧 Template ID: template_ybjvsvy
   📧 Service ID: service_u25vulc
   ```
3. **Check your email** - it should now show proper content

### Step 5: If Still Not Working

#### Option A: Test with Even Simpler Template
Create a super basic test template in EmailJS:

```html
<!DOCTYPE html>
<html>
<body>
    <h1>Test Email</h1>
    <p>Hello {{customer_name}}</p>
    <p>Order: {{order_number}}</p>
    <p>Total: ${{total_amount}}</p>
</body>
</html>
```

#### Option B: Check EmailJS Template Variables
1. In EmailJS dashboard, go to your template
2. Click "Test" button
3. Add test values for variables:
   - `customer_name`: Test Customer
   - `order_number`: TEST-001
   - `total_amount`: 99.99
4. Send test email to yourself

#### Option C: Verify EmailJS Service
1. Check that your EmailJS service is active
2. Verify the service ID `service_u25vulc` is correct
3. Check your EmailJS quota limits

### Step 6: Common Issues and Solutions

#### Issue 1: Template Not Found
**Error**: Template not found
**Solution**: Make sure template ID is exactly `template_ybjvsvy`

#### Issue 2: Service Not Found
**Error**: Service not found
**Solution**: Verify service ID `service_u25vulc` is correct

#### Issue 3: Variables Not Replacing
**Error**: Variables show as `{{variable_name}}` instead of values
**Solution**: Check that variable names match exactly in template and code

#### Issue 4: HTML Not Rendering
**Error**: Email shows as plain text
**Solution**: Make sure template is set to HTML format in EmailJS

### Step 7: Debug Information
When testing, check the browser console for:
```
📧 Sending email with template params: {
  email: "test@example.com",
  customer_name: "Test Customer",
  order_number: "OD-123",
  ...
}
```

If you see this log, the variables are being sent correctly.

### Step 8: Final Verification
After implementing the minimal template:
1. ✅ Email should show "Order Confirmed!" header
2. ✅ Customer name should appear correctly
3. ✅ Order number should display
4. ✅ Order details should be formatted properly
5. ✅ No "corrupted variables" message

## 🎯 Expected Result
After using the minimal template, your emails should look like:
- Professional header with order number
- Customer greeting with their name
- Order details in formatted sections
- Proper totals and shipping information
- Clean, readable layout

## 📞 If Still Having Issues
1. **Check EmailJS Dashboard**: Ensure template is saved and active
2. **Verify Variables**: Make sure all variable names match exactly
3. **Test with Simple Template**: Use the super basic test template first
4. **Check Console Logs**: Look for the detailed parameter logs
5. **Contact EmailJS Support**: If the issue persists, it might be an EmailJS account issue

The minimal template should resolve the "corrupted variables" issue! 🎯
