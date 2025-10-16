import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search, Filter, Grid, List, Star, ShoppingCart, Percent, Package, AlertTriangle, X, Tag } from 'lucide-react';
import { useCart } from '../../contexts/CartContext';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ProductCard from '../../components/common/ProductCard';
import { supabase } from '../../lib/supabase';

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  short_description?: string;
  sku: string;
  barcode: string;
  category_id: string;
  price: number;
  cost_price: number;
  compare_at_price?: number;
  currency: string;
  images: string[];
  specifications?: any;
  features?: string[];
  tags?: any;
  weight_kg?: number;
  dimensions?: any;
  stock_quantity?: number;
  is_active: boolean;
  is_featured: boolean;
  stock_tracking: boolean;
  requires_shipping: boolean;
  created_at: string;
  updated_at: string;
  category?: {
    id: string;
    name: string;
    slug: string;
    description?: string;
  };
}

interface DisplayProduct {
  id: string;
  name: string;
  price: number;
  original_price?: number;
  image_url: string;
  rating: number;
  reviews_count: number;
  promotion_badge?: string;
  promotion_discount?: number;
  in_stock: boolean;
  stock_count: number;
  category: string;
  sku: string;
  description?: string;
  brand?: string;
}

export default function Products() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<DisplayProduct[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);

  const { addToCart } = useCart();
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '');
  const [priceRange, setPriceRange] = useState([0, 500]);
  const [sortBy, setSortBy] = useState('featured');
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [onlyOnSale, setOnlyOnSale] = useState(searchParams.get('on_sale') === 'true');

  // Fetch real products from Supabase
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        console.log('📦 Fetching products for customer view...');
        
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select(`
            *,
            category:categories(id, name, slug, description)
          `)
          .eq('is_active', true)
          .order('created_at', { ascending: false });

        if (productsError) {
          console.error('❌ Error fetching products:', productsError);
          throw new Error(`Failed to fetch products: ${productsError.message}`);
        }

        console.log('✅ Products fetched for customer view:', productsData);
        
        // Transform real products to display format
        const displayProducts: DisplayProduct[] = (productsData || []).map((product: Product) => {
          const stockCount = product.stock_quantity || 0;
          const isInStock = stockCount > 0;
          const hasDiscount = product.compare_at_price && product.compare_at_price > product.price;
          
          return {
            id: product.id,
            name: product.name,
            price: product.price,
            original_price: hasDiscount ? product.compare_at_price : undefined,
            image_url: product.images && product.images.length > 0 ? product.images[0] : '',
            rating: 4.5, // Default rating - you can add a ratings table later
            reviews_count: Math.floor(Math.random() * 100) + 10, // Default - you can add a reviews table later
            promotion_badge: hasDiscount ? `${Math.round(((product.compare_at_price! - product.price) / product.compare_at_price!) * 100)}% OFF` : undefined,
            promotion_discount: hasDiscount ? product.compare_at_price! - product.price : undefined,
            in_stock: isInStock,
            stock_count: stockCount,
            category: product.category?.name || 'Uncategorized',
            sku: product.sku,
            description: product.description,
            brand: 'Best Brightness', // Default brand - you can add a brand field later
          };
        });

        setProducts(displayProducts);
        
        // Extract unique categories
        const uniqueCategories = [...new Set(displayProducts.map(p => p.category))].filter(Boolean);
        setCategories(uniqueCategories);
        
      } catch (error) {
        console.error('Error fetching products:', error);
        console.error('Failed to load products. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    
    if (searchQuery) params.set('search', searchQuery);
    if (selectedCategory) params.set('category', selectedCategory);
    if (onlyOnSale) params.set('on_sale', 'true');
    
    setSearchParams(params, { replace: true });
  }, [searchQuery, selectedCategory, onlyOnSale, setSearchParams]);

  // Filter products based on search and filters
  const filteredProducts = products.filter(product => {
    if (searchQuery && !product.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (selectedCategory && product.category !== selectedCategory) {
      return false;
    }
    if (product.price < priceRange[0] || product.price > priceRange[1]) {
      return false;
    }
    if (onlyInStock && !product.in_stock) {
      return false;
    }
    if (onlyOnSale && !product.original_price) {
      return false;
    }
    return true;
  });

  // Sort products
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    switch (sortBy) {
      case 'price-low':
        return a.price - b.price;
      case 'price-high':
        return b.price - a.price;
      case 'name':
        return a.name.localeCompare(b.name);
      case 'rating':
        return b.rating - a.rating;
      case 'stock':
        return b.stock_count - a.stock_count;
      default:
        return 0;
    }
  });

  const handleAddToCart = async (product: DisplayProduct) => {
    try {
      // Transform DisplayProduct back to the format expected by addToCart
      const cartProduct = {
        id: product.id,
        name: product.name,
        price: product.price,
        image_url: product.image_url,
        sku: product.sku,
        description: product.description,
        category: product.category,
        in_stock: product.in_stock,
        stock_count: product.stock_count
      };
      await addToCart(cartProduct, 1);
    } catch (error) {
      console.error('Error adding to cart:', error);
    }
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setSelectedCategory('');
    setPriceRange([0, 500]);
    setOnlyInStock(true);
    setOnlyOnSale(false);
    setSearchParams({});
  };

  // Get stock status helper function
  const getStockStatus = (stockCount: number) => {
    if (stockCount === 0) {
      return { status: 'out-of-stock', message: 'Out of Stock', color: 'text-red-600 bg-red-50' };
    } else if (stockCount <= 3) {
      return { 
        status: 'urgent', 
        message: `Only ${stockCount} left!`, 
        color: 'text-orange-600 bg-orange-50 animate-pulse' 
      };
    } else if (stockCount <= 10) {
      return { 
        status: 'low', 
        message: `${stockCount} in stock - running low`, 
        color: 'text-yellow-600 bg-yellow-50' 
      };
    } else {
      return { 
        status: 'good', 
        message: `${stockCount} in stock`, 
        color: 'text-green-600 bg-green-50' 
      };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col">
        {/* Page Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Professional Cleaning Supplies</h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Discover our comprehensive range of equipment, detergents, and supplies
          </p>
        </div>

        {/* Active Filters Display */}
        {(selectedCategory || onlyOnSale) && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-2xl p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-blue-800 mr-2">Active Filters:</span>
              
              {selectedCategory && (
                <div className="flex items-center bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                  <span>Category: {selectedCategory}</span>
                  <button
                    onClick={() => setSelectedCategory('')}
                    className="ml-2 hover:text-blue-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}

              {onlyOnSale && (
                <div className="flex items-center bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm">
                  <Percent className="h-3 w-3 mr-1" />
                  <span>On Sale</span>
                  <button
                    onClick={() => setOnlyOnSale(false)}
                    className="ml-2 hover:text-orange-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}

              <button
                onClick={clearAllFilters}
                className="ml-auto text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Clear All
              </button>
            </div>
          </div>
        )}

        {/* Search and Filter Bar */}
        <div className="bg-[#F8F9FA] rounded-2xl shadow-lg p-6 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            {/* Search Bar */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search cleaning supplies..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Category Filter */}
            <select
              className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="">All categories</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>

            {/* Sort */}
            <select
              className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="featured">Featured</option>
              <option value="name">Name A-Z</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="rating">Top Rated</option>
              <option value="stock">Stock Level</option>
            </select>

            {/* View Mode Toggle */}
            <div className="flex bg-white border border-gray-300 rounded-xl p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-blue-500 text-white' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <Grid className="h-5 w-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-blue-500 text-white' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <List className="h-5 w-5" />
              </button>
            </div>

            {/* Filters Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors"
            >
              <Filter className="h-5 w-5" />
              <span>Filters</span>
            </button>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Price Range */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Price Range: ${priceRange[0]} - ${priceRange[1]}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="500"
                    value={priceRange[1]}
                    onChange={(e) => setPriceRange([0, parseInt(e.target.value)])}
                    className="w-full"
                  />
                </div>

                {/* Stock Filter */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="in-stock"
                    checked={onlyInStock}
                    onChange={(e) => setOnlyInStock(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="in-stock" className="ml-2 text-sm text-gray-700">
                    Only show in stock
                  </label>
                </div>

                {/* Sale Filter */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="on-sale"
                    checked={onlyOnSale}
                    onChange={(e) => setOnlyOnSale(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="on-sale" className="ml-2 text-sm text-gray-700">
                    On sale only
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Results Count */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-gray-600">
            Showing {sortedProducts.length} of {products.length} products
          </p>
        </div>

        {/* Products Grid/List */}
        {sortedProducts.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
            <p className="text-gray-500">Try adjusting your search or filter criteria.</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {sortedProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {sortedProducts.map((product) => {
              const stockStatus = getStockStatus(product.stock_count);
              
              return (
                <div key={product.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                  <div className="flex flex-col md:flex-row gap-6">
                    {/* Product Image */}
                    <div className="flex-shrink-0 md:w-48">
                      <div className="relative">
                        <ImageWithFallback
                          src={product.image_url}
                          alt={product.name}
                          className="w-full h-48 object-cover rounded-lg"
                        />
                        {product.promotion_badge && (
                          <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded-md text-xs font-medium">
                            {product.promotion_badge}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Product Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col h-full">
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="text-lg font-semibold text-gray-900 hover:text-blue-600">
                              <Link to={`/products/${product.id}`}>
                                {product.name}
                              </Link>
                            </h3>
                            <div className="flex items-center ml-4">
                              <Star className="h-4 w-4 text-yellow-400 fill-current" />
                              <span className="text-sm text-gray-600 ml-1">
                                {product.rating} ({product.reviews_count})
                              </span>
                            </div>
                          </div>
                          
                          <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                            {product.description}
                          </p>
                          
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-xs text-gray-500">SKU: {product.sku}</span>
                            <span className="text-xs text-gray-500">•</span>
                            <span className="text-xs text-gray-500">Brand: {product.brand}</span>
                          </div>
                          
                          <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${stockStatus.color}`}>
                            {stockStatus.message}
                          </div>
                        </div>
                        
                        {/* Price and Actions */}
                        <div className="flex items-center justify-between mt-4">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl font-bold text-gray-900">
                              ${product.price.toFixed(2)}
                            </span>
                            {product.original_price && (
                              <span className="text-lg text-gray-500 line-through">
                                ${product.original_price.toFixed(2)}
                              </span>
                            )}
                          </div>
                          
                          <button
                            onClick={() => handleAddToCart(product)}
                            disabled={!product.in_stock}
                            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                          >
                            <ShoppingCart className="h-4 w-4" />
                            {product.in_stock ? 'Add to Cart' : 'Out of Stock'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
