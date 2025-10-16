import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { toast } from 'sonner';
import { useAuth } from './AuthContext';

export interface CartItem {
  id: string;
  product_id: string;
  name: string;
  price: number;
  original_price: number;
  quantity: number;
  image_url?: string;
  sku?: string;
  brand?: string;
  category?: string;
  promotion_id?: string;
  promotion_discount?: number;
  combo_id?: string;
  in_stock: boolean;
  added_at: string;
  variant?: {
    color?: string;
    size?: string;
    [key: string]: any;
  };
}

export interface Promotion {
  id: string;
  name: string;
  description: string;
  discount_type: 'percentage' | 'fixed_amount';
  discount_value: number;
  minimum_quantity?: number;
  maximum_discount_amount?: number;
}

interface GuestCart {
  items: CartItem[];
  metadata: {
    total_items: number;
    subtotal: number;
    created_at: string;
    updated_at: string;
  };
}

interface CartState {
  items: CartItem[];
  loading: boolean;
  subtotal: number;
  discount_amount: number;
  promotion_discount: number;
  total: number;
  applied_promotions: Promotion[];
  loyalty_points_used: number;
  loyalty_discount: number;
  isGuestCart: boolean;
}

type CartAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_CART'; payload: CartItem[] }
  | { type: 'ADD_ITEM'; payload: CartItem }
  | { type: 'UPDATE_ITEM'; payload: { id: string; quantity: number } }
  | { type: 'REMOVE_ITEM'; payload: string }
  | { type: 'CLEAR_CART' }
  | { type: 'APPLY_PROMOTION'; payload: Promotion }
  | { type: 'REMOVE_PROMOTION'; payload: string }
  | { type: 'SET_LOYALTY_POINTS'; payload: { points: number; discount: number } }
  | { type: 'SET_GUEST_MODE'; payload: boolean }
  | { type: 'CALCULATE_TOTALS' };

const initialState: CartState = {
  items: [],
  loading: false,
  subtotal: 0,
  discount_amount: 0,
  promotion_discount: 0,
  total: 0,
  applied_promotions: [],
  loyalty_points_used: 0,
  loyalty_discount: 0,
  isGuestCart: true,
};

const GUEST_CART_KEY = 'ecommerce_guest_cart';

// localStorage utilities
const saveGuestCart = (cartData: GuestCart) => {
  try {
    localStorage.setItem(GUEST_CART_KEY, JSON.stringify(cartData));
  } catch (error) {
    console.warn('Failed to save cart to localStorage:', error);
  }
};

