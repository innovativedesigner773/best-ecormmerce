import React, { useEffect, useState } from 'react';
import { Package, Search, Filter, Eye, Download } from 'lucide-react';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';

interface Product {
  id: string;
  name: string;
  price: number;
  images?: string[];
  sku: string;
}

interface Customer {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
}

interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_snapshot: {
    name: string;
    price: number;
    image_url?: string;
    description?: string;
    category?: string;
  };
  quantity: number;
  unit_price: number;
  total_price: number;
}

type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

interface Order {
  id: string;
  order_number: string;
  customer_id: string;
  customer_email: string;
  customer_info: any;
  status: OrderStatus;
  payment_status: string;
  payment_method?: string;
  payment_details?: any;
  currency: string;
  subtotal: number;
  tax_amount: number;
  shipping_amount: number;
  discount_amount: number;
  total: number; // Note: using 'total' instead of 'total_amount'
  notes?: string;
  billing_address?: any;
  shipping_address?: any;
  processed_at?: string;
  created_at: string;
  updated_at: string;
  customer?: Customer;
  order_items?: OrderItem[];
}

export default function AdminOrders() {
  const [loading, setLoading] = useState<boolean>(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);

  const formatZAR = (amount: number) =>
    new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount);

  const downloadFile = (content: string, fileName: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportOrdersCSV = () => {
    if (!orders || orders.length === 0) return;
    const header = ['order_id','order_number','customer_name','customer_email','items_count','total_amount_zar','status','payment_status','created_at'];
    const rows = orders.map(o => [
      o.id,
      o.order_number,
      o.customer ? `${o.customer.first_name} ${o.customer.last_name}` : 'Unknown',
      o.customer?.email || o.customer_email || '',
      String(o.order_items?.length || 0),
      String(o.total),
      o.status,
      o.payment_status,
      o.created_at
    ]);
    const csv = [header, ...rows]
      .map(cols => cols
        .map(val => {
          const s = String(val ?? '');
          if (s.includes(',') || s.includes('"') || s.includes('\n')) {
            return '"' + s.replace(/"/g, '""') + '"';
          }
          return s;
        })
        .join(','))
      .join('\n');
    downloadFile(csv, `orders-export-${new Date().toISOString().slice(0,10)}.csv`, 'text/csv;charset=utf-8;');
  };

  const handlePrintInvoice = (order: Order) => {
    if (!order) return;
    const win = window.open('', '_blank');
    if (!win) return;
    const doc = win.document;
    
    const customerName = order.customer ? `${order.customer.first_name} ${order.customer.last_name}` : 
                        order.customer_info?.name || 'Unknown Customer';
    const customerEmail = order.customer?.email || order.customer_email || '';
    
    const orderItemsHtml = order.order_items?.map(item => `
      <tr>
        <td>${item.product_snapshot?.name || 'Unknown Product'}</td>
        <td class="right">${item.quantity}</td>
        <td class="right">${formatZAR(item.unit_price)}</td>
        <td class="right">${formatZAR(item.total_price)}</td>
      </tr>
    `).join('') || '<tr><td colspan="4" class="text-center">No items found</td></tr>';
    
    const html = `<!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Invoice ${order.order_number}</title>
        <style>
          :root { color-scheme: light; }
          body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; background: #fff; color: #111827; margin: 0; }
          .container { max-width: 800px; margin: 32px auto; padding: 24px; border: 1px solid #E5E7EB; border-radius: 16px; }
          .header { display:flex; justify-content: space-between; align-items:center; border-bottom: 1px solid #E5E7EB; padding-bottom: 12px; }
          .brand { font-size: 20px; font-weight: 700; }
          .muted { color: #6B7280; }
          .row { display:flex; gap: 16px; }
          .card { border: 1px solid #E5E7EB; border-radius: 12px; padding: 12px; }
          .grid { display:grid; grid-template-columns: 1fr 1fr; gap: 16px; }
          .title { font-weight: 600; font-size: 14px; color: #374151; margin-bottom: 8px; }
          .totals { display:flex; justify-content:flex-end; margin-top: 12px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { text-align: left; padding: 10px; border-bottom: 1px solid #E5E7EB; }
          th { background: #F9FAFB; font-size: 12px; text-transform: uppercase; color: #6B7280; }
          .right { text-align: right; }
          .text-center { text-align: center; }
          @media print { .container { box-shadow: none; border: 0; } }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="brand">Best Brightness</div>
            <div class="muted">Invoice • ${order.order_number}</div>
          </div>
          <div style="margin-top:16px" class="grid">
            <div class="card">
              <div class="title">Billed To</div>
              <div>${customerName}</div>
              <div class="muted">${customerEmail}</div>
              <div class="muted">Order ID: ${order.id}</div>
            </div>
            <div class="card">
              <div class="title">Order Details</div>
              <div>Status: ${order.status}</div>
              <div>Payment: ${order.payment_status}</div>
              <div class="muted">Placed: ${new Date(order.created_at).toLocaleString()}</div>
            </div>
          </div>
          <div style="margin-top:16px">
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th class="right">Qty</th>
                  <th class="right">Unit Price</th>
                  <th class="right">Total</th>
                </tr>
              </thead>
              <tbody>
                ${orderItemsHtml}
              </tbody>
            </table>
            <div class="totals">
              <div>
                <div class="row" style="justify-content: space-between; min-width:280px">
                  <div class="muted">Subtotal</div>
                  <div>${formatZAR(order.subtotal)}</div>
                </div>
                <div class="row" style="justify-content: space-between; min-width:280px">
                  <div class="muted">Tax</div>
                  <div>${formatZAR(order.tax_amount)}</div>
                </div>
                <div class="row" style="justify-content: space-between; min-width:280px">
                  <div class="muted">Shipping</div>
                  <div>${formatZAR(order.shipping_amount)}</div>
                </div>
                <div class="row" style="justify-content: space-between; min-width:280px">
                  <div class="muted">Discount</div>
                  <div>-${formatZAR(order.discount_amount)}</div>
                </div>
                <div class="row" style="justify-content: space-between; min-width:280px; font-weight:700; margin-top: 8px;">
                  <div>Total</div>
                  <div>${formatZAR(order.total)}</div>
                </div>
              </div>
            </div>
          </div>
          <div style="margin-top:24px" class="muted">Thank you for your business.</div>
        </div>
        <script>window.onload = () => { window.print(); }</script>
      </body>
      </html>`;
    doc.open();
    doc.write(html);
    doc.close();
  };

  // Fetch real orders from database
  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('📦 Fetching orders from database...');

      // Try to fetch orders with the actual database structure
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          customer_id,
          customer_email,
          customer_info,
          status,
          payment_status,
          payment_method,
          payment_details,
          currency,
          subtotal,
          tax_amount,
          shipping_amount,
          discount_amount,
          total,
          notes,
          billing_address,
          shipping_address,
          processed_at,
          created_at,
          updated_at
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (ordersError) {
        console.error('❌ Error fetching orders:', ordersError);
        
        // If orders table doesn't exist, show a helpful message
        if (ordersError.code === '42P01' || ordersError.message.includes('does not exist')) {
          setError('Orders table not found. Please ensure the database is properly set up.');
          setOrders([]);
          return;
        }
        
        throw ordersError;
      }

      console.log('✅ Orders fetched successfully:', ordersData?.length || 0);
      
      // If we have orders, try to fetch customer and order items data
      if (ordersData && ordersData.length > 0) {
        const enrichedOrders = await Promise.all(
          ordersData.map(async (order) => {
            // Fetch customer data
            let customer = null;
            if (order.customer_id) {
              const { data: customerData } = await supabase
                .from('user_profiles')
                .select('id, first_name, last_name, email, phone')
                .eq('id', order.customer_id)
                .single();
              customer = customerData;
            }

            // Fetch order items
            let orderItems = [];
            const { data: itemsData } = await supabase
              .from('order_items')
              .select('id, order_id, product_id, product_snapshot, quantity, unit_price, total_price')
              .eq('order_id', order.id);
            orderItems = itemsData || [];

            return {
              ...order,
              customer,
              order_items: orderItems
            };
          })
        );
        
        setOrders(enrichedOrders);
      } else {
        setOrders([]);
      }
    } catch (error) {
      console.error('❌ Error fetching orders:', error);
      setError('Failed to load orders. Please try again.');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  // Update order status
  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      console.log(`🔄 Updating order ${orderId} status to ${newStatus}`);
      
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) {
        console.error('❌ Error updating order status:', error);
        throw error;
      }

      console.log('✅ Order status updated successfully');
      
      // Refresh orders list
      await fetchOrders();
    } catch (error) {
      console.error('❌ Error updating order status:', error);
      setError('Failed to update order status. Please try again.');
    }
  };

  // Filter orders based on search and status
  const filteredOrders = orders.filter(order => {
    const matchesSearch = searchTerm === '' || 
      order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.customer && 
        (`${order.customer.first_name} ${order.customer.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
         order.customer.email.toLowerCase().includes(searchTerm.toLowerCase())));
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Check database setup
  const checkDatabaseSetup = async () => {
    try {
      console.log('🔍 Checking database setup...');
      
      // Check if orders table exists
      const { data: ordersCheck, error: ordersError } = await supabase
        .from('orders')
        .select('id')
        .limit(1);
      
      if (ordersError) {
        console.error('❌ Orders table check failed:', ordersError);
        if (ordersError.code === '42P01') {
          setError('Database not set up. Please run the database setup script first.');
          return false;
        }
      } else {
        console.log('✅ Orders table exists');
      }

      // Check if order_items table exists
      const { data: itemsCheck, error: itemsError } = await supabase
        .from('order_items')
        .select('id')
        .limit(1);
      
      if (itemsError) {
        console.error('❌ Order items table check failed:', itemsError);
        if (itemsError.code === '42P01') {
          setError('Order items table not found. Please ensure database is properly set up.');
          return false;
        }
      } else {
        console.log('✅ Order items table exists');
      }

      return true;
    } catch (error) {
      console.error('❌ Database setup check failed:', error);
      setError('Failed to check database setup.');
      return false;
    }
  };

  useEffect(() => {
    const initializeData = async () => {
      const dbSetup = await checkDatabaseSetup();
      if (dbSetup) {
        await fetchOrders();
      }
    };
    
    initializeData();
  }, []);

  return (
    <div className="min-h-screen bg-[var(--brand-soft-gray)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="rounded-2xl p-6 sm:p-8 mb-8 bg-gradient-to-r from-[var(--brand-fresh-blue)]/40 via-[var(--brand-light-blue)]/30 to-[var(--brand-pure-white)]">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-[var(--brand-trust-navy)]">Orders</h1>
              <p className="text-[var(--muted-foreground)] mt-2">View and manage customer orders</p>
            </div>
            <Button onClick={handleExportOrdersCSV} className="bg-[var(--brand-fresh-green)] hover:bg-[var(--brand-fresh-green)]/90 text-white">
              <Download className="h-5 w-5" />
              Export Orders
            </Button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}
          
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center space-x-4 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
                <Input
                  placeholder="Search orders..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto bg-[var(--brand-fresh-blue)]/20 rounded-full flex items-center justify-center mb-4">
                <Package className="h-8 w-8 text-[var(--brand-deep-blue)]" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {orders.length === 0 ? 'No orders found' : 'No orders match your search'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {orders.length === 0 
                  ? 'Orders will appear here once customers start placing them.' 
                  : 'Try adjusting your search terms or filters.'}
              </p>
              {orders.length === 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
                  <p className="text-sm text-blue-800 mb-2">
                    <strong>Need to set up your database?</strong>
                  </p>
                  <p className="text-xs text-blue-600">
                    Make sure you've run the database setup scripts in your Supabase SQL editor.
                    Check the DATABASE_SETUP.md file for instructions.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total (ZAR)</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-900">{order.order_number}</div>
                        <div className="text-xs text-gray-500">ID: {order.id.slice(0, 8)}...</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {order.customer ? `${order.customer.first_name} ${order.customer.last_name}` : 
                         order.customer_info?.name || 'Unknown Customer'}
                        {(order.customer?.email || order.customer_email) && (
                          <div className="text-xs text-gray-500">{order.customer?.email || order.customer_email}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        <div className="space-y-1">
                          <div className="font-medium">{order.order_items?.length || 0} items</div>
                          {order.order_items && order.order_items.length > 0 && (
                            <div className="text-xs text-gray-500 max-w-xs">
                              {order.order_items.slice(0, 2).map((item, index) => (
                                <div key={item.id} className="truncate">
                                  {item.quantity}x {item.product_snapshot?.name || 'Unknown Product'}
                                </div>
                              ))}
                              {order.order_items.length > 2 && (
                                <div className="text-gray-400">+{order.order_items.length - 2} more...</div>
                              )}
                            </div>
                          )}
                          {order.order_items && order.order_items.length > 0 && (
                            <div className="group relative">
                              <button 
                                className="text-xs text-blue-600 hover:text-blue-800 underline"
                                onClick={() => { setSelectedOrder(order); setIsDetailsOpen(true); }}
                              >
                                View all items
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 font-semibold">{formatZAR(order.total)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ` +
                            (order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                             order.status === 'shipped' ? 'bg-blue-100 text-blue-800' :
                             order.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                             order.status === 'pending' ? 'bg-gray-100 text-gray-800' :
                             'bg-red-100 text-red-800')
                          }
                        >
                          {order.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{new Date(order.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => { setSelectedOrder(order); setIsDetailsOpen(true); }}
                        >
                          <Eye className="h-4 w-4 mr-1.5" />
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
                <Package className="h-8 w-8" />
              </div>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Order Management</h3>
            <p className="text-gray-500 mb-4">
              This page will contain comprehensive order management features:
            </p>
            <ul className="text-left max-w-md mx-auto space-y-2 text-gray-600">
              <li>• View all orders with detailed information</li>
              <li>• Update order status and tracking</li>
              <li>• Process refunds and returns</li>
              <li>• Print order receipts and invoices</li>
              <li>• Export orders to CSV/PDF</li>
              <li>• Advanced filtering and search</li>
              <li>• Order analytics and reporting</li>
            </ul>
          </div>
        </div>
        {isDetailsOpen && selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/30" onClick={() => setIsDetailsOpen(false)} />
            <div className="relative bg-white w-full max-w-4xl mx-4 rounded-2xl shadow-2xl border border-gray-200 max-h-[90vh] overflow-y-auto">
              <div className="px-6 py-5 border-b border-gray-200 bg-[#F8F9FA] rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">Order {selectedOrder.order_number}</h3>
                    <p className="text-sm text-gray-600">Placed on {new Date(selectedOrder.created_at).toLocaleString()}</p>
                  </div>
                  <button
                    onClick={() => setIsDetailsOpen(false)}
                    className="text-gray-500 hover:text-gray-700"
                    aria-label="Close"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <div className="px-6 py-5">
                {/* Order Items Summary */}
                {selectedOrder.order_items && selectedOrder.order_items.length > 0 && (
                  <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="text-sm font-semibold text-blue-900 mb-2">Order Summary</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-blue-700 font-medium">Total Items:</span>
                        <span className="ml-2 text-blue-900">{selectedOrder.order_items.length}</span>
                      </div>
                      <div>
                        <span className="text-blue-700 font-medium">Total Quantity:</span>
                        <span className="ml-2 text-blue-900">
                          {selectedOrder.order_items.reduce((sum, item) => sum + item.quantity, 0)}
                        </span>
                      </div>
                      <div>
                        <span className="text-blue-700 font-medium">Order Total:</span>
                        <span className="ml-2 text-blue-900 font-semibold">{formatZAR(selectedOrder.total)}</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Customer</h4>
                    {selectedOrder.customer ? (
                      <>
                        <p className="text-gray-900">{selectedOrder.customer.first_name} {selectedOrder.customer.last_name}</p>
                        <p className="text-sm text-gray-500">{selectedOrder.customer.email}</p>
                        {selectedOrder.customer.phone && (
                          <p className="text-sm text-gray-500">{selectedOrder.customer.phone}</p>
                        )}
                      </>
                    ) : selectedOrder.customer_info ? (
                      <>
                        <p className="text-gray-900">{selectedOrder.customer_info.name || 'Unknown Customer'}</p>
                        <p className="text-sm text-gray-500">{selectedOrder.customer_email}</p>
                        {selectedOrder.customer_info.phone && (
                          <p className="text-sm text-gray-500">{selectedOrder.customer_info.phone}</p>
                        )}
                      </>
                    ) : (
                      <p className="text-gray-500">Unknown Customer</p>
                    )}
                  </div>
                  <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Summary</h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <span
                          className={
                            `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ` +
                            (selectedOrder.status === 'delivered' ? 'bg-green-100 text-green-800' :
                             selectedOrder.status === 'shipped' ? 'bg-blue-100 text-blue-800' :
                             selectedOrder.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                             selectedOrder.status === 'pending' ? 'bg-gray-100 text-gray-800' :
                             'bg-red-100 text-red-800')
                          }
                        >
                          {selectedOrder.status}
                        </span>
                        <span className="text-gray-500 text-sm">Payment: {selectedOrder.payment_status}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-gray-900 font-semibold">{formatZAR(selectedOrder.total)}</span>
                        <span className="text-gray-500 text-sm">• {selectedOrder.order_items?.length || 0} items</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 bg-white rounded-xl border border-gray-200">
                  <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 rounded-t-xl">
                    <h4 className="text-sm font-semibold text-gray-700">Order Items ({selectedOrder.order_items?.length || 0})</h4>
                  </div>
                  <div className="p-4">
                    {selectedOrder.order_items && selectedOrder.order_items.length > 0 ? (
                      <div className="space-y-4">
                        {selectedOrder.order_items.map((item) => (
                          <div key={item.id} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex-1">
                              <div className="flex items-start gap-3">
                                {item.product_snapshot?.image_url && (
                                  <img 
                                    src={item.product_snapshot.image_url} 
                                    alt={item.product_snapshot.name}
                                    className="w-12 h-12 object-cover rounded-md"
                                  />
                                )}
                                <div className="flex-1">
                                  <p className="text-gray-900 font-medium">{item.product_snapshot?.name || 'Unknown Product'}</p>
                                  {item.product_snapshot?.description && (
                                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{item.product_snapshot.description}</p>
                                  )}
                                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                                    <span>Product ID: {item.product_id}</span>
                                    <span>SKU: {item.product_snapshot?.sku || 'N/A'}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="text-right ml-4">
                              <div className="text-sm text-gray-500">Quantity</div>
                              <div className="text-lg font-semibold text-gray-900">{item.quantity}</div>
                              <div className="text-sm text-gray-500 mt-1">{formatZAR(item.unit_price)} each</div>
                              <div className="text-lg font-semibold text-gray-900 mt-1">{formatZAR(item.total_price)}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Package className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                        <p className="text-gray-500">No items found in this order</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-6 bg-white rounded-xl border border-gray-200">
                  <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 rounded-t-xl">
                    <h4 className="text-sm font-semibold text-gray-700">Order Totals</h4>
                  </div>
                  <div className="p-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Subtotal:</span>
                        <span className="text-gray-900">{formatZAR(selectedOrder.subtotal)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Tax:</span>
                        <span className="text-gray-900">{formatZAR(selectedOrder.tax_amount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Shipping:</span>
                        <span className="text-gray-900">{formatZAR(selectedOrder.shipping_amount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Discount:</span>
                        <span className="text-gray-900">-{formatZAR(selectedOrder.discount_amount)}</span>
                      </div>
                      <div className="flex justify-between border-t border-gray-200 pt-2 font-semibold">
                        <span className="text-gray-900">Total:</span>
                        <span className="text-gray-900">{formatZAR(selectedOrder.total)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 bg-[#F8F9FA] border-t border-gray-200 rounded-b-2xl flex items-center justify-between">
                <div className="flex gap-2">
                  <select
                    value={selectedOrder.status}
                    onChange={(e) => updateOrderStatus(selectedOrder.id, e.target.value as OrderStatus)}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="pending">Pending</option>
                    <option value="processing">Processing</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setIsDetailsOpen(false)}
                    className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => selectedOrder && handlePrintInvoice(selectedOrder)}
                    className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                  >
                    Print Invoice
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}