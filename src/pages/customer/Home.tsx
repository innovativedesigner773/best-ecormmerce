import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Truck, CheckCircle, Headphones, Gift, Star, Sparkles, AlertCircle, Clock, Zap, Users, TrendingUp, Award, Shield } from 'lucide-react';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';
import ProductCard from '../../components/common/ProductCard';
import ProductCarousel from '../../components/common/ProductCarousel';
import SalesSection from '../../components/common/SalesSection';
import CategoryShowcase from '../../components/common/CategoryShowcase';
import ProductFilters from '../../components/common/ProductFilters';
import { supabase } from '../../lib/supabase';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { motion, AnimatePresence } from 'framer-motion';


// Dynamic categories fetched from database
interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image_url?: string;
  product_count?: number;
}

// Add this helper function before HeroSlide component
const getTimeRemaining = (endDate: string) => {
  const now = new Date().getTime();
  const end = new Date(endDate).getTime();
  const difference = end - now;

  if (difference <= 0) return null;

  const days = Math.floor(difference / (1000 * 60 * 60 * 24));
  const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));

  return { days, hours, minutes };
};

// Also add this helper function that was referenced but not defined
const formatDiscount = (type: string, value: number) => {
  switch (type) {
    case 'percentage':
      return `${value}% OFF`;
    case 'fixed':
      return `R${value} OFF`;
    case 'bogo':
      return 'BUY 1 GET 1';
    case 'free_shipping':
      return 'FREE SHIPPING';
    default:
      return 'SPECIAL OFFER';
  }
};

// Color themes for different promotion types
const getPromotionTheme = (promotion: any) => {
  // Default theme for when no promotion is provided
  const defaultTheme = {
    primary: '#4682B4',
    secondary: '#2C3E50',
    accent: '#87CEEB',
    background: 'from-[#87CEEB] via-[#B0E0E6] to-[#87CEEB]',
    text: '#2C3E50',
    button: '#4682B4',
    buttonHover: '#2C3E50',
    icon: 'Sparkles'
  };

  // Return default theme if promotion is null, undefined, or doesn't have required properties
  if (!promotion || typeof promotion !== 'object' || !promotion.id) {
    return defaultTheme;
  }

  // Dynamic themes based on your requested colors: orange, yellow, green, brown
  const themes = [
    {
      // Orange Theme
      primary: '#FF8C00',
      secondary: '#FF7F00',
      accent: '#FFA500',
      background: 'from-[#FF8C00] via-[#FFA500] to-[#FF7F00]',
      text: '#FFFFFF',
      button: '#FFFFFF',
      buttonHover: '#F8F9FA',
      icon: 'Zap'
    },
    {
      // Yellow Theme
      primary: '#FFD700',
      secondary: '#FFC107',
      accent: '#FFEB3B',
      background: 'from-[#FFD700] via-[#FFEB3B] to-[#FFC107]',
      text: '#2C3E50',
      button: '#2C3E50',
      buttonHover: '#34495E',
      icon: 'Star'
    },
    {
      // Green Theme
      primary: '#4CAF50',
      secondary: '#45A049',
      accent: '#66BB6A',
      background: 'from-[#4CAF50] via-[#66BB6A] to-[#45A049]',
      text: '#FFFFFF',
      button: '#FFFFFF',
      buttonHover: '#F8F9FA',
      icon: 'Gift'
    },
    {
      // Brown Theme
      primary: '#8D6E63',
      secondary: '#795548',
      accent: '#A1887F',
      background: 'from-[#8D6E63] via-[#A1887F] to-[#795548]',
      text: '#FFFFFF',
      button: '#FFFFFF',
      buttonHover: '#F8F9FA',
      icon: 'Clock'
    }
  ];

  try {
    // Create a more randomized selection using promotion ID and name
    let seed = 0;
    if (promotion.id) {
      seed += promotion.id;
    }
    if (promotion.name) {
      // Add character codes from promotion name for more randomness
      for (let i = 0; i < Math.min(promotion.name.length, 5); i++) {
        seed += promotion.name.charCodeAt(i);
      }
    } else {
      // Fallback randomization using current timestamp if no name
      seed += Date.now() % 1000;
    }
    
    // Use the seed to get a random but consistent theme for this promotion
    const themeIndex = Math.abs(seed) % themes.length;
    return themes[themeIndex] || defaultTheme;
  } catch (error) {
    console.warn('Error getting promotion theme:', error);
    return defaultTheme;
  }
};

