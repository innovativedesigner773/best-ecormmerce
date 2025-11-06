import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight, Tag, Gift, AlertCircle, Package, AlertTriangle, Share2 } from 'lucide-react';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ShareCartModal from '../../components/common/ShareCartModal';
import { ShareableCartService } from '../../utils/shareable-cart';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';

export default function Cart() {
  const {
    items,
    loading,
    subtotal,
    discount_amount,
    promotion_discount,
    total,
    applied_promotions,
    loyalty_points_used,
    loyalty_discount,
    free_shipping,
    updateQuantity,
    removeFromCart,
    clearCart,
    applyPromoCode,
    removePromotion,
    redeemLoyaltyPoints,
    canShareCart,
  } = useCart();

  const { user } = useAuth();
  const navigate = useNavigate();

  const [promoCode, setPromoCode] = useState('');
  const [loyaltyPointsToRedeem, setLoyaltyPointsToRedeem] = useState('');
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);
  const [stockStatuses, setStockStatuses] = useState<Record<string, any>>({});
  const [showShareModal, setShowShareModal] = useState(false);
  const [realStockData, setRealStockData] = useState<Record<string, any>>({});

  // Fetch real stock data from database
  useEffect(() => {
    const fetchStockData = async () => {
      if (items.length === 0) return;

      try {
        console.log('📦 Fetching real stock data for cart items...');
        
        // Get unique product IDs from cart items
        const productIds = [...new Set(items.map(item => item.product_id))];
        
        // Fetch stock data from Supabase
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select('id, stock_quantity, is_active, stock_tracking')
          .in('id', productIds);

        if (productsError) {
          console.error('❌ Error fetching stock data:', productsError);
          return;
        }

        console.log('✅ Stock data fetched:', productsData);

        // Create stock data mapping
        const stockDataMap: Record<string, any> = {};
        productsData?.forEach(product => {
          const stockCount = product.stock_quantity || 0;
          const isInStock = product.is_active && (product.stock_tracking ? stockCount > 0 : true);
          
          stockDataMap[product.id] = {
            stock_count: stockCount,
            in_stock: isInStock,
            stock_tracking: product.stock_tracking
          };
        });

        setRealStockData(stockDataMap);
      } catch (error) {
        console.error('Error fetching stock data:', error);
      }
    };

    fetchStockData();
  }, [items]);

  // Update stock statuses based on real data
  useEffect(() => {
    const updateStockStatuses = () => {
      const newStockStatuses: Record<string, any> = {};
      
      items.forEach(item => {
        const productId = item.product_id;
        const currentStock = realStockData[productId] || { stock_count: 0, in_stock: false, stock_tracking: true };
        
        // Get stock status
        let stockStatus;
        if (!currentStock.in_stock) {
          stockStatus = { 
            status: 'out-of-stock', 
            message: 'Out of Stock', 
            color: 'text-red-600 bg-red-50 border-red-200',
            urgent: false,
            available: false
          };
        } else if (currentStock.stock_count <= 3 && currentStock.stock_tracking) {
          stockStatus = { 
            status: 'urgent', 
            message: `Only ${currentStock.stock_count} left!`, 
            color: 'text-orange-600 bg-orange-50 border-orange-200 animate-pulse',
            urgent: true,
            available: true
          };
        } else if (currentStock.stock_count <= 10 && currentStock.stock_tracking) {
          stockStatus = { 
            status: 'low', 
            message: `${currentStock.stock_count} in stock`, 
            color: 'text-yellow-600 bg-yellow-50 border-yellow-200',
            urgent: false,
            available: true
          };
        } else {
          const message = currentStock.stock_tracking 
            ? `${currentStock.stock_count} in stock`
            : 'In Stock';
          stockStatus = { 
            status: 'good', 
            message: message, 
            color: 'text-green-600 bg-green-50 border-green-200',
            urgent: false,
            available: true
          };
        }

        newStockStatuses[item.id] = stockStatus;
      });

      setStockStatuses(newStockStatuses);
    };

    updateStockStatuses();
  }, [items, realStockData]);

  const handleQuantityChange = async (itemId: string, newQuantity: number) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    const productStock = realStockData[item.product_id];
    if (!productStock) {
      toast.error('Unable to verify stock availability');
      return;
    }

    // Check stock limits
    if (productStock.stock_tracking && newQuantity > productStock.stock_count) {
      toast.error(`Only ${productStock.stock_count} units available in stock`);
      return;
    }

    // Check maximum quantity per order (10)
    if (newQuantity > 10) {
      toast.error('Maximum 10 units per order');
      return;
    }

    await updateQuantity(itemId, newQuantity);
  };

  const handleRemoveItem = async (itemId: string) => {
    await removeFromCart(itemId);
  };

  const handleApplyPromoCode = async () => {
    if (!promoCode.trim()) {
      toast.error('Please enter a promo code');
      return;
    }

    setIsApplyingPromo(true);
    try {
      await applyPromoCode(promoCode);
      setPromoCode('');
    } catch (error) {
      console.error('Error applying promo code:', error);
    } finally {
      setIsApplyingPromo(false);
    }
  };

  const handleRedeemPoints = async () => {
    const points = parseInt(loyaltyPointsToRedeem);
    if (!points || points <= 0) {
      toast.error('Please enter a valid number of points');
      return;
    }

    const userPoints = user?.user_metadata?.loyalty_points || 0;
    if (points > userPoints) {
      toast.error('You don\'t have enough loyalty points');
      return;
    }

    try {
      await redeemLoyaltyPoints(points);
      setLoyaltyPointsToRedeem('');
    } catch (error) {
      console.error('Error redeeming points:', error);
    }
  };

  const handleProceedToCheckout = () => {
    if (items.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    // Check if any items are out of stock
    const outOfStockItems = items.filter(item => {
      const productStock = realStockData[item.product_id];
      return !productStock?.in_stock;
    });

    if (outOfStockItems.length > 0) {
      toast.error('Please remove out of stock items before proceeding to checkout');
      return;
    }

    navigate('/checkout');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="bg-primary text-primary-foreground p-4 rounded-2xl shadow-lg inline-block mb-4">
            <Package className="h-8 w-8" />
          </div>
          <LoadingSpinner size="large" />
          <p className="mt-4 text-[#09215F] font-medium">Loading your cart...</p>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <div className="bg-primary text-primary-foreground p-6 rounded-2xl shadow-lg inline-block mb-6">
              <ShoppingBag className="h-16 w-16" />
            </div>
            <h2 className="text-4xl font-bold text-[#09215F] mb-4">Your cart is empty</h2>
            <p className="text-[#09215F]/80 text-lg mb-8">
              Looks like you haven't added any professional cleaning supplies to your cart yet.
            </p>
            <Link
              to="/products"
              className="inline-flex items-center bg-primary text-primary-foreground px-8 py-4 rounded-xl hover:bg-secondary transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 text-lg font-medium"
            >
              <ShoppingBag className="h-6 w-6 mr-3" />
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-8 text-center">
          <div className="bg-primary text-primary-foreground p-4 rounded-2xl shadow-lg inline-block mb-4">
            <ShoppingBag className="h-8 w-8" />
          </div>
          <h1 className="text-4xl font-bold text-[#09215F] mb-2">Shopping Cart</h1>
          <p className="text-[#09215F]/80 text-lg">
            {items.length} professional cleaning {items.length !== 1 ? 'products' : 'product'} in your cart
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-100">
              <div className="p-8">
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-2xl font-bold text-[#09215F]">Cart Items</h2>
                  <button
                    onClick={() => clearCart()}
                    className="text-sm text-red-600 hover:text-red-800 flex items-center bg-red-50 px-4 py-2 rounded-xl hover:bg-red-100 transition-all duration-300"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear Cart
                  </button>
                </div>

                <div className="space-y-6">
                  {items.map((item, index) => {
                    const stockStatus = stockStatuses[item.id] || { status: 'unknown', message: 'Checking...', color: 'text-gray-500 bg-gray-50' };
                    const productStock = realStockData[item.product_id] || { stock_count: 0, in_stock: false, stock_tracking: true };
                    const maxAvailable = productStock.stock_tracking ? productStock.stock_count : 10;
                    
                    return (
                      <div key={item.id} className={`flex items-center space-x-6 py-6 ${
                        index !== items.length - 1 ? 'border-b border-gray-100' : ''
                      }`}>
                        <div className="flex-shrink-0">
                          <div className="relative">
                            <ImageWithFallback
                              src={item.image_url || 'https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?w=100&h=100&fit=crop'}
                              alt={item.name}
                              className="w-20 h-20 object-cover rounded-xl shadow-md"
                            />
                            {item.promotion_id && (
                              <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                                <Tag className="h-3 w-3" />
                              </div>
                            )}
                            {stockStatus.urgent && (
                              <div className="absolute -bottom-2 -right-2 bg-orange-500 text-white text-xs px-2 py-1 rounded-full animate-pulse">
                                <AlertTriangle className="h-3 w-3" />
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold text-[#09215F] mb-1">
                            {item.name}
                          </h3>
                          <p className="text-[#09215F]/60 text-sm mb-2">SKU: {item.sku}</p>
                          
                          {/* Stock Status */}
                          <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${stockStatus.color} mb-2`}>
                            {stockStatus.status === 'out-of-stock' && <AlertCircle className="h-3 w-3 mr-1" />}
                            {stockStatus.urgent && <AlertTriangle className="h-3 w-3 mr-1" />}
                            {stockStatus.status === 'good' && <Package className="h-3 w-3 mr-1" />}
                            {stockStatus.message}
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {item.promotion_id && (
                              <div className="flex items-center bg-green-50 px-3 py-1 rounded-full border border-green-200">
                                <Tag className="h-3 w-3 text-green-600 mr-1" />
                                <span className="text-xs text-green-700 font-medium">
                                  Promotion Applied
                                </span>
                              </div>
                            )}

                            {stockStatus.urgent && (
                              <div className="flex items-center bg-orange-50 px-3 py-1 rounded-full border border-orange-200 animate-pulse">
                                <AlertTriangle className="h-3 w-3 text-orange-600 mr-1" />
                                <span className="text-xs text-orange-700 font-medium">
                                  Limited Stock!
                                </span>
                              </div>
                            )}

                            {!stockStatus.available && (
                              <div className="flex items-center bg-red-50 px-3 py-1 rounded-full border border-red-200">
                                <AlertCircle className="h-3 w-3 text-red-600 mr-1" />
                                <span className="text-xs text-red-700 font-medium">
                                  Out of Stock
                                </span>
                              </div>
                            )}

                            {item.quantity > maxAvailable && productStock.in_stock && productStock.stock_tracking && (
                              <div className="flex items-center bg-yellow-50 px-3 py-1 rounded-full border border-yellow-200">
                                <AlertTriangle className="h-3 w-3 text-yellow-600 mr-1" />
                                <span className="text-xs text-yellow-700 font-medium">
                                  Quantity exceeds stock
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center space-x-4">
                          {/* Quantity Controls */}
                          <div className="flex items-center bg-gray-50 rounded-xl border border-gray-200">
                            <button
                              onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                              className="p-2 hover:bg-gray-100 disabled:opacity-50 rounded-l-xl transition-colors"
                              disabled={item.quantity <= 1}
                            >
                              <Minus className="h-4 w-4 text-[#09215F]" />
                            </button>
                            <span className="px-4 py-2 text-lg font-semibold text-[#09215F] min-w-[3rem] text-center">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                              className="p-2 hover:bg-gray-100 rounded-r-xl transition-colors disabled:opacity-50"
                              disabled={!productStock.in_stock || item.quantity >= Math.min(maxAvailable, 10)}
                            >
                              <Plus className="h-4 w-4 text-[#09215F]" />
                            </button>
                          </div>

                          {/* Price */}
                          <div className="text-right min-w-0">
                            <div className="flex flex-col items-end space-y-1">
                              <span className="text-xl font-bold text-[#09215F]">
                                R{(item.price * item.quantity).toFixed(2)}
                              </span>
                              {item.original_price > item.price && (
                                <span className="text-sm text-gray-500 line-through">
                                  R{(item.original_price * item.quantity).toFixed(2)}
                                </span>
                              )}
                            </div>
                            {item.promotion_discount && item.promotion_discount > 0 && (
                              <p className="text-sm text-green-600 font-medium mt-1">
                                Save R{(item.promotion_discount * item.quantity).toFixed(2)}
                              </p>
                            )}
                          </div>

                          {/* Remove Button */}
                          <button
                            onClick={() => handleRemoveItem(item.id)}
                            className="text-red-600 hover:text-red-800 p-2 hover:bg-red-50 rounded-xl transition-all duration-300"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Promo Code Section */}
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 mt-6 p-8">
              <h3 className="text-2xl font-bold text-[#09215F] mb-6">Promotions & Discounts</h3>
              
              {/* Apply Promo Code */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-[#09215F] mb-3">
                  Promo Code
                </label>
                <div className="flex space-x-3">
                  <input
                    type="text"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    placeholder="Enter promo code"
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#97CF50] focus:border-transparent transition-all duration-300"
                  />
                  <button
                    onClick={handleApplyPromoCode}
                    disabled={isApplyingPromo}
                    className="bg-primary text-primary-foreground px-6 py-3 rounded-xl hover:bg-secondary transition-all duration-300 disabled:opacity-50 flex items-center shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                  >
                    {isApplyingPromo ? (
                      <LoadingSpinner size="small" />
                    ) : (
                      'Apply'
                    )}
                  </button>
                </div>
              </div>

              {/* Applied Promotions */}
              {applied_promotions.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-[#09215F] mb-3">Applied Promotions</h4>
                  <div className="space-y-3">
                    {applied_promotions.map((promotion) => (
                      <div key={promotion.id} className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl p-4">
                        <div className="flex items-center">
                          <div className="bg-green-100 p-2 rounded-full mr-3">
                            <Tag className="h-4 w-4 text-green-600" />
                          </div>
                          <span className="text-sm font-semibold text-green-800">
                            {promotion.name}
                          </span>
                        </div>
                        <button
                          onClick={() => removePromotion(promotion.id)}
                          className="text-red-600 hover:text-red-800 p-2 hover:bg-red-50 rounded-xl transition-all duration-300"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Loyalty Points */}
              {user && (
                <div>
                  <label className="block text-lg font-semibold text-[#09215F] mb-3">
                    Loyalty Points (Available: {user.user_metadata?.loyalty_points || 0})
                  </label>
                  <div className="flex space-x-3">
                    <input
                      type="number"
                      value={loyaltyPointsToRedeem}
                      onChange={(e) => setLoyaltyPointsToRedeem(e.target.value)}
                      placeholder="Points to redeem"
                      max={user.user_metadata?.loyalty_points || 0}
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#97CF50] focus:border-transparent transition-all duration-300"
                    />
                    <button
                      onClick={handleRedeemPoints}
                      className="bg-purple-600 text-white px-6 py-3 rounded-xl hover:bg-purple-700 transition-all duration-300 flex items-center shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                    >
                      <Gift className="h-4 w-4 mr-2" />
                      Redeem
                    </button>
                  </div>
                  <p className="text-sm text-[#09215F]/60 mt-2">
                    1 point = R0.01 • Minimum 100 points
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-8 sticky top-4">
              <h2 className="text-2xl font-bold text-[#09215F] mb-6">Order Summary</h2>
              
              <div className="space-y-4">
                <div className="flex justify-between text-lg">
                  <span className="text-[#09215F]/80">Subtotal ({items.length} items)</span>
                  <span className="font-semibold text-[#09215F]">R{subtotal.toFixed(2)}</span>
                </div>

                {promotion_discount > 0 && (
                  <div className="flex justify-between text-lg">
                    <span className="text-green-600">Promotion Discount</span>
                    <span className="text-green-600 font-semibold">-R{promotion_discount.toFixed(2)}</span>
                  </div>
                )}

                {loyalty_discount > 0 && (
                  <div className="flex justify-between text-lg">
                    <span className="text-purple-600">Loyalty Points ({loyalty_points_used} points)</span>
                    <span className="text-purple-600 font-semibold">-R{loyalty_discount.toFixed(2)}</span>
                  </div>
                )}

                {discount_amount > 0 && (
                  <div className="flex justify-between text-lg text-green-600 font-semibold bg-green-50 px-4 py-3 rounded-xl">
                    <span>Total Savings</span>
                    <span>-R{discount_amount.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between text-lg">
                  <span className="text-[#09215F]/80">Shipping</span>
                  <span className="font-semibold text-[#09215F]">
                    {free_shipping || total >= 500 ? (
                      <span className="text-green-600">FREE</span>
                    ) : (
                      'R50.00'
                    )}
                  </span>
                </div>

                {free_shipping && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                    <p className="text-green-800 font-medium flex items-center">
                      <Tag className="h-4 w-4 mr-2" />
                      Free shipping applied via promotion!
                    </p>
                  </div>
                )}

                <div className="border-t border-gray-200 pt-4">
                  <div className="flex justify-between text-2xl font-bold text-[#09215F]">
                    <span>Total</span>
                    <span>R{(total + (free_shipping || total >= 500 ? 0 : 50)).toFixed(2)}</span>
                  </div>
                </div>

                {!free_shipping && total < 500 && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                    <p className="text-green-800 font-medium">
                      Add R{(500 - total).toFixed(2)} more for free shipping!
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-8 space-y-4">
                <button
                  onClick={handleProceedToCheckout}
                  className="w-full bg-primary text-primary-foreground py-4 px-6 rounded-xl hover:bg-secondary transition-all duration-300 flex items-center justify-center text-lg font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                >
                  Proceed to Checkout
                  <ArrowRight className="ml-3 h-6 w-6" />
                </button>

                {canShareCart() && (
                  <button
                    onClick={() => setShowShareModal(true)}
                    className="w-full bg-green-600 text-white py-4 px-6 rounded-xl hover:bg-green-700 transition-all duration-300 flex items-center justify-center text-lg font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                  >
                    <Share2 className="mr-3 h-6 w-6" />
                    Share Cart
                  </button>
                )}

                <Link
                  to="/products"
                  className="w-full border-2 border-primary text-primary py-4 px-6 rounded-xl hover:bg-primary hover:text-primary-foreground transition-all duration-300 flex items-center justify-center text-lg font-semibold"
                >
                  Continue Shopping
                </Link>
              </div>

              {/* Security Badge */}
              <div className="mt-8 text-center">
                <div className="flex items-center justify-center text-[#09215F]/60 bg-gray-50 py-3 px-4 rounded-xl">
                  <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medium">Secure Checkout</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Share Cart Modal */}
      <ShareCartModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
      />
    </div>
  );
}