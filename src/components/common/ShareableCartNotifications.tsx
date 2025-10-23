import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, X, Bell } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { ShareableCartService } from '../../utils/shareable-cart';
import { toast } from 'sonner';

interface ShareableCartNotification {
  id: string;
  type: 'paid' | 'expired' | 'accessed';
  shareableCart: any;
  message: string;
  timestamp: string;
  read: boolean;
}

export default function ShareableCartNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<ShareableCartNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (user) {
      loadNotifications();
      // Set up polling for new notifications (every 30 seconds)
      const interval = setInterval(loadNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const loadNotifications = async () => {
    if (!user) return;

    try {
      const result = await ShareableCartService.getUserShareableCarts();
      if (result.success && result.data) {
        const shareableCarts = result.data as any[];
        
        // Create notifications for recent activities
        const newNotifications: ShareableCartNotification[] = [];
        
        shareableCarts.forEach((cart) => {
          // Notification for paid carts
          if (cart.status === 'paid' && cart.paid_at) {
            const paidDate = new Date(cart.paid_at);
            const now = new Date();
            const hoursDiff = (now.getTime() - paidDate.getTime()) / (1000 * 60 * 60);
            
            // Only show notifications for carts paid in the last 24 hours
            if (hoursDiff <= 24) {
              newNotifications.push({
                id: `paid_${cart.id}`,
                type: 'paid',
                shareableCart: cart,
                message: `Your shared cart was paid for by ${cart.paid_by_user_id ? 'a user' : 'someone'}`,
                timestamp: cart.paid_at,
                read: false,
              });
            }
          }
          
          // Notification for expired carts
          if (cart.status === 'expired') {
            const expiredDate = new Date(cart.expires_at);
            const now = new Date();
            const hoursDiff = (now.getTime() - expiredDate.getTime()) / (1000 * 60 * 60);
            
            // Only show notifications for carts that expired in the last 24 hours
            if (hoursDiff <= 24) {
              newNotifications.push({
                id: `expired_${cart.id}`,
                type: 'expired',
                shareableCart: cart,
                message: 'Your shared cart has expired',
                timestamp: cart.expires_at,
                read: false,
              });
            }
          }
          
          // Notification for high access count
          if (cart.access_count > 5 && cart.last_accessed_at) {
            const lastAccessDate = new Date(cart.last_accessed_at);
            const now = new Date();
            const hoursDiff = (now.getTime() - lastAccessDate.getTime()) / (1000 * 60 * 60);
            
            // Only show notifications for recent high access
            if (hoursDiff <= 1) {
              newNotifications.push({
                id: `accessed_${cart.id}`,
                type: 'accessed',
                shareableCart: cart,
                message: `Your shared cart has been viewed ${cart.access_count} times`,
                timestamp: cart.last_accessed_at,
                read: false,
              });
            }
          }
        });
        
        // Sort by timestamp (newest first)
        newNotifications.sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        
        setNotifications(newNotifications);
        setUnreadCount(newNotifications.filter(n => !n.read).length);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const markAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === notificationId 
          ? { ...notification, read: true }
          : notification
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    );
    setUnreadCount(0);
  };

  const removeNotification = (notificationId: string) => {
    setNotifications(prev => {
      const notification = prev.find(n => n.id === notificationId);
      if (notification && !notification.read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      return prev.filter(n => n.id !== notificationId);
    });
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'paid':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'expired':
        return <AlertCircle className="w-5 h-5 text-orange-600" />;
      case 'accessed':
        return <Bell className="w-5 h-5 text-green-600" />;
      default:
        return <Bell className="w-5 h-5 text-gray-600" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'paid':
        return 'border-l-green-500 bg-green-50';
      case 'expired':
        return 'border-l-orange-500 bg-orange-50';
      case 'accessed':
        return 'border-l-green-500 bg-green-50';
      default:
        return 'border-l-gray-500 bg-gray-50';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  if (!user || notifications.length === 0) {
    return null;
  }

  return (
    <div className="relative">
      {/* Notification Bell */}
      <button
        onClick={() => setShowNotifications(!showNotifications)}
        className="relative p-1.5 sm:p-2 text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 rounded-full"
      >
        <Bell className="w-5 h-5 sm:w-6 sm:h-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 bg-red-500 text-white text-[10px] sm:text-xs rounded-full h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Dropdown */}
      {showNotifications && (
        <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-sm text-green-600 hover:text-green-800"
                >
                  Mark all as read
                </button>
              )}
            </div>
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 border-l-4 ${getNotificationColor(notification.type)} ${
                  !notification.read ? 'bg-opacity-100' : 'bg-opacity-50'
                } hover:bg-opacity-75 transition-colors`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    {getNotificationIcon(notification.type)}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${!notification.read ? 'font-medium' : 'font-normal'} text-gray-900`}>
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatTimestamp(notification.timestamp)}
                      </p>
                      {notification.shareableCart && (
                        <p className="text-xs text-gray-600 mt-1">
                          Total: R{notification.shareableCart.cart_data?.total?.toFixed(2) || '0.00'}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-1 ml-2">
                    {!notification.read && (
                      <button
                        onClick={() => markAsRead(notification.id)}
                        className="text-xs text-green-600 hover:text-green-800"
                      >
                        Mark read
                      </button>
                    )}
                    <button
                      onClick={() => removeNotification(notification.id)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {notifications.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              <Bell className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p>No notifications yet</p>
            </div>
          )}
        </div>
      )}

      {/* Click outside to close */}
      {showNotifications && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowNotifications(false)}
        />
      )}
    </div>
  );
}