// Add this helper function before the Home component
const HeroSlide: React.FC<{ promotion?: any; buildPromotionUrl: (promotion: any) => string }> = ({ promotion, buildPromotionUrl }) => {
  const theme = getPromotionTheme(promotion);
  const IconComponent = promotion ? 
    (theme.icon === 'Zap' ? Zap : 
     theme.icon === 'Gift' ? Gift : 
     theme.icon === 'Clock' ? Clock : 
     theme.icon === 'Star' ? Star : Zap) : 
    Sparkles;

  if (!promotion) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <motion.div 
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center lg:text-left"
        >
          <div className="flex items-center justify-center lg:justify-start mb-4">
            <IconComponent className="h-8 w-8 text-white mr-3" />
            <span className="text-white/90 font-medium">Professional Grade Quality</span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6 text-[#2C3E50] dark:text-white leading-tight">
            Premium Cleaning Supplies for Every Need
          </h1>
          <p className="text-base sm:text-lg md:text-xl mb-6 sm:mb-8 text-[#2C3E50]/80 dark:text-gray-300 max-w-xl">
            Discover our comprehensive range of professional-grade cleaning equipment, 
            industrial detergents, and essential supplies. Quality guaranteed, competitive prices, fast delivery across Durban.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
            <Link
              to="/products"
              className="bg-[#4682B4] text-white px-8 py-4 rounded-xl font-semibold hover:bg-[#2C3E50] transition-all duration-300 inline-flex items-center justify-center shadow-lg hover:shadow-xl transform hover:-translate-y-1"
            >
              Shop Now
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
            <Link
              to="/products"
              className="border-2 border-[#4682B4] text-[#4682B4] px-8 py-4 rounded-xl font-semibold hover:bg-[#4682B4] hover:text-white transition-all duration-300 inline-flex items-center justify-center"
            >
              View Catalog
            </Link>
          </div>
        </motion.div>
        <motion.div 
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="relative"
        >
          <div className="relative rounded-2xl overflow-hidden shadow-2xl transform rotate-3 hover:rotate-0 transition-transform duration-500">
            <ImageWithFallback
              src="https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&h=400&fit=crop"
              alt="Professional cleaning supplies arrangement"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
          </div>
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.8 }}
            className="absolute -bottom-4 -right-4 bg-white rounded-xl p-4 shadow-lg"
          >
            <div className="flex items-center space-x-2">
              <Star className="h-5 w-5 text-yellow-400 fill-current" />
              <span className="font-semibold text-[#2C3E50]">4.9/5</span>
              <span className="text-gray-600 text-sm">2,500+ reviews</span>
            </div>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  // Promotion slide
  const timeRemaining = getTimeRemaining(promotion.end_date);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
      <motion.div 
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center lg:text-left"
      >
        <div className="flex items-center justify-center lg:justify-start mb-4">
          <IconComponent className="h-8 w-8 text-white mr-3" />
          <span className="text-white/90 font-medium">Hot Deal</span>
        </div>
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6 text-white leading-tight">
          {promotion.name}
        </h1>
        <motion.div 
          className="text-2xl sm:text-3xl font-black mb-3 sm:mb-4"
          style={{ color: theme.accent }}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          {formatDiscount(promotion.type, promotion.value)}
        </motion.div>
        <p className="text-base sm:text-lg md:text-xl mb-6 sm:mb-8 text-white/90 max-w-xl">
          {promotion.description}
        </p>
        {timeRemaining && (
          <div className="mb-8 inline-flex items-center bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
            <Clock className="h-5 w-5 mr-2 text-white" />
            <span className="font-mono font-bold text-white">
              {timeRemaining.days}d {timeRemaining.hours}h {timeRemaining.minutes}m
            </span>
          </div>
        )}
        <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
          <Link
            to={buildPromotionUrl(promotion)}
            className="bg-white text-gray-800 px-8 py-4 rounded-xl font-semibold hover:bg-gray-100 transition-all duration-300 inline-flex items-center justify-center shadow-lg hover:shadow-xl transform hover:-translate-y-1"
            style={{ color: theme.primary }}
          >
            Shop Now
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
          <Link
            to={buildPromotionUrl(promotion)}
            className="border-2 border-white text-white px-8 py-4 rounded-xl font-semibold hover:bg-white hover:text-gray-800 transition-all duration-300 inline-flex items-center justify-center"
            style={{ 
              borderColor: 'white',
              '--hover-text-color': theme.primary 
            } as React.CSSProperties}
          >
            View Details
          </Link>
        </div>
      </motion.div>
      <motion.div 
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="relative"
      >
        <Link to={buildPromotionUrl(promotion)} className="block">
          <div className="relative rounded-2xl overflow-hidden shadow-2xl">
            <ImageWithFallback
              src={promotion.image_url || "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=600&h=300&fit=crop"}
              alt={promotion.name}
              className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
          </div>
        </Link>
      </motion.div>
    </div>
  );
};

