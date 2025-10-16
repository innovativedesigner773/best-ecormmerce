import { loadStripe, Stripe } from '@stripe/stripe-js';

// Resolve Stripe publishable key from multiple sources to make setup easier in dev
function resolvePublishableKey(): string | undefined {
  // 1) Preferred: Vite env
  const fromVite = (import.meta as any)?.env?.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined;
  if (fromVite) return fromVite;

  // 2) URL query param (?pk=...) will store into localStorage for subsequent loads
  if (typeof window !== 'undefined') {
    try {
      const url = new URL(window.location.href);
      const fromQuery = url.searchParams.get('pk') || url.searchParams.get('stripe_pk');
      if (fromQuery && fromQuery.startsWith('pk_')) {
        localStorage.setItem('VITE_STRIPE_PUBLISHABLE_KEY', fromQuery);
        // Clean the URL so pk is not left visible
        url.searchParams.delete('pk');
        url.searchParams.delete('stripe_pk');
        window.history.replaceState({}, '', url.toString());
        return fromQuery;
      }
    } catch {}

    // 3) Local storage fallback for quick manual setup in the console
    const fromLocalStorage = localStorage.getItem('VITE_STRIPE_PUBLISHABLE_KEY') || undefined;
    if (fromLocalStorage) return fromLocalStorage;

    // 4) Global window variable fallback
    const fromWindow = (window as any).VITE_STRIPE_PUBLISHABLE_KEY as string | undefined;
    if (fromWindow) return fromWindow;
  }

  // 5) process.env fallback (mainly for SSR/test environments)
  try {
    const fromProcess = (process as any)?.env?.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined;
    if (fromProcess) return fromProcess;
  } catch {}

  return undefined;
}

const stripePublishableKey = resolvePublishableKey();

// Initialize Stripe
let stripePromise: Promise<Stripe | null> | null = null;

export const getStripe = () => {
  if (!stripePublishableKey) {
    console.error('❌ Missing Stripe publishable key. Provide one via .env.local (VITE_STRIPE_PUBLISHABLE_KEY), or add ?pk=... in URL, or set localStorage VITE_STRIPE_PUBLISHABLE_KEY');
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

