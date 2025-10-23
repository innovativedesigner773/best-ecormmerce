import React, { useState, useEffect } from 'react';
import { Bell, Send, CheckCircle, XCircle, AlertTriangle, RefreshCw, Mail, Users, Clock, Trash2, RotateCcw } from 'lucide-react';
import { sendNotificationsForRestockedProducts, testStockNotificationEmail } from '../../services/stockNotificationService';
import { getNotificationQueueStatus, processNotificationsWithEmailJS, getNotificationQueueItems, clearFailedNotifications, retryFailedNotifications, NotificationQueueItem } from '../../services/notificationQueueService';
import { supabase } from '../../lib/supabase';
import LoadingSpinner from '../common/LoadingSpinner';

interface NotificationStats {
  totalPending: number;
  totalSent: number;
  productsWithNotifications: number;
}

interface QueueStats {
  pending_count: number;
  processing_count: number;
  sent_count: number;
  failed_count: number;
  total_count: number;
}

interface ProductNotification {
  id: string;
  name: string;
  stock_quantity: number;
  pending_count: number;
  sent_count: number;
}

export default function StockNotificationManager() {
  const [stats, setStats] = useState<NotificationStats>({
    totalPending: 0,
    totalSent: 0,
    productsWithNotifications: 0
  });
  const [queueStats, setQueueStats] = useState<QueueStats>({
    pending_count: 0,
    processing_count: 0,
    sent_count: 0,
    failed_count: 0,
    total_count: 0
  });
  const [products, setProducts] = useState<ProductNotification[]>([]);
  const [queueItems, setQueueItems] = useState<NotificationQueueItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testing, setTesting] = useState(false);
  const [lastSent, setLastSent] = useState<string | null>(null);
  const [results, setResults] = useState<{
    totalSent: number;
    totalFailed: number;
    productResults: Array<{
      productId: string;
      productName: string;
      sent: number;
      failed: number;
    }>;
  } | null>(null);

  // Fetch queue statistics
  const fetchQueueStats = async () => {
    try {
      const stats = await getNotificationQueueStatus();
      if (stats) {
        setQueueStats(stats);
      }
    } catch (error) {
      console.error('Error fetching queue stats:', error);
    }
  };

  // Fetch queue items
  const fetchQueueItems = async () => {
    try {
      const items = await getNotificationQueueItems(20);
      setQueueItems(items);
    } catch (error) {
      console.error('Error fetching queue items:', error);
    }
  };

  // Process notification queue
  const handleProcessQueue = async () => {
    try {
      setProcessing(true);
      const result = await processNotificationsWithEmailJS();
      
      if (result.processed_count > 0) {
        alert(`Processed ${result.processed_count} notifications: ${result.success_count} sent, ${result.failed_count} failed`);
      } else {
        alert('No notifications to process');
      }
      
      // Refresh data
      await Promise.all([fetchQueueStats(), fetchQueueItems(), fetchStats()]);
      
    } catch (error) {
      console.error('Error processing queue:', error);
      alert('Error processing queue. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  // Retry failed notifications
  const handleRetryFailed = async () => {
    try {
      setProcessing(true);
      const result = await retryFailedNotifications();
      
      if (result.processed_count > 0) {
        alert(`Retried ${result.processed_count} notifications: ${result.success_count} sent, ${result.failed_count} failed`);
      } else {
        alert('No failed notifications to retry');
      }
      
      // Refresh data
      await Promise.all([fetchQueueStats(), fetchQueueItems(), fetchStats()]);
      
    } catch (error) {
      console.error('Error retrying failed notifications:', error);
      alert('Error retrying failed notifications. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  // Clear failed notifications
  const handleClearFailed = async () => {
    if (!confirm('Are you sure you want to clear all failed notifications? This action cannot be undone.')) {
      return;
    }

    try {
      const success = await clearFailedNotifications();
      if (success) {
        alert('Failed notifications cleared successfully');
        await Promise.all([fetchQueueStats(), fetchQueueItems()]);
      } else {
        alert('Failed to clear notifications. Please try again.');
      }
    } catch (error) {
      console.error('Error clearing failed notifications:', error);
      alert('Error clearing failed notifications. Please try again.');
    }
  };

  // Fetch notification statistics
  const fetchStats = async () => {
    try {
      setLoading(true);
      
      // Get total pending notifications
      const { data: pendingData, error: pendingError } = await supabase
        .from('stock_notifications')
        .select('id', { count: 'exact' })
        .eq('is_notified', false);

      if (pendingError) throw pendingError;

      // Get total sent notifications
      const { data: sentData, error: sentError } = await supabase
        .from('stock_notifications')
        .select('id', { count: 'exact' })
        .eq('is_notified', true);

      if (sentError) throw sentError;

      // Get products with notifications
      const { data: productsData, error: productsError } = await supabase
        .from('stock_notifications')
        .select('product_id')
        .eq('is_notified', false);

      if (productsError) throw productsError;

      const uniqueProducts = new Set(productsData?.map(p => p.product_id) || []);

      setStats({
        totalPending: pendingData?.length || 0,
        totalSent: sentData?.length || 0,
        productsWithNotifications: uniqueProducts.size
      });

    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch products with notification details
  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          id,
          name,
          stock_quantity,
          stock_notifications!left(id, is_notified)
        `)
        .not('stock_notifications', 'is', null);

      if (error) throw error;

      const productMap = new Map<string, ProductNotification>();

      data?.forEach(product => {
        const productId = product.id;
        if (!productMap.has(productId)) {
          productMap.set(productId, {
            id: productId,
            name: product.name,
            stock_quantity: product.stock_quantity,
            pending_count: 0,
            sent_count: 0
          });
        }

        const productData = productMap.get(productId)!;
        if (product.stock_notifications) {
          if (product.stock_notifications.is_notified) {
            productData.sent_count++;
          } else {
            productData.pending_count++;
          }
        }
      });

      setProducts(Array.from(productMap.values()));
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  // Send notifications for all restocked products
  const handleSendAllNotifications = async () => {
    try {
      setSending(true);
      setResults(null);
      
      const result = await sendNotificationsForRestockedProducts();
      setResults(result);
      setLastSent(new Date().toLocaleString());
      
      // Refresh data
      await Promise.all([fetchStats(), fetchProducts()]);
      
    } catch (error) {
      console.error('Error sending notifications:', error);
    } finally {
      setSending(false);
    }
  };

  // Test email functionality
  const handleTestEmail = async () => {
    if (!testEmail.trim()) {
      alert('Please enter a test email address');
      return;
    }

    try {
      setTesting(true);
      const success = await testStockNotificationEmail(testEmail.trim());
      
      if (success) {
        alert('Test email sent successfully!');
      } else {
        alert('Failed to send test email. Please check the configuration.');
      }
    } catch (error) {
      console.error('Error testing email:', error);
      alert('Error testing email. Please try again.');
    } finally {
      setTesting(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchProducts();
    fetchQueueStats();
    fetchQueueItems();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Bell className="h-6 w-6 text-[#4682B4]" />
              Stock Notification Manager
            </h2>
            <p className="text-gray-600 mt-1">
              Manage and send stock availability notifications to customers
            </p>
          </div>
          <button
            onClick={() => {
              fetchStats();
              fetchProducts();
              fetchQueueStats();
              fetchQueueItems();
            }}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Notifications</p>
              <p className="text-3xl font-bold text-orange-600">{stats.totalPending}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-orange-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Sent Notifications</p>
              <p className="text-3xl font-bold text-green-600">{stats.totalSent}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Products with Notifications</p>
              <p className="text-3xl font-bold text-green-600">{stats.productsWithNotifications}</p>
            </div>
            <Users className="h-8 w-8 text-green-500" />
          </div>
        </div>
      </div>

      {/* Queue Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Queue Pending</p>
              <p className="text-3xl font-bold text-yellow-600">{queueStats.pending_count}</p>
            </div>
            <Clock className="h-8 w-8 text-yellow-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Processing</p>
              <p className="text-3xl font-bold text-green-600">{queueStats.processing_count}</p>
            </div>
            <RefreshCw className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Queue Sent</p>
              <p className="text-3xl font-bold text-green-600">{queueStats.sent_count}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Queue Failed</p>
              <p className="text-3xl font-bold text-red-600">{queueStats.failed_count}</p>
            </div>
            <XCircle className="h-8 w-8 text-red-500" />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions</h3>
        <div className="flex flex-wrap gap-4">
          <button
            onClick={handleSendAllNotifications}
            disabled={sending || stats.totalPending === 0}
            className="flex items-center gap-2 px-6 py-3 bg-[#4682B4] text-white rounded-lg hover:bg-[#2C3E50] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? (
              <LoadingSpinner size="sm" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Send All Notifications ({stats.totalPending})
          </button>

          <button
            onClick={handleProcessQueue}
            disabled={processing || queueStats.pending_count === 0}
            className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {processing ? (
              <LoadingSpinner size="sm" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Process Queue ({queueStats.pending_count})
          </button>

          <button
            onClick={handleRetryFailed}
            disabled={processing || queueStats.failed_count === 0}
            className="flex items-center gap-2 px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {processing ? (
              <LoadingSpinner size="sm" />
            ) : (
              <RotateCcw className="h-4 w-4" />
            )}
            Retry Failed ({queueStats.failed_count})
          </button>

          <button
            onClick={handleClearFailed}
            disabled={queueStats.failed_count === 0}
            className="flex items-center gap-2 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 className="h-4 w-4" />
            Clear Failed ({queueStats.failed_count})
          </button>

          <div className="flex items-center gap-2">
            <input
              type="email"
              placeholder="test@example.com"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4682B4] focus:border-transparent"
            />
            <button
              onClick={handleTestEmail}
              disabled={testing}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
            >
              {testing ? (
                <LoadingSpinner size="sm" />
              ) : (
                <Mail className="h-4 w-4" />
              )}
              Test Email
            </button>
          </div>
        </div>

        {lastSent && (
          <p className="text-sm text-gray-600 mt-3">
            Last sent: {lastSent}
          </p>
        )}
      </div>

      {/* Results */}
      {results && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Send Results</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-green-600 font-medium">Sent: {results.totalSent}</span>
            </div>
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              <span className="text-red-600 font-medium">Failed: {results.totalFailed}</span>
            </div>
          </div>

          {results.productResults.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 mb-2">By Product:</h4>
              <div className="space-y-2">
                {results.productResults.map((product) => (
                  <div key={product.productId} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium">{product.productName}</span>
                    <div className="flex gap-4 text-sm">
                      <span className="text-green-600">✓ {product.sent}</span>
                      <span className="text-red-600">✗ {product.failed}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Products with Notifications */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Products with Notifications</h3>
        {products.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No products with notifications found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stock
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pending
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sent
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {products.map((product) => (
                  <tr key={product.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{product.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        product.stock_quantity > 0 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {product.stock_quantity} in stock
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-orange-600 font-medium">
                        {product.pending_count}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-green-600 font-medium">
                        {product.sent_count}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Notification Queue */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Notification Queue</h3>
        {queueItems.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No items in the notification queue.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Attempts
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {queueItems.map((item) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{item.email_data.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{item.email_data.product_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        item.status === 'sent' ? 'bg-green-100 text-green-800' :
                        item.status === 'failed' ? 'bg-red-100 text-red-800' :
                        item.status === 'processing' ? 'bg-green-100 text-green-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">
                        {item.attempts}/{item.max_attempts}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(item.created_at).toLocaleString()}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
