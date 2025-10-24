import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BarChart3, 
  ShoppingCart, 
  Banknote, 
  Package, 
  Users, 
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CreditCard,
  Receipt,
  TrendingUp,
  Star,
  AlertCircle,
  CheckCircle,
  Calendar,
  Target,
  Award,
  Zap,
  Activity,
  Eye
} from 'lucide-react';
import CashierLayout from '../../components/cashier/CashierLayout';

// Custom South African Rand icon component
const RandIcon = ({ className = "h-8 w-8" }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <text
      x="12"
      y="16"
      textAnchor="middle"
      fontSize="12"
      fontWeight="500"
      fill="currentColor"
    >
      R
    </text>
  </svg>
);

export default function EnhancedCashierDashboard() {
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedPeriod, setSelectedPeriod] = useState('today');
  const [activeStats, setActiveStats] = useState(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const statsData = {
    today: {
      sales: { value: 'R1,234.56', change: '+8.2%', trend: 'up' },
      orders: { value: '24', change: '+15.3%', trend: 'up' },
      items: { value: '89', change: '+12.1%', trend: 'up' },
      customers: { value: '18', change: '+5.7%', trend: 'up' }
    },
    week: {
      sales: { value: 'R8,945.23', change: '+22.4%', trend: 'up' },
      orders: { value: '157', change: '+18.9%', trend: 'up' },
      items: { value: '634', change: '+15.7%', trend: 'up' },
      customers: { value: '142', change: '+12.3%', trend: 'up' }
    },
    month: {
      sales: { value: 'R34,567.89', change: '-2.1%', trend: 'down' },
      orders: { value: '892', change: '+5.6%', trend: 'up' },
      items: { value: '2,847', change: '+8.9%', trend: 'up' },
      customers: { value: '567', change: '-1.2%', trend: 'down' }
    }
  };

  const currentStats = statsData[selectedPeriod];

  const recentTransactions = [
    { id: 1, customer: 'Clean Home Restaurant', amount: 'R845.99', time: '2 min ago', items: 8, status: 'completed' },
    { id: 2, customer: 'Sparkle Office Solutions', amount: 'R1,128.45', time: '5 min ago', items: 12, status: 'completed' },
    { id: 3, customer: 'Fresh Start Catering', amount: 'R367.20', time: '8 min ago', items: 6, status: 'completed' },
    { id: 4, customer: 'Pristine Hotel Group', amount: 'R2,234.78', time: '12 min ago', items: 25, status: 'refunded' },
    { id: 5, customer: 'Bright Future Daycare', amount: 'R289.34', time: '15 min ago', items: 9, status: 'completed' }
  ];

  const topProducts = [
    { name: 'All-Purpose Cleaner 500ml', sold: 24, revenue: 'R383.76', trend: '+15%' },
    { name: 'Toilet Paper 12-Pack', sold: 18, revenue: 'R405.00', trend: '+8%' },
    { name: 'Dish Soap Concentrate 1L', sold: 15, revenue: 'R281.25', trend: '+12%' },
    { name: 'Microfiber Cloth Set', sold: 12, revenue: 'R420.00', trend: '+5%' },
    { name: 'Floor Disinfectant 2L', sold: 8, revenue: 'R719.92', trend: '+22%' }
  ];

  const achievements = [
    { icon: Award, title: 'Sales Champion', description: 'Exceeded daily target by 20%', earned: true },
    { icon: Star, title: 'Customer Favorite', description: '5-star rating this week', earned: true },
    { icon: Target, title: 'Accuracy Expert', description: 'Zero transaction errors', earned: false },
    { icon: Zap, title: 'Speed Demon', description: 'Fastest checkout time', earned: true }
  ];

  return (
    <CashierLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50/50 to-cyan-50/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Modern Header with Glassmorphism */}
        <div className="mb-8 backdrop-blur-xl bg-white/80 border border-white/20 rounded-3xl shadow-2xl p-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-green-500 to-cyan-500 text-white shadow-lg">
                <Activity className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                  Cashier Dashboard
                </h1>
                <p className="text-slate-500 mt-1 font-medium">Your point-of-sale overview and performance metrics</p>
              </div>
            </div>
            <div className="mt-4 lg:mt-0 flex flex-col lg:flex-row lg:items-center lg:space-x-6">
              <div className="text-right">
                <div className="text-2xl font-bold text-slate-800">
                  {currentTime.toLocaleTimeString()}
                </div>
                <div className="text-slate-500 font-medium">
                  {currentTime.toLocaleDateString('en-ZA', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </div>
              </div>
              <div className="flex items-center space-x-2 backdrop-blur-xl bg-white/80 border border-white/20 rounded-2xl px-4 py-2 shadow-lg">
                <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-slate-600">Active Session</span>
              </div>
            </div>
          </div>
        </div>

        {/* Period Selector */}
        <div className="mb-6">
          <div className="backdrop-blur-xl bg-white/80 border border-white/20 rounded-2xl shadow-lg p-2 inline-block">
            <div className="flex space-x-1">
              {[
                { key: 'today', label: 'Today' },
                { key: 'week', label: 'This Week' },
                { key: 'month', label: 'This Month' }
              ].map((period) => (
                <button
                  key={period.key}
                  onClick={() => setSelectedPeriod(period.key)}
                  className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                    selectedPeriod === period.key
                      ? 'bg-gradient-to-r from-green-600 to-cyan-600 text-white shadow-lg transform scale-105'
                      : 'text-slate-600 hover:text-green-600 hover:bg-green-50'
                  }`}
                >
                  {period.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div 
            className="bg-white rounded-2xl shadow-xl p-6 hover:shadow-2xl transition-all duration-300 cursor-pointer transform hover:-translate-y-1"
            onMouseEnter={() => setActiveStats('sales')}
            onMouseLeave={() => setActiveStats(null)}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#09215F]/80">Sales Revenue</p>
                <p className="text-3xl font-bold text-[#09215F] mt-1">{currentStats.sales.value}</p>
              </div>
              <div className="p-4 rounded-2xl bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg">
                <RandIcon className="h-8 w-8" />
              </div>
            </div>
            <div className="mt-4 flex items-center">
              {currentStats.sales.trend === 'up' ? (
                <ArrowUpRight className="h-5 w-5 text-green-500 mr-2" />
              ) : (
                <ArrowDownRight className="h-5 w-5 text-red-500 mr-2" />
              )}
              <span className={`text-sm font-bold ${currentStats.sales.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                {currentStats.sales.change}
              </span>
              <span className="text-sm text-[#09215F]/80 ml-2">vs last {selectedPeriod}</span>
            </div>
            {activeStats === 'sales' && (
              <div className="mt-3 text-xs text-[#09215F]/70">
                🎯 Target: {selectedPeriod === 'today' ? 'R1,000' : selectedPeriod === 'week' ? 'R7,000' : 'R30,000'}
              </div>
            )}
          </div>

          <div 
            className="bg-white rounded-2xl shadow-xl p-6 hover:shadow-2xl transition-all duration-300 cursor-pointer transform hover:-translate-y-1"
            onMouseEnter={() => setActiveStats('orders')}
            onMouseLeave={() => setActiveStats(null)}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#09215F]/80">Orders Processed</p>
                <p className="text-3xl font-bold text-[#09215F] mt-1">{currentStats.orders.value}</p>
              </div>
              <div className="p-4 rounded-2xl bg-gradient-to-br from-[#97CF50] to-[#09215F] text-white shadow-lg">
                <ShoppingCart className="h-8 w-8" />
              </div>
            </div>
            <div className="mt-4 flex items-center">
              {currentStats.orders.trend === 'up' ? (
                <ArrowUpRight className="h-5 w-5 text-green-500 mr-2" />
              ) : (
                <ArrowDownRight className="h-5 w-5 text-red-500 mr-2" />
              )}
              <span className={`text-sm font-bold ${currentStats.orders.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                {currentStats.orders.change}
              </span>
              <span className="text-sm text-[#09215F]/80 ml-2">vs last {selectedPeriod}</span>
            </div>
            {activeStats === 'orders' && (
              <div className="mt-3 text-xs text-[#09215F]/70">
                ⚡ Avg processing time: 2.3 minutes
              </div>
            )}
          </div>

          <div 
            className="bg-white rounded-2xl shadow-xl p-6 hover:shadow-2xl transition-all duration-300 cursor-pointer transform hover:-translate-y-1"
            onMouseEnter={() => setActiveStats('items')}
            onMouseLeave={() => setActiveStats(null)}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#09215F]/80">Items Sold</p>
                <p className="text-3xl font-bold text-[#09215F] mt-1">{currentStats.items.value}</p>
              </div>
              <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg">
                <Package className="h-8 w-8" />
              </div>
            </div>
            <div className="mt-4 flex items-center">
              {currentStats.items.trend === 'up' ? (
                <ArrowUpRight className="h-5 w-5 text-green-500 mr-2" />
              ) : (
                <ArrowDownRight className="h-5 w-5 text-red-500 mr-2" />
              )}
              <span className={`text-sm font-bold ${currentStats.items.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                {currentStats.items.change}
              </span>
              <span className="text-sm text-[#09215F]/80 ml-2">vs last {selectedPeriod}</span>
            </div>
            {activeStats === 'items' && (
              <div className="mt-3 text-xs text-[#09215F]/70">
                📦 Most popular: Coca Cola 500ml
              </div>
            )}
          </div>

          <div 
            className="bg-white rounded-2xl shadow-xl p-6 hover:shadow-2xl transition-all duration-300 cursor-pointer transform hover:-translate-y-1"
            onMouseEnter={() => setActiveStats('customers')}
            onMouseLeave={() => setActiveStats(null)}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#09215F]/80">Customers Served</p>
                <p className="text-3xl font-bold text-[#09215F] mt-1">{currentStats.customers.value}</p>
              </div>
              <div className="p-4 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-lg">
                <Users className="h-8 w-8" />
              </div>
            </div>
            <div className="mt-4 flex items-center">
              {currentStats.customers.trend === 'up' ? (
                <ArrowUpRight className="h-5 w-5 text-green-500 mr-2" />
              ) : (
                <ArrowDownRight className="h-5 w-5 text-red-500 mr-2" />
              )}
              <span className={`text-sm font-bold ${currentStats.customers.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                {currentStats.customers.change}
              </span>
              <span className="text-sm text-[#09215F]/80 ml-2">vs last {selectedPeriod}</span>
            </div>
            {activeStats === 'customers' && (
              <div className="mt-3 text-xs text-[#09215F]/70">
                ⭐ Customer satisfaction: 4.8/5
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Quick Actions */}
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-2xl font-semibold text-[#09215F] mb-6 flex items-center">
              <Zap className="h-6 w-6 mr-3 text-[#97CF50]" />
              Quick Actions
            </h2>
            <div className="grid grid-cols-1 gap-4">
              <button 
                onClick={() => navigate('/cashier/pos')}
                className="flex items-center p-4 rounded-xl border-2 border-[#97CF50]/20 hover:bg-gradient-to-r hover:from-[#97CF50]/10 hover:to-[#97CF50]/10 transition-all duration-300 group hover:border-[#97CF50]/40 hover:shadow-lg"
              >
                <div className="p-3 rounded-xl bg-gradient-to-br from-[#97CF50] to-[#09215F] text-white mr-4 group-hover:shadow-lg group-hover:scale-110 transition-all duration-300">
                  <ShoppingCart className="h-6 w-6" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-[#09215F] group-hover:text-[#97CF50] transition-colors">Open POS System</p>
                  <p className="text-sm text-[#09215F]/80">Start processing customer sales</p>
                </div>
              </button>

              <button 
                onClick={() => navigate('/cashier/reports')}
                className="flex items-center p-4 rounded-xl border-2 border-[#97CF50]/20 hover:bg-gradient-to-r hover:from-[#97CF50]/10 hover:to-[#97CF50]/10 transition-all duration-300 group hover:border-[#97CF50]/40 hover:shadow-lg"
              >
                <div className="p-3 rounded-xl bg-gradient-to-br from-green-500 to-green-600 text-white mr-4 group-hover:shadow-lg group-hover:scale-110 transition-all duration-300">
                  <BarChart3 className="h-6 w-6" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-[#09215F] group-hover:text-[#97CF50] transition-colors">View Performance Reports</p>
                  <p className="text-sm text-[#09215F]/80">Daily and weekly sales analytics</p>
                </div>
              </button>

              <button 
                onClick={() => navigate('/admin/products')}
                className="flex items-center p-4 rounded-xl border-2 border-[#97CF50]/20 hover:bg-gradient-to-r hover:from-[#97CF50]/10 hover:to-[#97CF50]/10 transition-all duration-300 group hover:border-[#97CF50]/40 hover:shadow-lg"
              >
                <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 text-white mr-4 group-hover:shadow-lg group-hover:scale-110 transition-all duration-300">
                  <Package className="h-6 w-6" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-[#09215F] group-hover:text-[#97CF50] transition-colors">Check Inventory Status</p>
                  <p className="text-sm text-[#09215F]/80">Current stock levels and alerts</p>
                </div>
              </button>

              <button 
                onClick={() => window.print()}
                className="flex items-center p-4 rounded-xl border-2 border-[#97CF50]/20 hover:bg-gradient-to-r hover:from-[#97CF50]/10 hover:to-[#97CF50]/10 transition-all duration-300 group hover:border-[#97CF50]/40 hover:shadow-lg"
              >
                <div className="p-3 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 text-white mr-4 group-hover:shadow-lg group-hover:scale-110 transition-all duration-300">
                  <Receipt className="h-6 w-6" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-[#09215F] group-hover:text-[#97CF50] transition-colors">Print End-of-Day Report</p>
                  <p className="text-sm text-[#09215F]/80">Generate shift summary</p>
                </div>
              </button>
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-2xl font-semibold text-[#09215F] mb-6 flex items-center">
              <Clock className="h-6 w-6 mr-3 text-[#97CF50]" />
              Recent Transactions
            </h2>
            <div className="space-y-3">
              {recentTransactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-4 bg-gradient-to-r from-[#97CF50]/10 to-transparent rounded-xl border border-[#97CF50]/20 hover:from-[#97CF50]/20 hover:border-[#97CF50]/30 transition-all duration-300">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${transaction.status === 'completed' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                      {transaction.status === 'completed' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                    </div>
                    <div>
                      <p className="font-semibold text-[#09215F]">{transaction.customer}</p>
                      <p className="text-sm text-[#09215F]/80">{transaction.items} items • {transaction.time}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-[#09215F]">{transaction.amount}</p>
                    <p className={`text-xs ${transaction.status === 'completed' ? 'text-green-600' : 'text-red-600'}`}>
                      {transaction.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Top Products */}
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-2xl font-semibold text-[#09215F] mb-6 flex items-center">
              <TrendingUp className="h-6 w-6 mr-3 text-[#97CF50]" />
              Top Selling Products
            </h2>
            <div className="space-y-4">
              {topProducts.map((product, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gradient-to-r from-[#97CF50]/10 to-transparent rounded-xl border border-[#97CF50]/20">
                  <div className="flex items-center space-x-4">
                    <div className="bg-[#97CF50] text-white rounded-lg px-3 py-2 font-bold">
                      #{index + 1}
                    </div>
                    <div>
                      <p className="font-semibold text-[#09215F]">{product.name}</p>
                      <p className="text-sm text-[#09215F]/80">{product.sold} units sold</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-[#09215F]">{product.revenue}</p>
                    <p className="text-sm text-green-600 font-semibold">{product.trend}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Achievements */}
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-2xl font-semibold text-[#09215F] mb-6 flex items-center">
              <Award className="h-6 w-6 mr-3 text-[#97CF50]" />
              Today's Achievements
            </h2>
            <div className="space-y-4">
              {achievements.map((achievement, index) => {
                const IconComponent = achievement.icon;
                return (
                  <div key={index} className={`flex items-center p-4 rounded-xl border transition-all duration-300 ${
                    achievement.earned 
                      ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200' 
                      : 'bg-gray-50 border-gray-200'
                  }`}>
                    <div className={`p-3 rounded-xl mr-4 ${
                      achievement.earned 
                        ? 'bg-gradient-to-br from-green-500 to-emerald-600 text-white' 
                        : 'bg-gray-300 text-gray-500'
                    }`}>
                      <IconComponent className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <p className={`font-bold ${achievement.earned ? 'text-green-700' : 'text-gray-500'}`}>
                        {achievement.title}
                      </p>
                      <p className={`text-sm ${achievement.earned ? 'text-green-600' : 'text-gray-400'}`}>
                        {achievement.description}
                      </p>
                    </div>
                    {achievement.earned && (
                      <CheckCircle className="h-6 w-6 text-green-500" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Enhanced Features Info */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center">
            <div className="bg-gradient-to-br from-[#97CF50] to-[#09215F] text-white p-6 rounded-2xl w-20 h-20 mx-auto mb-6 flex items-center justify-center">
              <Eye className="h-10 w-10" />
            </div>
            <h3 className="text-2xl font-bold text-[#09215F] mb-4">Advanced Cashier Features</h3>
            <p className="text-[#09215F]/80 mb-8 max-w-2xl mx-auto">
              This comprehensive dashboard provides real-time insights and powerful tools for modern retail operations.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <div className="bg-gradient-to-br from-[#97CF50]/20 to-[#97CF50]/10 p-6 rounded-2xl border border-[#97CF50]/20">
                <h4 className="font-bold text-[#09215F] mb-2">🔥 Real-time Analytics</h4>
                <p className="text-sm text-[#09215F]/80">Live performance tracking and instant insights</p>
              </div>
              <div className="bg-gradient-to-br from-[#97CF50]/20 to-[#97CF50]/10 p-6 rounded-2xl border border-[#97CF50]/20">
                <h4 className="font-bold text-[#09215F] mb-2">🎯 Smart Recommendations</h4>
                <p className="text-sm text-[#09215F]/80">AI-powered product suggestions and upselling</p>
              </div>
              <div className="bg-gradient-to-br from-[#97CF50]/20 to-[#97CF50]/10 p-6 rounded-2xl border border-[#97CF50]/20">
                <h4 className="font-bold text-[#09215F] mb-2">📱 Mobile Integration</h4>
                <p className="text-sm text-[#09215F]/80">Seamless mobile POS and inventory management</p>
              </div>
              <div className="bg-gradient-to-br from-[#97CF50]/20 to-[#97CF50]/10 p-6 rounded-2xl border border-[#97CF50]/20">
                <h4 className="font-bold text-[#09215F] mb-2">🏆 Gamification</h4>
                <p className="text-sm text-[#09215F]/80">Achievement system and performance rewards</p>
              </div>
              <div className="bg-gradient-to-br from-[#97CF50]/20 to-[#97CF50]/10 p-6 rounded-2xl border border-[#97CF50]/20">
                <h4 className="font-bold text-[#09215F] mb-2">🔐 Advanced Security</h4>
                <p className="text-sm text-[#09215F]/80">Fraud detection and secure payment processing</p>
              </div>
              <div className="bg-gradient-to-br from-[#97CF50]/20 to-[#97CF50]/10 p-6 rounded-2xl border border-[#97CF50]/20">
                <h4 className="font-bold text-[#09215F] mb-2">📊 Predictive Analytics</h4>
                <p className="text-sm text-[#09215F]/80">Forecasting and trend analysis for better decisions</p>
              </div>
            </div>
          </div>
          </div>
        </div>
      </div>
    </CashierLayout>
  );
}