const loadGuestCart = (): GuestCart | null => {
  try {
    const stored = localStorage.getItem(GUEST_CART_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.warn('Failed to load cart from localStorage:', error);
  }
  return null;
};

const clearGuestCart = () => {
  try {
    localStorage.removeItem(GUEST_CART_KEY);
  } catch (error) {
    console.warn('Failed to clear cart from localStorage:', error);
  }
};

function calculateTotals(state: CartState): CartState {
  const subtotal = state.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const promotion_discount = state.items.reduce((sum, item) => sum + ((item.promotion_discount || 0) * item.quantity), 0);
  const total = subtotal - promotion_discount - state.loyalty_discount;

  return {
    ...state,
    subtotal,
    promotion_discount,
    discount_amount: promotion_discount + state.loyalty_discount,
    total: Math.max(0, total),
  };
}

function cartReducer(state: CartState, action: CartAction): CartState {
  let newState: CartState;

  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };

    case 'SET_CART':
      return calculateTotals({ ...state, items: action.payload });

    case 'ADD_ITEM': {
      const existingItem = state.items.find(item => 
        item.product_id === action.payload.product_id &&
        JSON.stringify(item.variant) === JSON.stringify(action.payload.variant)
      );
      
      if (existingItem) {
        const updatedItems = state.items.map(item =>
          item.id === existingItem.id
            ? { ...item, quantity: item.quantity + action.payload.quantity }
            : item
        );
        newState = calculateTotals({ ...state, items: updatedItems });
      } else {
        newState = calculateTotals({ ...state, items: [...state.items, action.payload] });
      }
      break;
    }

    case 'UPDATE_ITEM': {
      const updatedItems = state.items.map(item =>
        item.id === action.payload.id
          ? { ...item, quantity: action.payload.quantity }
          : item
      ).filter(item => item.quantity > 0);
      
      newState = calculateTotals({ ...state, items: updatedItems });
      break;
    }

    case 'REMOVE_ITEM': {
      const updatedItems = state.items.filter(item => item.id !== action.payload);
      newState = calculateTotals({ ...state, items: updatedItems });
      break;
    }

    case 'CLEAR_CART':
      newState = { ...initialState, isGuestCart: state.isGuestCart };
      break;

    case 'APPLY_PROMOTION': {
      const updatedPromotions = [...state.applied_promotions, action.payload];
      newState = { ...state, applied_promotions: updatedPromotions };
      break;
    }

    case 'REMOVE_PROMOTION': {
      const updatedPromotions = state.applied_promotions.filter(p => p.id !== action.payload);
      newState = { ...state, applied_promotions: updatedPromotions };
      break;
    }

    case 'SET_LOYALTY_POINTS':
      newState = calculateTotals({
        ...state,
        loyalty_points_used: action.payload.points,
        loyalty_discount: action.payload.discount,
      });
      break;

    case 'SET_GUEST_MODE':
      newState = { ...state, isGuestCart: action.payload };
      break;

    case 'CALCULATE_TOTALS':
      newState = calculateTotals(state);
      break;

    default:
      return state;
  }

  // Save to localStorage if in guest mode
  if (newState.isGuestCart) {
    const guestCartData: GuestCart = {
      items: newState.items,
      metadata: {
        total_items: newState.items.reduce((sum, item) => sum + item.quantity, 0),
        subtotal: newState.subtotal,
        created_at: loadGuestCart()?.metadata.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    };
    saveGuestCart(guestCartData);
  }

  return newState;
}

