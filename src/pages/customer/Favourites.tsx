import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, ShoppingCart, Trash2, ShoppingBag, ArrowRight, Package, AlertTriangle, AlertCircle, Sparkles } from 'lucide-react';
import { useFavourites } from '../../contexts/FavouritesContext';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function Favourites() {
  const { items, loading, removeFromFavourites, clearFavourites } = useFavourites();
  const { addToCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [addingToCart, setAddingToCart] = useState<string | null>(null);

  // Get stock status helper function
  const getStockStatus = (stockCount: number) => {
    if (stockCount === 0) {
      return { 
        status: 'out-of-stock', 
        message: 'Out of Stock', 
        color: 'text-red-600 bg-red-50 border-red-200',
        icon: AlertCircle,
        urgent: false,
        available: false
      };
    } else if (stockCount <= 3) {
      return { 
        status: 'urgent', 
        message: `Only ${stockCount} left!`, 
        color: 'text-orange-600 bg-orange-50 border-orange-200 animate-pulse',
        icon: AlertTriangle,
        urgent: true,
        available: true
      };
    } else if (stockCount <= 10) {
      return { 
        status: 'low', 
        message: `${stockCount} in stock`, 
        color: 'text-yellow-600 bg-yellow-50 border-yellow-200',
        icon: Package,
        urgent: false,
        available: true
      };
    } else {
      return { 
        status: 'good', 
        message: `${stockCount} in stock`, 
        color: 'text-green-600 bg-green-50 border-green-200',
        icon: Package,
        urgent: false,
        available: true
      };
    }
  };

  const handleAddToCart = async (item: any) => {
    try {
      setAddingToCart(item.id);
      await addToCart(item, 1);
      toast.success(`Added ${item.name} to cart!`);
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast.error('Failed to add item to cart. Please try again.');
    } finally {
      setAddingToCart(null);
    }
  };

  const handleRemoveFromFavourites = async (productId: string) => {
    await removeFromFavourites(productId);
  };

  const handleClearFavourites = async () => {
    if (window.confirm('Are you sure you want to remove all items from your favourites?')) {
      await clearFavourites();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="bg-primary text-primary-foreground p-4 rounded-2xl shadow-lg inline-block mb-4">
            <Heart className="h-8 w-8" />
          </div>
          <LoadingSpinner size="large" />
          <p className="mt-4 text-[#09215F] font-medium">Loading your favourites...</p>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <div className="bg-gradient-to-br from-[#97CF50] to-[#09215F] text-white p-6 rounded-2xl shadow-lg inline-block mb-6">
              <Heart className="h-16 w-16" />
            </div>
            <h2 className="text-4xl font-bold text-[#09215F] mb-4">No favourites yet</h2>
            <p className="text-[#09215F]/80 text-lg mb-8">
              Start building your wishlist by adding your favourite cleaning supplies!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/products"
                className="inline-flex items-center bg-primary text-primary-foreground px-8 py-4 rounded-xl hover:bg-secondary transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 text-lg font-medium"
              >
                <ShoppingBag className="h-6 w-6 mr-3" />
                Browse Products
              </Link>
              <Link
                to="/"
                className="inline-flex items-center border-2 border-primary text-primary px-8 py-4 rounded-xl hover:bg-primary hover:text-primary-foreground transition-all duration-300 text-lg font-medium"
              >
                <Sparkles className="h-6 w-6 mr-3" />
                Explore Featured
              </Link>
            </div>
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
          <div className="bg-gradient-to-br from-[#97CF50] to-[#09215F] text-white p-4 rounded-2xl shadow-lg inline-block mb-4">
            <Heart className="h-8 w-8" />
          </div>
          <h1 className="text-4xl font-bold text-[#09215F] mb-2">My Favourites</h1>
          <p className="text-[#09215F]/80 text-lg">
            {items.length} professional cleaning {items.length !== 1 ? 'products' : 'product'} saved
          </p>
          {!user && (
            <div className="mt-4 bg-green-50 border border-green-200 rounded-xl p-4 inline-block">
              <p className="text-green-800 text-sm">
                💡 <Link to="/login" className="underline hover:no-underline">Sign in</Link> to sync your favourites across devices
              </p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Favourites Items */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-100">
              <div className="p-8">
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-2xl font-bold text-[#09215F]">Saved Products</h2>
                  <button
                    onClick={handleClearFavourites}
                    className="text-sm text-red-600 hover:text-red-800 flex items-center bg-red-50 px-4 py-2 rounded-xl hover:bg-red-100 transition-all duration-300"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear All
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {items.map((item, index) => {
                    const stockInfo = getStockStatus(item.stock_count);
                    
                    return (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                        className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2"
                      >
                        <div className="relative mb-4 bg-gray-50 rounded-xl overflow-hidden flex items-center justify-center">
                          <Link to={`/products/${item.product_id}`} className="w-full h-48 flex items-center justify-center">
                            <ImageWithFallback
                              src={item.image_url || 'https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?w=300&h=300&fit=crop'}
                              alt={item.name}
                              className="w-full h-full object-contain rounded-xl"
                            />
                          </Link>
                          
                          {/* Remove from favourites button */}
                          <button
                            onClick={() => handleRemoveFromFavourites(item.product_id)}
                            className="absolute top-3 right-3 p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-white hover:scale-110 transition-all duration-200 text-red-600"
                            title="Remove from favourites"
                          >
                            <Heart className="h-5 w-5 fill-current" />
                          </button>

                          {/* Promotion badge */}
                          {item.promotion_badge && (
                            <div className="absolute top-3 left-3 bg-gradient-to-r from-red-500 to-red-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                              {item.promotion_badge}
                            </div>
                          )}

                          {/* Urgency badge */}
                          {stockInfo.urgent && (
                            <div className="absolute bottom-3 right-3 bg-gradient-to-r from-orange-500 to-red-500 text-white px-2 py-1 rounded-full text-xs font-bold shadow-lg animate-pulse">
                              <AlertTriangle className="h-3 w-3 inline mr-1" />
                              URGENT
                            </div>
                          )}
                        </div>

                        <div className="space-y-3">
                          {/* Brand */}
                          {item.brand && (
                            <p className="text-sm text-gray-500 uppercase tracking-wide">{item.brand}</p>
                          )}

                          {/* Product name */}
                          <Link to={`/products/${item.product_id}`}>
                            <h3 className="font-semibold text-[#09215F] hover:text-[#97CF50] transition-colors line-clamp-2">
                              {item.name}
                            </h3>
                          </Link>

                          {/* Stock status */}
                          <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${stockInfo.color}`}>
                            <stockInfo.icon className="h-3 w-3 mr-1" />
                            {stockInfo.message}
                          </div>

                          {/* Rating */}
                          {item.rating && (
                            <div className="flex items-center space-x-1">
                              <div className="flex">
                                {[...Array(5)].map((_, i) => (
                                  <svg
                                    key={i}
                                    className={`h-4 w-4 ${i < Math.floor(item.rating!) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                  </svg>
                                ))}
                              </div>
                              <span className="text-sm text-gray-600">
                                {item.rating} ({item.reviews_count} reviews)
                              </span>
                            </div>
                          )}

                          {/* Pricing */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <span className="text-xl font-bold text-[#09215F]">
                                R{item.price.toFixed(2)}
                              </span>
                              {item.original_price && item.original_price > item.price && (
                                <span className="text-sm text-gray-500 line-through">
                                  R{item.original_price.toFixed(2)}
                                </span>
                              )}
                            </div>
                            
                            {item.promotion_discount && item.promotion_discount > 0 && (
                              <span className="text-sm text-green-600 font-medium bg-green-50 px-2 py-1 rounded-full">
                                Save R{item.promotion_discount.toFixed(2)}
                              </span>
                            )}
                          </div>

                          {/* Add to cart button */}
                          <button
                            onClick={() => handleAddToCart(item)}
                            disabled={!stockInfo.available || addingToCart === item.id}
                            className={`w-full inline-flex items-center justify-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 ${
                              !stockInfo.available || addingToCart === item.id
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : stockInfo.urgent
                                ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white hover:from-red-600 hover:to-orange-600 animate-pulse'
                                : 'bg-primary text-primary-foreground hover:bg-secondary'
                            }`}
                          >
                            {addingToCart === item.id ? (
                              <LoadingSpinner size="small" />
                            ) : (
                              <>
                                <ShoppingCart className="h-4 w-4 mr-2" />
                                {!stockInfo.available 
                                  ? 'Out of Stock' 
                                  : stockInfo.urgent 
                                  ? 'Buy Now!' 
                                  : 'Add to Cart'
                                }
                              </>
                            )}
                          </button>

                          {/* Added date */}
                          <p className="text-xs text-gray-500 text-center">
                            Added {new Date(item.added_at).toLocaleDateString()}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-8 sticky top-4">
              <h2 className="text-2xl font-bold text-[#09215F] mb-6">Quick Actions</h2>
              
              <div className="space-y-6">
                {/* Stock summary */}
                <div className="bg-gradient-to-r from-[#97CF50]/10 to-[#09215F]/10 rounded-xl p-4">
                  <h3 className="font-semibold text-[#09215F] mb-3">Stock Summary</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-green-600">In Stock:</span>
                      <span className="font-medium">{items.filter(item => item.in_stock).length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-orange-600">Low Stock:</span>
                      <span className="font-medium">{items.filter(item => item.in_stock && item.stock_count <= 3).length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-red-600">Out of Stock:</span>
                      <span className="font-medium">{items.filter(item => !item.in_stock).length}</span>
                    </div>
                  </div>
                </div>

                {/* Category breakdown */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <h3 className="font-semibold text-[#09215F] mb-3">Categories</h3>
                  <div className="space-y-2 text-sm">
                    {Array.from(new Set(items.map(item => item.category))).map(category => (
                      <div key={category} className="flex justify-between">
                        <span className="text-[#09215F]/70">{category}:</span>
                        <span className="font-medium">{items.filter(item => item.category === category).length}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-4">
                  <Link
                    to="/products"
                    className="w-full bg-primary text-primary-foreground py-3 px-4 rounded-xl hover:bg-secondary transition-all duration-300 flex items-center justify-center font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                  >
                    <ShoppingBag className="h-5 w-5 mr-2" />
                    Browse More Products
                  </Link>

                  <Link
                    to="/cart"
                    className="w-full border-2 border-primary text-primary py-3 px-4 rounded-xl hover:bg-primary hover:text-primary-foreground transition-all duration-300 flex items-center justify-center font-medium"
                  >
                    <ShoppingCart className="h-5 w-5 mr-2" />
                    View Cart
                  </Link>
                </div>

                {/* Tips */}
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <h3 className="font-semibold text-green-800 mb-2">💡 Pro Tips</h3>
                  <ul className="text-sm text-green-700 space-y-1">
                    <li>• Stock levels update in real-time</li>
                    <li>• Get notified of low stock items</li>
                    <li>• Add multiple items to cart at once</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}