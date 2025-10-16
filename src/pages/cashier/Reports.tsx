import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BarChart3, 
  ArrowLeft,
  DollarSign, 
  ShoppingCart, 
  Package, 
  Users,
  Calendar,
  Download,
  TrendingUp,
  PieChart,
  LineChart,
  Activity,
  Filter,
  Share2,
  Eye,
  Sparkles,
  Star,
  Trophy,
  Clock,
  Zap
} from 'lucide-react';
import CashierLayout from '../../components/cashier/CashierLayout';

export default function CashierReports() {
  const navigate = useNavigate();
  const [selectedDateRange, setSelectedDateRange] = useState('today');
  const [selectedReport, setSelectedReport] = useState('sales');

  const dateRanges = [
    { key: 'today', label: 'Today' },
    { key: 'week', label: 'This Week' },
    { key: 'month', label: 'This Month' },
    { key: 'quarter', label: 'This Quarter' },
    { key: 'year', label: 'This Year' }
  ];

  const reportTypes = [
    { key: 'sales', label: 'Sales Report', icon: DollarSign },
    { key: 'transactions', label: 'Transaction Report', icon: ShoppingCart },
    { key: 'products', label: 'Product Performance', icon: Package },
    { key: 'customers', label: 'Customer Report', icon: Users }
  ];

  // Mock data for demonstration
  const mockData = {
    sales: {
      total: 'R12,456.78',
      transactions: 89,
      avgTransaction: 'R139.96',
      growth: '+15.2%',
      previousPeriod: 'R10,820.15'
    },
    insights: {
      bestHour: '12:00 PM',
      bestDay: 'Friday',
      conversionRate: '68%',
      repeatCustomers: '42%'
    },
    topProducts: [
      { name: 'All-Purpose Cleaner 500ml', sold: 24, revenue: 'R383.76', growth: '+12%', category: 'Surface Cleaners' },
      { name: 'Toilet Paper 12-Pack', sold: 18, revenue: 'R405.00', growth: '+8%', category: 'Paper Products' },
      { name: 'Dish Soap Concentrate 1L', sold: 15, revenue: 'R281.25', growth: '+15%', category: 'Kitchen Cleaners' },
      { name: 'Microfiber Cloth Set', sold: 12, revenue: 'R420.00', growth: '+5%', category: 'Cleaning Tools' }
    ],
    hourlyData: [
      { hour: '09:00', sales: 850, transactions: 12 },
      { hour: '10:00', sales: 1200, transactions: 18 },
      { hour: '11:00', sales: 1800, transactions: 25 },
      { hour: '12:00', sales: 2400, transactions: 32 },
      { hour: '13:00', sales: 2100, transactions: 28 },
      { hour: '14:00', sales: 1900, transactions: 24 },
      { hour: '15:00', sales: 1600, transactions: 20 },
      { hour: '16:00', sales: 1400, transactions: 16 }
    ],
    paymentMethods: [
      { method: 'Card', amount: 7890, percentage: 63.4 },
      { method: 'Cash', amount: 3210, percentage: 25.8 },
      { method: 'Mobile', amount: 1356, percentage: 10.8 }
    ]
  };

  // ---- Export utilities ----
  const sanitizeFilename = (name: string) => name.replace(/[^a-z0-9-_]+/gi, '-').toLowerCase();

  const convertRowsToCSV = (rows: Array<Record<string, any>>): string => {
    if (!rows || rows.length === 0) return '';
    const headers = Object.keys(rows[0]);
    const escape = (value: any) => {
      if (value === null || value === undefined) return '';
      const str = String(value);
      // Quote fields that contain commas, quotes, or new lines
      if (/[",\n]/.test(str)) {
        return '"' + str.replace(/"/g, '""') + '"';
      }
      return str;
    };
    const csv = [headers.join(',')]
      .concat(rows.map(row => headers.map(h => escape(row[h])).join(',')))
      .join('\n');
    return csv;
  };

  const downloadTextFile = (filename: string, content: string, mime = 'text/csv;charset=utf-8;') => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const buildRowsForExport = (): Array<Record<string, any>> => {
    if (selectedReport === 'sales') {
      return [
        { metric: 'Total Sales', value: mockData.sales.total },
        { metric: 'Transactions', value: mockData.sales.transactions },
        { metric: 'Avg Transaction', value: mockData.sales.avgTransaction },
        { metric: 'Growth', value: mockData.sales.growth },
        { metric: 'Previous Period', value: mockData.sales.previousPeriod },
        { metric: 'Best Day', value: mockData.insights.bestDay },
        { metric: 'Best Hour', value: mockData.insights.bestHour },
        { metric: 'Conversion Rate', value: mockData.insights.conversionRate },
        { metric: 'Repeat Customers', value: mockData.insights.repeatCustomers }
      ];
    }

    if (selectedReport === 'transactions') {
      return mockData.hourlyData.map(h => ({
        hour: h.hour,
        sales: h.sales,
        transactions: h.transactions
      }));
    }

    if (selectedReport === 'products') {
      return mockData.topProducts.map(p => ({
        name: p.name,
        category: p.category,
        sold: p.sold,
        revenue: p.revenue,
        growth: p.growth
      }));
    }

    // customers
    return [
      { metric: 'Conversion Rate', value: mockData.insights.conversionRate },
      { metric: 'Repeat Customers', value: mockData.insights.repeatCustomers },
      { metric: 'Best Day', value: mockData.insights.bestDay },
      { metric: 'Best Hour', value: mockData.insights.bestHour }
    ];
  };

  const handleExportReport = () => {
    const rows = buildRowsForExport();
    const csv = convertRowsToCSV(rows);
    const date = new Date();
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const filename = sanitizeFilename(`best-brightness-${selectedReport}-${selectedDateRange}-${y}-${m}-${d}.csv`);
    downloadTextFile(filename, csv);
  };

  return (
    <CashierLayout>
      <div className="min-h-screen bg-gradient-to-br from-[#F8F9FA] via-[#FFFFFF] to-[#F8F9FA]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Modern Header with Glassmorphism */}
        <div className="mb-8 backdrop-blur-xl bg-white/80 border border-white/20 rounded-3xl shadow-2xl p-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <button
                onClick={() => navigate('/cashier/dashboard')}
                className="group p-3 text-[#2C3E50] hover:text-[#4682B4] hover:bg-[#B0E0E6]/20 rounded-2xl transition-all duration-300 border border-[rgba(44,62,80,0.1)] hover:border-[#4682B4]/30 hover:shadow-lg"
              >
                <ArrowLeft className="h-6 w-6 group-hover:scale-110 transition-transform" />
              </button>
              <div className="flex items-center space-x-4">
                <div className="p-3 rounded-2xl bg-gradient-to-br from-[#4682B4] to-[#87CEEB] text-white shadow-lg">
                  <BarChart3 className="h-8 w-8" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold text-[#2C3E50]">Analytics Dashboard</h1>
                  <p className="text-[#2C3E50]/70 mt-1 font-medium">Real-time performance insights & reports</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button className="px-4 py-2 text-[#2C3E50] hover:text-[#4682B4] border border-[rgba(44,62,80,0.1)] hover:border-[#4682B4]/30 rounded-xl transition-all duration-300 hover:bg-[#B0E0E6]/20 flex items-center">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </button>
              <button className="px-4 py-2 text-[#2C3E50] hover:text-[#4682B4] border border-[rgba(44,62,80,0.1)] hover:border-[#4682B4]/30 rounded-xl transition-all duration-300 hover:bg-[#B0E0E6]/20 flex items-center">
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </button>
              <button
                onClick={handleExportReport}
                className="bg-gradient-to-r from-[#4682B4] to-[#87CEEB] text-white px-6 py-3 rounded-xl hover:from-[#2C3E50] hover:to-[#4682B4] transition-all duration-300 flex items-center shadow-lg hover:shadow-xl transform hover:-translate-y-1 font-medium"
              >
                <Download className="h-5 w-5 mr-2" />
                Export Report
              </button>
            </div>
          </div>
        </div>

        {/* Modern Date Range Selector */}
        <div className="mb-8 flex items-center justify-between">
          <div className="backdrop-blur-xl bg-white/80 border border-white/20 rounded-2xl shadow-lg p-2">
            <div className="flex space-x-1">
              {dateRanges.map((range) => (
                <button
                  key={range.key}
                  onClick={() => setSelectedDateRange(range.key)}
                  className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                    selectedDateRange === range.key
                      ? 'bg-gradient-to-r from-[#4682B4] to-[#87CEEB] text-white shadow-lg transform scale-105'
                      : 'text-[#2C3E50] hover:text-[#4682B4] hover:bg-[#B0E0E6]/20'
                  }`}
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>
          
          {/* Live Update Indicator */}
          <div className="flex items-center space-x-2 backdrop-blur-xl bg-white/80 border border-white/20 rounded-2xl px-4 py-2 shadow-lg">
            <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-[#2C3E50]/80">Live Updates</span>
          </div>
        </div>

        {/* Enhanced Report Type Selector */}
        <div className="mb-8">
          <div className="backdrop-blur-xl bg-white/80 border border-white/20 rounded-3xl shadow-xl p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-[#2C3E50] flex items-center">
                <Eye className="h-6 w-6 mr-3 text-[#4682B4]" />
                Report Analytics
              </h2>
              <div className="text-sm text-[#2C3E50]/70 bg-[#F8F9FA] px-3 py-1 rounded-lg">
                {selectedDateRange.charAt(0).toUpperCase() + selectedDateRange.slice(1)} View
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {reportTypes.map((report) => (
                <button
                  key={report.key}
                  onClick={() => setSelectedReport(report.key)}
                  className={`group p-6 rounded-2xl border-2 transition-all duration-300 ${
                    selectedReport === report.key
                      ? 'border-[#4682B4] bg-gradient-to-br from-[#F8F9FA] to-[#B0E0E6]/20 text-[#2C3E50] shadow-xl scale-105'
                      : 'border-[rgba(44,62,80,0.1)] hover:border-[#4682B4]/40 hover:bg-[#B0E0E6]/20 hover:scale-102'
                  }`}
                >
                  <div className={`p-3 rounded-xl mx-auto mb-4 w-fit ${
                    selectedReport === report.key 
                      ? 'bg-gradient-to-br from-[#4682B4] to-[#87CEEB] text-white shadow-lg' 
                      : 'bg-[#F8F9FA] group-hover:bg-[#B0E0E6]/30 text-[#2C3E50] group-hover:text-[#4682B4]'
                  }`}>
                    <report.icon className="h-8 w-8 group-hover:scale-110 transition-transform" />
                  </div>
                  <p className="font-semibold text-center">{report.label}</p>
                  {selectedReport === report.key && (
                    <div className="mt-2 flex justify-center">
                      <div className="h-1 w-8 bg-gradient-to-r from-[#4682B4] to-[#87CEEB] rounded-full"></div>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Enhanced Key Metrics with Modern Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Sales Card */}
          <div className="group backdrop-blur-xl bg-white/80 border border-white/20 rounded-3xl shadow-xl p-6 hover:shadow-2xl transition-all duration-300 hover:-translate-y-2">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-lg group-hover:scale-110 transition-transform">
                <DollarSign className="h-8 w-8" />
              </div>
              <div className="text-right">
                <div className="text-xs text-[#2C3E50]/70 font-medium uppercase tracking-wide">Total Sales</div>
                <div className="text-3xl font-bold text-[#2C3E50] mt-1">{mockData.sales.total}</div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-4 w-4 text-emerald-500" />
                <span className="text-sm font-bold text-emerald-600">{mockData.sales.growth}</span>
              </div>
              <div className="text-xs text-[#2C3E50]/70">vs {mockData.sales.previousPeriod}</div>
            </div>
            <div className="mt-3 h-1 bg-slate-200 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-emerald-500 to-green-600 rounded-full" style={{width: '75%'}}></div>
            </div>
          </div>

          {/* Transactions Card */}
          <div className="group backdrop-blur-xl bg-white/80 border border-white/20 rounded-3xl shadow-xl p-6 hover:shadow-2xl transition-all duration-300 hover:-translate-y-2">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-[#4682B4] to-[#87CEEB] text-white shadow-lg group-hover:scale-110 transition-transform">
                <ShoppingCart className="h-8 w-8" />
              </div>
              <div className="text-right">
                <div className="text-xs text-[#2C3E50]/70 font-medium uppercase tracking-wide">Transactions</div>
                <div className="text-3xl font-bold text-[#2C3E50] mt-1">{mockData.sales.transactions}</div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Zap className="h-4 w-4 text-[#4682B4]" />
                <span className="text-sm font-medium text-[#2C3E50]">Active</span>
              </div>
              <div className="text-xs text-[#2C3E50]/70">+{Math.floor(mockData.sales.transactions * 0.12)} today</div>
            </div>
          </div>

          {/* Average Transaction Card */}
          <div className="group backdrop-blur-xl bg-white/80 border border-white/20 rounded-3xl shadow-xl p-6 hover:shadow-2xl transition-all duration-300 hover:-translate-y-2">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 text-white shadow-lg group-hover:scale-110 transition-transform">
                <BarChart3 className="h-8 w-8" />
              </div>
              <div className="text-right">
                <div className="text-xs text-[#2C3E50]/70 font-medium uppercase tracking-wide">Avg Transaction</div>
                <div className="text-3xl font-bold text-[#2C3E50] mt-1">{mockData.sales.avgTransaction}</div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Star className="h-4 w-4 text-purple-500" />
                <span className="text-sm font-medium text-[#2C3E50]">Optimal</span>
              </div>
              <div className="text-xs text-[#2C3E50]/70">Target: R150</div>
            </div>
          </div>

          {/* Peak Performance Card */}
          <div className="group backdrop-blur-xl bg-white/80 border border-white/20 rounded-3xl shadow-xl p-6 hover:shadow-2xl transition-all duration-300 hover:-translate-y-2">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 text-white shadow-lg group-hover:scale-110 transition-transform">
                <Activity className="h-8 w-8" />
              </div>
              <div className="text-right">
                <div className="text-xs text-[#2C3E50]/70 font-medium uppercase tracking-wide">Peak Hour</div>
                <div className="text-3xl font-bold text-[#2C3E50] mt-1">{mockData.insights.bestHour}</div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Trophy className="h-4 w-4 text-orange-500" />
                <span className="text-sm font-medium text-[#2C3E50]">Best</span>
              </div>
              <div className="text-xs text-[#2C3E50]/70">R2,400 peak</div>
            </div>
          </div>
        </div>

        {/* Advanced Analytics Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Interactive Sales Chart */}
          <div className="lg:col-span-2 backdrop-blur-xl bg-white/80 border border-white/20 rounded-3xl shadow-xl p-8">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-[#2C3E50] flex items-center">
                <LineChart className="h-6 w-6 mr-3 text-[#4682B4]" />
                Sales Performance
              </h2>
              <div className="flex items-center space-x-3">
                <button className="px-3 py-1 text-xs font-medium text-[#4682B4] bg-[#B0E0E6]/30 rounded-lg">
                  Revenue
                </button>
                <button className="px-3 py-1 text-xs font-medium text-[#2C3E50]/70 hover:text-[#4682B4] hover:bg-[#B0E0E6]/30 rounded-lg transition-colors">
                  Transactions
                </button>
              </div>
            </div>
            
            <div className="space-y-6">
              {mockData.hourlyData.map((data, index) => (
                <div key={index} className="group">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <span className="text-sm font-medium text-[#2C3E50] min-w-[60px]">{data.hour}</span>
                      <div className="flex items-center space-x-2 text-xs text-[#2C3E50]/70">
                        <Clock className="h-3 w-3" />
                        <span>{data.transactions} transactions</span>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-[#2C3E50]">R{data.sales.toLocaleString()}</span>
                  </div>
                  <div className="relative">
                    <div className="flex-1 bg-gradient-to-r from-[#F8F9FA] to-[#E9ECEF] rounded-full h-4 overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-[#87CEEB] via-[#B0E0E6] to-[#4682B4] h-4 rounded-full relative group-hover:from-[#4682B4] group-hover:to-[#2C3E50] transition-all duration-500 flex items-center justify-end pr-2"
                        style={{ width: `${(data.sales / 2400) * 100}%` }}
                      >
                        <div className="h-2 w-2 bg-white rounded-full opacity-80"></div>
                      </div>
                    </div>
                    {/* Peak indicator */}
                    {data.sales === 2400 && (
                      <div className="absolute -top-8 right-0 flex items-center space-x-1 bg-gradient-to-r from-orange-500 to-amber-500 text-white px-2 py-1 rounded-lg text-xs font-medium">
                        <Sparkles className="h-3 w-3" />
                        <span>Peak</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            {/* Summary Stats */}
            <div className="mt-8 grid grid-cols-3 gap-4 pt-6 border-t border-[rgba(44,62,80,0.1)]">
              <div className="text-center">
                <div className="text-2xl font-bold text-emerald-600">R{mockData.hourlyData.reduce((sum, h) => sum + h.sales, 0).toLocaleString()}</div>
                <div className="text-xs text-[#2C3E50]/70 font-medium">Total Revenue</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-[#4682B4]">{mockData.hourlyData.reduce((sum, h) => sum + h.transactions, 0)}</div>
                <div className="text-xs text-[#2C3E50]/70 font-medium">Total Transactions</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{mockData.insights.conversionRate}</div>
                <div className="text-xs text-[#2C3E50]/70 font-medium">Conversion Rate</div>
              </div>
            </div>
          </div>

          {/* Enhanced Performance Insights */}
          <div className="space-y-6">
            {/* Top Products Card */}
            <div className="backdrop-blur-xl bg-white/80 border border-white/20 rounded-3xl shadow-xl p-6">
              <h3 className="text-xl font-bold text-[#2C3E50] mb-6 flex items-center">
                <TrendingUp className="h-5 w-5 mr-3 text-emerald-600" />
                Top Performers
              </h3>
              <div className="space-y-4">
                {mockData.topProducts.slice(0, 3).map((product, index) => (
                  <div key={index} className="group p-4 rounded-2xl bg-gradient-to-r from-[#F8F9FA] to-[#B0E0E6]/20 border border-[rgba(44,62,80,0.1)] hover:border-[#4682B4]/40 hover:shadow-lg transition-all duration-300">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-sm ${
                          index === 0 ? 'bg-gradient-to-br from-yellow-400 to-orange-500' :
                          index === 1 ? 'bg-gradient-to-br from-slate-400 to-slate-600' :
                          'bg-gradient-to-br from-amber-600 to-orange-700'
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-semibold text-[#2C3E50] text-sm">{product.name}</div>
                          <div className="text-xs text-[#2C3E50]/70">{product.category}</div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold text-[#2C3E50]">{product.revenue}</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-medium text-emerald-600 bg-emerald-100 px-2 py-1 rounded-lg">
                          {product.growth}
                        </span>
                        <span className="text-xs text-[#2C3E50]/70">{product.sold} sold</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment Methods Distribution */}
            <div className="backdrop-blur-xl bg-white/80 border border-white/20 rounded-3xl shadow-xl p-6">
              <h3 className="text-xl font-bold text-[#2C3E50] mb-6 flex items-center">
                <PieChart className="h-5 w-5 mr-3 text-[#4682B4]" />
                Payment Methods
              </h3>
              <div className="space-y-4">
                {mockData.paymentMethods.map((method, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-[#2C3E50]">{method.method}</span>
                      <div className="text-right">
                        <span className="text-sm font-bold text-[#2C3E50]">R{method.amount.toLocaleString()}</span>
                        <div className="text-xs text-[#2C3E50]/70">{method.percentage}%</div>
                      </div>
                    </div>
                    <div className="w-full bg-[#E9ECEF] rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          index === 0 ? 'bg-gradient-to-r from-[#4682B4] to-[#87CEEB]' :
                          index === 1 ? 'bg-gradient-to-r from-emerald-500 to-green-500' :
                          'bg-gradient-to-r from-purple-500 to-violet-500'
                        }`}
                        style={{ width: `${method.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>
    </CashierLayout>
  );
}
