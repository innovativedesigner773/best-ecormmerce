import React, { useState } from 'react';
import {
  PaymentElement,
  CardElement,
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { CreditCard, Lock } from 'lucide-react';
import LoadingSpinner from '../common/LoadingSpinner';

interface StripePaymentFormProps {
  amount: number;
  currency?: string;
  onSuccess: (paymentIntentId: string) => void;
  onError: (error: string) => void;
  onBack: () => void;
  customerEmail: string;
  customerName: string;
}

export default function StripePaymentForm({
  amount,
  currency = 'zar',
  onSuccess,
  onError,
  onBack,
  customerEmail,
  customerName,
}: StripePaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [cardBrand, setCardBrand] = useState<string>('unknown');
  const [cardComplete, setCardComplete] = useState({
    cardNumber: false,
    cardExpiry: false,
    cardCvc: false,
  });

  // Card brand icons/colors
  const getCardBrandInfo = (brand: string) => {
    switch (brand) {
      case 'visa':
        return { color: 'text-blue-600', label: 'Visa' };
      case 'mastercard':
        return { color: 'text-red-600', label: 'Mastercard' };
      case 'amex':
        return { color: 'text-blue-500', label: 'American Express' };
      case 'discover':
        return { color: 'text-orange-500', label: 'Discover' };
      case 'diners':
        return { color: 'text-purple-600', label: 'Diners Club' };
      case 'jcb':
        return { color: 'text-green-600', label: 'JCB' };
      case 'unionpay':
        return { color: 'text-red-500', label: 'UnionPay' };
      default:
        return { color: 'text-gray-400', label: '' };
    }
  };

  const brandInfo = getCardBrandInfo(cardBrand);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      onError('Stripe has not loaded yet. Please try again.');
      return;
    }

    const cardNumberElement = elements.getElement(CardNumberElement);
    if (!cardNumberElement) {
      onError('Card element not found. Please refresh the page.');
      return;
    }

    // Check if all fields are complete
    if (!cardComplete.cardNumber || !cardComplete.cardExpiry || !cardComplete.cardCvc) {
      onError('Please complete all card fields.');
      return;
    }

    setLoading(true);

    try {
      // Create payment method
      const { error: paymentMethodError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardNumberElement,
        billing_details: {
          name: customerName,
          email: customerEmail,
        },
      });

      if (paymentMethodError) {
        throw new Error(paymentMethodError.message);
      }

      if (!paymentMethod) {
        throw new Error('Failed to create payment method');
      }

      // Here you would typically create a payment intent on your backend
      // For now, we'll simulate success with the payment method ID
      console.log('Payment Method Created:', paymentMethod.id);
      console.log('Card Brand:', paymentMethod.card?.brand);
      console.log('Last 4 digits:', paymentMethod.card?.last4);

      // Call onSuccess with payment method ID
      // In production, you'd send this to your backend to create a payment intent
      onSuccess(paymentMethod.id);
    } catch (error: any) {
      console.error('Payment error:', error);
      onError(error.message || 'Payment failed. Please check your card details and try again.');
    } finally {
      setLoading(false);
    }
  };

  // Stripe Elements styling
  const elementStyles = {
    base: {
      fontSize: '16px',
      color: '#2C3E50',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      '::placeholder': {
        color: '#94a3b8',
      },
      padding: '12px',
    },
    invalid: {
      color: '#ef4444',
      iconColor: '#ef4444',
    },
    complete: {
      color: '#10b981',
      iconColor: '#10b981',
    },
  };

  const elementOptions = {
    style: elementStyles,
    showIcon: true,
  };

  return (
    <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-8">
      <div className="flex items-center mb-6">
        <div className="bg-[#4682B4] text-white p-3 rounded-xl mr-4">
          <CreditCard className="h-6 w-6" />
        </div>
        <h2 className="text-2xl font-bold text-[#2C3E50]">Payment Information</h2>
      </div>

      {/* Secure Payment Badge */}
      <div className="mb-6 flex items-center justify-center space-x-2 bg-green-50 border border-green-200 rounded-xl p-3">
        <Lock className="h-4 w-4 text-green-600" />
        <span className="text-sm font-medium text-green-700">Secured by Stripe</span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Card Number */}
        <div>
          <label className="block text-sm font-semibold text-[#2C3E50] mb-3">
            Card Number *
          </label>
          <div className="relative">
            <div className="w-full px-4 py-3 border border-gray-300 rounded-xl focus-within:ring-2 focus-within:ring-[#4682B4] focus-within:border-transparent transition-all duration-300">
              <CardNumberElement
                options={elementOptions}
                onChange={(e) => {
                  setCardBrand(e.brand);
                  setCardComplete({ ...cardComplete, cardNumber: e.complete });
                }}
              />
            </div>
            {brandInfo.label && (
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                <span className={`text-sm font-semibold ${brandInfo.color}`}>
                  {brandInfo.label}
                </span>
              </div>
            )}
          </div>
          {cardBrand !== 'unknown' && (
            <p className="mt-2 text-xs text-gray-500">
              ✓ Valid {brandInfo.label} card detected
            </p>
          )}
        </div>

        {/* Expiry and CVC */}
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-[#2C3E50] mb-3">
              Expiry Date *
            </label>
            <div className="w-full px-4 py-3 border border-gray-300 rounded-xl focus-within:ring-2 focus-within:ring-[#4682B4] focus-within:border-transparent transition-all duration-300">
              <CardExpiryElement
                options={elementOptions}
                onChange={(e) => {
                  setCardComplete({ ...cardComplete, cardExpiry: e.complete });
                }}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#2C3E50] mb-3">
              CVC *
            </label>
            <div className="w-full px-4 py-3 border border-gray-300 rounded-xl focus-within:ring-2 focus-within:ring-[#4682B4] focus-within:border-transparent transition-all duration-300">
              <CardCvcElement
                options={elementOptions}
                onChange={(e) => {
                  setCardComplete({ ...cardComplete, cardCvc: e.complete });
                }}
              />
            </div>
          </div>
        </div>

        {/* Payment Amount Display */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-[#2C3E50] font-medium">Total Payment</span>
            <span className="text-2xl font-bold text-[#2C3E50]">
              R{amount.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Test Card Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-blue-800 mb-2">Test Mode - Use Test Cards:</p>
          <div className="space-y-1 text-xs text-blue-700">
            <p>• Visa: 4242 4242 4242 4242</p>
            <p>• Mastercard: 5555 5555 5555 4444</p>
            <p>• Any future expiry date (e.g., 12/34) and any 3-digit CVC</p>
          </div>
        </div>

        {/* Buttons */}
        <div className="mt-8 flex space-x-4">
          <button
            type="button"
            onClick={onBack}
            disabled={loading}
            className="flex-1 border-2 border-[#4682B4] text-[#4682B4] py-4 px-6 rounded-xl hover:bg-[#4682B4] hover:text-white transition-all duration-300 text-lg font-semibold disabled:opacity-50"
          >
            Back
          </button>
          <button
            type="submit"
            disabled={loading || !stripe || !cardComplete.cardNumber || !cardComplete.cardExpiry || !cardComplete.cardCvc}
            className="flex-1 bg-[#4682B4] text-white py-4 px-6 rounded-xl hover:bg-[#2C3E50] transition-all duration-300 text-lg font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center"
          >
            {loading ? (
              <>
                <LoadingSpinner size="small" />
                <span className="ml-2">Processing...</span>
              </>
            ) : (
              'Review Order'
            )}
          </button>
        </div>
      </form>

      {/* Security Notice */}
      <div className="mt-6 text-center text-xs text-gray-500">
        <p>Your payment information is encrypted and secure.</p>
        <p>We never store your full card details.</p>
      </div>
    </div>
  );
}

