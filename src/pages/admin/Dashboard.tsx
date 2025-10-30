import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { 
  BarChart3, 
  Users, 
  Package, 
  ShoppingCart, 
  TrendingUp, 
  AlertCircle,
  CheckCircle,
  Clock,
  Database,
  TestTube,
  Zap,
  Activity,
  Bell,
  RefreshCw
} from 'lucide-react';
import D3TimeSeries from '../../components/ui/D3TimeSeries';

// Import test components
import DatabaseFixVerification from '../../components/admin/DatabaseFixVerification';
import RealTimeRegistrationTest from '../../components/admin/RealTimeRegistrationTest';
import QuickRegistrationTest from '../../components/admin/QuickRegistrationTest';
import StockNotificationManager from '../../components/admin/StockNotificationManager';
import AdvancedAnalytics from '../../components/admin/AdvancedAnalytics';

// Import Supabase client
import { supabase } from '../../lib/supabase';
import { getSummary, getSalesTimeSeries, getBestSellers, getMonthlyStock50Reached, getRevenueBreakdown, getInventoryKpis, getSalesByCategory, getTopCustomers, getBusinessValue, getSalesMix, getProductAnalytics, getUserAnalytics, getOrderAnalytics, type TimeRange } from '../../services/analyticsService';

// Data interfaces
interface DashboardStats {
  totalUsers: number;
  totalProducts: number;
  totalOrders: number;
  revenue: number;
  growthRate: number;
  pendingOrders: number;
  newProductsThisWeek: number;
}

interface RecentActivity {
  id: string;
  action: string;
  user: string;
  time: string;
  type: 'user' | 'order' | 'product';
}

interface TopProduct {
  id: string;
  name: string;
  sales: number;
  revenue: number;
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<TimeRange>('1M');
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalProducts: 0,
    totalOrders: 0,
    revenue: 0,
    growthRate: 0,
    pendingOrders: 0,
    newProductsThisWeek: 0
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [bestByQty, setBestByQty] = useState<Array<{ id: string; name: string; quantity: number; revenue: number }>>([]);
  const [bestByRevenue, setBestByRevenue] = useState<Array<{ id: string; name: string; quantity: number; revenue: number }>>([]);
  const [stock50, setStock50] = useState<Array<{ id: string; name: string; soldThisMonth: number; startingStock: number; percentSold: number }>>([]);
  const [series, setSeries] = useState<Array<{ date: string; revenue: number; orders: number }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [revBreakdown, setRevBreakdown] = useState<{ subtotal: number; tax: number; shipping: number; discount: number; total: number } | null>(null);
  const [inventory, setInventory] = useState<{ totalProducts: number; active: number; outOfStock: number; lowStock: number } | null>(null);
  const [salesByCat, setSalesByCat] = useState<Array<{ categoryId: string; categoryName: string; revenue: number; orders: number; items: number }>>([]);
  const [topCustomers, setTopCustomers] = useState<Array<{ id: string; name: string; email: string; total: number; orders: number }>>([]);
  const [biz, setBiz] = useState<{ aov: number; itemsPerOrder: number; repeatRate: number; grossMargin: number; inventoryValueRetail: number; inventoryValueCost: number; sellThrough: number; refundRate: number; revenue: number; ordersCount: number; itemsCount: number } | null>(null);
  const [mix, setMix] = useState<{ channel: Array<{ name: string; revenue: number; orders: number }>; payments: Array<{ name: string; revenue: number; orders: number }>; newVsReturning: { new: { revenue: number; orders: number }; returning: { revenue: number; orders: number } }; totals: { revenue: number; orders: number } } | null>(null);
  const [productAnalytics, setProductAnalytics] = useState<any>(null);
  const [userAnalytics, setUserAnalytics] = useState<any>(null);
  const [orderAnalytics, setOrderAnalytics] = useState<any>(null);

