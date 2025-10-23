import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Truck, CheckCircle, XCircle, Eye, RotateCcw, Calendar, Clock, ShoppingBag } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';
import { OrderService } from '../../utils/order-service';
import { toast } from 'sonner';

interface Order {
  id: string;
  order_number: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'confirmed';
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded' | 'partially_refunded';
  total_amount: number;
  items_count: number;
  created_at: string;
  order_items?: Array<{
    id: string;
    product_snapshot: {
      name: string;
      image_url: string;
      price: number;
    };
    quantity: number;
    unit_price: number;
    total_price: number;
  }>;
}

export default function OrderHistory() {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const { user, userProfile } = useAuth();
  const { addToCart } = useCart();
  const navigate = useNavigate();

  // Fetch orders from the database
  useEffect(() => {
    const fetchOrders = async () => {
      if (!userProfile?.id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError('');
        
        const result = await OrderService.getCustomerOrders(userProfile.id);
        
        if (result.success && result.data) {
          // Transform the data to match our interface
          const transformedOrders: Order[] = result.data.map((order: any) => ({
            id: order.id,
            order_number: order.order_number,
            status: order.status,
            payment_status: order.payment_status,
            total_amount: order.total || order.total_amount, // Handle both field names
            items_count: order.order_items?.length || 0,
            created_at: order.created_at,
            order_items: order.order_items?.map((item: any) => ({
              id: item.id,
              product_snapshot: item.product_snapshot,
              quantity: item.quantity,
              unit_price: item.unit_price,
              total_price: item.total_price,
            })) || [],
          }));
          
          setOrders(transformedOrders);
        } else {
          setError(result.error || 'Failed to fetch orders');
        }
      } catch (err) {
        console.error('Error fetching orders:', err);
        setError('Failed to fetch orders');
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [userProfile?.id]);

  // Mock order data - fallback for testing
  const mockOrders: Order[] = [
    {
      id: 'order-1',
      order_number: 'ORD-2024-001',
      status: 'delivered',
      total_amount: 89.97,
      items_count: 3,
      created_at: '2024-01-15T10:30:00Z',
      items: [
        {
          id: '1',
          name: 'Professional All-Purpose Cleaner 5L',
          quantity: 1,
          price: 24.99,
          image_url: 'https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?w=100&h=100&fit=crop',
        },
        {
          id: '2',
          name: 'Heavy Duty Floor Cleaner 2L',
          quantity: 2,
          price: 18.99,
          image_url: 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=100&h=100&fit=crop',
        },
        {
          id: '3',
          name: 'Glass & Window Cleaner Kit',
          quantity: 1,
          price: 15.99,
          image_url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=100&h=100&fit=crop',
        },
      ],
    },
    {
      id: 'order-2',
      order_number: 'ORD-2024-002',
      status: 'shipped',
      total_amount: 67.98,
      items_count: 2,
      created_at: '2024-01-18T14:15:00Z',
      items: [
        {
          id: '4',
          name: 'Disinfectant Spray Bundle (6 Pack)',
          quantity: 1,
          price: 32.99,
          image_url: 'https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?w=100&h=100&fit=crop',
        },
        {
          id: '5',
          name: 'Kitchen Degreaser Pro 1L',
          quantity: 1,
          price: 34.99,
          image_url: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=100&h=100&fit=crop',
        },
      ],
    },
    {
      id: 'order-3',
      order_number: 'ORD-2024-003',
      status: 'processing',
      total_amount: 156.47,
      items_count: 5,
      created_at: '2024-01-20T09:20:00Z',
      items: [
        {
          id: '6',
          name: 'Professional All-Purpose Cleaner 5L',
          quantity: 2,
          price: 24.99,
          image_url: 'https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?w=100&h=100&fit=crop',
        },
        {
          id: '7',
          name: 'Heavy Duty Floor Cleaner 2L',
          quantity: 3,
          price: 18.99,
          image_url: 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=100&h=100&fit=crop',
        },
      ],
    },
  ];

  // Use real orders if available, otherwise fall back to mock data for testing
  const displayOrders = orders.length > 0 ? orders : mockOrders;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'processing':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'shipped':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'delivered':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'confirmed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'processing':
        return <Package className="h-4 w-4" />;
      case 'shipped':
        return <Truck className="h-4 w-4" />;
      case 'delivered':
        return <CheckCircle className="h-4 w-4" />;
      case 'confirmed':
        return <CheckCircle className="h-4 w-4" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  const handleReorder = async (order: Order) => {
    try {
      if (order.order_items) {
        for (const item of order.order_items) {
          await addToCart({
            id: item.id,
            name: item.product_snapshot.name,
            price: item.unit_price,
            image_url: item.product_snapshot.image_url,
            sku: `SKU-${item.id}`,
            in_stock: true,
          }, item.quantity);
        }
        toast.success('All items from this order have been added to your cart!');
        navigate('/cart');
      } else {
        toast.error('No items found in this order');
      }
    } catch (error) {
      console.error('Error reordering items:', error);
      toast.error('Failed to reorder items. Please try again.');
    }
  };

  const filteredOrders = filterStatus === 'all' 
    ? displayOrders 
    : displayOrders.filter(order => order.status === filterStatus);

  const statusTabs = [
    { key: 'all', label: 'All Orders', icon: ShoppingBag },
    { key: 'pending', label: 'Pending', icon: Clock },
    { key: 'confirmed', label: 'Confirmed', icon: CheckCircle },
    { key: 'processing', label: 'Processing', icon: Package },
    { key: 'shipped', label: 'Shipped', icon: Truck },
    { key: 'delivered', label: 'Delivered', icon: CheckCircle },
  ];

  // Redirect to login if not authenticated
  if (!user) {
    navigate('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <div className="bg-[#97CF50] text-white p-3 rounded-2xl shadow-lg">
              <ShoppingBag className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-[#09215F]">Order History</h1>
              <p className="text-[#09215F]/70 mt-1">Track and manage your orders</p>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="bg-[#97CF50] text-white p-4 rounded-2xl shadow-lg inline-block mb-4">
                <Package className="h-8 w-8" />
              </div>
              <p className="text-[#09215F] font-medium">Loading your orders...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 mb-8">
            <div className="flex items-center space-x-3">
              <XCircle className="h-6 w-6 text-red-600" />
              <div>
                <h3 className="text-red-800 font-semibold">Error Loading Orders</h3>
                <p className="text-red-600 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="mb-8">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-2">
            <nav className="flex space-x-2">
              {statusTabs.map((tab) => {
                const IconComponent = tab.icon;
                const count = tab.key === 'all' ? displayOrders.length : displayOrders.filter(o => o.status === tab.key).length;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setFilterStatus(tab.key)}
                    className={`flex items-center space-x-2 px-4 py-3 rounded-xl font-semibold text-sm transition-all duration-300 ${
                      filterStatus === tab.key
                        ? 'bg-gradient-to-r from-[#97CF50] to-[#09215F] text-white shadow-lg transform scale-105'
                        : 'text-[#09215F]/70 hover:text-[#09215F] hover:bg-gray-50'
                    }`}
                  >
                    <IconComponent className="h-4 w-4" />
                    <span>{tab.label}</span>
                    <span className={`px-2 py-1 text-xs rounded-full font-bold ${
                      filterStatus === tab.key 
                        ? 'bg-white/20 text-white' 
                        : 'bg-gray-100 text-[#09215F]/60'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Orders List */}
          <div className="lg:col-span-2">
            <div className="space-y-6">
              {filteredOrders.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-12 text-center">
                  <div className="bg-gray-100 rounded-2xl p-6 w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                    <Package className="h-12 w-12 text-gray-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-[#09215F] mb-3">No orders found</h3>
                  <p className="text-[#09215F]/70 text-lg">
                    {filterStatus === 'all' 
                      ? "You haven't placed any orders yet." 
                      : `No ${filterStatus} orders found.`
                    }
                  </p>
                </div>
              ) : (
                filteredOrders.map((order) => (
                  <div key={order.id} className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 hover:shadow-2xl transition-all duration-300 group">
                    {/* Order Header */}
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h3 className="text-xl font-bold text-[#09215F] group-hover:text-[#97CF50] transition-colors">
                          {order.order_number}
                        </h3>
                        <p className="text-[#09215F]/60 font-medium mt-1">
                          Placed on {new Date(order.created_at).toLocaleDateString('en-ZA', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className={`inline-flex items-center px-3 py-2 rounded-xl text-sm font-bold border ${getStatusColor(order.status)} shadow-sm`}>
                          {getStatusIcon(order.status)}
                          <span className="ml-2 capitalize">{order.status}</span>
                        </div>
                        <p className="text-2xl font-bold text-[#09215F] mt-2">R{order.total_amount.toFixed(2)}</p>
                      </div>
                    </div>

                    {/* Order Items Preview */}
                    <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-bold text-[#09215F]">
                          {order.items_count} item{order.items_count !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <div className="flex space-x-4 overflow-x-auto">
                        {(order.order_items || order.items || []).slice(0, 3).map((item) => (
                          <div key={item.id} className="flex-shrink-0 flex items-center space-x-3 bg-white rounded-xl p-3 border border-gray-200">
                            <ImageWithFallback
                              src={item.product_snapshot?.image_url || 'https://via.placeholder.com/100'}
                              alt={item.product_snapshot?.name || 'Product'}
                              className="w-12 h-12 object-cover rounded-lg"
                            />
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-[#09215F] truncate max-w-32">
                                {item.product_snapshot?.name || 'Product'}
                              </p>
                              <p className="text-xs text-[#09215F]/60 font-medium">Qty: {item.quantity}</p>
                            </div>
                          </div>
                        ))}
                        {(order.order_items || order.items || []).length > 3 && (
                          <div className="flex-shrink-0 flex items-center justify-center bg-[#97CF50]/10 rounded-xl p-3 border border-[#97CF50]/20">
                            <span className="text-sm font-bold text-[#97CF50]">
                              +{(order.order_items || order.items || []).length - 3} more
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between">
                      <div className="flex space-x-3">
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="flex items-center bg-[#97CF50] text-white px-4 py-2 rounded-xl hover:bg-[#09215F] transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 font-semibold"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </button>
                        {(order.status === 'delivered' || order.status === 'confirmed') && (
                          <button 
                            onClick={() => handleReorder(order)}
                            className="flex items-center bg-green-600 text-white px-4 py-2 rounded-xl hover:bg-green-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 font-semibold"
                          >
                            <RotateCcw className="h-4 w-4 mr-2" />
                            Reorder
                          </button>
                        )}
                      </div>
                      <div className="text-sm text-[#09215F]/60 font-medium">
                        Order #{order.id.split('-')[1]}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Order Details Sidebar */}
          <div className="lg:col-span-1">
            {selectedOrder ? (
              <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 sticky top-4">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-[#09215F]">Order Details</h2>
                  <button
                    onClick={() => setSelectedOrder(null)}
                    className="text-[#09215F]/40 hover:text-[#09215F] hover:bg-gray-100 p-2 rounded-xl transition-all duration-300"
                  >
                    <XCircle className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Order Info */}
                  <div className="p-4 bg-gradient-to-r from-[#97CF50]/10 to-[#09215F]/10 rounded-xl border border-[#97CF50]/20">
                    <h3 className="font-bold text-[#09215F] text-lg">{selectedOrder.order_number}</h3>
                    <p className="text-sm text-[#09215F]/70 font-medium mt-1">
                      {new Date(selectedOrder.created_at).toLocaleDateString('en-ZA', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>

                  {/* Status */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <span className="text-sm font-bold text-[#09215F]">Status</span>
                    <div className={`inline-flex items-center px-3 py-2 rounded-xl text-sm font-bold border ${getStatusColor(selectedOrder.status)}`}>
                      {getStatusIcon(selectedOrder.status)}
                      <span className="ml-2 capitalize">{selectedOrder.status}</span>
                    </div>
                  </div>

                  {/* Items */}
                  <div>
                    <h4 className="font-bold text-[#09215F] mb-4 text-lg">Items Ordered</h4>
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {(selectedOrder.order_items || selectedOrder.items || []).map((item) => (
                        <div key={item.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                          <ImageWithFallback
                            src={item.product_snapshot?.image_url || 'https://via.placeholder.com/100'}
                            alt={item.product_snapshot?.name || 'Product'}
                            className="w-14 h-14 object-cover rounded-lg"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-[#09215F] leading-tight">
                              {item.product_snapshot?.name || 'Product'}
                            </p>
                            <p className="text-sm text-[#09215F]/70 font-medium">
                              Qty: {item.quantity} × R{item.unit_price.toFixed(2)}
                            </p>
                          </div>
                          <p className="text-sm font-bold text-[#09215F]">
                            R{item.total_price.toFixed(2)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Total */}
                  <div className="p-4 bg-gradient-to-r from-[#97CF50]/10 to-[#09215F]/10 rounded-xl border border-[#97CF50]/20">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold text-[#09215F]">Total Amount</span>
                      <span className="text-2xl font-bold text-[#09215F]">R{selectedOrder.total_amount.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col space-y-3">
                    <button className="w-full bg-[#97CF50] text-white py-3 px-4 rounded-xl hover:bg-[#09215F] transition-all duration-300 text-sm font-bold shadow-lg hover:shadow-xl transform hover:-translate-y-1">
                      Track Order
                    </button>
                    {selectedOrder.status === 'delivered' && (
                      <button 
                        onClick={() => handleReorder(selectedOrder)}
                        className="w-full border-2 border-[#97CF50] text-[#97CF50] py-3 px-4 rounded-xl hover:bg-[#97CF50] hover:text-white transition-all duration-300 text-sm font-bold"
                      >
                        Reorder Items
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 text-center">
                <div className="bg-gray-100 rounded-2xl p-6 w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                  <Package className="h-10 w-10 text-gray-400" />
                </div>
                <h3 className="text-xl font-bold text-[#09215F] mb-3">Select an Order</h3>
                <p className="text-[#09215F]/70">
                  Click on an order to view its details and track progress
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}