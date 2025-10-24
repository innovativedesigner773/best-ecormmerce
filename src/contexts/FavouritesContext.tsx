import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

export interface FavouriteItem {
  id: string;
  product_id: string;
  name: string;
  price: number;
  original_price?: number;
  image_url?: string;
  sku: string;
  in_stock: boolean;
  stock_count: number;
  category: string;
  brand?: string;
  description?: string;
  rating?: number;
  reviews_count?: number;
  promotion_badge?: string;
  promotion_discount?: number;
  added_at: string;
}

interface FavouritesContextType {
  items: FavouriteItem[];
  loading: boolean;
  addToFavourites: (product: any) => Promise<void>;
  removeFromFavourites: (productId: string) => Promise<void>;
  isFavourite: (productId: string) => boolean;
  clearFavourites: () => Promise<void>;
  updateStockStatus: (productId: string, stockData: { stock_count: number; in_stock: boolean }) => void;
}

const FavouritesContext = createContext<FavouritesContextType | undefined>(undefined);

export function useFavourites() {
  const context = useContext(FavouritesContext);
  if (context === undefined) {
    throw new Error('useFavourites must be used within a FavouritesProvider');
  }
  return context;
}

interface FavouritesProviderProps {
  children: ReactNode;
}

const FAVOURITES_STORAGE_KEY = 'best_brightness_favourites';