  // Fetch dashboard statistics
  const fetchDashboardStats = async () => {
    try {
      console.log('📊 Fetching dashboard statistics...');
      
      // Fetch users count (use count with small range to avoid head/header issues)
      const { count: usersCount, error: usersError } = await supabase
        .from('user_profiles')
        .select('id', { count: 'exact' })
        .range(0, 0);

      if (usersError) throw usersError;

      // Fetch products count
      const { count: productsCount, error: productsError } = await supabase
        .from('products')
        .select('id', { count: 'exact' })
        .range(0, 0);

      if (productsError) throw productsError;

      // Fetch orders for growth rate calc
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('id, status, created_at');

      if (ordersError) throw ordersError;

      // Fetch pending orders count separately scoped to recent period if needed (keep base here for safety)
      const pendingOrders = ordersData?.filter(order => (order.status || '').toLowerCase() === 'pending').length || 0;

      // Fetch products added this week
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      const { count: newProductsCount, error: newProductsError } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', oneWeekAgo.toISOString());

      if (newProductsError) throw newProductsError;

      // Calculate growth rate (simplified - comparing this month to last month)
      const thisMonth = new Date();
      thisMonth.setDate(1);
      const lastMonth = new Date(thisMonth);
      lastMonth.setMonth(lastMonth.getMonth() - 1);

      const { count: thisMonthOrders, error: thisMonthError } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', thisMonth.toISOString());

      const { count: lastMonthOrders, error: lastMonthError } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', lastMonth.toISOString())
        .lt('created_at', thisMonth.toISOString());

      const growthRate = lastMonthOrders && lastMonthOrders > 0 
        ? ((thisMonthOrders || 0) - lastMonthOrders) / lastMonthOrders * 100 
        : 0;

      setStats({
        totalUsers: usersCount || 0,
        totalProducts: productsCount || 0,
        totalOrders: ordersData?.length || 0,
        revenue: 0,
        growthRate: Math.round(growthRate * 10) / 10,
        pendingOrders: pendingOrders,
        newProductsThisWeek: newProductsCount || 0
      });

      console.log('✅ Dashboard stats fetched successfully');
    } catch (error) {
      console.error('❌ Error fetching dashboard stats:', error);
      setError('Failed to load dashboard statistics');
    }
  };

  // Fetch recent activity
  const fetchRecentActivity = async () => {
    try {
      console.log('🔄 Fetching recent activity...');
      
      const activities: RecentActivity[] = [];

      // Fetch recent user registrations
      const { data: recentUsers, error: usersError } = await supabase
        .from('user_profiles')
        .select('first_name, last_name, created_at')
        .order('created_at', { ascending: false })
        .limit(3);

      if (!usersError && recentUsers) {
        recentUsers.forEach(user => {
          activities.push({
            id: `user-${user.created_at}`,
            action: 'New user registered',
            user: `${user.first_name} ${user.last_name}`,
            time: formatTimeAgo(user.created_at),
            type: 'user'
          });
        });
      }

      // Fetch recent orders
      const { data: recentOrders, error: ordersError } = await supabase
        .from('orders')
        .select('order_number, status, created_at, customer_id')
        .order('created_at', { ascending: false })
        .limit(3);

      if (!ordersError && recentOrders) {
        // Get customer names for orders
        const customerIds = recentOrders.map(order => order.customer_id).filter(Boolean);
        const { data: customers } = await supabase
          .from('user_profiles')
          .select('id, first_name, last_name')
          .in('id', customerIds);

        recentOrders.forEach(order => {
          const customer = customers?.find(c => c.id === order.customer_id);
          const customerName = customer ? `${customer.first_name} ${customer.last_name}` : 'Unknown Customer';
          
          activities.push({
            id: `order-${order.created_at}`,
            action: `Order ${order.status}`,
            user: customerName,
            time: formatTimeAgo(order.created_at),
            type: 'order'
          });
        });
      }

      // Sort activities by time and take the most recent 4
      activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
      setRecentActivity(activities.slice(0, 4));

      console.log('✅ Recent activity fetched successfully');
    } catch (error) {
      console.error('❌ Error fetching recent activity:', error);
    }
  };

  // Fetch top products
  const fetchTopProducts = async () => {
    try {
      console.log('🏆 Fetching top products...');
      
      // Get top products by order items
      const { data: orderItems, error: orderItemsError } = await supabase
        .from('order_items')
        .select(`
          product_id,
          quantity,
          price,
          product:products(name)
        `);

      if (orderItemsError) throw orderItemsError;

      // Aggregate product sales
      const productSales = new Map<string, { name: string; sales: number; revenue: number }>();
      
      orderItems?.forEach(item => {
        if (item.product_id && item.product) {
          const existing = productSales.get(item.product_id) || { 
            name: item.product.name, 
            sales: 0, 
            revenue: 0 
          };
          existing.sales += item.quantity || 0;
          existing.revenue += (item.quantity || 0) * (item.price || 0);
          productSales.set(item.product_id, existing);
        }
      });

      // Convert to array and sort by sales
      const topProductsList = Array.from(productSales.entries())
        .map(([id, data]) => ({
          id,
          name: data.name,
          sales: data.sales,
          revenue: data.revenue
        }))
        .sort((a, b) => b.sales - a.sales)
        .slice(0, 4);

      setTopProducts(topProductsList);
      console.log('✅ Top products fetched successfully');
    } catch (error) {
      console.error('❌ Error fetching top products:', error);
    }
  };

