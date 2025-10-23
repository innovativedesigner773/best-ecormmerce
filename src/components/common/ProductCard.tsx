import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Star, Eye, Heart, Percent, Loader2, AlertTriangle, Package, Edit, Trash2, Bell, BellOff } from 'lucide-react';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { useCart } from '../../contexts/CartContext';
import { useFavourites } from '../../contexts/FavouritesContext';
import { useStockNotifications } from '../../contexts/StockNotificationsContext';
import { useAuth } from '../../contexts/AuthContext';
import { motion } from 'framer-motion';

export interface Product {
  id: string | number;
  name: string;
  brand?: string;
  price: number;
  original_price?: number;
  discount?: number;
  category?: string;
  image_url?: string;
  image?: string;
  rating?: number;
  reviews?: number;
  reviews_count?: number;
  featured?: boolean;
  description?: string;
  in_stock?: boolean;
  stock_count?: number;
  promotion_badge?: string;
  colors?: string[];
  sizes?: string[];
  sku?: string;
}

interface ProductCardProps {
  product: Product;
  featured?: boolean;
  className?: string;
  isAdmin?: boolean;
  onEdit?: (product: Product) => void;
  onDelete?: (product: Product) => void;
  linkTo?: string; // optional custom link
}

export default function ProductCard({ product, featured = false, className = '', isAdmin = false, onEdit, onDelete, linkTo }: ProductCardProps) {
  const { addToCart } = useCart();
  const { addToFavourites, removeFromFavourites, isFavourite } = useFavourites();
  const { addStockNotification, hasNotificationForProduct } = useStockNotifications();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isFavouriteLoading, setIsFavouriteLoading] = useState(false);
  const [isRemindMeLoading, setIsRemindMeLoading] = useState(false);
  const [showRemindMeModal, setShowRemindMeModal] = useState(false);
  const [remindMeEmail, setRemindMeEmail] = useState('');

  const discount = product.original_price 
    ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
    : product.discount;

  const reviewsCount = product.reviews_count || product.reviews || 0;
  const productId = product.id.toString();
  const isProductFavourite = isFavourite(productId);

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      await addToCart(product, 1);
    } catch (error) {
      console.error('Error adding to cart:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleFavourite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isFavouriteLoading) return;
    
    setIsFavouriteLoading(true);
    try {
      if (isProductFavourite) {
        await removeFromFavourites(productId);
      } else {
        await addToFavourites({
          ...product,
          product_id: productId,
          sku: product.sku || `SKU-${productId}`,
          reviews_count: reviewsCount
        });
      }
    } catch (error) {
      console.error('Error toggling favourite:', error);
    } finally {
      setIsFavouriteLoading(false);
    }
  };

  const handleRemindMe = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user) {
      // Show login prompt or redirect to login
      alert('Please log in to set up stock notifications');
      return;
    }

    if (hasNotificationForProduct(productId)) {
      alert('You already have a notification set up for this product!');
      return;
    }

    setShowRemindMeModal(true);
    setRemindMeEmail(user.email || '');
  };

  const handleSubmitRemindMe = async () => {
    if (!remindMeEmail.trim()) {
      alert('Please enter a valid email address');
      return;
    }

    setIsRemindMeLoading(true);
    try {
      const success = await addStockNotification(productId, remindMeEmail.trim());
      if (success) {
        alert('Stock notification set up successfully! We\'ll email you when this product is back in stock.');
        setShowRemindMeModal(false);
        setRemindMeEmail('');
      } else {
        alert('Failed to set up notification. Please try again.');
      }
    } catch (error) {
      console.error('Error setting up stock notification:', error);
      alert('Failed to set up notification. Please try again.');
    } finally {
      setIsRemindMeLoading(false);
    }
  };

  const imageUrl = product.image_url || product.image;
  const inStock = product.in_stock !== false && product.stock_count !== 0;
  const stockCount = product.stock_count || 0;
  
  // Determine stock status and urgency
  const getStockStatus = () => {
    if (stockCount === 0) {
      return { status: 'out-of-stock', message: 'Out of Stock', urgent: false, color: 'text-red-600 bg-red-50' };
    } else if (stockCount <= 3) {
      return { 
        status: 'low-stock', 
        message: `Only ${stockCount} left – buy now!`, 
        urgent: true, 
        color: 'text-orange-600 bg-orange-50' 
      };
    } else if (stockCount <= 10) {
      return { 
        status: 'running-low', 
        message: `${stockCount} in stock – running low`, 
        urgent: false, 
        color: 'text-yellow-600 bg-yellow-50' 
      };
    } else {
      return { 
        status: 'in-stock', 
        message: `${stockCount} in stock`, 
        urgent: false, 
        color: 'text-green-600 bg-green-50' 
      };
    }
  };

  const stockInfo = getStockStatus();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`group relative bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 flex flex-col h-full ${className}`}
    >
  <Link to={linkTo || `/products/${product.id}`} className="flex flex-col h-full">
        {/* Product Image - Fixed height */}
        <div className="relative overflow-hidden bg-gray-50 flex-shrink-0">
          <ImageWithFallback
            src={imageUrl}
            alt={product.name}
            className="w-full h-48 sm:h-56 object-cover group-hover:scale-105 transition-transform duration-500"
          />
          
          {/* Badges and overlays */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300" />
          
          {/* Discount Badge */}
          {discount && discount > 0 && (
            <div className="absolute top-3 left-3 bg-gradient-to-r from-red-500 to-red-600 text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center shadow-lg animate-pulse">
              <Percent className="h-3 w-3 mr-1" />
              {discount}% OFF
            </div>
          )}

          {/* Promotion Badge */}
          {product.promotion_badge && !discount && (
            <div className="absolute top-3 left-3 bg-gradient-to-r from-orange-500 to-red-500 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg">
              {product.promotion_badge}
            </div>
          )}

          {/* Stock Urgency Badge */}
          {stockInfo.urgent && (
            <div className="absolute top-3 right-3 bg-gradient-to-r from-red-500 to-orange-500 text-white px-2 py-1 rounded-full text-xs font-semibold flex items-center shadow-lg animate-pulse">
              <AlertTriangle className="h-3 w-3 mr-1" />
              URGENT
            </div>
          )}

          {/* Rating Badge */}
          {product.rating && !stockInfo.urgent && (
            <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm rounded-full px-3 py-1 shadow-lg">
              <div className="flex items-center space-x-1">
                <Star className="h-3 w-3 text-yellow-400 fill-current" />
                <span className="text-xs font-medium text-gray-800">{product.rating}</span>
                {reviewsCount > 0 && (
                  <span className="text-xs text-gray-500">({reviewsCount})</span>
                )}
              </div>
            </div>
          )}

          {/* Stock Status Overlay for Out of Stock */}
          {!inStock && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <div className="bg-white px-4 py-2 rounded-lg">
                <span className="text-sm font-semibold text-gray-800">Out of Stock</span>
              </div>
            </div>
          )}

          {/* Hover Actions */}
          <div className="absolute top-3 left-3 flex flex-col space-y-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            {/* Favourite Button */}
            <button
              onClick={handleToggleFavourite}
              disabled={isFavouriteLoading}
              className={`p-2 backdrop-blur-sm rounded-full shadow-lg hover:scale-110 transition-all duration-200 ${
                isProductFavourite 
                  ? 'bg-red-500 text-white' 
                  : 'bg-white/90 text-gray-700 hover:bg-white'
              }`}
              title={isProductFavourite ? "Remove from favourites" : "Add to favourites"}
            >
              {isFavouriteLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Heart className={`h-4 w-4 ${isProductFavourite ? 'fill-current' : ''}`} />
              )}
            </button>

            {/* Quick View */}
            {!stockInfo.urgent && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                className="p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-white hover:scale-110 transition-all duration-200"
                title="Quick View"
              >
                <Eye className="h-4 w-4 text-gray-700" />
              </button>
            )}
          </div>
        </div>

        {/* Product Info - Flexible content area */}
        <div className="p-5 flex flex-col flex-grow">
          {/* Brand */}
          {product.brand && (
            <p className="text-xs text-gray-500 mb-1 uppercase tracking-wide flex-shrink-0">{product.brand}</p>
          )}

          {/* Product Name - Fixed height */}
          <h3 className="font-semibold text-gray-800 mb-3 group-hover:text-[#97CF50] transition-colors duration-300 flex-shrink-0 min-h-[3rem] line-clamp-2">
            {product.name}
          </h3>

          {/* Description - Flexible but limited */}
          {product.description && (
            <p className="text-sm text-gray-600 mb-3 line-clamp-2 flex-shrink-0">{product.description}</p>
          )}

          {/* Stock Status with urgency message */}
          <div className={`mb-4 p-2 rounded-lg text-xs font-medium flex items-center ${stockInfo.color} ${stockInfo.urgent ? 'animate-pulse' : ''} flex-shrink-0`}>
            <Package className="h-3 w-3 mr-2" />
            <span>{stockInfo.message}</span>
            {stockInfo.urgent && <AlertTriangle className="h-3 w-3 ml-2" />}
          </div>

          {/* Spacer to push content to bottom */}
          <div className="flex-grow" />

          {/* Pricing - Fixed at bottom */}
          <div className="flex items-center justify-between mb-4 flex-shrink-0">
            <div className="flex items-center space-x-2">
              <span className="text-xl font-bold text-gray-900">
                R{product.price.toFixed(2)}
              </span>
              {product.original_price && product.original_price > product.price && (
                <span className="text-sm text-gray-500 line-through">
                  R{product.original_price.toFixed(2)}
                </span>
              )}
            </div>
            
            {product.original_price && product.original_price > product.price && (
              <span className="text-sm text-green-600 font-medium bg-green-50 px-2 py-1 rounded-full">
                Save R{(product.original_price - product.price).toFixed(2)}
              </span>
            )}
          </div>

          {/* Action Buttons - Changes based on admin mode */}
          <div className="flex justify-center flex-shrink-0">
            {isAdmin ? (
              <div className="flex space-x-2 w-full">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onEdit?.(product);
                  }}
                  className="flex-1 inline-flex items-center justify-center px-4 py-3 rounded-xl text-sm font-medium bg-gradient-to-r from-[#97CF50] to-[#97CF50] text-white hover:from-[#09215F] hover:to-[#97CF50] transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onDelete?.(product);
                  }}
                  className="flex-1 inline-flex items-center justify-center px-4 py-3 rounded-xl text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </button>
              </div>
            ) : !inStock ? (
              // Show "Remind Me" button for out-of-stock products
              <button
                onClick={handleRemindMe}
                disabled={isRemindMeLoading || hasNotificationForProduct(productId)}
                className={`w-full inline-flex items-center justify-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 ${
                  isRemindMeLoading || hasNotificationForProduct(productId)
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600'
                }`}
              >
                {isRemindMeLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : hasNotificationForProduct(productId) ? (
                  <BellOff className="h-4 w-4 mr-2" />
                ) : (
                  <Bell className="h-4 w-4 mr-2" />
                )}
                {isRemindMeLoading 
                  ? 'Setting up...' 
                  : hasNotificationForProduct(productId)
                  ? 'Notification Set'
                  : 'Remind Me When Available'
                }
              </button>
            ) : (
              // Show "Add to Cart" button for in-stock products
              <button
                onClick={handleAddToCart}
                disabled={isLoading}
                className={`w-full inline-flex items-center justify-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 ${
                  isLoading
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : stockInfo.urgent
                    ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white hover:from-red-600 hover:to-orange-600 animate-pulse'
                    : 'bg-primary text-primary-foreground hover:bg-secondary'
                }`}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <ShoppingCart className="h-4 w-4 mr-2" />
                )}
                {isLoading 
                  ? 'Adding...' 
                  : stockInfo.urgent 
                  ? 'Buy Now!' 
                  : 'Add to Cart'
                }
              </button>
            )}
          </div>

          {/* Color/Size Variants Preview */}
          {(product.colors || product.sizes) && (
            <div className="mt-3 pt-3 border-t border-gray-100 flex-shrink-0">
              {product.colors && (
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-xs text-gray-500">Colors:</span>
                  <div className="flex space-x-1">
                    {product.colors.slice(0, 4).map((color, index) => (
                      <div
                        key={index}
                        className="w-4 h-4 rounded-full border border-gray-300"
                        style={{ backgroundColor: color.toLowerCase() }}
                        title={color}
                      />
                    ))}
                    {product.colors.length > 4 && (
                      <span className="text-xs text-gray-500">+{product.colors.length - 4}</span>
                    )}
                  </div>
                </div>
              )}
              
              {product.sizes && (
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-500">Sizes:</span>
                  <div className="flex space-x-1">
                    {product.sizes.slice(0, 3).map((size, index) => (
                      <span key={index} className="text-xs bg-gray-100 px-1 py-0.5 rounded">
                        {size}
                      </span>
                    ))}
                    {product.sizes.length > 3 && (
                      <span className="text-xs text-gray-500">+{product.sizes.length - 3}</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </Link>

      {/* Remind Me Modal */}
      {showRemindMeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Get Notified When Back in Stock
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              We'll email you when "{product.name}" becomes available again.
            </p>
            <div className="mb-4">
              <label htmlFor="remind-email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                id="remind-email"
                value={remindMeEmail}
                onChange={(e) => setRemindMeEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#97CF50] focus:border-transparent"
                placeholder="Enter your email address"
                disabled={isRemindMeLoading}
              />
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowRemindMeModal(false);
                  setRemindMeEmail('');
                }}
                disabled={isRemindMeLoading}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitRemindMe}
                disabled={isRemindMeLoading}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-orange-500 to-red-500 rounded-md hover:from-orange-600 hover:to-red-600 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50"
              >
                {isRemindMeLoading ? 'Setting up...' : 'Set Notification'}
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}