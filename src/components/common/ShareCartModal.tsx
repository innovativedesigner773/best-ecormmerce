import React, { useState } from 'react';
import { X, Share2, Copy, Check, Clock, MessageSquare, Calendar, ExternalLink, ShoppingBag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../contexts/CartContext';
import { ShareableCartService } from '../../utils/shareable-cart';
import { toast } from 'sonner';
import LoadingSpinner from './LoadingSpinner';

interface ShareCartModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ShareCartModal({ isOpen, onClose }: ShareCartModalProps) {
  const { items, subtotal, discount_amount, promotion_discount, total, applied_promotions, loyalty_points_used, loyalty_discount } = useCart();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [shareableUrl, setShareableUrl] = useState<string>('');
  const [shareToken, setShareToken] = useState<string>('');
  const [message, setMessage] = useState('');
  const [expiresInDays, setExpiresInDays] = useState(7);
  const [copied, setCopied] = useState(false);

  const handleCreateShareableCart = async () => {
    if (items.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    setLoading(true);
    try {
      const result = await ShareableCartService.createShareableCart({
        cart_data: {
          items,
          subtotal,
          discount_amount,
          promotion_discount,
          total,
          applied_promotions,
          loyalty_points_used,
          loyalty_discount,
        },
        cart_metadata: {
          message: message.trim() || undefined,
          expires_in_days: expiresInDays,
        },
      });

      if (result.success && result.data) {
        // Generate URL that goes directly to checkout with shared cart state
        const url = ShareableCartService.generateShareableUrl(result.data.share_token);
        setShareableUrl(url);
        setShareToken(result.data.share_token);
        toast.success('Shareable cart created successfully!');
      } else {
        toast.error(result.error || 'Failed to create shareable cart');
      }
    } catch (error) {
      console.error('Error creating shareable cart:', error);
      toast.error('Failed to create shareable cart');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyUrl = async () => {
    if (shareableUrl) {
      const success = await ShareableCartService.copyToClipboard(shareableUrl);
      if (success) {
        setCopied(true);
        toast.success('Link copied to clipboard!');
        setTimeout(() => setCopied(false), 2000);
      } else {
        toast.error('Failed to copy link');
      }
    }
  };

  const handleShare = async () => {
    if (shareableUrl) {
      const success = await ShareableCartService.shareCart(
        shareableUrl,
        'Check out my cart',
        message || 'I\'ve shared my cart with you. You can view and pay for these items.'
      );
      if (success) {
        toast.success('Cart shared successfully!');
      } else {
        // Fallback to copy if share fails
        handleCopyUrl();
      }
    }
  };

  const handleClose = () => {
    setShareableUrl('');
    setShareToken('');
    setMessage('');
    setExpiresInDays(7);
    setCopied(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto border border-gray-100">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center">
            <div className="bg-[#4682B4] text-white p-2 rounded-xl mr-3">
              <Share2 className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-semibold text-[#2C3E50]">Share Your Cart</h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-[#2C3E50] transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {!shareableUrl ? (
            <>
              {/* Cart Summary */}
              <div className="bg-[#F8F9FA] rounded-xl p-6 border border-gray-100">
                <h3 className="font-semibold text-[#2C3E50] mb-4 flex items-center">
                  <ShoppingBag className="w-4 h-4 mr-2 text-[#4682B4]" />
                  Cart Summary
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#2C3E50]/80">Items:</span>
                    <span className="font-medium text-[#2C3E50]">{items.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#2C3E50]/80">Subtotal:</span>
                    <span className="font-medium text-[#2C3E50]">R{subtotal.toFixed(2)}</span>
                  </div>
                  {discount_amount > 0 && (
                    <div className="flex justify-between text-[#28A745]">
                      <span>Discount:</span>
                      <span className="font-medium">-R{discount_amount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold border-t border-gray-200 pt-3">
                    <span className="text-[#2C3E50]">Total:</span>
                    <span className="text-[#4682B4] text-lg">R{total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Message Input */}
              <div>
                <label className="block text-sm font-semibold text-[#2C3E50] mb-3 flex items-center">
                  <MessageSquare className="w-4 h-4 mr-2 text-[#4682B4]" />
                  Personal Message (Optional)
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Add a personal message for the recipient..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4682B4] focus:border-transparent resize-none transition-colors"
                  rows={3}
                  maxLength={500}
                />
                <div className="text-xs text-[#2C3E50]/60 mt-2">
                  {message.length}/500 characters
                </div>
              </div>

              {/* Expiration Settings */}
              <div>
                <label className="block text-sm font-semibold text-[#2C3E50] mb-3 flex items-center">
                  <Clock className="w-4 h-4 mr-2 text-[#4682B4]" />
                  Link Expires In
                </label>
                <select
                  value={expiresInDays}
                  onChange={(e) => setExpiresInDays(Number(e.target.value))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4682B4] focus:border-transparent transition-colors"
                >
                  <option value={1}>1 day</option>
                  <option value={3}>3 days</option>
                  <option value={7}>7 days</option>
                  <option value={14}>14 days</option>
                  <option value={30}>30 days</option>
                </select>
              </div>

              {/* Create Button */}
              <button
                onClick={handleCreateShareableCart}
                disabled={loading || items.length === 0}
                className="w-full bg-[#4682B4] text-white py-4 px-6 rounded-xl hover:bg-[#2C3E50] focus:outline-none focus:ring-2 focus:ring-[#4682B4] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center font-semibold shadow-lg"
              >
                {loading ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Creating Shareable Link...
                  </>
                ) : (
                  <>
                    <Share2 className="w-5 h-5 mr-2" />
                    Create Shareable Link
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              {/* Success State */}
              <div className="text-center">
                <div className="w-20 h-20 bg-[#28A745] rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <Check className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-xl font-bold text-[#2C3E50] mb-3">
                  Shareable Link Created!
                </h3>
                <p className="text-[#2C3E50]/80 text-sm mb-6">
                  Your cart has been shared successfully. The link will expire in {expiresInDays} day{expiresInDays !== 1 ? 's' : ''}.
                </p>
              </div>

              {/* Shareable URL */}
              <div>
                <label className="block text-sm font-semibold text-[#2C3E50] mb-3">
                  Shareable Link
                </label>
                <div className="flex">
                  <input
                    type="text"
                    value={shareableUrl}
                    readOnly
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-l-xl bg-[#F8F9FA] text-sm font-mono"
                  />
                  <button
                    onClick={handleCopyUrl}
                    className="px-4 py-3 border border-l-0 border-gray-300 rounded-r-xl bg-white hover:bg-[#F8F9FA] focus:outline-none focus:ring-2 focus:ring-[#4682B4] transition-colors"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-[#28A745]" />
                    ) : (
                      <Copy className="w-4 h-4 text-[#2C3E50]" />
                    )}
                  </button>
                </div>
              </div>

              {/* Share Options */}
              <div className="space-y-3">
                <button
                  onClick={handleShare}
                  className="w-full bg-[#4682B4] text-white py-4 px-6 rounded-xl hover:bg-[#2C3E50] focus:outline-none focus:ring-2 focus:ring-[#4682B4] focus:ring-offset-2 transition-all duration-300 flex items-center justify-center font-semibold shadow-lg"
                >
                  <Share2 className="w-5 h-5 mr-2" />
                  Share Now
                </button>

                <button
                  onClick={() => {
                    navigate('/checkout', { 
                      state: { 
                        isSharedCart: true, 
                        sharedCartToken: shareToken 
                      } 
                    });
                    onClose();
                  }}
                  className="w-full bg-[#F8F9FA] text-[#2C3E50] py-4 px-6 rounded-xl hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[#4682B4] focus:ring-offset-2 transition-all duration-300 flex items-center justify-center font-semibold border border-gray-200"
                >
                  <ShoppingBag className="w-5 h-5 mr-2" />
                  Preview Checkout
                </button>
              </div>

              {/* Link Details */}
              <div className="bg-[#F8F9FA] rounded-xl p-6 text-sm border border-gray-100">
                <div className="flex items-center text-[#2C3E50]/80 mb-3">
                  <Calendar className="w-4 h-4 mr-2 text-[#4682B4]" />
                  <span className="font-medium">Expires: {new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toLocaleDateString()}</span>
                </div>
                <div className="text-[#2C3E50]/80">
                  <span className="font-medium">Token: </span>
                  <code className="bg-white px-2 py-1 rounded-lg text-xs font-mono border border-gray-200">{shareToken}</code>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 bg-[#F8F9FA] rounded-b-2xl">
          <p className="text-xs text-[#2C3E50]/60 text-center">
            The recipient will be able to view your cart and pay for the items directly.
          </p>
        </div>
      </div>
    </div>
  );
}
