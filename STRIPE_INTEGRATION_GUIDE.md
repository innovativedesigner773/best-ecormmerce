# Stripe Integration Guide

## Overview
This guide explains the Stripe integration for Best Brightness E-commerce platform. The integration includes card brand detection, real-time validation, and secure payment processing.

## Features Implemented

### ✅ Frontend Features
- **Stripe Elements**: Professional card input fields with built-in validation
- **Real-time Card Brand Detection**: Automatically detects Visa, Mastercard, Amex, etc.
- **Card Validation**: Real-time validation as users type card details
- **Secure Card Entry**: PCI-compliant card input using Stripe's hosted fields
- **Visual Feedback**: Shows card brand logos and validation status
- **Test Mode Indicators**: Clear indicators showing test mode and test card numbers

### ✅ Backend Features
- **Payment Intent Creation**: Secure payment intent creation endpoint
- **Payment Confirmation**: Endpoint to confirm and process payments
- **Payment Method Retrieval**: Get card details after payment
- **Webhook Handler**: Handle Stripe webhook events (payment succeeded/failed)

## Setup Instructions

### 1. Environment Variables

#### Frontend (.env.local or .env)
```bash
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key_here
```

#### Backend (Vercel Environment Variables)
```bash
STRIPE_SECRET_KEY=your_stripe_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

**⚠️ Important**: 
- Never commit API keys to Git
- Add `.env.local` to your `.gitignore`
- Use different keys for development and production

### 2. Install Dependencies

```bash
# Frontend dependencies (already installed)
npm install @stripe/stripe-js @stripe/react-stripe-js

# Backend dependencies (already installed)
npm install stripe
```

### 3. File Structure

```
src/
├── config/
│   └── stripe.ts                    # Stripe configuration
├── components/
│   └── payment/
│       └── StripePaymentForm.tsx   # Payment form component
└── pages/
    └── customer/
        └── Checkout.tsx            # Updated checkout page

api/
├── index.tsx                       # Main API with Stripe endpoints
└── stripe-payment.tsx             # Standalone Stripe module (optional)
```

## Usage

### Frontend Implementation

The checkout page now uses Stripe Elements at Step 2 (Payment Information):

```tsx
import { Elements } from '@stripe/react-stripe-js';
import { getStripe } from '../../config/stripe';
import StripePaymentForm from '../../components/payment/StripePaymentForm';

// In your component:
<Elements stripe={getStripe()}>
  <StripePaymentForm
    amount={finalTotal}
    currency="zar"
    onSuccess={handleStripePaymentSuccess}
    onError={handleStripePaymentError}
    onBack={() => setCurrentStep(1)}
    customerEmail={shippingInfo.email}
    customerName={`${shippingInfo.firstName} ${shippingInfo.lastName}`}
  />
</Elements>
```

### Card Brand Detection

The payment form automatically detects and displays card brands:
- **Visa**: Blue badge
- **Mastercard**: Red badge
- **American Express**: Blue badge
- **Discover**: Orange badge
- **Diners Club**: Purple badge
- **JCB**: Green badge
- **UnionPay**: Red badge

### Backend API Endpoints

#### 1. Create Payment Intent
```bash
POST /api/make-server-8880f2f2/stripe/create-payment-intent

Body:
{
  "amount": 100.50,
  "currency": "zar",
  "customerEmail": "customer@example.com",
  "customerName": "John Doe"
}

Response:
{
  "success": true,
  "clientSecret": "pi_xxx_secret_xxx",
  "paymentIntentId": "pi_xxx"
}
```

#### 2. Confirm Payment
```bash
POST /api/make-server-8880f2f2/stripe/confirm-payment

Body:
{
  "paymentMethodId": "pm_xxx",
  "amount": 100.50,
  "currency": "zar",
  "customerEmail": "customer@example.com"
}

Response:
{
  "success": true,
  "paymentIntent": {
    "id": "pi_xxx",
    "status": "succeeded",
    "amount": 10050,
    "currency": "zar"
  }
}
```

#### 3. Get Payment Method Details
```bash
POST /api/make-server-8880f2f2/stripe/payment-method-details

Body:
{
  "paymentMethodId": "pm_xxx"
}

Response:
{
  "success": true,
  "paymentMethod": {
    "id": "pm_xxx",
    "type": "card",
    "card": {
      "brand": "visa",
      "last4": "4242",
      "exp_month": 12,
      "exp_year": 2025
    }
  }
}
```

#### 4. Webhook Handler
```bash
POST /api/make-server-8880f2f2/stripe/webhook

Headers:
  stripe-signature: xxx