  // Format time ago helper
  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    return `${Math.floor(diffInSeconds / 86400)} days ago`;
  };

  // Refresh all data
  const refreshData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Existing basics
      const basics = Promise.all([
        fetchDashboardStats(),
        fetchRecentActivity(),
        fetchTopProducts()
      ]);
      // New analytics-driven data
      const analytics = Promise.all([
        getSummary(range),
        getSalesTimeSeries(range),
        getBestSellers(range, 'quantity', 5),
        getBestSellers(range, 'revenue', 5),
        getMonthlyStock50Reached(),
        getRevenueBreakdown(range),
        getInventoryKpis(),
        getSalesByCategory(range),
        getTopCustomers(range, 5),
        getBusinessValue(range),
        getSalesMix(range),
        getProductAnalytics(range),
        getUserAnalytics(range),
        getOrderAnalytics(range)
      ]);

      const [, [summary, ts, qty, rev, stock, rbd, inv, cat, customers, business, mixData, productData, userData, orderData]] = await Promise.all([basics, analytics]);
      // Merge KPIs for orders/sales, keep users/products from base stats to avoid unintended range-scoping
      setStats(prev => ({
        ...prev,
        totalOrders: summary.ordersCount,
        revenue: summary.salesAmount,
        pendingOrders: summary.pendingOrders,
        newProductsThisWeek: summary.newProductsThisWeek
      }));
      setSeries(ts);
      setBestByQty(qty as any);
      setBestByRevenue(rev as any);
      setStock50(stock as any);
      setRevBreakdown(rbd as any);
      setInventory(inv as any);
      setSalesByCat(cat as any);
      setTopCustomers(customers as any);
      setBiz(business as any);
      setMix(mixData as any);
      setProductAnalytics(productData as any);
      setUserAnalytics(userData as any);
      setOrderAnalytics(orderData as any);
    } catch (error) {
      console.error('❌ Error refreshing data:', error);
      setError('Failed to refresh dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    refreshData();
  }, [range]);

  return (
    <div className="min-h-screen bg-[#F8F9FA] p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl text-[#09215F] mb-2">
                Admin Dashboard
              </h1>
              <p className="text-[#6C757D]">
                Welcome back! Here's what's happening with Best Brightness today.
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                size="sm"
                onClick={refreshData}
                disabled={loading}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Badge variant="secondary" className="px-3 py-1">
                <Activity className="h-4 w-4 mr-1" />
                {loading ? 'Loading...' : 'System Healthy'}
              </Badge>
            </div>
          </div>
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white p-1 rounded-xl shadow-sm border border-[#B0E0E6]/30">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="testing" className="flex items-center gap-2">
              <TestTube className="h-4 w-4" />
              Registration Testing
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Advanced Analytics
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Stock Notifications
            </TabsTrigger>
            <TabsTrigger value="database" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Database Status
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Range Filters */}
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                {([
                  { key: '1W', label: '1W' },
                  { key: '1M', label: '1M' },
                  { key: '6M', label: '6M' },
                  { key: '12M', label: '12M' }
                ] as Array<{ key: TimeRange; label: string }>).map(opt => (
                  <Button
                    key={opt.key}
                    variant={range === opt.key ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setRange(opt.key)}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
            </div>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-gradient-to-r from-[#97CF50] to-[#97CF50] text-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-white/90">Total Users</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-2xl">
                      {loading ? '...' : stats.totalUsers.toLocaleString()}
                    </div>
                    <Users className="h-8 w-8 text-white/80" />
                  </div>
                  <p className="text-xs text-white/80 mt-1">
                    {loading ? 'Loading...' : `${stats.growthRate >= 0 ? '+' : ''}${stats.growthRate}% from last month`}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-[#28A745] to-[#20C997] text-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-white/90">Total Products</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-2xl">
                      {loading ? '...' : stats.totalProducts}
                    </div>
                    <Package className="h-8 w-8 text-white/80" />
                  </div>
                  <p className="text-xs text-white/80 mt-1">
                    {loading ? 'Loading...' : `${stats.newProductsThisWeek} added this week`}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-[#FF6B35] to-[#FF8C69] text-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-white/90">Total Orders</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-2xl">
                      {loading ? '...' : stats.totalOrders}
                    </div>
                    <ShoppingCart className="h-8 w-8 text-white/80" />
                  </div>
                  <p className="text-xs text-white/80 mt-1">
                    {loading ? 'Loading...' : `${stats.pendingOrders} pending`}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-[#09215F] to-[#34495E] text-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-white/90">Revenue</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-2xl">
                      {loading ? '...' : `R${stats.revenue.toLocaleString()}`}
                    </div>
                    <TrendingUp className="h-8 w-8 text-white/80" />
                  </div>
                  <p className="text-xs text-white/80 mt-1">
                    {loading ? 'Loading...' : `${stats.growthRate >= 0 ? '+' : ''}${stats.growthRate}% growth`}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Charts and Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Sales Performance Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Revenue & Orders
                  </CardTitle>
                  <CardDescription>Performance over selected period</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <D3TimeSeries data={series} height={256} />
                  </div>
                </CardContent>
              </Card>
              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Recent Activity
                  </CardTitle>
                  <CardDescription>Latest system activities and user actions</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {loading ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#97CF50]"></div>
                        <span className="ml-2 text-[#6C757D]">Loading activities...</span>
                      </div>
                    ) : recentActivity.length > 0 ? (
                      recentActivity.map((activity) => (
                        <div key={activity.id} className="flex items-center justify-between p-3 bg-[#F8F9FA] rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className={`p-2 rounded-full ${
                              activity.type === 'user' ? 'bg-[#97CF50]/10 text-[#97CF50]' :
                              activity.type === 'order' ? 'bg-[#28A745]/10 text-[#28A745]' :
                              'bg-[#FF6B35]/10 text-[#FF6B35]'
                            }`}>
                              {activity.type === 'user' ? <Users className="h-4 w-4" /> :
                               activity.type === 'order' ? <ShoppingCart className="h-4 w-4" /> :
                               <Package className="h-4 w-4" />}
                            </div>
                            <div>
                              <p className="text-sm text-[#09215F]">{activity.action}</p>
                              <p className="text-xs text-[#6C757D]">{activity.user}</p>
                            </div>
                          </div>
                          <span className="text-xs text-[#6C757D]">{activity.time}</span>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-[#6C757D]">
                        <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>No recent activity found</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Top Products */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Top Products
                  </CardTitle>
                  <CardDescription>Best performing products for selected period</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-medium mb-2">By Quantity</h4>
                      <div className="space-y-3">
                        {(loading ? [] : bestByQty).map((p, index) => (
                          <div key={p.id} className="flex items-center justify-between p-3 bg-[#F8F9FA] rounded-lg">
                            <div className="flex items-center space-x-3">
                              <div className="bg-[#97CF50] text-white rounded-full w-8 h-8 flex items-center justify-center text-sm">#{index + 1}</div>
                              <div>
                                <p className="text-sm text-[#09215F]">{p.name}</p>
                                <p className="text-xs text-[#6C757D]">{p.quantity} units</p>
                              </div>
                            </div>
                            <span className="text-sm text-[#28A745]">R{p.revenue.toLocaleString()}</span>
                          </div>
                        ))}
                        {!loading && bestByQty.length === 0 && (
                          <div className="text-center py-6 text-[#6C757D]">No data</div>
                        )}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium mb-2">By Revenue</h4>
                      <div className="space-y-3">
                        {(loading ? [] : bestByRevenue).map((p, index) => (
                          <div key={p.id} className="flex items-center justify-between p-3 bg-[#F8F9FA] rounded-lg">
                            <div className="flex items-center space-x-3">
                              <div className="bg-[#34495E] text-white rounded-full w-8 h-8 flex items-center justify-center text-sm">#{index + 1}</div>
                              <div>
                                <p className="text-sm text-[#09215F]">{p.name}</p>
                                <p className="text-xs text-[#6C757D]">R{p.revenue.toLocaleString()}</p>
                              </div>
                            </div>
                            <span className="text-sm text-[#28A745]">{p.quantity} units</span>
                          </div>
                        ))}
                        {!loading && bestByRevenue.length === 0 && (
                          <div className="text-center py-6 text-[#6C757D]">No data</div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Revenue Breakdown & Inventory KPIs */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Revenue Breakdown</CardTitle>
                  <CardDescription>Completed orders in selected period</CardDescription>
                </CardHeader>
                <CardContent>
                  {revBreakdown ? (
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="p-3 bg-[#F8F9FA] rounded-lg">
                        <div className="text-[#6C757D]">Subtotal</div>
                        <div className="text-[#09215F] font-semibold">R{revBreakdown.subtotal.toLocaleString()}</div>
                      </div>
                      <div className="p-3 bg-[#F8F9FA] rounded-lg">
                        <div className="text-[#6C757D]">Tax</div>
                        <div className="text-[#09215F] font-semibold">R{revBreakdown.tax.toLocaleString()}</div>
                      </div>
                      <div className="p-3 bg-[#F8F9FA] rounded-lg">
                        <div className="text-[#6C757D]">Shipping</div>
                        <div className="text-[#09215F] font-semibold">R{revBreakdown.shipping.toLocaleString()}</div>
                      </div>
                      <div className="p-3 bg-[#F8F9FA] rounded-lg">
                        <div className="text-[#6C757D]">Discount</div>
                        <div className="text-[#09215F] font-semibold">-R{revBreakdown.discount.toLocaleString()}</div>
                      </div>
                      <div className="col-span-2 p-3 bg-[#E8F5E9] rounded-lg">
                        <div className="text-[#2E7D32]">Total</div>
                        <div className="text-[#1B5E20] font-semibold text-lg">R{revBreakdown.total.toLocaleString()}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-[#6C757D] text-sm">No data</div>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Inventory</CardTitle>
                  <CardDescription>Stock health overview</CardDescription>
                </CardHeader>
                <CardContent>
                  {inventory ? (
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="p-3 bg-[#F8F9FA] rounded-lg">
                        <div className="text-[#6C757D]">Total</div>
                        <div className="text-[#09215F] font-semibold">{inventory.totalProducts}</div>
                      </div>
                      <div className="p-3 bg-[#F8F9FA] rounded-lg">
                        <div className="text-[#6C757D]">Active</div>
                        <div className="text-[#09215F] font-semibold">{inventory.active}</div>
                      </div>
                      <div className="p-3 bg-[#FFF3E0] rounded-lg">
                        <div className="text-[#EF6C00]">Low Stock (≤5)</div>
                        <div className="text-[#E65100] font-semibold">{inventory.lowStock}</div>
                      </div>
                      <div className="p-3 bg-[#FFEBEE] rounded-lg">
                        <div className="text-[#C62828]">Out of Stock</div>
                        <div className="text-[#B71C1C] font-semibold">{inventory.outOfStock}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-[#6C757D] text-sm">No data</div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Sales by Category & Top Customers */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Sales by Category</CardTitle>
                  <CardDescription>Top categories by revenue</CardDescription>
                </CardHeader>
                <CardContent>
                  {salesByCat.length ? (
                    <div className="space-y-3">
                      {salesByCat.slice(0, 6).map(row => (
                        <div key={row.categoryId} className="flex items-center justify-between p-3 bg-[#F8F9FA] rounded-lg">
                          <div>
                            <div className="text-sm text-[#09215F]">{row.categoryName}</div>
                            <div className="text-xs text-[#6C757D]">{row.items} items</div>
                          </div>
                          <div className="text-sm font-semibold text-[#09215F]">R{row.revenue.toLocaleString()}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-[#6C757D] text-sm">No data</div>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Top Customers</CardTitle>
                  <CardDescription>Highest spenders in selected period</CardDescription>
                </CardHeader>
                <CardContent>
                  {topCustomers.length ? (
                    <div className="space-y-3">
                      {topCustomers.map((c, idx) => (
                        <div key={c.id} className="flex items-center justify-between p-3 bg-[#F8F9FA] rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="bg-[#97CF50] text-white rounded-full w-8 h-8 flex items-center justify-center text-sm">#{idx + 1}</div>
                            <div>
                              <div className="text-sm text-[#09215F]">{c.name || 'Customer'}</div>
                              <div className="text-xs text-[#6C757D]">{c.email}</div>
                            </div>
                          </div>
                          <div className="text-sm font-semibold text-[#09215F]">R{c.total.toLocaleString()}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-[#6C757D] text-sm">No data</div>
                  )}
                </CardContent>
              </Card>
            </div>
            
            {/* Sales Mix (Channel, Payment, New vs Returning) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Sales by Channel</CardTitle>
                  <CardDescription>Share of completed orders</CardDescription>
                </CardHeader>
                <CardContent>
                  {mix && mix.channel.length ? (
                    <div className="space-y-3">
                      {mix.channel.map(row => (
                        <div key={row.name} className="flex items-center justify-between p-3 bg-[#F8F9FA] rounded-lg">
                          <div className="text-sm text-[#09215F] capitalize">{row.name}</div>
                          <div className="text-xs text-[#6C757D]">{row.orders} orders</div>
                          <div className="text-sm font-semibold text-[#09215F]">R{row.revenue.toLocaleString()}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-[#6C757D] text-sm">No data</div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Payment Methods</CardTitle>
                  <CardDescription>Completed orders by method</CardDescription>
                </CardHeader>
                <CardContent>
                  {mix && mix.payments.length ? (
                    <div className="space-y-3">
                      {mix.payments.map(row => (
                        <div key={row.name} className="flex items-center justify-between p-3 bg-[#F8F9FA] rounded-lg">
                          <div className="text-sm text-[#09215F] capitalize">{row.name}</div>
                          <div className="text-xs text-[#6C757D]">{row.orders} orders</div>
                          <div className="text-sm font-semibold text-[#09215F]">R{row.revenue.toLocaleString()}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-[#6C757D] text-sm">No data</div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>New vs Returning Customers</CardTitle>
                <CardDescription>Within the selected period</CardDescription>
              </CardHeader>
              <CardContent>
                {mix ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="p-3 bg-[#F8F9FA] rounded-lg">
                      <div className="text-[#6C757D]">New Customers</div>
                      <div className="text-[#09215F] font-semibold">R{mix.newVsReturning.new.revenue.toLocaleString()} • {mix.newVsReturning.new.orders} orders</div>
                    </div>
                    <div className="p-3 bg-[#F8F9FA] rounded-lg">
                      <div className="text-[#6C757D]">Returning Customers</div>
                      <div className="text-[#09215F] font-semibold">R{mix.newVsReturning.returning.revenue.toLocaleString()} • {mix.newVsReturning.returning.orders} orders</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-[#6C757D] text-sm">No data</div>
                )}
              </CardContent>
            </Card>

            {/* Business Value KPIs */}
            <Card>
              <CardHeader>
                <CardTitle>Business Value</CardTitle>
                <CardDescription>Key commerce metrics for the selected period</CardDescription>
              </CardHeader>
              <CardContent>
                {biz ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-3 bg-[#F8F9FA] rounded-lg">
                      <div className="text-[#6C757D] text-sm">Average Order Value</div>
                      <div className="text-[#09215F] font-semibold">R{Math.round(biz.aov).toLocaleString()}</div>
                    </div>
                    <div className="p-3 bg-[#F8F9FA] rounded-lg">
                      <div className="text-[#6C757D] text-sm">Items per Order</div>
                      <div className="text-[#09215F] font-semibold">{biz.itemsPerOrder.toFixed(2)}</div>
                    </div>
                    <div className="p-3 bg-[#F8F9FA] rounded-lg">
                      <div className="text-[#6C757D] text-sm">Repeat Customer Rate</div>
                      <div className="text-[#09215F] font-semibold">{Math.round(biz.repeatRate * 100)}%</div>
                    </div>
                    <div className="p-3 bg-[#F8F9FA] rounded-lg">
                      <div className="text-[#6C757D] text-sm">Gross Margin</div>
                      <div className="text-[#09215F] font-semibold">{Math.round(biz.grossMargin * 100)}%</div>
                    </div>
                    <div className="p-3 bg-[#F8F9FA] rounded-lg">
                      <div className="text-[#6C757D] text-sm">Inventory Value (Retail)</div>
                      <div className="text-[#09215F] font-semibold">R{Math.round(biz.inventoryValueRetail).toLocaleString()}</div>
                    </div>
                    <div className="p-3 bg-[#F8F9FA] rounded-lg">
                      <div className="text-[#6C757D] text-sm">Inventory Value (Cost)</div>
                      <div className="text-[#09215F] font-semibold">R{Math.round(biz.inventoryValueCost).toLocaleString()}</div>
                    </div>
                    <div className="p-3 bg-[#FFF3E0] rounded-lg">
                      <div className="text-[#EF6C00] text-sm">Sell-Through</div>
                      <div className="text-[#E65100] font-semibold">{Math.round(biz.sellThrough * 100)}%</div>
                    </div>
                    <div className="p-3 bg-[#FFEBEE] rounded-lg">
                      <div className="text-[#C62828] text-sm">Refund/Cancel Rate</div>
                      <div className="text-[#B71C1C] font-semibold">{Math.round(biz.refundRate * 100)}%</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-[#6C757D] text-sm">No data</div>
                )}
              </CardContent>
            </Card>

            {/* Stock 50% Reached This Month */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Products that reached 50% of monthly stock
                </CardTitle>
                <CardDescription>Based on current month sales vs starting stock</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#97CF50]"></div>
                    <span className="ml-2 text-[#6C757D]">Checking stock...</span>
                  </div>
                ) : stock50.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="text-left text-[#6C757D]">
                          <th className="py-2 pr-4">Product</th>
                          <th className="py-2 pr-4">Sold (month)</th>
                          <th className="py-2 pr-4">Starting Stock</th>
                          <th className="py-2">% Sold</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stock50.map(p => (
                          <tr key={p.id} className="border-t">
                            <td className="py-2 pr-4 text-[#09215F]">{p.name}</td>
                            <td className="py-2 pr-4">{p.soldThisMonth}</td>
                            <td className="py-2 pr-4">{p.startingStock}</td>
                            <td className="py-2">{Math.round(p.percentSold * 100)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-6 text-[#6C757D]">No products reached 50% this month yet.</div>
                )}
              </CardContent>
            </Card>

            {/* Comprehensive Product Analytics */}
            {productAnalytics && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Product Performance Summary</CardTitle>
                    <CardDescription>Key metrics from products table</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="p-3 bg-[#F8F9FA] rounded-lg">
                        <div className="text-[#6C757D]">Total Products</div>
                        <div className="text-[#09215F] font-semibold">{productAnalytics.summary.totalProducts}</div>
                      </div>
                      <div className="p-3 bg-[#E8F5E9] rounded-lg">
                        <div className="text-[#2E7D32]">Active Products</div>
                        <div className="text-[#1B5E20] font-semibold">{productAnalytics.summary.activeProducts}</div>
                      </div>
                      <div className="p-3 bg-[#FFF3E0] rounded-lg">
                        <div className="text-[#EF6C00]">Low Stock (≤5)</div>
                        <div className="text-[#E65100] font-semibold">{productAnalytics.summary.lowStockCount}</div>
                      </div>
                      <div className="p-3 bg-[#FFEBEE] rounded-lg">
                        <div className="text-[#C62828]">Out of Stock</div>
                        <div className="text-[#B71C1C] font-semibold">{productAnalytics.summary.outOfStockCount}</div>
                      </div>
                      <div className="p-3 bg-[#F8F9FA] rounded-lg">
                        <div className="text-[#6C757D]">Inventory Value</div>
                        <div className="text-[#09215F] font-semibold">R{productAnalytics.summary.totalInventoryValue.toLocaleString()}</div>
                      </div>
                      <div className="p-3 bg-[#F8F9FA] rounded-lg">
                        <div className="text-[#6C757D]">Avg Profit Margin</div>
                        <div className="text-[#09215F] font-semibold">{productAnalytics.summary.avgProfitMargin.toFixed(1)}%</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Top Performing Products</CardTitle>
                    <CardDescription>By revenue in selected period</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {productAnalytics.topRevenue.slice(0, 5).map((product: any, index: number) => (
                        <div key={product.id} className="flex items-center justify-between p-3 bg-[#F8F9FA] rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="bg-[#97CF50] text-white rounded-full w-8 h-8 flex items-center justify-center text-sm">#{index + 1}</div>
                            <div>
                              <p className="text-sm text-[#09215F]">{product.name}</p>
                              <p className="text-xs text-[#6C757D]">{product.category} • {product.totalSold} sold</p>
                            </div>
                          </div>
                          <div className="text-sm font-semibold text-[#09215F]">R{product.totalRevenue.toLocaleString()}</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* User Analytics */}
            {userAnalytics && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>User Growth & Engagement</CardTitle>
                    <CardDescription>Key metrics from user_profiles table</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="p-3 bg-[#F8F9FA] rounded-lg">
                        <div className="text-[#6C757D]">Total Users</div>
                        <div className="text-[#09215F] font-semibold">{userAnalytics.summary.totalUsers}</div>
                      </div>
                      <div className="p-3 bg-[#E8F5E9] rounded-lg">
                        <div className="text-[#2E7D32]">New Users</div>
                        <div className="text-[#1B5E20] font-semibold">{userAnalytics.summary.newUsers}</div>
                      </div>
                      <div className="p-3 bg-[#F8F9FA] rounded-lg">
                        <div className="text-[#6C757D]">Growth Rate</div>
                        <div className="text-[#09215F] font-semibold">{userAnalytics.summary.userGrowthRate.toFixed(1)}%</div>
                      </div>
                      <div className="p-3 bg-[#E8F5E9] rounded-lg">
                        <div className="text-[#2E7D32]">Active Customers</div>
                        <div className="text-[#1B5E20] font-semibold">{userAnalytics.summary.activeCustomers}</div>
                      </div>
                      <div className="p-3 bg-[#FFF3E0] rounded-lg">
                        <div className="text-[#EF6C00]">At Risk</div>
                        <div className="text-[#E65100] font-semibold">{userAnalytics.summary.atRiskCustomers}</div>
                      </div>
                      <div className="p-3 bg-[#FFEBEE] rounded-lg">
                        <div className="text-[#C62828]">Inactive</div>
                        <div className="text-[#B71C1C] font-semibold">{userAnalytics.summary.inactiveCustomers}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>User Roles Distribution</CardTitle>
                    <CardDescription>Breakdown by user roles</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {userAnalytics.usersByRole.map((role: any) => (
                        <div key={role.role} className="flex items-center justify-between p-3 bg-[#F8F9FA] rounded-lg">
                          <div className="text-sm text-[#09215F] capitalize">{role.role}</div>
                          <div className="text-sm font-semibold text-[#09215F]">{role.count} users</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Order Analytics */}
            {orderAnalytics && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Order Performance</CardTitle>
                    <CardDescription>Key metrics from orders table</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="p-3 bg-[#F8F9FA] rounded-lg">
                        <div className="text-[#6C757D]">Total Orders</div>
                        <div className="text-[#09215F] font-semibold">{orderAnalytics.summary.totalOrders}</div>
                      </div>
                      <div className="p-3 bg-[#E8F5E9] rounded-lg">
                        <div className="text-[#2E7D32]">Completed</div>
                        <div className="text-[#1B5E20] font-semibold">{orderAnalytics.summary.completedOrders}</div>
                      </div>
                      <div className="p-3 bg-[#F8F9FA] rounded-lg">
                        <div className="text-[#6C757D]">Completion Rate</div>
                        <div className="text-[#09215F] font-semibold">{orderAnalytics.summary.completionRate.toFixed(1)}%</div>
                      </div>
                      <div className="p-3 bg-[#F8F9FA] rounded-lg">
                        <div className="text-[#6C757D]">Avg Order Value</div>
                        <div className="text-[#09215F] font-semibold">R{orderAnalytics.summary.avgOrderValue.toLocaleString()}</div>
                      </div>
                      <div className="p-3 bg-[#FFF3E0] rounded-lg">
                        <div className="text-[#EF6C00]">Pending</div>
                        <div className="text-[#E65100] font-semibold">{orderAnalytics.summary.pendingOrders}</div>
                      </div>
                      <div className="p-3 bg-[#FFEBEE] rounded-lg">
                        <div className="text-[#C62828]">Cancelled</div>
                        <div className="text-[#B71C1C] font-semibold">{orderAnalytics.summary.cancelledOrders}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Order Value Distribution</CardTitle>
                    <CardDescription>Orders by value ranges</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-[#F8F9FA] rounded-lg">
                        <div className="text-sm text-[#09215F]">Under R100</div>
                        <div className="text-sm font-semibold text-[#09215F]">{orderAnalytics.valueRanges.under100}</div>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-[#F8F9FA] rounded-lg">
                        <div className="text-sm text-[#09215F]">R100 - R500</div>
                        <div className="text-sm font-semibold text-[#09215F]">{orderAnalytics.valueRanges.between100500}</div>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-[#F8F9FA] rounded-lg">
                        <div className="text-sm text-[#09215F]">R500 - R1000</div>
                        <div className="text-sm font-semibold text-[#09215F]">{orderAnalytics.valueRanges.between5001000}</div>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-[#F8F9FA] rounded-lg">
                        <div className="text-sm text-[#09215F]">Over R1000</div>
                        <div className="text-sm font-semibold text-[#09215F]">{orderAnalytics.valueRanges.over1000}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* Registration Testing Tab */}
          <TabsContent value="testing" className="space-y-6">
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="mb-6">
                <h2 className="text-2xl text-[#09215F] mb-2">Registration System Testing</h2>
                <p className="text-[#6C757D]">
                  Test and verify that the database fix has resolved the "Database error saving new user" issue.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Real-Time Test */}
                <div className="space-y-4">
                  <RealTimeRegistrationTest />
                </div>

                {/* Quick Test */}
                <div className="space-y-4">
                  <QuickRegistrationTest />
                </div>
              </div>

              {/* Instructions */}
              <div className="mt-8 p-6 bg-green-50 border border-green-200 rounded-xl">
                <h3 className="font-medium text-green-900 mb-3 flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Quick Testing Guide
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-green-800">
                  <div>
                    <h4 className="font-medium mb-2">Before Testing:</h4>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Run COMPREHENSIVE_DATABASE_FIX.sql in Supabase</li>
                      <li>Wait for all ✅ success messages</li>
                      <li>Clear browser cache completely</li>
                    </ol>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">During Testing:</h4>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Use "Real-Time Test" for comprehensive testing</li>
                      <li>Use "Quick Test" for simple verification</li>
                      <li>Check results show ✅ success indicators</li>
                    </ol>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Advanced Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <AdvancedAnalytics />
            </div>
          </TabsContent>

          {/* Stock Notifications Tab */}
          <TabsContent value="notifications" className="space-y-6">
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="mb-6">
                <h2 className="text-2xl text-[#09215F] mb-2">Stock Notification Management</h2>
                <p className="text-[#6C757D]">
                  Manage and send stock availability notifications to customers who requested to be notified.
                </p>
              </div>

              <StockNotificationManager />
            </div>
          </TabsContent>

          {/* Database Status Tab */}
          <TabsContent value="database" className="space-y-6">
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="mb-6">
                <h2 className="text-2xl text-[#09215F] mb-2">Database Status & Verification</h2>
                <p className="text-[#6C757D]">
                  Monitor database health and verify that all components are properly configured.
                </p>
              </div>

              <DatabaseFixVerification />

              {/* Database Health Indicators */}
              <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-green-50 border-green-200">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <div>
                        <h4 className="text-sm font-medium text-green-900">Database Schema</h4>
                        <p className="text-xs text-green-700">user_profiles table ready</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-green-50 border-green-200">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Activity className="h-5 w-5 text-green-600" />
                      <div>
                        <h4 className="text-sm font-medium text-green-900">Trigger Function</h4>
                        <p className="text-xs text-green-700">handle_new_user active</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-yellow-50 border-yellow-200">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <AlertCircle className="h-5 w-5 text-yellow-600" />
                      <div>
                        <h4 className="text-sm font-medium text-yellow-900">RLS Policies</h4>
                        <p className="text-xs text-yellow-700">INSERT policy configured</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}