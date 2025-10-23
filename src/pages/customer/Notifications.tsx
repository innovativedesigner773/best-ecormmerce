import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, BellOff, Trash2, Package, Calendar, Mail, Eye, AlertTriangle } from 'lucide-react';
import { useStockNotifications } from '../../contexts/StockNotificationsContext';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';
import { motion } from 'framer-motion';

export default function Notifications() {
  const { notifications, loading, removeStockNotification } = useStockNotifications();
  const { user } = useAuth();
  const [removingId, setRemovingId] = useState<string | null>(null);

  const handleRemoveNotification = async (notificationId: string) => {
    setRemovingId(notificationId);
    try {
      await removeStockNotification(notificationId);
    } catch (error) {
      console.error('Error removing notification:', error);
    } finally {
      setRemovingId(null);
    }
  };

  const pendingNotifications = notifications.filter(n => !n.is_notified);
  const sentNotifications = notifications.filter(n => n.is_notified);

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <Bell className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Stock Notifications</h1>
            <p className="text-gray-600 mb-8">Please log in to view your stock notifications.</p>
            <Link
              to="/login"
              className="inline-flex items-center px-6 py-3 bg-[#4682B4] text-white rounded-xl hover:bg-[#2C3E50] transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Bell className="h-12 w-12 text-[#4682B4] mr-3" />
            <h1 className="text-3xl font-bold text-gray-900">Stock Notifications</h1>
          </div>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Manage your stock notifications for out-of-stock products. We'll email you when they become available again.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="flex items-center">
              <div className="p-3 bg-orange-100 rounded-lg">
                <Bell className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-gray-900">{pendingNotifications.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-lg">
                <BellOff className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Sent</p>
                <p className="text-2xl font-bold text-gray-900">{sentNotifications.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-lg">
                <Package className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total</p>
                <p className="text-2xl font-bold text-gray-900">{notifications.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Pending Notifications */}
        {pendingNotifications.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <AlertTriangle className="h-5 w-5 text-orange-500 mr-2" />
              Pending Notifications ({pendingNotifications.length})
            </h2>
            <div className="space-y-4">
              {pendingNotifications.map((notification) => (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-xl p-6 shadow-lg border-l-4 border-orange-500"
                >
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <ImageWithFallback
                        src={notification.product_image}
                        alt={notification.product_name}
                        className="w-16 h-16 object-cover rounded-lg"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {notification.product_name}
                      </h3>
                      <p className="text-sm text-gray-600 mb-2">
                        We'll notify you when this product is back in stock
                      </p>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <div className="flex items-center">
                          <Mail className="h-4 w-4 mr-1" />
                          {notification.email}
                        </div>
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          {new Date(notification.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex-shrink-0 flex space-x-2">
                      <Link
                        to={`/products/${notification.product_id}`}
                        className="p-2 text-[#4682B4] hover:bg-[#F8F9FA] rounded-lg transition-colors"
                        title="View Product"
                      >
                        <Eye className="h-5 w-5" />
                      </Link>
                      <button
                        onClick={() => handleRemoveNotification(notification.id)}
                        disabled={removingId === notification.id}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                        title="Remove Notification"
                      >
                        {removingId === notification.id ? (
                          <div className="h-5 w-5 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Trash2 className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Sent Notifications */}
        {sentNotifications.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <BellOff className="h-5 w-5 text-green-500 mr-2" />
              Sent Notifications ({sentNotifications.length})
            </h2>
            <div className="space-y-4">
              {sentNotifications.map((notification) => (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-xl p-6 shadow-lg border-l-4 border-green-500 opacity-75"
                >
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <ImageWithFallback
                        src={notification.product_image}
                        alt={notification.product_name}
                        className="w-16 h-16 object-cover rounded-lg"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {notification.product_name}
                      </h3>
                      <p className="text-sm text-gray-600 mb-2">
                        Notification sent - product is back in stock!
                      </p>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <div className="flex items-center">
                          <Mail className="h-4 w-4 mr-1" />
                          {notification.email}
                        </div>
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          Sent {new Date(notification.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <Link
                        to={`/products/${notification.product_id}`}
                        className="p-2 text-[#4682B4] hover:bg-[#F8F9FA] rounded-lg transition-colors"
                        title="View Product"
                      >
                        <Eye className="h-5 w-5" />
                      </Link>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {notifications.length === 0 && (
          <div className="text-center py-12">
            <Bell className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Stock Notifications</h3>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              You haven't set up any stock notifications yet. Visit our products page and click "Remind Me When Available" on out-of-stock products.
            </p>
            <Link
              to="/products"
              className="inline-flex items-center px-6 py-3 bg-[#4682B4] text-white rounded-xl hover:bg-[#2C3E50] transition-colors"
            >
              <Package className="h-5 w-5 mr-2" />
              Browse Products
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
