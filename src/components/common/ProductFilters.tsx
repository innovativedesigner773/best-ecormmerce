import React, { useState } from 'react';
import { Search, Filter, X, SlidersHorizontal, Star, Percent, Package, Tag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface FilterState {
  search: string;
  category: string;
  priceRange: [number, number];
  sortBy: string;
  onlyInStock: boolean;
  onlyOnSale: boolean;
  rating: number;
  brand: string;
}

interface ProductFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  categories: string[];
  brands: string[];
  maxPrice: number;
  className?: string;
}

export default function ProductFilters({
  filters,
  onFiltersChange,
  categories,
  brands,
  maxPrice,
  className = ''
}: ProductFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);

  const updateFilter = (key: keyof FilterState, value: any) => {
    const newFilters = { ...filters, [key]: value };
    onFiltersChange(newFilters);
    
    // Update active filters display
    const newActiveFilters = [];
    if (newFilters.search) newActiveFilters.push(`Search: "${newFilters.search}"`);
    if (newFilters.category) newActiveFilters.push(`Category: ${newFilters.category}`);
    if (newFilters.onlyOnSale) newActiveFilters.push('On Sale');
    if (newFilters.onlyInStock) newActiveFilters.push('In Stock Only');
    if (newFilters.rating > 0) newActiveFilters.push(`Rating: ${newFilters.rating}+ stars`);
    if (newFilters.brand) newActiveFilters.push(`Brand: ${newFilters.brand}`);
    if (newFilters.priceRange[0] > 0 || newFilters.priceRange[1] < maxPrice) {
      newActiveFilters.push(`Price: R${newFilters.priceRange[0]} - R${newFilters.priceRange[1]}`);
    }
    setActiveFilters(newActiveFilters);
  };

  const clearFilter = (filterType: keyof FilterState) => {
    const defaultValues: FilterState = {
      search: '',
      category: '',
      priceRange: [0, maxPrice],
      sortBy: 'featured',
      onlyInStock: false,
      onlyOnSale: false,
      rating: 0,
      brand: ''
    };
    updateFilter(filterType, defaultValues[filterType]);
  };

  const clearAllFilters = () => {
    const defaultFilters: FilterState = {
      search: '',
      category: '',
      priceRange: [0, maxPrice],
      sortBy: 'featured',
      onlyInStock: false,
      onlyOnSale: false,
      rating: 0,
      brand: ''
    };
    onFiltersChange(defaultFilters);
    setActiveFilters([]);
  };

  return (
    <div className={`bg-white rounded-2xl shadow-lg border border-gray-200 ${className}`}>
      {/* Main Filter Bar */}
      <div className="p-6">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search products..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
              value={filters.search}
              onChange={(e) => updateFilter('search', e.target.value)}
            />
          </div>

          {/* Category Filter */}
          <select
            className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white min-w-[180px]"
            value={filters.category}
            onChange={(e) => updateFilter('category', e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>

          {/* Sort */}
          <select
            className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white min-w-[160px]"
            value={filters.sortBy}
            onChange={(e) => updateFilter('sortBy', e.target.value)}
          >
            <option value="featured">Featured</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
            <option value="name">Name A-Z</option>
            <option value="rating">Top Rated</option>
            <option value="newest">Newest</option>
          </select>

          {/* Advanced Filters Toggle */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors"
          >
            <SlidersHorizontal className="h-5 w-5" />
            <span>Advanced</span>
          </button>
        </div>

        {/* Active Filters Display */}
        {activeFilters.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 pt-4 border-t border-gray-200"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-gray-700 mr-2">Active Filters:</span>
              {activeFilters.map((filter, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex items-center bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm"
                >
                  <span>{filter}</span>
                  <button
                    onClick={() => {
                      // Remove specific filter logic would go here
                      clearAllFilters();
                    }}
                    className="ml-2 hover:text-green-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </motion.div>
              ))}
              <button
                onClick={clearAllFilters}
                className="ml-auto text-sm text-green-600 hover:text-green-800 font-medium"
              >
                Clear All
              </button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Advanced Filters */}
      <AnimatePresence>
        {showAdvanced && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-gray-200 p-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Price Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Price Range: R{filters.priceRange[0]} - R{filters.priceRange[1]}
                </label>
                <div className="space-y-2">
                  <input
                    type="range"
                    min="0"
                    max={maxPrice}
                    value={filters.priceRange[1]}
                    onChange={(e) => updateFilter('priceRange', [filters.priceRange[0], parseInt(e.target.value)])}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>R0</span>
                    <span>R{maxPrice}</span>
                  </div>
                </div>
              </div>

              {/* Rating Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Minimum Rating
                </label>
                <div className="flex items-center space-x-2">
                  <Star className="h-4 w-4 text-yellow-400 fill-current" />
                  <select
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    value={filters.rating}
                    onChange={(e) => updateFilter('rating', parseInt(e.target.value))}
                  >
                    <option value="0">Any Rating</option>
                    <option value="1">1+ Stars</option>
                    <option value="2">2+ Stars</option>
                    <option value="3">3+ Stars</option>
                    <option value="4">4+ Stars</option>
                    <option value="5">5 Stars</option>
                  </select>
                </div>
              </div>

              {/* Brand Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Brand
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  value={filters.brand}
                  onChange={(e) => updateFilter('brand', e.target.value)}
                >
                  <option value="">All Brands</option>
                  {brands.map(brand => (
                    <option key={brand} value={brand}>{brand}</option>
                  ))}
                </select>
              </div>

              {/* Quick Filters */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quick Filters
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.onlyInStock}
                      onChange={(e) => updateFilter('onlyInStock', e.target.checked)}
                      className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700 flex items-center">
                      <Package className="h-4 w-4 mr-1" />
                      In Stock Only
                    </span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.onlyOnSale}
                      onChange={(e) => updateFilter('onlyOnSale', e.target.checked)}
                      className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700 flex items-center">
                      <Percent className="h-4 w-4 mr-1" />
                      On Sale Only
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
