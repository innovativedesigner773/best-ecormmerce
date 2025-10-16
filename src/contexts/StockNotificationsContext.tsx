import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

interface StockNotification {
  id: string;
  product_id: string;
  product_name: string;
  product_image: string;
  product_price: number;
  email: string;
  created_at: string;
  is_notified: boolean;
}

interface StockNotificationsContextType {
  notifications: StockNotification[];
  loading: boolean;
  addStockNotification: (productId: string, email: string) => Promise<boolean>;
  removeStockNotification: (notificationId: string) => Promise<boolean>;
  hasNotificationForProduct: (productId: string) => boolean;
  refreshNotifications: () => Promise<void>;
}

const StockNotificationsContext = createContext<StockNotificationsContextType | undefined>(undefined);

export const useStockNotifications = () => {
  const context = useContext(StockNotificationsContext);
  if (context === undefined) {
    throw new Error('useStockNotifications must be used within a StockNotificationsProvider');
  }
  return context;
};

interface StockNotificationsProviderProps {
  children: ReactNode;
}

export const StockNotificationsProvider: React.FC<StockNotificationsProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<StockNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  // Fetch user's stock notifications
  const fetchNotifications = async () => {
    if (!user) {
      setNotifications([]);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_user_stock_notifications', {
        user_id_param: user.id
      });

      if (error) {
        console.error('Error fetching stock notifications:', error);
        return;
      }

      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching stock notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // Add a new stock notification
  const addStockNotification = async (productId: string, email: string): Promise<boolean> => {
    if (!user) {
      console.error('User must be logged in to add stock notifications');
      return false;
    }

    try {
      // Check if user already has a notification for this product
      const { data: existing, error: checkError } = await supabase
        .from('stock_notifications')
        .select('id')
        .eq('user_id', user.id)
        .eq('product_id', productId)
        .eq('is_notified', false)
        .single();

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error checking existing notification:', checkError);
        return false;
      }

      if (existing) {
        console.log('User already has a notification for this product');
        return false;
      }

      // Insert new notification
      const { data, error } = await supabase
        .from('stock_notifications')
        .insert({
          user_id: user.id,
          product_id: productId,
          email: email
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding stock notification:', error);
        return false;
      }

      // Refresh notifications list
      await fetchNotifications();
      return true;
    } catch (error) {
      console.error('Error adding stock notification:', error);
      return false;
    }
  };

  // Remove a stock notification
  const removeStockNotification = async (notificationId: string): Promise<boolean> => {
    if (!user) {
      console.error('User must be logged in to remove stock notifications');
      return false;
    }

    try {
      const { error } = await supabase
        .from('stock_notifications')
        .delete()
        .eq('id', notificationId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error removing stock notification:', error);
        return false;
      }

      // Refresh notifications list
      await fetchNotifications();
      return true;
    } catch (error) {
      console.error('Error removing stock notification:', error);
      return false;
    }
  };

  // Check if user has a notification for a specific product
  const hasNotificationForProduct = (productId: string): boolean => {
    return notifications.some(notification => 
      notification.product_id === productId && !notification.is_notified
    );
  };

  // Refresh notifications
  const refreshNotifications = async () => {
    await fetchNotifications();
  };

  // Fetch notifications when user changes
  useEffect(() => {
    fetchNotifications();
  }, [user]);

  const value: StockNotificationsContextType = {
    notifications,
    loading,
    addStockNotification,
    removeStockNotification,
    hasNotificationForProduct,
    refreshNotifications
  };

  return (
    <StockNotificationsContext.Provider value={value}>
      {children}
    </StockNotificationsContext.Provider>
  );
};