export default function Home() {
  const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [errorDetails, setErrorDetails] = useState<string>('');
  const [featuredProducts, setFeaturedProducts] = useState<any[]>([]);
  const [featuredLoading, setFeaturedLoading] = useState(true);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [activePromotions, setActivePromotions] = useState<any[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [trendingProducts, setTrendingProducts] = useState<any[]>([]);
  const [newProducts, setNewProducts] = useState<any[]>([]);
  const [topRatedProducts, setTopRatedProducts] = useState<any[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  
  // Filter state
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    priceRange: [0, 1000] as [number, number],
    sortBy: 'featured',
    onlyInStock: false,
    onlyOnSale: false,
    rating: 0,
    brand: ''
  });

  useEffect(() => {
    const checkServerStatus = async () => {
      try {
        const serverUrl = `https://${projectId}.supabase.co/functions/v1/make-server-8880f2f2`;
        console.log('Testing server health at:', `${serverUrl}/health`);
        
        const response = await fetch(`${serverUrl}/health`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          }
        });

        if (response.ok) {
          const result = await response.json();
          console.log('Server health check successful:', result);
          setServerStatus('online');
        } else {
          console.error('Server health check failed:', response.status);
          setServerStatus('offline');
          setErrorDetails(`Server responded with ${response.status}: ${await response.text()}`);
        }
      } catch (error) {
        console.error('Server connection failed:', error);
        setServerStatus('offline');
        setErrorDetails(`Connection error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    };

    checkServerStatus();
    fetchFeaturedProducts();
    fetchCategories();
    fetchAllProducts();
  }, []);

  const fetchFeaturedProducts = async () => {
    try {
      setFeaturedLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          categories (
            name
          )
        `)
        .eq('is_active', true)
        .eq('is_featured', true)
        .order('created_at', { ascending: false })
        .limit(6);

      if (error) throw error;
      
      // Transform the data to match the expected format
      const transformedProducts = (data || []).map(product => ({
        id: product.id,
        name: product.name,
        brand: product.brand || 'Best Brightness',
        price: product.price,
        original_price: product.compare_at_price,
        discount: product.compare_at_price ? 
          Math.round(((product.compare_at_price - product.price) / product.compare_at_price) * 100) : 
          null,
        category: product.categories?.name || 'General',
        image_url: product.images?.[0] || '/api/placeholder/400/400',
        rating: 4.5, // Default rating - can be enhanced with reviews table later
        reviews: Math.floor(Math.random() * 200) + 50, // Default reviews count
        featured: true,
        description: product.short_description || product.description || 'High-quality cleaning product',
        in_stock: product.stock_quantity > 0,
        stock_count: product.stock_quantity,
        promotion_badge: product.compare_at_price ? 
          `${Math.round(((product.compare_at_price - product.price) / product.compare_at_price) * 100)}% OFF` : 
          null
      }));

      setFeaturedProducts(transformedProducts);
    } catch (err) {
      console.error('Failed to fetch featured products:', err);
      setFeaturedProducts([]);
    } finally {
      setFeaturedLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      setCategoriesLoading(true);
      const { data, error } = await supabase
        .from('categories')
        .select(`
          *,
          products!inner(count)
        `)
        .eq('is_active', true)
        .order('name', { ascending: true })
        .limit(6);

      if (error) throw error;
      
      // Transform categories with product counts
      const transformedCategories = (data || []).map(category => ({
        id: category.id,
        name: category.name,
        slug: category.slug,
        description: category.description || `${category.name} products`,
        image_url: category.image_url || `https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=300&h=200&fit=crop`,
        product_count: category.products?.length || 0
      }));

      setCategories(transformedCategories);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
      // Fallback to default categories if fetch fails
      setCategories([
        { 
          id: 'equipment',
          name: 'Equipment', 
          slug: 'equipment',
          image_url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=300&h=200&fit=crop', 
          product_count: 0,
          description: 'Professional cleaning machines and tools'
        },
        { 
          id: 'detergents',
          name: 'Detergents', 
          slug: 'detergents',
          image_url: 'https://images.unsplash.com/photo-1563453392212-326f5e854473?w=300&h=200&fit=crop', 
          product_count: 0,
          description: 'Industrial-strength cleaning chemicals'
        },
        { 
          id: 'supplies',
          name: 'Supplies', 
          slug: 'supplies',
          image_url: 'https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?w=300&h=200&fit=crop', 
          product_count: 0,
          description: 'Essential cleaning accessories and consumables'
        }
      ]);
    } finally {
      setCategoriesLoading(false);
    }
  };

  const fetchAllProducts = async () => {
    try {
      setProductsLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          categories (
            name
          )
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Failed to fetch products, using fallback data:', error);
        // Use fallback data instead of throwing error
        setAllProducts([]);
        setTrendingProducts([]);
        setNewProducts([]);
        setTopRatedProducts([]);
        return;
      }
      
      // Transform the data to match the expected format
      const transformedProducts = (data || []).map(product => ({
        id: product.id,
        name: product.name,
        brand: product.brand || 'Best Brightness',
        price: product.price,
        original_price: product.compare_at_price,
        discount: product.compare_at_price ? 
          Math.round(((product.compare_at_price - product.price) / product.compare_at_price) * 100) : 
          null,
        category: product.categories?.name || 'General',
        image_url: product.images?.[0] || '/api/placeholder/400/400',
        rating: 4.5, // Default rating - can be enhanced with reviews table later
        reviews: Math.floor(Math.random() * 200) + 50, // Default reviews count
        featured: product.is_featured,
        description: product.short_description || product.description || 'High-quality cleaning product',
        in_stock: product.stock_quantity > 0,
        stock_count: product.stock_quantity,
        promotion_badge: product.compare_at_price ? 
          `${Math.round(((product.compare_at_price - product.price) / product.compare_at_price) * 100)}% OFF` : 
          null,
        sku: product.sku,
        created_at: product.created_at
      }));

      setAllProducts(transformedProducts);
      
      // Set different product collections
      setTrendingProducts(transformedProducts.filter(p => p.featured).slice(0, 8));
      setNewProducts(transformedProducts.slice(0, 8));
      setTopRatedProducts([...transformedProducts].sort((a, b) => b.rating - a.rating).slice(0, 8));
      
    } catch (err) {
      console.error('Failed to fetch all products:', err);
      // Set empty arrays to prevent crashes
      setAllProducts([]);
      setTrendingProducts([]);
      setNewProducts([]);
      setTopRatedProducts([]);
    } finally {
      setProductsLoading(false);
    }
  };

  // Helper function to build promotion URL
  const buildPromotionUrl = (promotion: any) => {
    const params = new URLSearchParams();
    if (promotion.filter_params) {
      Object.entries(promotion.filter_params).forEach(([key, value]) => {
        params.append(key, value as string);
      });
    }
    return `/products?${params.toString()}`;
  };

  // Add this useEffect for slide rotation
  useEffect(() => {
    if (activePromotions.length === 0) return;
    
    const timer = setInterval(() => {
      setCurrentSlideIndex(current => 
        current >= activePromotions.length ? 0 : current + 1
      );
    }, 5000); // Change slide every 5 seconds

    return () => clearInterval(timer);
  }, [activePromotions.length]);

  // Modify the useEffect that fetches promotions
  useEffect(() => {
    const fetchActivePromotions = async () => {
      try {
        const { data, error } = await supabase
          .from('promotions')
          .select('*')
          .eq('is_active', true)
          .gte('end_date', new Date().toISOString())
          .order('created_at', { ascending: false });

        if (error) throw error;
        setActivePromotions(data || []);
      } catch (err) {
        console.error('Failed to fetch promotions:', err);
        setActivePromotions([]);
      }
    };

    fetchActivePromotions();
  }, []);

  // Filter handlers
  const handleFiltersChange = (newFilters: typeof filters) => {
    setFilters(newFilters);
  };

  // Get unique brands from products
  const getUniqueBrands = () => {
    return [...new Set(allProducts.map(p => p.brand).filter(Boolean))];
  };

  // Get unique categories from products
  const getUniqueCategories = () => {
    return [...new Set(allProducts.map(p => p.category).filter(Boolean))];
  };

  // Get max price from products
  const getMaxPrice = () => {
    return Math.max(...allProducts.map(p => p.price), 1000);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Server Status Diagnostic Banner */}
      {serverStatus !== 'online' && (
        <div className={`w-full p-4 text-center text-sm ${
          serverStatus === 'checking' 
            ? 'bg-blue-50 text-blue-800 border-b border-blue-200' 
            : 'bg-red-50 text-red-800 border-b border-red-200'
        }`}>
          <div className="max-w-4xl mx-auto flex items-center justify-center space-x-2">
            <AlertCircle className="h-4 w-4" />
            {serverStatus === 'checking' ? (
              <span>Checking server connection...</span>
            ) : (
              <div className="text-left">
                <div>⚠️ Server Connection Issue: Some features may be limited in demo mode</div>
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs opacity-70">Click for technical details</summary>
                  <div className="mt-1 text-xs font-mono bg-red-100 p-2 rounded border">
                    <div>Project ID: {projectId}</div>
                    <div>Server URL: https://{projectId}.supabase.co/functions/v1/make-server-8880f2f2</div>
                    <div>Error: {errorDetails}</div>
                  </div>
                </details>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Updated Hero Section with Promotions */}
      <section 
        className="relative overflow-hidden"
        style={{
          background: (() => {
            if (currentSlideIndex === 0) {
              return 'linear-gradient(135deg, #87CEEB 0%, #B0E0E6 50%, #87CEEB 100%)';
            }
            
            const currentPromotion = activePromotions[currentSlideIndex - 1];
            if (currentPromotion && currentPromotion.id) {
              const theme = getPromotionTheme(currentPromotion);
              return `linear-gradient(135deg, ${theme.primary} 0%, ${theme.accent} 50%, ${theme.secondary} 100%)`;
            }
            
            return 'linear-gradient(135deg, #87CEEB 0%, #B0E0E6 50%, #87CEEB 100%)';
          })()
        }}
      >
        {/* Floating bubbles animation */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-10 left-10 w-4 h-4 bg-white/20 rounded-full animate-pulse"></div>
          <div className="absolute top-32 right-20 w-6 h-6 bg-white/15 rounded-full animate-bounce" style={{ animationDelay: '1s' }}></div>
          <div className="absolute bottom-20 left-1/4 w-3 h-3 bg-white/25 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
          <div className="absolute top-1/2 right-1/3 w-5 h-5 bg-white/10 rounded-full animate-bounce" style={{ animationDelay: '2s' }}></div>
          {/* Additional themed floating elements */}
          {currentSlideIndex > 0 && activePromotions[currentSlideIndex - 1] && activePromotions[currentSlideIndex - 1].id && (
            <>
              <div 
                className="absolute top-1/4 left-1/3 w-2 h-2 rounded-full animate-pulse" 
                style={{ 
                  backgroundColor: getPromotionTheme(activePromotions[currentSlideIndex - 1]).accent + '40',
                  animationDelay: '0.3s' 
                }}
              ></div>
              <div 
                className="absolute bottom-1/3 right-1/4 w-3 h-3 rounded-full animate-bounce" 
                style={{ 
                  backgroundColor: getPromotionTheme(activePromotions[currentSlideIndex - 1]).primary + '30',
                  animationDelay: '1.5s' 
                }}
              ></div>
            </>
          )}
        </div>
       
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlideIndex}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
            >
              <HeroSlide 
                promotion={currentSlideIndex === 0 ? null : activePromotions[currentSlideIndex - 1]}
                buildPromotionUrl={buildPromotionUrl}
              />
            </motion.div>
          </AnimatePresence>
          
          {/* Slide indicators */}
          {activePromotions.length > 0 && (
            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex space-x-2">
              <button
                onClick={() => setCurrentSlideIndex(0)}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  currentSlideIndex === 0 ? 'w-6' : 'bg-white/50 hover:bg-white/80'
                }`}
                style={{
                  backgroundColor: currentSlideIndex === 0 ? '#4682B4' : undefined
                }}
              />
              {activePromotions.map((promotion, index) => {
                if (!promotion || !promotion.id) return null;
                
                const theme = getPromotionTheme(promotion);
                return (
                  <button
                    key={index}
                    onClick={() => setCurrentSlideIndex(index + 1)}
                    className={`w-3 h-3 rounded-full transition-all duration-300 ${
                      currentSlideIndex === index + 1 ? 'w-6' : 'bg-white/50 hover:bg-white/80'
                    }`}
                    style={{
                      backgroundColor: currentSlideIndex === index + 1 ? theme.primary : undefined
                    }}
                  />
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Trust Badges Section */}
      <section className="py-12 sm:py-16 bg-[#F8F9FA] dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
            {[
              { icon: Truck, title: 'Free Delivery', desc: 'On orders over R500', color: 'from-[#87CEEB] to-[#B0E0E6]' },
              { icon: CheckCircle, title: 'Quality Guarantee', desc: '100% satisfaction guaranteed', color: 'from-[#28A745] to-[#20c997]' },
              { icon: Headphones, title: '24/7 Support', desc: 'Expert help when you need it', color: 'from-[#4682B4] to-[#2C3E50]' },
              { icon: Gift, title: 'Loyalty Rewards', desc: 'Earn points on every purchase', color: 'from-[#FF6B35] to-[#fd7e14]' }
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className="text-center group"
              >
                <div className={`bg-gradient-to-br ${item.color} rounded-2xl p-4 sm:p-6 w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-3 sm:mb-4 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                  <item.icon className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
                </div>
                <h3 className="font-semibold mb-1 sm:mb-2 text-[#2C3E50] dark:text-white">{item.title}</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Hot Deals & Promotions Section */}
      {/* <PromotionsSection /> Removed as promotions are now in the hero section */}

      {/* Advanced Product Filters */}
      {allProducts.length > 0 && (
        <section className="py-8 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <ProductFilters
              filters={filters}
              onFiltersChange={handleFiltersChange}
              categories={getUniqueCategories()}
              brands={getUniqueBrands()}
              maxPrice={getMaxPrice()}
            />
          </div>
        </section>
      )}

      {/* Featured Products */}
      <ProductCarousel
        products={featuredProducts}
        title="⭐ Featured Products"
        subtitle="Our most popular and highly-rated cleaning supplies"
        viewAllLink="/products?featured=true&filter=featured"
        className="bg-[#F8F9FA]"
        maxItems={4}
      />

      {/* Trending Products */}
      <ProductCarousel
        products={trendingProducts}
        title="🔥 Trending Now"
        subtitle="What's popular with our customers right now"
        viewAllLink="/products?sort=trending&filter=trending"
        maxItems={4}
      />

      {/* Sales Section */}
      <SalesSection
        products={allProducts}
        title="🔥 Hot Deals & Sales"
        subtitle="Limited time offers you can't miss"
        showCountdown={true}
        endDate={new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()} // 7 days from now
      />

      {/* New Products */}
      <ProductCarousel
        products={newProducts}
        title="✨ New Arrivals"
        subtitle="Fresh products just added to our catalog"
        viewAllLink="/products?sort=newest&filter=new"
        className="bg-gray-50"
        maxItems={4}
      />

      {/* Top Rated Products */}
      <ProductCarousel
        products={topRatedProducts}
        title="⭐ Top Rated"
        subtitle="Highest rated products by our customers"
        viewAllLink="/products?sort=rating&filter=top-rated"
        maxItems={4}
      />

      {/* Enhanced Category Showcase */}
      <CategoryShowcase
        categories={categories}
        products={allProducts}
        title="Shop by Category"
        subtitle="Find exactly what you need across our professional cleaning solutions"
        maxCategories={6}
        maxProductsPerCategory={4}
      />

      {/* Enhanced Final CTA Section */}
      <section className="py-12 sm:py-16 md:py-20 bg-gradient-to-br from-[#87CEEB] via-[#B0E0E6] to-[#4682B4] dark:from-blue-900 dark:via-blue-800 dark:to-blue-900 relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-1/4 left-1/4 w-32 h-32 border border-white rounded-full"></div>
          <div className="absolute bottom-1/4 right-1/4 w-48 h-48 border border-white rounded-full"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 border border-white rounded-full"></div>
        </div>
       
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8"
        >
          <div className="text-center mb-12">
            <div className="flex justify-center mb-6">
              <div className="bg-white/20 backdrop-blur-sm rounded-full p-4">
                <Users className="h-12 w-12 text-white" />
              </div>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6 text-white">Ready to Get Started?</h2>
            <p className="text-base sm:text-lg md:text-xl mb-6 sm:mb-8 md:mb-10 text-white/90 max-w-2xl mx-auto px-4">
              Join thousands of satisfied customers across Durban who trust Best Brightness for their cleaning needs.
              Experience the difference professional-grade supplies make.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/register"
                className="bg-white text-[#4682B4] dark:text-blue-600 px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-semibold hover:bg-gray-100 transition-all duration-300 inline-flex items-center justify-center shadow-xl hover:shadow-2xl transform hover:-translate-y-1"
              >
                Create Account
                <Gift className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
              </Link>
              <Link
                to="/products"
                className="border-2 border-white text-white px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-semibold hover:bg-white hover:text-[#4682B4] dark:hover:text-blue-600 transition-all duration-300 inline-flex items-center justify-center"
              >
                Browse Products
                <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
              </Link>
            </div>
          </div>
         
          {/* Enhanced Trust indicators */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 mt-12 sm:mt-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-center bg-white/10 backdrop-blur-sm rounded-2xl p-4 sm:p-6"
            >
              <div className="bg-white/20 rounded-full p-2 sm:p-3 w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-1 sm:mb-2">2,500+</h3>
              <p className="text-white/80 text-sm sm:text-base">Happy Customers</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="text-center bg-white/10 backdrop-blur-sm rounded-2xl p-4 sm:p-6"
            >
              <div className="bg-white/20 rounded-full p-2 sm:p-3 w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 flex items-center justify-center">
                <Star className="h-6 w-6 sm:h-8 sm:w-8 text-white fill-current" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-1 sm:mb-2">4.9/5</h3>
              <p className="text-white/80 text-sm sm:text-base">Average Rating</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="text-center bg-white/10 backdrop-blur-sm rounded-2xl p-4 sm:p-6"
            >
              <div className="bg-white/20 rounded-full p-2 sm:p-3 w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 flex items-center justify-center">
                <Truck className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-1 sm:mb-2">24h</h3>
              <p className="text-white/80 text-sm sm:text-base">Fast Durban Delivery</p>
            </motion.div>
          </div>

          {/* Additional Features */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 mt-8 sm:mt-12">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.8 }}
              className="text-center"
            >
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 sm:p-4 mb-2 sm:mb-3">
                <Shield className="h-5 w-5 sm:h-6 sm:w-6 text-white mx-auto" />
              </div>
              <p className="text-white/80 text-xs sm:text-sm">Quality Guarantee</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 1.0 }}
              className="text-center"
            >
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 sm:p-4 mb-2 sm:mb-3">
                <Award className="h-5 w-5 sm:h-6 sm:w-6 text-white mx-auto" />
              </div>
              <p className="text-white/80 text-xs sm:text-sm">Professional Grade</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 1.2 }}
              className="text-center"
            >
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 sm:p-4 mb-2 sm:mb-3">
                <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-white mx-auto" />
              </div>
              <p className="text-white/80 text-xs sm:text-sm">Best Prices</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 1.4 }}
              className="text-center"
            >
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 sm:p-4 mb-2 sm:mb-3">
                <Headphones className="h-5 w-5 sm:h-6 sm:w-6 text-white mx-auto" />
              </div>
              <p className="text-white/80 text-xs sm:text-sm">24/7 Support</p>
            </motion.div>
          </div>
        </motion.div>
      </section>
    </div>
  );
}

// Remove the PromotionsSection component since it's now integrated into the hero