import { Hono } from 'hono';
import { cors } from 'hono/cors';

const app = new Hono();

// Enable CORS
app.use('/*', cors());

// Stripe payment intent creation endpoint
app.post('/create-payment-intent', async (c) => {
  try {
    const { amount, currency, customerEmail, customerName } = await c.req.json();

    // Validate required fields
    if (!amount || !currency) {
      return c.json({ 
        success: false, 
        error: 'Missing required fields: amount and currency are required' 
      }, 400);
    }

    // Get Stripe secret key from environment
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    
    if (!stripeSecretKey) {
      console.error('❌ Stripe secret key not found in environment variables');
      return c.json({ 
        success: false, 
        error: 'Stripe configuration error' 
      }, 500);
    }

    // Initialize Stripe
    const stripe = require('stripe')(stripeSecretKey);

    // Create a PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency.toLowerCase(),
      metadata: {
        customer_email: customerEmail || '',
        customer_name: customerName || '',
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return c.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error: any) {
    console.error('❌ Error creating payment intent:', error);
    return c.json({ 
      success: false, 
      error: error.message || 'Failed to create payment intent' 
    }, 500);
  }
});

// Confirm payment endpoint
app.post('/confirm-payment', async (c) => {
  try {
    const { paymentMethodId, amount, currency, customerEmail } = await c.req.json();

    if (!paymentMethodId || !amount || !currency) {
      return c.json({ 
        success: false, 
        error: 'Missing required fields' 
      }, 400);
    }

    // Get Stripe secret key from environment
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    
    if (!stripeSecretKey) {
      return c.json({ 
        success: false, 
        error: 'Stripe configuration error' 
      }, 500);
    }

    const stripe = require('stripe')(stripeSecretKey);

    // Create and confirm payment intent in one step
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: currency.toLowerCase(),
      payment_method: paymentMethodId,
      confirm: true,
      receipt_email: customerEmail,
      return_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/orders`,
    });

    return c.json({
      success: true,
      paymentIntent: {
        id: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
      },
    });
  } catch (error: any) {
    console.error('❌ Error confirming payment:', error);
    return c.json({ 
      success: false, 
      error: error.message || 'Failed to confirm payment' 
    }, 500);
  }
});

// Retrieve payment method details
app.post('/payment-method-details', async (c) => {
  try {
    const { paymentMethodId } = await c.req.json();

    if (!paymentMethodId) {
      return c.json({ 
        success: false, 
        error: 'Payment method ID is required' 
      }, 400);
    }

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    
    if (!stripeSecretKey) {
      return c.json({ 
        success: false, 
        error: 'Stripe configuration error' 
      }, 500);
    }

    const stripe = require('stripe')(stripeSecretKey);

    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);

    return c.json({
      success: true,
      paymentMethod: {
        id: paymentMethod.id,
        type: paymentMethod.type,
        card: paymentMethod.card ? {
          brand: paymentMethod.card.brand,
          last4: paymentMethod.card.last4,
          exp_month: paymentMethod.card.exp_month,
          exp_year: paymentMethod.card.exp_year,
        } : null,
      },
    });
  } catch (error: any) {
    console.error('❌ Error retrieving payment method:', error);
    return c.json({ 
      success: false, 
      error: error.message || 'Failed to retrieve payment method' 
    }, 500);
  }
});

// Webhook handler for Stripe events
app.post('/webhook', async (c) => {
  try {
    const sig = c.req.header('stripe-signature');
    const body = await c.req.text();

    if (!sig) {
      return c.json({ 
        success: false, 
        error: 'Missing stripe signature' 
      }, 400);
    }

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    if (!stripeSecretKey || !webhookSecret) {
      return c.json({ 
        success: false, 
        error: 'Stripe configuration error' 
      }, 500);
    }

    const stripe = require('stripe')(stripeSecretKey);

    // Verify webhook signature
    const event = stripe.webhooks.constructEvent(body, sig, webhookSecret);

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded':
        console.log('✅ Payment succeeded:', event.data.object.id);
        // TODO: Update order status in database
        break;
      case 'payment_intent.payment_failed':
        console.log('❌ Payment failed:', event.data.object.id);
        // TODO: Handle failed payment
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return c.json({ success: true, received: true });
  } catch (error: any) {
    console.error('❌ Webhook error:', error);
    return c.json({ 
      success: false, 
      error: error.message || 'Webhook handling failed' 
    }, 400);
  }
});

export default app;

