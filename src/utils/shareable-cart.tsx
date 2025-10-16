import { supabase } from '../lib/supabase';
import { CartItem } from '../contexts/CartContext';

export interface ShareableCart {
  id: string;
  share_token: string;
  original_user_id?: string;
  original_session_id?: string;
  cart_data: {
    items: CartItem[];
    subtotal: number;
    discount_amount: number;
    promotion_discount: number;
    total: number;
    applied_promotions: any[];
    loyalty_points_used: number;
    loyalty_discount: number;
  };
  cart_metadata: {
    original_user_name?: string;
    original_user_email?: string;
    message?: string;
    expires_in_days?: number;
  };
  status: 'active' | 'paid' | 'expired' | 'cancelled';
  expires_at: string;
  paid_by_user_id?: string;
  paid_at?: string;
  order_id?: string;
  access_count: number;
  last_accessed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateShareableCartData {
  cart_data: {
    items: CartItem[];
    subtotal: number;
    discount_amount: number;
    promotion_discount: number;
    total: number;
    applied_promotions: any[];
    loyalty_points_used: number;
    loyalty_discount: number;
  };
  cart_metadata?: {
    message?: string;
    expires_in_days?: number;
  };
}

export interface ShareableCartResponse {
  success: boolean;
  data?: ShareableCart;
  error?: string;
}

export class ShareableCartService {
  /**
   * Create a new shareable cart
   */
  static async createShareableCart(data: CreateShareableCartData): Promise<ShareableCartResponse> {
    try {
      const { data: user } = await supabase.auth.getUser();
      
      const shareableCartData = {
        original_user_id: user?.user?.id || null,
        cart_data: data.cart_data,
        cart_metadata: {
          original_user_name: user?.user?.user_metadata?.first_name 
            ? `${user.user.user_metadata.first_name} ${user.user.user_metadata.last_name || ''}`.trim()
            : null,
          original_user_email: user?.user?.email || null,
          ...data.cart_metadata,
        },
        expires_at: new Date(Date.now() + (data.cart_metadata?.expires_in_days || 7) * 24 * 60 * 60 * 1000).toISOString(),
      };

      const { data: result, error } = await supabase
        .from('shareable_carts')
        .insert(shareableCartData)
        .select()
        .single();

      if (error) {
        console.error('Error creating shareable cart:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data: result };
    } catch (error) {
      console.error('Error creating shareable cart:', error);
      return { success: false, error: 'Failed to create shareable cart' };
    }
  }

  /**
   * Get a shareable cart by token
   */
  static async getShareableCartByToken(token: string): Promise<ShareableCartResponse> {
    try {
      console.log('🔍 Fetching shareable cart with token:', token);
      
      const { data, error } = await supabase
        .from('shareable_carts')
        .select('*')
        .eq('share_token', token)
        .eq('status', 'active')
        .gt('expires_at', new Date().toISOString())
        .single();

      if (error) {
        console.error('❌ Error fetching shareable cart:', error);
        return { success: false, error: 'Shareable cart not found or expired' };
      }

      console.log('✅ Shareable cart found:', data);
      console.log('📦 Cart data items:', data.cart_data?.items);

      // Update access count and last accessed time
      await supabase
        .from('shareable_carts')
        .update({
          access_count: data.access_count + 1,
          last_accessed_at: new Date().toISOString(),
        })
        .eq('id', data.id);

      return { success: true, data };
    } catch (error) {
      console.error('Error fetching shareable cart:', error);
      return { success: false, error: 'Failed to fetch shareable cart' };
    }
  }

  /**
   * Mark a shareable cart as paid
   */
  static async markAsPaid(token: string, orderId: string): Promise<ShareableCartResponse> {
    try {
      const { data: user } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('shareable_carts')
        .update({
          status: 'paid',
          paid_by_user_id: user?.user?.id || null,
          paid_at: new Date().toISOString(),
          order_id: orderId,
        })
        .eq('share_token', token)
        .eq('status', 'active')
        .select()
        .single();

      if (error) {
        console.error('Error marking cart as paid:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Error marking cart as paid:', error);
      return { success: false, error: 'Failed to mark cart as paid' };
    }
  }

  /**
   * Get user's shareable carts
   */
  static async getUserShareableCarts(): Promise<ShareableCartResponse> {
    try {
      const { data: user } = await supabase.auth.getUser();
      
      if (!user?.user?.id) {
        return { success: false, error: 'User not authenticated' };
      }

      const { data, error } = await supabase
        .from('shareable_carts')
        .select('*')
        .eq('original_user_id', user.user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user shareable carts:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data: data as any };
    } catch (error) {
      console.error('Error fetching user shareable carts:', error);
      return { success: false, error: 'Failed to fetch shareable carts' };
    }
  }

  /**
   * Cancel a shareable cart
   */
  static async cancelShareableCart(token: string): Promise<ShareableCartResponse> {
    try {
      const { data: user } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('shareable_carts')
        .update({ status: 'cancelled' })
        .eq('share_token', token)
        .eq('original_user_id', user?.user?.id)
        .eq('status', 'active')
        .select()
        .single();

      if (error) {
        console.error('Error cancelling shareable cart:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Error cancelling shareable cart:', error);
      return { success: false, error: 'Failed to cancel shareable cart' };
    }
  }

  /**
   * Extend expiration of a shareable cart
   */
  static async extendExpiration(token: string, days: number = 7): Promise<ShareableCartResponse> {
    try {
      const { data: user } = await supabase.auth.getUser();
      
      const newExpirationDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
      
      const { data, error } = await supabase
        .from('shareable_carts')
        .update({ 
          expires_at: newExpirationDate,
          status: 'active' // Reset to active if it was expired
        })
        .eq('share_token', token)
        .eq('original_user_id', user?.user?.id)
        .select()
        .single();

      if (error) {
        console.error('Error extending shareable cart:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Error extending shareable cart:', error);
      return { success: false, error: 'Failed to extend shareable cart' };
    }
  }

  /**
   * Generate shareable URL
   */
  static generateShareableUrl(token: string, baseUrl?: string): string {
    const base = baseUrl || window.location.origin;
    return `${base}/checkout?shared=${token}`;
  }

  /**
   * Copy shareable URL to clipboard
   */
  static async copyToClipboard(url: string): Promise<boolean> {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url);
        return true;
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = url;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const result = document.execCommand('copy');
        textArea.remove();
        return result;
      }
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      return false;
    }
  }

  /**
   * Share via native share API or fallback
   */
  static async shareCart(url: string, title: string, text: string): Promise<boolean> {
    try {
      if (navigator.share) {
        await navigator.share({
          title,
          text,
          url,
        });
        return true;
      } else {
        // Fallback to clipboard
        return await this.copyToClipboard(url);
      }
    } catch (error) {
      console.error('Error sharing cart:', error);
      return false;
    }
  }

  /**
   * Get shareable cart analytics (admin only)
   */
  static async getShareableCartAnalytics(): Promise<ShareableCartResponse> {
    try {
      const { data, error } = await supabase
        .from('shareable_cart_analytics')
        .select('*')
        .order('date', { ascending: false })
        .limit(30);

      if (error) {
        console.error('Error fetching analytics:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data: data as any };
    } catch (error) {
      console.error('Error fetching analytics:', error);
      return { success: false, error: 'Failed to fetch analytics' };
    }
  }
}