interface CartContextType extends CartState {
  addToCart: (product: any, quantity?: number, variant?: any) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  removeFromCart: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  applyPromoCode: (code: string) => Promise<void>;
  removePromotion: (promotionId: string) => Promise<void>;
  redeemLoyaltyPoints: (points: number) => Promise<void>;
  refreshCart: () => Promise<void>;
  mergeGuestCartWithUser: () => Promise<void>;
  getTotalItemCount: () => number;
  canShareCart: () => boolean;
  getCartSummary: () => {
    items: CartItem[];
    subtotal: number;
    discount_amount: number;
    promotion_discount: number;
    total: number;
    applied_promotions: Promotion[];
    loyalty_points_used: number;
    loyalty_discount: number;
  };
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, initialState);
  const { user } = useAuth();

  // Load cart when component mounts or user changes
  useEffect(() => {
    const loadCart = async () => {
      if (user) {
        // User is authenticated - switch to user cart
        dispatch({ type: 'SET_GUEST_MODE', payload: false });
        
        // If there's a guest cart, merge it
        const guestCart = loadGuestCart();
        if (guestCart && guestCart.items.length > 0) {
          console.log('Found guest cart to merge with user cart');
          // Merge guest cart items
          dispatch({ type: 'SET_CART', payload: guestCart.items });
          // Clear the guest cart from localStorage
          clearGuestCart();
        }
        
        // Load user's cart from server (if implemented)
        // await refreshCart();
      } else {
        // User is not authenticated - load guest cart
        dispatch({ type: 'SET_GUEST_MODE', payload: true });
        
        const guestCart = loadGuestCart();
        if (guestCart) {
          dispatch({ type: 'SET_CART', payload: guestCart.items });
        } else {
          dispatch({ type: 'CLEAR_CART' });
        }
      }
    };

    loadCart();
  }, [user]);

  const addToCart = async (product: any, quantity: number = 1, variant?: any) => {
    try {
      const cartItem: CartItem = {
        id: `${product.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        product_id: product.id.toString(),
        name: product.name,
        price: product.current_price || product.price,
        original_price: product.original_price || product.price,
        quantity,
        image_url: product.image_url || product.image,
        sku: product.sku,
        brand: product.brand,
        category: product.category,
        promotion_discount: product.promotion_discount || 0,
        promotion_id: product.promotion_id,
        in_stock: product.in_stock !== false,
        added_at: new Date().toISOString(),
        variant,
      };

      dispatch({ type: 'ADD_ITEM', payload: cartItem });
      toast.success(`${product.name} added to cart`, {
        description: state.isGuestCart ? 'Added to guest cart' : undefined,
      });
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast.error('Failed to add item to cart');
    }
  };

  const updateQuantity = async (itemId: string, quantity: number) => {
    try {
      dispatch({ type: 'UPDATE_ITEM', payload: { id: itemId, quantity } });
      
      if (quantity === 0) {
        toast.success('Item removed from cart');
      } else {
        toast.success('Cart updated');
      }
    } catch (error) {
      console.error('Error updating cart:', error);
      toast.error('Failed to update cart');
    }
  };

  const removeFromCart = async (itemId: string) => {
    try {
      dispatch({ type: 'REMOVE_ITEM', payload: itemId });
      toast.success('Item removed from cart');
    } catch (error) {
      console.error('Error removing from cart:', error);
      toast.error('Failed to remove item');
    }
  };

  const clearCart = async () => {
    try {
      dispatch({ type: 'CLEAR_CART' });
      if (state.isGuestCart) {
        clearGuestCart();
      }
      toast.success('Cart cleared');
    } catch (error) {
      console.error('Error clearing cart:', error);
      toast.error('Failed to clear cart');
    }
  };

  const applyPromoCode = async (code: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      // This would typically make an API call to validate the promo code
      // For now, we'll simulate a successful response
      const mockPromotion: Promotion = {
        id: `promo_${Date.now()}`,
        name: `Promo Code: ${code}`,
        description: '10% off your order',
        discount_type: 'percentage',
        discount_value: 10,
      };

      dispatch({ type: 'APPLY_PROMOTION', payload: mockPromotion });
      toast.success('Promo code applied successfully!');
    } catch (error) {
      console.error('Error applying promo code:', error);
      toast.error('Invalid promo code');
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const removePromotion = async (promotionId: string) => {
    try {
      dispatch({ type: 'REMOVE_PROMOTION', payload: promotionId });
      toast.success('Promotion removed');
    } catch (error) {
      console.error('Error removing promotion:', error);
      toast.error('Failed to remove promotion');
    }
  };

  const redeemLoyaltyPoints = async (points: number) => {
    try {
      const discount = points * 0.01; // 1 point = R0.01
      dispatch({ type: 'SET_LOYALTY_POINTS', payload: { points, discount } });
      toast.success(`${points} loyalty points redeemed for R${discount.toFixed(2)} discount`);
    } catch (error) {
      console.error('Error redeeming points:', error);
      toast.error('Failed to redeem loyalty points');
    }
  };

  const refreshCart = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      // This would typically load cart from server for authenticated users
      // For guest cart, we reload from localStorage
      if (state.isGuestCart) {
        const guestCart = loadGuestCart();
        if (guestCart) {
          dispatch({ type: 'SET_CART', payload: guestCart.items });
        }
      }
    } catch (error) {
      console.error('Error refreshing cart:', error);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const mergeGuestCartWithUser = async () => {
    if (!user || !state.isGuestCart) return;
    
    try {
      // This would typically sync the cart with the server
      // For now, we'll just switch modes and keep the items
      dispatch({ type: 'SET_GUEST_MODE', payload: false });
      clearGuestCart();
      toast.success('Cart synced with your account');
    } catch (error) {
      console.error('Error merging cart:', error);
      toast.error('Failed to sync cart');
    }
  };

  const getTotalItemCount = () => {
    return state.items.reduce((total, item) => total + item.quantity, 0);
  };

  const canShareCart = () => {
    return state.items.length > 0 && state.total > 0;
  };

  const getCartSummary = () => {
    return {
      items: state.items,
      subtotal: state.subtotal,
      discount_amount: state.discount_amount,
      promotion_discount: state.promotion_discount,
      total: state.total,
      applied_promotions: state.applied_promotions,
      loyalty_points_used: state.loyalty_points_used,
      loyalty_discount: state.loyalty_discount,
    };
  };

  const value: CartContextType = {
    ...state,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    applyPromoCode,
    removePromotion,
    redeemLoyaltyPoints,
    refreshCart,
    mergeGuestCartWithUser,
    getTotalItemCount,
    canShareCart,
    getCartSummary,
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}