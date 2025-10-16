# Stripe Integration - Quick Start

## 🚀 Get Started in 3 Steps

### Step 1: Create Environment File

Create a `.env.local` file in the root directory:

```bash
# Create the file
touch .env.local
```

Add your Stripe publishable key:

```bash
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key_here
```

### Step 2: Configure Backend (Vercel)

Add environment variables to your Vercel project:

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to Settings → Environment Variables
4. Add:
   ```
   STRIPE_SECRET_KEY=your_stripe_secret_key_here
   ```

### Step 3: Restart Dev Server

```bash
npm run dev
```

## ✅ Test the Integration

1. Navigate to checkout: `http://localhost:5173/checkout`
2. Fill in shipping information
3. At payment step, enter test card:
   - **Card Number**: `4242 4242 4242 4242` (Visa)
   - **Expiry**: `12/34` (any future date)
   - **CVC**: `123` (any 3 digits)
4. Watch for:
   - ✅ "Visa" badge appears next to card number
   - ✅ Green checkmark when card is complete
   - ✅ "Review Order" button enables

## 🎯 What's Included

### Frontend
- ✅ Professional Stripe card input fields
- ✅ Real-time brand detection (Visa, Mastercard, etc.)
- ✅ Card validation as you type
- ✅ Visual feedback and error messages
- ✅ Test card suggestions displayed

### Backend
- ✅ Payment intent creation API
- ✅ Payment confirmation API
- ✅ Payment method details API
- ✅ Webhook handler for Stripe events

## 🧪 Test Cards

Try these cards to see brand detection:

| Brand | Card Number | Detected As |
|-------|-------------|-------------|
| Visa | `4242 4242 4242 4242` | Visa (Blue) |
| Mastercard | `5555 5555 5555 4444` | Mastercard (Red) |
| Amex | `3782 822463 10005` | American Express (Blue) |
| Discover | `6011 1111 1111 1117` | Discover (Orange) |

## 📚 Full Documentation

See `STRIPE_INTEGRATION_GUIDE.md` for complete documentation including:
- Security best practices
- Production deployment
- Webhook configuration
- Troubleshooting
- API reference

## ⚠️ Important Notes

1. **Never commit `.env.local`** - It's already in `.gitignore`
2. **Test keys only** - These are test keys, safe to use in development
3. **Production keys** - Use different keys for production (no `_test_` in the key)

## 🆘 Troubleshooting

### "Stripe has not loaded yet"
- Verify `.env.local` exists and has the correct key
- Restart dev server: `npm run dev`

### "Configuration error"
- Check Vercel environment variables
- Redeploy after adding environment variables

### Card brand not showing
- Type a complete 16-digit card number
- Use one of the test cards listed above

## 🎉 You're All Set!

The Stripe integration is ready to use. Enjoy secure, PCI-compliant payment processing with automatic card brand detection!