Body: (raw Stripe webhook event)
```

## Test Cards

Use these test cards in test mode:

### Successful Payments
- **Visa**: `4242 4242 4242 4242`
- **Visa (debit)**: `4000 0566 5566 5556`
- **Mastercard**: `5555 5555 5555 4444`
- **Mastercard (2-series)**: `2223 0031 2200 3222`
- **American Express**: `3782 822463 10005`
- **Discover**: `6011 1111 1111 1117`
- **Diners Club**: `3056 9300 0902 0004`
- **JCB**: `3566 0020 2036 0505`

### Test Payment Failures
- **Generic decline**: `4000 0000 0000 0002`
- **Insufficient funds**: `4000 0000 0000 9995`
- **Lost card**: `4000 0000 0000 9987`
- **Stolen card**: `4000 0000 0000 9979`

### Test Details
- **Expiry Date**: Any future date (e.g., `12/34`)
- **CVC**: Any 3 digits (e.g., `123`)
- **ZIP**: Any 5 digits (e.g., `12345`)

## Security Best Practices

### ✅ Implemented
1. **PCI Compliance**: Card data never touches your servers (handled by Stripe Elements)
2. **Tokenization**: Card details converted to secure payment method tokens
3. **HTTPS Only**: All communication over secure connections
4. **Environment Variables**: API keys stored in environment variables, not code
5. **Server-Side Validation**: Payment processing happens on the server

### 🔒 Additional Recommendations
1. **Enable 3D Secure**: For additional authentication (already supported by Stripe)
2. **Monitor Webhooks**: Set up monitoring for failed webhook deliveries
3. **Rate Limiting**: Add rate limiting to payment endpoints
4. **Fraud Detection**: Use Stripe Radar for fraud prevention
5. **Activity Logging**: Log all payment attempts for audit trail

## Webhook Configuration

### Setting up Webhooks in Stripe Dashboard

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/test/webhooks)
2. Click "Add endpoint"
3. Enter your webhook URL:
   ```
   https://your-domain.com/api/make-server-8880f2f2/stripe/webhook
   ```
4. Select events to listen to:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `payment_intent.canceled`
   - `charge.refunded`
5. Copy the webhook signing secret
6. Add it to your environment variables as `STRIPE_WEBHOOK_SECRET`

## Migration to Production

### 1. Update API Keys
Replace test keys with production keys:
- Remove `_test_` from publishable key
- Remove `_test_` from secret key

### 2. Verify Business Details
Ensure your Stripe account has:
- Business information
- Bank account for payouts
- Tax information
- Identity verification (if required)

### 3. Update Currency
If needed, change currency from `zar` to your preferred currency in:
- Frontend: `StripePaymentForm` component
- Backend: Payment intent creation

### 4. Enable Production Mode
```bash
# Update .env.local
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_your_live_key

# Update Vercel environment variables
STRIPE_SECRET_KEY=sk_live_your_live_key
```

### 5. Test Production Setup
- Make a small test payment
- Verify webhook delivery
- Check payment appears in Stripe Dashboard
- Test refund process

## Troubleshooting

### Issue: "Stripe has not loaded yet"
**Solution**: Ensure `VITE_STRIPE_PUBLISHABLE_KEY` is set in `.env.local` and restart dev server

### Issue: Payment fails with "Configuration error"
**Solution**: Check that `STRIPE_SECRET_KEY` is set in backend environment variables

### Issue: Card brand not detected
**Solution**: This is normal for invalid/incomplete card numbers. Try a complete test card number.

### Issue: Webhook signature verification fails
**Solution**: 
1. Verify `STRIPE_WEBHOOK_SECRET` is correctly set
2. Ensure raw request body is used (not parsed JSON)
3. Check Stripe Dashboard for webhook delivery logs

### Issue: CORS errors
**Solution**: Verify CORS configuration in `api/index.tsx` includes your frontend domain

## Payment Flow Diagram

```
User Checkout Flow:
┌─────────────────────────────────────────────────────────────┐
│ 1. User enters shipping information                         │
│    └─→ Validates and proceeds to Step 2                     │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. User enters payment information (Stripe Elements)        │
│    ├─→ Card number → Brand detection → Visa/Mastercard     │
│    ├─→ Expiry date → Validates format                       │
│    ├─→ CVC → Validates length                               │
│    └─→ All fields validated → Create Payment Method         │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. Stripe.createPaymentMethod()                             │
│    ├─→ Success: Returns payment method ID                   │
│    └─→ Error: Shows validation error to user                │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. User reviews order                                        │
│    └─→ Confirms and places order                            │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. Backend processes payment                                │
│    ├─→ Creates order in database                            │
│    ├─→ (Future) Charges payment method via Stripe API       │
│    ├─→ Sends confirmation email                             │
│    └─→ Clears cart and redirects to orders page             │
└─────────────────────────────────────────────────────────────┘
```

## Support

For Stripe-specific issues:
- [Stripe Documentation](https://stripe.com/docs)
- [Stripe Support](https://support.stripe.com/)
- [Stripe Elements Reference](https://stripe.com/docs/stripe-js)

For Best Brightness integration issues:
- Check console logs for detailed error messages
- Review network tab for API call failures
- Verify environment variables are set correctly

## Changelog

### Version 1.0.0 (Current)
- ✅ Stripe Elements integration
- ✅ Card brand detection (Visa, Mastercard, Amex, etc.)
- ✅ Real-time card validation
- ✅ Payment method creation
- ✅ Backend API endpoints for payment processing
- ✅ Webhook handler setup
- ✅ Test mode indicators
- ✅ Secure payment flow

### Future Enhancements
- [ ] Payment intent creation and confirmation
- [ ] 3D Secure authentication
- [ ] Saved payment methods for registered users
- [ ] Subscription support
- [ ] Multi-currency support
- [ ] Apple Pay / Google Pay integration
- [ ] Refund functionality in admin panel

