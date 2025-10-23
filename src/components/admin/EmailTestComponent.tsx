import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { testOrderConfirmationEmail, sendOrderConfirmationEmail } from '../../services/emailService';
import { sendOrderConfirmation, testOrderConfirmationIntegration } from '../../utils/order-email-integration';
import { toast } from 'sonner';

export default function EmailTestComponent() {
  const [testEmail, setTestEmail] = useState('test@example.com');
  const [loading, setLoading] = useState(false);

  const handleTestEmailService = async () => {
    setLoading(true);
    try {
      console.log('🧪 Testing EmailJS configuration...');
      const result = await testOrderConfirmationEmail();
      
      if (result.success) {
        toast.success('✅ EmailJS configuration test passed!');
        console.log('✅ EmailJS test successful:', result.messageId);
      } else {
        toast.error(`❌ EmailJS test failed: ${result.error}`);
        console.error('❌ EmailJS test failed:', result.error);
      }
    } catch (error) {
      toast.error(`❌ EmailJS test error: ${error}`);
      console.error('❌ EmailJS test error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTestIntegration = async () => {
    setLoading(true);
    try {
      console.log('🧪 Testing order confirmation integration...');
      await testOrderConfirmationIntegration();
      toast.success('✅ Integration test completed! Check console for details.');
    } catch (error) {
      toast.error(`❌ Integration test error: ${error}`);
      console.error('❌ Integration test error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTestWithCustomEmail = async () => {
    if (!testEmail) {
      toast.error('Please enter a test email address');
      return;
    }

    setLoading(true);
    try {
      console.log('🧪 Testing with custom email:', testEmail);
      
      const testOrderData = {
        id: 'test-order-' + Date.now(),
        customer_email: testEmail,
        customer_name: 'Test Customer',
        order_number: 'BB-2024-TEST-' + Date.now(),
        order_date: new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
        status: 'Processing',
        payment_method: 'Credit Card',
        items: [
          {
            product_id: 'test-prod-1',
            name: 'Test Cleaning Solution',
            sku: 'TEST-CLEAN-001',
            quantity: 2,
            price: 24.99,
            image_url: 'https://via.placeholder.com/300x300?text=Test+Product'
          }
        ],
        subtotal: 49.98,
        shipping_cost: 9.99,
        discount_amount: 5.00,
        discount_code: 'TEST5',
        tax_amount: 4.50,
        total_amount: 59.47,
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

      const result = await sendOrderConfirmation(testOrderData);
      
      if (result.success) {
        toast.success(`✅ Test email sent successfully to ${testEmail}!`);
        console.log('✅ Test email sent:', result.messageId);
      } else {
        toast.error(`❌ Test email failed: ${result.error}`);
        console.error('❌ Test email failed:', result.error);
      }
    } catch (error) {
      toast.error(`❌ Test email error: ${error}`);
      console.error('❌ Test email error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>📧 Order Confirmation Email Testing</CardTitle>
          <CardDescription>
            Test the order confirmation email system to ensure it's working properly.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="test-email">Test Email Address</Label>
            <Input
              id="test-email"
              type="email"
              placeholder="test@example.com"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
            />
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Button 
              onClick={handleTestEmailService}
              disabled={loading}
              variant="outline"
            >
              {loading ? 'Testing...' : 'Test EmailJS Config'}
            </Button>
            
            <Button 
              onClick={handleTestIntegration}
              disabled={loading}
              variant="outline"
            >
              {loading ? 'Testing...' : 'Test Integration'}
            </Button>
            
            <Button 
              onClick={handleTestWithCustomEmail}
              disabled={loading || !testEmail}
              className="bg-[#97CF50] hover:bg-[#09215F]"
            >
              {loading ? 'Sending...' : 'Send Test Email'}
            </Button>
          </div>
          
          <div className="text-sm text-gray-600 space-y-1">
            <p><strong>Test EmailJS Config:</strong> Tests the basic EmailJS configuration and template setup.</p>
            <p><strong>Test Integration:</strong> Tests the complete integration with sample data.</p>
            <p><strong>Send Test Email:</strong> Sends a real test email to the specified address.</p>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>🔧 Troubleshooting</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p><strong>If emails are not sending:</strong></p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Check that the EmailJS template ID is set to <code>template_ybjvsvy</code></li>
            <li>Verify the template is active in your EmailJS dashboard</li>
            <li>Check the browser console for error messages</li>
            <li>Ensure your EmailJS service is properly configured</li>
            <li>Check your EmailJS quota limits</li>
          </ul>
          
          <p className="mt-4"><strong>Template Variables:</strong></p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Make sure all required template variables are provided</li>
            <li>Check that the HTML template is properly formatted</li>
            <li>Verify the subject line and email configuration</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
