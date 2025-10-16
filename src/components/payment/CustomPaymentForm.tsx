import React, { useMemo, useState } from 'react';
import { CreditCard, Lock } from 'lucide-react';
import visaIcon from '/assets/visa-svgrepo-com.svg';
import mastercardIcon from '/assets/mastercard-svgrepo-com.svg';

interface CustomPaymentFormProps {
  amount: number;
  currency?: string;
  onSuccess: (paymentMethodId: string) => void;
  onError: (error: string) => void;
  onBack: () => void;
  customerEmail: string;
  customerName: string;
}

// Minimal Luhn check for demo purposes
function luhnCheck(cardNumber: string): boolean {
  const digits = cardNumber.replace(/\D/g, '');
  let sum = 0;
  let shouldDouble = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits.charAt(i), 10);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
}

function detectBrand(cardNumber: string): 'visa' | 'mastercard' | 'amex' | 'unknown' {
  const n = cardNumber.replace(/\s+/g, '');
  if (/^4[0-9]{6,}$/.test(n)) return 'visa';
  if (/^(5[1-5][0-9]{5,}|2(2[2-9][0-9]{4,}|[3-6][0-9]{5,}|7[01][0-9]{4,}|720[0-9]{3,}))$/.test(n)) return 'mastercard';
  if (/^3[47][0-9]{5,}$/.test(n)) return 'amex';
  return 'unknown';
}

