import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Package, TrendingUp, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import { ImageWithFallback } from '../figma/ImageWithFallback';

interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image_url?: string;
  product_count?: number;
}

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

interface CategoryShowcaseProps {
  categories: Category[];
  products: Product[];
  title?: string;
  subtitle?: string;
  maxCategories?: number;
  maxProductsPerCategory?: number;
  className?: string;
}

export default function CategoryShowcase({
  categories,
  products,
  title = "Shop by Category",
  subtitle = "Explore our wide range of professional cleaning solutions",
  maxCategories = 6,
  maxProductsPerCategory = 4,
  className = ''
}: CategoryShowcaseProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categoryProducts, setCategoryProducts] = useState<{ [key: string]: Product[] }>({});

  // Group products by category
  useEffect(() => {
    const grouped: { [key: string]: Product[] } = {};
    
    categories.forEach(category => {
      const categoryProducts = products.filter(product => 
        product.category === category.name
      );
      grouped[category.name] = categoryProducts.slice(0, maxProductsPerCategory);
    });
    
    setCategoryProducts(grouped);
  }, [categories, products, maxProductsPerCategory]);

  // Get top categories by product count
  const topCategories = categories
    .filter(cat => cat.product_count && cat.product_count > 0)
    .sort((a, b) => (b.product_count || 0) - (a.product_count || 0))
    .slice(0, maxCategories);

  if (topCategories.length === 0) {
    return null;
  }

  return (
    <section className={`py-16 bg-[#F8F9FA] ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl font-bold text-[#09215F] mb-4">{title}</h2>
          <p className="text-xl text-[#6C757D] max-w-3xl mx-auto">{subtitle}</p>
        </motion.div>

        {/* Category Tabs */}
        <div className="flex flex-wrap justify-center gap-4 mb-12">
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            onClick={() => setSelectedCategory(null)}
            className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
              selectedCategory === null
                ? 'bg-[#97CF50] text-white shadow-lg hover:bg-[#09215F]'
                : 'bg-white text-[#09215F] hover:bg-[#F8F9FA] shadow-md border border-gray-200'
            }`}
          >
            All Categories
          </motion.button>
          {topCategories.map((category, index) => (
            <motion.button
              key={category.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              onClick={() => setSelectedCategory(category.name)}
              className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
                selectedCategory === category.name
                  ? 'bg-[#97CF50] text-white shadow-lg hover:bg-[#09215F]'
                  : 'bg-white text-[#09215F] hover:bg-[#F8F9FA] shadow-md border border-gray-200'
              }`}
            >
              {category.name}
              <span className="ml-2 text-xs bg-white/20 px-2 py-1 rounded-full">
                {category.product_count}
              </span>
            </motion.button>
          ))}
        </div>

        {/* Category Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {(selectedCategory 
            ? topCategories.filter(cat => cat.name === selectedCategory)
            : topCategories
          ).map((category, index) => (
            <motion.div
              key={category.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-200"
            >
              {/* Category Header */}
              <div className="relative">
                <Link to={`/products?category=${encodeURIComponent(category.slug || category.name)}`}>
                  <div className="relative h-48 overflow-hidden">
                    <ImageWithFallback
                      src={category.image_url || `https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop&ix=${index}`}
                      alt={category.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    
                    {/* Category Info Overlay */}
                    <div className="absolute bottom-4 left-4 right-4">
                      <h3 className="text-2xl font-bold text-white mb-2">
                        {category.name}
                      </h3>
                      <p className="text-white/90 text-sm mb-3 line-clamp-2">
                        {category.description || `Professional ${category.name.toLowerCase()} solutions`}
                      </p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center text-white/80 text-sm">
                          <Package className="h-4 w-4 mr-1" />
                          <span>{category.product_count} products</span>
                        </div>
                        <ArrowRight className="h-5 w-5 text-white" />
                      </div>
                    </div>
                  </div>
                </Link>
              </div>

              {/* Featured Products in Category */}
              {categoryProducts[category.name] && categoryProducts[category.name].length > 0 && (
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-[#09215F] flex items-center">
                      <TrendingUp className="h-4 w-4 mr-2 text-[#97CF50]" />
                      Popular in {category.name}
                    </h4>
                    <Link
                      to={`/products?category=${encodeURIComponent(category.slug || category.name)}`}
                      className="text-[#97CF50] hover:text-[#09215F] text-sm font-medium"
                    >
                      View All
                    </Link>
                  </div>

                  <div className="space-y-3">
                    {categoryProducts[category.name].slice(0, 3).map((product, productIndex) => (
                      <motion.div
                        key={product.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: productIndex * 0.1 }}
                        className="flex items-center space-x-3 p-3 bg-[#F8F9FA] rounded-lg hover:bg-[#E9ECEF] transition-colors"
                      >
                        <div className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden">
                          <ImageWithFallback
                            src={product.image_url || product.image}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <Link
                            to={`/products/${product.id}`}
                            className="text-sm font-medium text-[#09215F] hover:text-[#97CF50] line-clamp-1"
                          >
                            {product.name}
                          </Link>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className="text-sm font-bold text-[#09215F]">
                              R{product.price.toFixed(2)}
                            </span>
                            {product.original_price && product.original_price > product.price && (
                              <span className="text-xs text-[#6C757D] line-through">
                                R{product.original_price.toFixed(2)}
                              </span>
                            )}
                            {product.rating && (
                              <div className="flex items-center">
                                <Star className="h-3 w-3 text-yellow-400 fill-current" />
                                <span className="text-xs text-[#6C757D] ml-1">
                                  {product.rating}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {/* View All Categories Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center mt-12"
        >
          <Link
            to="/products"
            className="inline-flex items-center bg-[#97CF50] text-white px-8 py-4 rounded-xl font-semibold hover:bg-[#09215F] transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
          >
            <Package className="h-5 w-5 mr-2" />
            Browse All Categories
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
