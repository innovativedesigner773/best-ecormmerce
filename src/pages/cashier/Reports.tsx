import React, { useState, useEffect } from 'react';
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
import { getSalesReport, getProductPerformance, getCustomerReport, getTransactionReport, DateRange } from '../../services/reportsService';

export default function CashierReportsRealData() {
  const navigate = useNavigate();
  const [selectedDateRange, setSelectedDateRange] = useState<DateRange>('today');
  const [selectedReport, setSelectedReport] = useState('sales');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Real data states
  const [salesData, setSalesData] = useState<any>(null);
  const [productData, setProductData] = useState<any[]>([]);
  const [customerData, setCustomerData] = useState<any>(null);
  const [transactionData, setTransactionData] = useState<any>(null);

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

  // Fetch real data based on selected report and date range
  const fetchReportData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log(`📊 Fetching ${selectedReport} data for ${selectedDateRange}...`);
      
      switch (selectedReport) {
        case 'sales':
          const sales = await getSalesReport(selectedDateRange);
          setSalesData(sales);
          break;
        case 'products':
          const products = await getProductPerformance(selectedDateRange);
          setProductData(products);
          break;
        case 'customers':
          const customers = await getCustomerReport(selectedDateRange);
          setCustomerData(customers);
          break;
        case 'transactions':
          const transactions = await getTransactionReport(selectedDateRange);
          setTransactionData(transactions);
          break;
      }
    } catch (err) {
      console.error('Error fetching report data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch report data');
    } finally {
      setLoading(false);
    }
  };

  // Fetch data when report type or date range changes
  useEffect(() => {
    fetchReportData();
  }, [selectedReport, selectedDateRange]);

  // Format currency
  const formatCurrency = (amount: number) => `R${amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`;

  // Export functionality
  const handleExportReport = () => {
    const data = getCurrentReportData();
    const csv = convertToCSV(data);
    downloadCSV(csv, `${selectedReport}-report-${selectedDateRange}.csv`);
  };

  const getCurrentReportData = () => {
    switch (selectedReport) {
      case 'sales':
        return salesData ? [
          { metric: 'Total Sales', value: formatCurrency(salesData.total) },
          { metric: 'Transactions', value: salesData.transactions },
          { metric: 'Avg Transaction', value: formatCurrency(salesData.avgTransaction) },
          { metric: 'Growth', value: `${salesData.growth.toFixed(1)}%` },
          { metric: 'Previous Period', value: formatCurrency(salesData.previousPeriod) }
        ] : [];
      case 'products':
        return productData.map(p => ({
          name: p.name,
          category: p.category,
          sold: p.sold,
          revenue: formatCurrency(p.revenue),
          growth: `${p.growth}%`
        }));
      case 'customers':
        return customerData ? [
          { metric: 'Total Customers', value: customerData.totalCustomers },
          { metric: 'New Customers', value: customerData.newCustomers },
          { metric: 'Returning Customers', value: customerData.returningCustomers },
          { metric: 'Avg Order Value', value: formatCurrency(customerData.avgOrderValue) }
        ] : [];
      case 'transactions':
        return transactionData ? [
          { metric: 'Total Transactions', value: transactionData.totalTransactions },
          { metric: 'Successful', value: transactionData.successfulTransactions },
          { metric: 'Failed', value: transactionData.failedTransactions },
          { metric: 'Avg Value', value: formatCurrency(transactionData.avgTransactionValue) }
        ] : [];
      default:
        return [];
    }
  };

  const convertToCSV = (data: any[]) => {
    if (!data.length) return '';
    const headers = Object.keys(data[0]);
    const csv = [headers.join(',')];
    data.forEach(row => {
      const values = headers.map(header => {
        const value = row[header];
        return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
      });
      csv.push(values.join(','));
    });
    return csv.join('\n');
  };

  const downloadCSV = (csv: string, filename: string) => {
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <CashierLayout>
        <div className="min-h-screen bg-gradient-to-br from-[#F8F9FA] to-[#B0E0E6]/20 p-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#97CF50] mx-auto mb-4"></div>
              <p className="text-[#09215F] font-medium">Loading report data...</p>
            </div>
          </div>
        </div>
      </CashierLayout>
    );
  }

  if (error) {
    return (
      <CashierLayout>
        <div className="min-h-screen bg-gradient-to-br from-[#F8F9FA] to-[#B0E0E6]/20 p-8">
          <div className="max-w-4xl mx-auto">
            <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
              <div className="text-red-600 text-6xl mb-4">⚠️</div>
              <h2 className="text-2xl font-bold text-red-800 mb-2">Error Loading Reports</h2>
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={fetchReportData}
                className="bg-red-600 text-white px-6 py-3 rounded-xl hover:bg-red-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </CashierLayout>
    );
  }

  return (
    <CashierLayout>
      <div className="min-h-screen bg-gradient-to-br from-[#F8F9FA] to-[#B0E0E6]/20 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/cashier')}
                className="p-3 rounded-2xl bg-white/80 border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
              >
                <ArrowLeft className="h-6 w-6 text-[#09215F]" />
              </button>
              <div>
                <h1 className="text-4xl font-bold text-[#09215F] mb-2">Reports & Analytics</h1>
                <p className="text-[#09215F]/70 text-lg">Real-time business insights and performance metrics</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button className="px-4 py-2 text-[#09215F] hover:text-[#97CF50] border border-[rgba(44,62,80,0.1)] hover:border-[#97CF50]/30 rounded-xl transition-all duration-300 hover:bg-[#B0E0E6]/20 flex items-center">
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </button>
              <button
                onClick={handleExportReport}
                className="bg-gradient-to-r from-[#97CF50] to-[#97CF50] text-white px-6 py-3 rounded-xl hover:from-[#09215F] hover:to-[#97CF50] transition-all duration-300 flex items-center shadow-lg hover:shadow-xl transform hover:-translate-y-1 font-medium"
              >
                <Download className="h-5 w-5 mr-2" />
                Export Report
              </button>
            </div>
          </div>

          {/* Date Range Selector */}
          <div className="mb-8 flex items-center justify-between">
            <div className="backdrop-blur-xl bg-white/80 border border-white/20 rounded-2xl shadow-lg p-2">
              <div className="flex space-x-1">
                {dateRanges.map((range) => (
                  <button
                    key={range.key}
                    onClick={() => setSelectedDateRange(range.key as DateRange)}
                    className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                      selectedDateRange === range.key
                        ? 'bg-gradient-to-r from-[#97CF50] to-[#97CF50] text-white shadow-lg transform scale-105'
                        : 'text-[#09215F] hover:text-[#97CF50] hover:bg-[#B0E0E6]/20'
                    }`}
                  >
                    {range.label}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="flex items-center space-x-2 backdrop-blur-xl bg-white/80 border border-white/20 rounded-2xl px-4 py-2 shadow-lg">
              <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-[#09215F]/80">Live Data</span>
            </div>
          </div>

          {/* Report Type Selector */}
          <div className="mb-8">
            <div className="backdrop-blur-xl bg-white/80 border border-white/20 rounded-3xl shadow-xl p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-[#09215F] flex items-center">
                  <Eye className="h-6 w-6 mr-3 text-[#97CF50]" />
                  Report Analytics
                </h2>
                <div className="text-sm text-[#09215F]/70 bg-[#F8F9FA] px-3 py-1 rounded-lg">
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
                        ? 'border-[#97CF50] bg-gradient-to-br from-[#F8F9FA] to-[#B0E0E6]/20 text-[#09215F] shadow-xl scale-105'
                        : 'border-[rgba(44,62,80,0.1)] hover:border-[#97CF50]/40 hover:bg-[#B0E0E6]/20 hover:scale-102'
                    }`}
                  >
                    <div className={`p-3 rounded-xl mx-auto mb-4 w-fit ${
                      selectedReport === report.key 
                        ? 'bg-gradient-to-br from-[#97CF50] to-[#97CF50] text-white shadow-lg' 
                        : 'bg-[#F8F9FA] group-hover:bg-[#B0E0E6]/30 text-[#09215F] group-hover:text-[#97CF50]'
                    }`}>
                      <report.icon className="h-8 w-8 group-hover:scale-110 transition-transform" />
                    </div>
                    <p className="font-semibold text-center">{report.label}</p>
                    {selectedReport === report.key && (
                      <div className="mt-2 flex justify-center">
                        <div className="h-1 w-8 bg-gradient-to-r from-[#97CF50] to-[#97CF50] rounded-full"></div>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Real Data Display */}
          <div className="backdrop-blur-xl bg-white/80 border border-white/20 rounded-3xl shadow-xl p-8">
            {selectedReport === 'sales' && salesData && (
              <div>
                <h3 className="text-2xl font-bold text-[#09215F] mb-6">Sales Report</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-gradient-to-br from-emerald-50 to-green-100 p-6 rounded-2xl">
                    <div className="text-3xl font-bold text-emerald-600">{formatCurrency(salesData.total)}</div>
                    <div className="text-sm text-emerald-700 font-medium">Total Sales</div>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-2xl">
                    <div className="text-3xl font-bold text-green-600">{salesData.transactions}</div>
                    <div className="text-sm text-green-700 font-medium">Transactions</div>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-2xl">
                    <div className="text-3xl font-bold text-purple-600">{formatCurrency(salesData.avgTransaction)}</div>
                    <div className="text-sm text-purple-700 font-medium">Avg Transaction</div>
                  </div>
                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-2xl">
                    <div className="text-3xl font-bold text-orange-600">{salesData.growth.toFixed(1)}%</div>
                    <div className="text-sm text-orange-700 font-medium">Growth</div>
                  </div>
                </div>
              </div>
            )}

            {selectedReport === 'products' && productData.length > 0 && (
              <div>
                <h3 className="text-2xl font-bold text-[#09215F] mb-6">Product Performance</h3>
                <div className="space-y-4">
                  {productData.slice(0, 10).map((product, index) => (
                    <div key={index} className="bg-gradient-to-r from-[#F8F9FA] to-[#B0E0E6]/20 p-4 rounded-2xl border border-[rgba(44,62,80,0.1)]">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-[#09215F]">{product.name}</div>
                          <div className="text-sm text-[#09215F]/70">{product.category}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-[#09215F]">{product.sold} sold</div>
                          <div className="text-sm text-[#09215F]/70">{formatCurrency(product.revenue)}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedReport === 'customers' && customerData && (
              <div>
                <h3 className="text-2xl font-bold text-[#09215F] mb-6">Customer Report</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-2xl">
                    <div className="text-3xl font-bold text-green-600">{customerData.totalCustomers}</div>
                    <div className="text-sm text-green-700 font-medium">Total Customers</div>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-2xl">
                    <div className="text-3xl font-bold text-green-600">{customerData.newCustomers}</div>
                    <div className="text-sm text-green-700 font-medium">New Customers</div>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-2xl">
                    <div className="text-3xl font-bold text-purple-600">{customerData.returningCustomers}</div>
                    <div className="text-sm text-purple-700 font-medium">Returning</div>
                  </div>
                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-2xl">
                    <div className="text-3xl font-bold text-orange-600">{formatCurrency(customerData.avgOrderValue)}</div>
                    <div className="text-sm text-orange-700 font-medium">Avg Order Value</div>
                  </div>
                </div>
              </div>
            )}

            {selectedReport === 'transactions' && transactionData && (
              <div>
                <h3 className="text-2xl font-bold text-[#09215F] mb-6">Transaction Report</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-2xl">
                    <div className="text-3xl font-bold text-green-600">{transactionData.totalTransactions}</div>
                    <div className="text-sm text-green-700 font-medium">Total Transactions</div>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-2xl">
                    <div className="text-3xl font-bold text-green-600">{transactionData.successfulTransactions}</div>
                    <div className="text-sm text-green-700 font-medium">Successful</div>
                  </div>
                  <div className="bg-gradient-to-br from-red-50 to-red-100 p-6 rounded-2xl">
                    <div className="text-3xl font-bold text-red-600">{transactionData.failedTransactions}</div>
                    <div className="text-sm text-red-700 font-medium">Failed</div>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-2xl">
                    <div className="text-3xl font-bold text-purple-600">{formatCurrency(transactionData.avgTransactionValue)}</div>
                    <div className="text-sm text-purple-700 font-medium">Avg Value</div>
                  </div>
                </div>
              </div>
            )}

            {(!salesData && selectedReport === 'sales') || 
             (productData.length === 0 && selectedReport === 'products') || 
             (!customerData && selectedReport === 'customers') || 
             (!transactionData && selectedReport === 'transactions') && (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📊</div>
                <h3 className="text-xl font-bold text-[#09215F] mb-2">No Data Available</h3>
                <p className="text-[#09215F]/70">No data found for the selected time period.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </CashierLayout>
  );
}