export function FavouritesProvider({ children }: FavouritesProviderProps) {
  const [items, setItems] = useState<FavouriteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const [realStockData, setRealStockData] = useState<Record<string, { stock_count: number; in_stock: boolean }>>({});
  const lastFetchedProductIds = useRef<string>('');

  // Load favourites on mount and when user changes
  useEffect(() => {
    loadFavourites();
  }, [user]);

  // Fetch real stock data for favourites
  useEffect(() => {
    const fetchStockData = async () => {
      if (items.length === 0) {
        setRealStockData({});
        return;
      }

      // Get unique product IDs from favourites
      const productIds = [...new Set(items.map(item => item.product_id))];
      const productIdsString = productIds.sort().join(',');
      
      // Skip fetch if we already have data for these products
      if (productIdsString === lastFetchedProductIds.current) {
        return;
      }

      try {
        console.log('📦 Fetching real stock data for favourites...');
        
        // Fetch stock data from Supabase with optimized query
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select('id, stock_quantity, is_active, stock_tracking')
          .in('id', productIds)
          .limit(100); // Add limit for performance

        if (productsError) {
          console.error('❌ Error fetching stock data for favourites:', productsError);
          // Set empty stock data to prevent undefined errors
          setRealStockData({});
          return;
        }

        console.log('✅ Stock data fetched for favourites:', productsData?.length || 0, 'products');

        // Create stock data mapping with better error handling
        const stockDataMap: Record<string, { stock_count: number; in_stock: boolean }> = {};
        productsData?.forEach(product => {
          try {
            const stockCount = Number(product.stock_quantity) || 0;
            const isInStock = product.is_active && (product.stock_tracking ? stockCount > 0 : true);
            
            stockDataMap[product.id] = {
              stock_count: stockCount,
              in_stock: isInStock
            };
          } catch (error) {
            console.warn('Error processing stock data for product:', product.id, error);
            // Set default values for problematic products
            stockDataMap[product.id] = {
              stock_count: 0,
              in_stock: false
            };
          }
        });

        setRealStockData(stockDataMap);
        lastFetchedProductIds.current = productIdsString;
      } catch (error) {
        console.error('Error fetching stock data for favourites:', error);
        // Set empty stock data to prevent undefined errors
        setRealStockData({});
      }
    };

    // Debounce the fetch to avoid too many requests
    const timeoutId = setTimeout(fetchStockData, 300);
    return () => clearTimeout(timeoutId);
  }, [items.length]); // Only depend on items.length, not the entire items array

  // Update favourites with real stock data
  useEffect(() => {
    const updateStockLevels = () => {
      setItems(prevItems => {
        let hasUpdates = false;
        const updatedItems = prevItems.map(item => {
          const stockData = realStockData[item.product_id];
          if (stockData && (stockData.stock_count !== item.stock_count || stockData.in_stock !== item.in_stock)) {
            hasUpdates = true;
            return {
              ...item,
              stock_count: stockData.stock_count,
              in_stock: stockData.in_stock
            };
          }
          return item;
        });
        
        // Only update state if there are actual changes
        return hasUpdates ? updatedItems : prevItems;
      });
    };

    // Only run if we have real stock data
    if (Object.keys(realStockData).length > 0) {
      updateStockLevels();
    }
  }, [realStockData]);

  const loadFavourites = async () => {
    try {
      setLoading(true);
      
      if (user) {
        // For authenticated users, load from server (simulate with localStorage + user prefix)
        const serverKey = `${FAVOURITES_STORAGE_KEY}_${user.id}`;
        const stored = localStorage.getItem(serverKey);
        if (stored) {
          try {
            const favourites = JSON.parse(stored);
            // Update with current stock data if available
            const updatedFavourites = favourites.map((item: FavouriteItem) => {
              const stockData = realStockData[item.product_id];
              if (stockData) {
                return { ...item, ...stockData };
              }
              // Keep existing stock data if no real data available
              return item;
            });
            setItems(updatedFavourites);
          } catch (parseError) {
            console.error('Error parsing stored favourites:', parseError);
            // Clear corrupted data
            localStorage.removeItem(serverKey);
            setItems([]);
          }
        }
      } else {
        // For guest users, load from localStorage
        const stored = localStorage.getItem(FAVOURITES_STORAGE_KEY);
        if (stored) {
          try {
            const favourites = JSON.parse(stored);
            // Update with current stock data if available
            const updatedFavourites = favourites.map((item: FavouriteItem) => {
              const stockData = realStockData[item.product_id];
              if (stockData) {
                return { ...item, ...stockData };
              }
              // Keep existing stock data if no real data available
              return item;
            });
            setItems(updatedFavourites);
          } catch (parseError) {
            console.error('Error parsing stored favourites:', parseError);
            // Clear corrupted data
            localStorage.removeItem(FAVOURITES_STORAGE_KEY);
            setItems([]);
          }
        }
      }
    } catch (error) {
      console.error('Error loading favourites:', error);
      // Set empty array as fallback
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const saveFavourites = async (favourites: FavouriteItem[]) => {
    try {
      const key = user ? `${FAVOURITES_STORAGE_KEY}_${user.id}` : FAVOURITES_STORAGE_KEY;
      localStorage.setItem(key, JSON.stringify(favourites));
      
      // In a real implementation, this would sync to the server for authenticated users
      if (user) {
        // TODO: Sync to server
        console.log('Syncing favourites to server for user:', user.id);
      }
    } catch (error) {
      console.error('Error saving favourites:', error);
    }
  };

  const addToFavourites = async (product: any) => {
    try {
      const productId = product.id || product.product_id;
      
      // Check if already in favourites
      if (items.some(item => item.product_id === productId)) {
        toast.info('Product is already in your favourites');
        return;
      }

      // Get current stock data from real stock data or use product data as fallback
      const stockData = realStockData[productId] || {
        stock_count: product.stock_count || 0,
        in_stock: product.in_stock !== false && (product.stock_count || 0) > 0
      };

      const favouriteItem: FavouriteItem = {
        id: `fav_${productId}_${Date.now()}`,
        product_id: productId,
        name: product.name,
        price: product.price,
        original_price: product.original_price,
        image_url: product.image_url,
        sku: product.sku || `SKU-${productId}`,
        category: product.category || 'Unknown',
        brand: product.brand,
        description: product.description,
        rating: product.rating,
        reviews_count: product.reviews_count,
        promotion_badge: product.promotion_badge,
        promotion_discount: product.promotion_discount,
        added_at: new Date().toISOString(),
        ...stockData
      };

      const newItems = [...items, favouriteItem];
      setItems(newItems);
      await saveFavourites(newItems);
      
      toast.success(`${product.name} added to favourites!`);
    } catch (error) {
      console.error('Error adding to favourites:', error);
      toast.error('Failed to add to favourites. Please try again.');
    }
  };

  const removeFromFavourites = async (productId: string) => {
    try {
      const newItems = items.filter(item => item.product_id !== productId);
      setItems(newItems);
      await saveFavourites(newItems);
      
      const item = items.find(item => item.product_id === productId);
      toast.success(`${item?.name || 'Product'} removed from favourites`);
    } catch (error) {
      console.error('Error removing from favourites:', error);
      toast.error('Failed to remove from favourites. Please try again.');
    }
  };

  const isFavourite = (productId: string): boolean => {
    return items.some(item => item.product_id === productId);
  };

  const clearFavourites = async () => {
    try {
      setItems([]);
      await saveFavourites([]);
      toast.success('All favourites cleared');
    } catch (error) {
      console.error('Error clearing favourites:', error);
      toast.error('Failed to clear favourites. Please try again.');
    }
  };

  const updateStockStatus = (productId: string, stockData: { stock_count: number; in_stock: boolean }) => {
    setItems(prevItems =>
      prevItems.map(item =>
        item.product_id === productId
          ? { ...item, ...stockData }
          : item
      )
    );
  };

  const value: FavouritesContextType = {
    items,
    loading,
    addToFavourites,
    removeFromFavourites,
    isFavourite,
    clearFavourites,
    updateStockStatus,
  };

  return (
    <FavouritesContext.Provider value={value}>
      {children}
    </FavouritesContext.Provider>
  );
}