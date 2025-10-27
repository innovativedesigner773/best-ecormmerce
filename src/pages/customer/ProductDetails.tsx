import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Star, Plus, Minus, ShoppingCart, Heart, Share2, ArrowLeft, Shield, Truck, RotateCcw, Package, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { useCart } from '../../contexts/CartContext';
import { useFavourites } from '../../contexts/FavouritesContext';
import { useAuth } from '../../contexts/AuthContext';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';
import LoadingSpinner from '../../components/common/LoadingSpinner';
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
}

interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

export default function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { addToFavourites, removeFromFavourites, isFavourite } = useFavourites();
  const { user } = useAuth();
  
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [favouriteLoading, setFavouriteLoading] = useState(false);
  const [product, setProduct] = useState<Product | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [productLoading, setProductLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch product data from Supabase
  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return;
      
      try {
        setProductLoading(true);
        console.log('🔍 Fetching product with ID:', id);
        
        const { data: productData, error: productError } = await supabase
          .from('products')
          .select(`
            *,
            category:categories(id, name, slug, description)
          `)
          .eq('id', id)
          .eq('is_active', true)
          .single();

        if (productError) {
          console.error('❌ Error fetching product:', productError);
          throw new Error(`Product not found: ${productError.message}`);
        }

        if (!productData) {
          throw new Error('Product not found');
        }

        console.log('✅ Product fetched:', productData);
        setProduct(productData);
        setCategory(productData.category);
        setError(null);
      } catch (error) {
        console.error('Error fetching product:', error);
        setError(error instanceof Error ? error.message : 'Failed to load product');
        setProduct(null);
      } finally {
        setProductLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  // Show loading state
  if (productLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  // Show error state
  if (error || !product) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">Product Not Found</h2>
          <p className="text-muted-foreground mb-4">{error || 'The product you are looking for does not exist.'}</p>
          <button
            onClick={() => navigate('/products')}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90"
          >
            Back to Products
          </button>
        </div>
      </div>
    );
  }

  // Helper function to get stock status
  const getStockStatus = (stockCount: number = 0) => {
    if (stockCount === 0) {
      return { 
        status: 'out-of-stock', 
        message: 'Out of Stock', 
        color: 'text-red-600 bg-red-50 border-red-200',
        icon: AlertTriangle,
        urgent: false
      };
    } else if (stockCount <= 3) {
      return { 
        status: 'urgent', 
        message: `Only ${stockCount} left in stock!`, 
        color: 'text-orange-600 bg-orange-50 border-orange-200 animate-pulse',
        icon: AlertTriangle,
        urgent: true
      };
    } else if (stockCount <= 10) {
      return { 
        status: 'low', 
        message: `${stockCount} units in stock - running low`, 
        color: 'text-yellow-600 bg-yellow-50 border-yellow-200',
        icon: Package,
        urgent: false
      };
    } else {
      return { 
        status: 'good', 
        message: `${stockCount} units in stock`, 
        color: 'text-green-600 bg-green-50 border-green-200',
        icon: CheckCircle,
        urgent: false
      };
    }
  };

  const isProductFavourite = isFavourite(product.id);
  const stockInfo = getStockStatus(product.stock_quantity);
  const discount = product.compare_at_price 
    ? Math.round(((product.compare_at_price - product.price) / product.compare_at_price) * 100)
    : 0;

  const handleAddToCart = async () => {
    try {
      setLoading(true);
      await addToCart({
        id: product.id,
        name: product.name,
        price: product.price,
        original_price: product.compare_at_price,
        image_url: product.images[0],
        sku: product.sku,
        in_stock: product.is_active && (product.stock_quantity || 0) > 0,
        stock_count: product.stock_quantity || 0,
        brand: category?.name,
        category: category?.name,
      }, quantity);
      
      console.log(`Added ${quantity} ${product.name} to cart!`);
    } catch (error) {
      console.error('Error adding to cart:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFavourite = async () => {
    try {
      setFavouriteLoading(true);
      if (isProductFavourite) {
        await removeFromFavourites(product.id);
      } else {
        await addToFavourites({
          ...product,
          product_id: product.id,
          reviews_count: 0
        });
      }
    } catch (error) {
      console.error('Error toggling favourite:', error);
    } finally {
      setFavouriteLoading(false);
    }
  };

  const handleQuantityChange = (newQuantity: number) => {
    const maxQuantity = Math.min(10, product.stock_quantity || 0);
    if (newQuantity >= 1 && newQuantity <= maxQuantity) {
      setQuantity(newQuantity);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: product.name,
          text: product.description,
          url: window.location.href,
        });
      } catch (error) {
        // User cancelled sharing
      }
    } else {
      try {
        await navigator.clipboard.writeText(window.location.href);
        console.log('Product link copied to clipboard!');
      } catch (error) {
        console.error('Failed to copy link');
      }
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Back Navigation */}
      <div className="bg-card text-card-foreground shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-4">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to Products
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Product Images */}
          <div className="space-y-4">
            {/* Main Image */}
            <div className="aspect-square bg-card rounded-2xl overflow-hidden shadow-lg relative">
              <ImageWithFallback
                src={product.images[selectedImage] || product.images[0]}
                alt={product.name}
                className="w-full h-full object-cover"
              />
              {discount > 0 && (
                <div className="absolute top-4 left-4 bg-destructive text-destructive-foreground px-3 py-1 rounded-full text-sm font-semibold">
                  {discount}% OFF
                </div>
              )}
            </div>

            {/* Image Thumbnails */}
            {product.images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {product.images.map((image: string, index: number) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-colors ${
                      selectedImage === index 
                        ? 'border-primary' 
                        : 'border-border hover:border-accent'
                    }`}
                  >
                    <ImageWithFallback
                      src={image}
                      alt={`${product.name} ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Information */}
          <div className="space-y-6">
            {/* Header */}
            <div>
              {category && (
                <p className="text-sm text-primary font-medium mb-2">{category.name}</p>
              )}
              <h1 className="text-3xl font-bold text-foreground mb-2">{product.name}</h1>
              <div className="flex items-center gap-4">
                <div className="flex items-center">
                  <Star className="h-5 w-5 text-yellow-400 fill-current" />
                  <span className="ml-1 text-sm text-muted-foreground">4.8 (124 reviews)</span>
                </div>
                <span className="text-sm text-muted-foreground">SKU: {product.sku}</span>
              </div>
            </div>

            {/* Stock Status */}
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${stockInfo.color}`}>
              <stockInfo.icon className="h-4 w-4" />
              <span className="text-sm font-medium">{stockInfo.message}</span>
            </div>

            {/* Price */}
            <div className="space-y-1">
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-bold text-foreground">
                  R{product.price.toFixed(2)}
                </span>
                {product.compare_at_price && (
                  <span className="text-lg text-muted-foreground line-through">
                    R{product.compare_at_price.toFixed(2)}
                  </span>
                )}
                {discount > 0 && (
                  <span className="text-lg font-medium text-green-600">
                    Save R{(product.compare_at_price! - product.price).toFixed(2)}
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">Price includes VAT</p>
            </div>

            {/* Description */}
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Description</h3>
              <p className="text-muted-foreground leading-relaxed">
                {product.description || product.short_description || 'No description available.'}
              </p>
            </div>

            {/* Features */}
            {product.features && product.features.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-3">Key Features</h3>
                <ul className="space-y-2">
                  {product.features.map((feature: string, index: number) => (
                    <li key={index} className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Quantity and Add to Cart */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Quantity
                </label>
                <div className="flex items-center gap-3">
                  <div className="flex items-center border border-input rounded-lg bg-card">
                    <button
                      onClick={() => handleQuantityChange(quantity - 1)}
                      disabled={quantity <= 1}
                      className="p-2 text-muted-foreground hover:text-foreground disabled:opacity-50"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="px-4 py-2 text-center min-w-[3rem]">{quantity}</span>
                    <button
                      onClick={() => handleQuantityChange(quantity + 1)}
                      disabled={quantity >= Math.min(10, product.stock_quantity || 0)}
                      className="p-2 text-muted-foreground hover:text-foreground disabled:opacity-50"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    Maximum {Math.min(10, product.stock_quantity || 0)} per order
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleAddToCart}
                  disabled={loading || stockInfo.status === 'out-of-stock'}
                  className="flex-1 bg-primary text-primary-foreground py-3 px-6 rounded-lg font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <ShoppingCart className="h-5 w-5" />
                  )}
                  {stockInfo.status === 'out-of-stock' ? 'Out of Stock' : 'Add to Cart'}
                </button>
                
                <button
                  onClick={handleToggleFavourite}
                  disabled={favouriteLoading}
                  className={`p-3 rounded-lg border transition-colors ${
                    isProductFavourite
                      ? 'bg-destructive/10 border-destructive/30 text-destructive'
                      : 'bg-card border-input text-muted-foreground hover:bg-accent'
                  }`}
                >
                  {favouriteLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Heart className={`h-5 w-5 ${isProductFavourite ? 'fill-current' : ''}`} />
                  )}
                </button>
                
                <button
                  onClick={handleShare}
                  className="p-3 rounded-lg border border-input text-muted-foreground hover:bg-accent"
                >
                  <Share2 className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Trust Badges */}
            <div className="grid grid-cols-3 gap-4 pt-6 border-t">
              <div className="text-center">
                <Shield className="h-6 w-6 text-primary mx-auto mb-1" />
                <p className="text-xs text-muted-foreground">Quality Guarantee</p>
              </div>
              <div className="text-center">
                <Truck className="h-6 w-6 text-primary mx-auto mb-1" />
                <p className="text-xs text-muted-foreground">Free Delivery over $500</p>
              </div>
              <div className="text-center">
                <RotateCcw className="h-6 w-6 text-primary mx-auto mb-1" />
                <p className="text-xs text-muted-foreground">30-Day Return Policy</p>
              </div>
            </div>
          </div>
        </div>

        {/* Specifications */}
        {product.specifications && Object.keys(product.specifications).length > 0 && (
          <div className="mt-12 bg-card text-card-foreground rounded-2xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-foreground mb-6">Specifications</h2>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(product.specifications).map(([key, value]) => (
                <div key={key} className="border-b border-border pb-2">
                  <dt className="text-sm font-medium text-foreground">{key}</dt>
                  <dd className="text-sm text-muted-foreground mt-1">{String(value)}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </div>
    </div>
  );
}
