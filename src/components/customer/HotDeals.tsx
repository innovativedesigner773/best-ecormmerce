import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Flame, Clock, Tag, ArrowRight, Star, ShoppingCart } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { useCart } from '../../contexts/CartContext';
import { ImageWithFallback } from '../figma/ImageWithFallback';

interface Promotion {
  id: string;
  title: string;
  description: string;
  code: string;
  discount_type: 'percentage' | 'fixed_amount' | 'buy_x_get_y' | 'free_shipping';
  discount_value: number;
  minimum_order_amount: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  applies_to: 'all' | 'specific_products' | 'specific_categories';
}

interface Product {
  id: string;
  name: string;
  price: number;
  compare_at_price?: number;
  images: string[];
  sku: string;
  description: string;
  stock_quantity: number;
  category?: {
    name: string;
  };
}

interface HotDealsProps {
  maxPromotions?: number;
  showViewAll?: boolean;
}

export function HotDeals({ maxPromotions = 6, showViewAll = true }: HotDealsProps) {
  const [activePromotions, setActivePromotions] = useState<Promotion[]>([]);
  const [promotionalProducts, setPromotionalProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCart();

  useEffect(() => {
    fetchActivePromotions();
  }, []);

  const fetchActivePromotions = async () => {
    try {
      setLoading(true);
      
      // Fetch active promotions
      const { data: promotionsData, error: promotionsError } = await supabase
        .from('promotions')
        .select('*')
        .eq('is_active', true)
        .gte('end_date', new Date().toISOString())
        .lte('start_date', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(maxPromotions);

      if (promotionsError) {
        console.error('❌ Error fetching promotions:', promotionsError);
        return;
      }

      console.log('🔥 Active promotions fetched:', promotionsData);
      setActivePromotions(promotionsData || []);

      // Fetch products with discounts (compare_at_price > price)
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select(`
          id, name, price, compare_at_price, images, sku, description, stock_quantity,
          category:categories(name)
        `)
        .eq('is_active', true)
        .gt('stock_quantity', 0)
        .not('compare_at_price', 'is', null)
        .order('created_at', { ascending: false })
        .limit(8);

      if (productsError) {
        console.error('❌ Error fetching promotional products:', productsError);
        return;
      }

      console.log('🛍️ Promotional products fetched:', productsData);
      
      // Transform the data to match our interface
      const transformedProducts: Product[] = (productsData || []).map((item: any) => ({
        id: item.id,
        name: item.name,
        price: item.price,
        compare_at_price: item.compare_at_price,
        images: item.images,
        sku: item.sku,
        description: item.description,
        stock_quantity: item.stock_quantity,
        category: item.category?.[0] || { name: 'Uncategorized' }
      }));
      
      setPromotionalProducts(transformedProducts);
      
    } catch (error) {
      console.error('Error fetching hot deals:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDiscountText = (promotion: Promotion) => {
    switch (promotion.discount_type) {
      case 'percentage':
        return `${promotion.discount_value}% OFF`;
      case 'fixed_amount':
        return `$${promotion.discount_value} OFF`;
      case 'free_shipping':
        return 'FREE SHIPPING';
      case 'buy_x_get_y':
        return 'BOGO DEAL';
      default:
        return 'SPECIAL OFFER';
    }
  };

  const getTimeRemaining = (endDate: string) => {
    const end = new Date(endDate).getTime();
    const now = new Date().getTime();
    const difference = end - now;

    if (difference > 0) {
      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) return `${days}d ${hours}h left`;
      if (hours > 0) return `${hours}h ${minutes}m left`;
      return `${minutes}m left`;
    }
    return 'Expired';
  };

  const handleAddToCart = async (product: Product) => {
    try {
      const cartProduct = {
        id: product.id,
        name: product.name,
        price: product.price,
        image_url: product.images?.[0] || '',
        sku: product.sku,
        description: product.description,
        category: product.category?.name || '',
        in_stock: product.stock_quantity > 0,
        stock_count: product.stock_quantity
      };
      await addToCart(cartProduct, 1);
    } catch (error) {
      console.error('Error adding to cart:', error);
    }
  };

  if (loading) {
    return (
      <div className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-64 mx-auto mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-96 mx-auto mb-8"></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-gray-200 rounded-xl h-64"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If no active promotions or products, don't render the section
  if (activePromotions.length === 0 && promotionalProducts.length === 0) {
    return null;
  }

  return (
    <section className="bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex items-center justify-center gap-2 mb-4"
          >
            <Flame className="h-8 w-8 text-red-500 animate-pulse" />
            <h2 className="text-4xl font-bold text-gray-900">🔥 Hot Deals</h2>
            <Flame className="h-8 w-8 text-red-500 animate-pulse" />
          </motion.div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Limited-time offers you don't want to miss! Grab these amazing deals before they're gone.
          </p>
        </div>

        {/* Active Promotions */}
        {activePromotions.length > 0 && (
          <div className="mb-12">
            <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Tag className="h-6 w-6 text-orange-500" />
              Active Promotions
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activePromotions.map((promotion, index) => (
                <motion.div
                  key={promotion.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white rounded-2xl shadow-lg border-2 border-orange-200 overflow-hidden hover:shadow-xl transition-shadow"
                >
                  <div className="bg-gradient-to-r from-red-500 to-orange-500 text-white p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-2xl font-bold">
                        {getDiscountText(promotion)}
                      </span>
                      <div className="flex items-center gap-1 text-sm bg-white/20 rounded-full px-2 py-1">
                        <Clock className="h-3 w-3" />
                        {getTimeRemaining(promotion.end_date)}
                      </div>
                    </div>
                    <h4 className="text-lg font-semibold">{promotion.title}</h4>
                  </div>
                  
                  <div className="p-4">
                    <p className="text-gray-600 text-sm mb-4">
                      {promotion.description}
                    </p>
                    
                    {promotion.code && (
                      <div className="bg-gray-100 rounded-lg p-3 mb-4">
                        <p className="text-xs text-gray-500 mb-1">Use promo code:</p>
                        <div className="flex items-center justify-between">
                          <code className="text-lg font-bold text-gray-900">
                            {promotion.code}
                          </code>
                          <button
                            onClick={() => navigator.clipboard.writeText(promotion.code)}
                            className="text-green-600 hover:text-green-800 text-sm font-medium"
                          >
                            Copy
                          </button>
                        </div>
                      </div>
                    )}
                    
                    {promotion.minimum_order_amount > 0 && (
                      <p className="text-xs text-gray-500">
                        *Minimum order: ${promotion.minimum_order_amount}
                      </p>
                    )}
                    
                    <div className="mt-4">
                      <Link
                        to="/products"
                        className="inline-flex items-center gap-2 text-orange-600 hover:text-orange-800 font-medium"
                      >
                        Shop Now
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Promotional Products */}
        {promotionalProducts.length > 0 && (
          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Star className="h-6 w-6 text-yellow-500" />
              Products on Sale
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {promotionalProducts.map((product, index) => {
                const discountPercentage = product.compare_at_price 
                  ? Math.round(((product.compare_at_price - product.price) / product.compare_at_price) * 100)
                  : 0;
                
                return (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow group"
                  >
                    <div className="relative bg-gray-50 flex items-center justify-center overflow-hidden">
                      <ImageWithFallback
                        src={product.images?.[0] || ''}
                        alt={product.name}
                        className="w-full h-48 object-contain group-hover:scale-105 transition-transform duration-300"
                      />
                      {discountPercentage > 0 && (
                        <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded-md text-xs font-bold">
                          -{discountPercentage}%
                        </div>
                      )}
                      <div className="absolute top-2 right-2 bg-orange-500 text-white px-2 py-1 rounded-md text-xs font-bold animate-pulse">
                        HOT
                      </div>
                    </div>
                    
                    <div className="p-4">
                      <h4 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                        <Link to={`/products/${product.id}`} className="hover:text-green-600">
                          {product.name}
                        </Link>
                      </h4>
                      
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xl font-bold text-gray-900">
                          R{product.price.toFixed(2)}
                        </span>
                        {product.compare_at_price && (
                          <span className="text-sm text-gray-500 line-through">
                            R{product.compare_at_price.toFixed(2)}
                          </span>
                        )}
                      </div>
                      
                      <p className="text-xs text-gray-500 mb-3">
                        {product.stock_quantity} in stock
                      </p>
                      
                      <button
                        onClick={() => handleAddToCart(product)}
                        disabled={product.stock_quantity === 0}
                        className="w-full flex items-center justify-center gap-2 bg-orange-600 text-white py-2 px-4 rounded-lg hover:bg-orange-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                      >
                        <ShoppingCart className="h-4 w-4" />
                        {product.stock_quantity > 0 ? 'Add to Cart' : 'Out of Stock'}
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* View All Promotions Button */}
        {showViewAll && activePromotions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mt-12"
          >
            <Link
              to="/products?on_sale=true"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-600 to-red-600 text-white font-semibold py-4 px-8 rounded-xl hover:from-orange-700 hover:to-red-700 transition-all shadow-lg hover:shadow-xl"
            >
              View All Sale Items
              <ArrowRight className="h-5 w-5" />
            </Link>
          </motion.div>
        )}
      </div>
    </section>
  );
}