export default function CustomPaymentForm({
  amount,
  currency = 'zar',
  onSuccess,
  onError,
  onBack,
  customerEmail,
  customerName,
}: CustomPaymentFormProps) {
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [loading, setLoading] = useState(false);
  const [fieldError, setFieldError] = useState<string>('');

  const brand = useMemo(() => detectBrand(cardNumber), [cardNumber]);

  const renderBrandIcon = () => {
    if (brand === 'visa') {
      return (
        <img src={visaIcon} alt="Visa" width={48} height={32} />
      );
    }
    if (brand === 'mastercard') {
      return (
        <img src={mastercardIcon} alt="Mastercard" width={48} height={32} />
      );
    }
    if (brand === 'amex') {
      return (
        <svg width="48" height="32" viewBox="0 0 48 32" xmlns="http://www.w3.org/2000/svg" aria-label="American Express" role="img">
          <rect width="48" height="32" rx="6" fill="#2E77BC" />
          <rect x="8" y="12" width="32" height="8" fill="#fff" />
        </svg>
      );
    }
    return null;
  };

  const formatCardNumber = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (brand === 'amex') {
      return digits.replace(/(\d{1,4})(\d{1,6})?(\d{1,5})?/, (_m, a, b, c) => [a, b, c].filter(Boolean).join(' '));
    }
    return digits.replace(/(\d{1,4})(\d{1,4})?(\d{1,4})?(\d{1,4})?/, (_m, a, b, c, d) => [a, b, c, d].filter(Boolean).join(' '));
  };

  const formatExpiry = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 4);
    if (digits.length === 0) return '';
    let month = digits.slice(0, 2);
    if (month.length === 1) {
      if (parseInt(month, 10) > 1) month = `0${month}`; // if user types 3 => 03
    } else if (month.length === 2) {
      const m = parseInt(month, 10);
      if (m === 0) month = '01';
      if (m > 12) month = '12';
    }
    const year = digits.slice(2);
    return year ? `${month}/${year}` : month.length === 2 ? `${month}/` : month;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNumber = cardNumber.replace(/\s+/g, '');
    if (!cleanNumber || !expiry || !cvc) {
      setFieldError('Please complete all card fields.');
      onError('Please complete all card fields.');
      return;
    }
    if (!luhnCheck(cleanNumber)) {
      setFieldError('Invalid card number.');
      onError('Invalid card number.');
      return;
    }
    // Basic expiry validation MM/YY
    const match = expiry.match(/^(0[1-9]|1[0-2])\/(\d{2})$/);
    if (!match) {
      setFieldError('Invalid expiry format (MM/YY).');
      onError('Invalid expiry format (MM/YY).');
      return;
    }
    const now = new Date();
    const month = parseInt(match[1], 10);
    const year = 2000 + parseInt(match[2], 10);
    const lastDay = new Date(year, month, 0);
    if (lastDay < now) {
      setFieldError('Card has expired.');
      onError('Card has expired.');
      return;
    }
    if ((brand === 'amex' && cvc.length !== 4) || (brand !== 'amex' && cvc.length !== 3)) {
      setFieldError('Invalid CVC.');
      onError('Invalid CVC.');
      return;
    }

    setLoading(true);
    try {
      // Simulate a payment method token id (for demo purposes)
      const pseudoId = `pm_${Math.random().toString(36).slice(2, 10)}`;
      onSuccess(pseudoId);
    } catch (err: any) {
      onError(err?.message || 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
      <div className="bg-gradient-to-r from-[#2C3E50] to-[#4682B4] p-6 flex items-center justify-between">
        <div className="flex items-center">
          <div className="bg-white/15 text-white p-3 rounded-xl mr-4">
            <CreditCard className="h-6 w-6" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white">Payment Information</h2>
        </div>
        <div className="hidden sm:flex items-center space-x-3">
          <span className="px-2 py-1 rounded-md text-xs font-semibold bg-white/15 text-white tracking-wide">DEMO</span>
          <div className="flex items-center space-x-2 text-white/80 text-xs">
            <Lock className="h-4 w-4" />
            <span>Secure entry</span>
          </div>
        </div>
      </div>

      <div className="px-8 pt-6">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center space-x-2 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2">
            <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-xs font-semibold">Demo</span>
            <span className="text-sm font-medium text-blue-800">No real charges</span>
          </div>
          {/* Brand gallery: show all until detected, then show only detected brand */}
          <div className="flex items-center space-x-2">
            {(['visa','mastercard','amex'] as const)
              .filter(b => brand === 'unknown' ? true : b === brand)
              .map(b => (
                <div key={b} className="bg-white border border-gray-200 rounded-lg shadow-sm p-1.5">
                  <div className="w-[60px] h-[36px] flex items-center justify-center">
                    {b === 'visa' && (
                      <img src={visaIcon} alt="Visa" width={48} height={32} />
                    )}
                    {b === 'mastercard' && (
                      <img src={mastercardIcon} alt="Mastercard" width={48} height={32} />
                    )}
                    {b === 'amex' && (
                      <svg width="48" height="32" viewBox="0 0 48 32" xmlns="http://www.w3.org/2000/svg" aria-label="American Express" role="img">
                        <rect width="48" height="32" rx="6" fill="#2E77BC" />
                        <rect x="8" y="12" width="32" height="8" fill="#fff" />
                      </svg>
                    )}
                  </div>
                </div>
            ))}
          </div>
        </div>

      <form onSubmit={handleSubmit} className="space-y-6 px-8 pb-8">
        <div>
          <label className="block text-sm font-semibold text-[#2C3E50] mb-3">Card Number *</label>
          <div className="relative">
            <input
              value={cardNumber}
              onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
              inputMode="numeric"
              placeholder={brand === 'amex' ? '3782 822463 10005' : '4242 4242 4242 4242'}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#4682B4] focus:border-transparent outline-none text-lg tracking-widest"
            />
            {/* Inline badge near the field for small screens */}
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center space-x-2 sm:hidden">
              {renderBrandIcon()}
              {brand !== 'unknown' && (
                <span className="text-xs text-gray-600 capitalize">{brand}</span>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-[#2C3E50] mb-3">Expiry (MM/YY) *</label>
            <input
              value={expiry}
              onChange={(e) => setExpiry(formatExpiry(e.target.value))}
              placeholder="MM/YY"
              inputMode="numeric"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#4682B4] focus:border-transparent outline-none text-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#2C3E50] mb-3">CVC *</label>
            <input
              value={cvc}
              onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').slice(0, brand === 'amex' ? 4 : 3))}
              inputMode="numeric"
              placeholder={brand === 'amex' ? '1234' : '123'}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#4682B4] focus:border-transparent outline-none text-lg"
            />
          </div>
        </div>

        {fieldError && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
            {fieldError}
          </div>
        )}

        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-[#2C3E50] font-medium">Total Payment</span>
            <span className="text-2xl font-bold text-[#2C3E50]">R{amount.toFixed(2)}</span>
          </div>
        </div>

        {/* Demo helper removed by request */}

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
            disabled={loading}
            className="flex-1 bg-[#4682B4] text-white py-4 px-6 rounded-xl hover:bg-[#2C3E50] transition-all duration-300 text-lg font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center"
          >
            {loading ? 'Processing...' : 'Review Order'}
          </button>
        </div>
      </form>

      <div className="px-8 pb-6 text-center text-xs text-gray-500">
        <p>Your card details are validated locally for demo purposes.</p>
        <p>No payment is processed without a gateway.</p>
      </div>
      {/* Close inner content wrapper opened above (px-8 pt-6) */}
      </div>
    </div>
  );
}


