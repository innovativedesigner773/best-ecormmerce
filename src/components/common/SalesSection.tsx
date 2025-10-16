import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Percent, Clock, Tag, Star, ShoppingCart, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import ProductCard from './ProductCard';
import { ImageWithFallback } from '../figma/ImageWithFallback';

interface Product {
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

interface SalesSectionProps {
  products: Product[];
  title?: string;
  subtitle?: string;
  showCountdown?: boolean;
  endDate?: string;
  className?: string;
}

export default function SalesSection({
  products,
  title = "🔥 Hot Deals & Sales",
  subtitle = "Limited time offers you can't miss",
  showCountdown = true,
  endDate,
  className = ''
}: SalesSectionProps) {
  const [timeRemaining, setTimeRemaining] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  } | null>(null);

  // Calculate time remaining
  useEffect(() => {
    if (!showCountdown || !endDate) return;

    const calculateTimeRemaining = () => {
      const now = new Date().getTime();
      const end = new Date(endDate).getTime();
      const difference = end - now;

      if (difference <= 0) {
        setTimeRemaining(null);
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeRemaining({ days, hours, minutes, seconds });
    };

    calculateTimeRemaining();
    const interval = setInterval(calculateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [endDate, showCountdown]);

  // Filter products that are on sale
  const saleProducts = products.filter(product => 
    product.original_price && product.original_price > product.price
  );

  // Sort by discount percentage (highest first)
  const sortedSaleProducts = [...saleProducts].sort((a, b) => {
    const discountA = a.original_price ? ((a.original_price - a.price) / a.original_price) * 100 : 0;
    const discountB = b.original_price ? ((b.original_price - b.price) / b.original_price) * 100 : 0;
    return discountB - discountA;
  });

  if (sortedSaleProducts.length === 0) {
    return null;
  }

  return (
    <section className={`py-16 bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center mb-4">
            <div className="bg-gradient-to-r from-red-500 to-orange-500 rounded-full p-3 mr-4">
              <Percent className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-4xl font-bold text-gray-900">{title}</h2>
          </div>
          <p className="text-xl text-gray-600 mb-6">{subtitle}</p>

          {/* Countdown Timer */}
          {showCountdown && timeRemaining && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="inline-flex items-center bg-gradient-to-r from-red-500 to-orange-500 text-white px-6 py-3 rounded-2xl shadow-lg"
            >
              <Clock className="h-5 w-5 mr-2" />
              <span className="font-mono font-bold">
                {timeRemaining.days}d {timeRemaining.hours}h {timeRemaining.minutes}m {timeRemaining.seconds}s
              </span>
              <span className="ml-2 text-sm">left!</span>
            </motion.div>
          )}
        </motion.div>

        {/* Sale Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
          {sortedSaleProducts.slice(0, 8).map((product, index) => {
            const discount = product.original_price 
              ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
              : 0;

            return (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className="relative"
              >
                {/* Special Sale Badge */}
                <div className="absolute -top-2 -right-2 z-10 bg-gradient-to-r from-red-500 to-orange-500 text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg animate-pulse">
                  {discount}% OFF
                </div>

                <ProductCard 
                  product={{
                    ...product,
                    promotion_badge: `${discount}% OFF`
                  }} 
                />
              </motion.div>
            );
          })}
        </div>

        {/* View All Sales Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center"
        >
          <Link
            to="/products?on_sale=true"
            className="inline-flex items-center bg-gradient-to-r from-red-500 to-orange-500 text-white px-8 py-4 rounded-2xl font-semibold hover:from-red-600 hover:to-orange-600 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
          >
            <Tag className="h-5 w-5 mr-2" />
            View All Sale Items
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </motion.div>

        {/* Sale Statistics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          <div className="text-center bg-white rounded-2xl p-6 shadow-lg">
            <div className="bg-gradient-to-r from-red-500 to-orange-500 rounded-full p-3 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <Percent className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              Up to {Math.max(...sortedSaleProducts.map(p => 
                p.original_price ? Math.round(((p.original_price - p.price) / p.original_price) * 100) : 0
              ))}% OFF
            </h3>
            <p className="text-gray-600">Maximum discount available</p>
          </div>

          <div className="text-center bg-white rounded-2xl p-6 shadow-lg">
            <div className="bg-gradient-to-r from-orange-500 to-yellow-500 rounded-full p-3 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <ShoppingCart className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              {sortedSaleProducts.length}+
            </h3>
            <p className="text-gray-600">Items on sale</p>
          </div>

          <div className="text-center bg-white rounded-2xl p-6 shadow-lg">
            <div className="bg-gradient-to-r from-yellow-500 to-red-500 rounded-full p-3 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <Star className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              {Math.round(sortedSaleProducts.reduce((acc, p) => acc + (p.rating || 4.5), 0) / sortedSaleProducts.length * 10) / 10}/5
            </h3>
            <p className="text-gray-600">Average rating</p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
