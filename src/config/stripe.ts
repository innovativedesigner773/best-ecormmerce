import { loadStripe, Stripe } from '@stripe/stripe-js';

// Load Stripe publishable key from environment variables
const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

// Initialize Stripe
let stripePromise: Promise<Stripe | null> | null = null;

export const getStripe = () => {
  if (!stripePublishableKey) {
    console.error('❌ Missing Stripe publishable key. Please add VITE_STRIPE_PUBLISHABLE_KEY to your .env.local file and restart dev server');
    return null;
  }

  if (!stripePromise) {
    stripePromise = loadStripe(stripePublishableKey);
  }
  return stripePromise;
};

export const STRIPE_CONFIG = {
  publishableKey: stripePublishableKey || '',
  isConfigured: !!stripePublishableKey,
};

