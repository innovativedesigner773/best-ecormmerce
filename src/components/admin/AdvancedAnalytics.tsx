import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  Target,
  BarChart3,
  PieChart,
  Activity,
  Calendar,
  Package,
  Star,
  AlertTriangle,
  CheckCircle,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { 
  getConversionFunnel, 
  getCustomerLifetimeValue, 
  getCohortAnalysis, 
  getProductPerformance,
  getSeasonalTrends,
  getPredictiveInventory,
  type TimeRange 
} from '../../services/analyticsService';

interface ConversionFunnelData {
  totalUsers: number;
  customers: number;
  completedCustomers: number;
  registrationToCustomerRate: number;
  customerToCompletedRate: number;
  overallConversionRate: number;
}

interface CLVData {
  totalCustomers: number;
  avgCLV: number;
  medianCLV: number;
  totalCLV: number;
  topCustomersByCLV: Array<{
    customerId: string;
    email: string;
    totalOrders: number;
    totalSpent: number;
    clv: number;
  }>;
}

interface CohortData {
  month: string;
  newCustomers: number;
  retention: Map<string, number>;
}

interface ProductPerformanceData {
  allProducts: Array<{
    id: string;
    name: string;
    category: string;
    totalSold: number;
    totalRevenue: number;
    avgPrice: number;
    profitMargin: number;
    velocity: number;
    stockTurnover: number;
    currentStock: number;
  }>;
  topByRevenue: any[];
  topByVelocity: any[];
  topByMargin: any[];
  slowMoving: any[];
  summary: {
    totalProducts: number;
    avgMargin: number;
    avgVelocity: number;
    totalRevenue: number;
  };
}

export default function AdvancedAnalytics() {
  const [activeTab, setActiveTab] = useState('conversion');
  const [range, setRange] = useState<TimeRange>('1M');
  const [loading, setLoading] = useState(true);
  
  // Data states
  const [conversionData, setConversionData] = useState<ConversionFunnelData | null>(null);
  const [clvData, setClvData] = useState<CLVData | null>(null);
  const [cohortData, setCohortData] = useState<CohortData[]>([]);
  const [productData, setProductData] = useState<ProductPerformanceData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [conversion, clv, cohort, products] = await Promise.all([
        getConversionFunnel(range),
        getCustomerLifetimeValue(range),
        getCohortAnalysis(range),
        getProductPerformance(range)
      ]);
      
      setConversionData(conversion);
      setClvData(clv);
      setCohortData(cohort);
      setProductData(products);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics data');
      console.error('Analytics fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [range]);

  const formatCurrency = (amount: number) => `R${amount.toLocaleString()}`;
  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4682B4]"></div>
        <span className="ml-2 text-[#6C757D]">Loading advanced analytics...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-red-900 mb-2">Error Loading Analytics</h3>
        <p className="text-red-700 mb-4">{error}</p>
        <Button onClick={fetchAllData} variant="outline">
          <ArrowUpRight className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Range Selector */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#2C3E50]">Advanced Analytics</h2>
          <p className="text-[#6C757D]">Deep insights into customer behavior and business performance</p>
        </div>
        <div className="flex gap-2">
          {([
            { key: '1W', label: '1 Week' },
            { key: '1M', label: '1 Month' },
            { key: '6M', label: '6 Months' },
            { key: '12M', label: '1 Year' }
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

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="conversion" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Conversion
          </TabsTrigger>
          <TabsTrigger value="clv" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Customer Value
          </TabsTrigger>
          <TabsTrigger value="cohort" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Retention
          </TabsTrigger>
          <TabsTrigger value="products" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Products
          </TabsTrigger>
          <TabsTrigger value="trends" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Trends
          </TabsTrigger>
          <TabsTrigger value="inventory" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Inventory
          </TabsTrigger>
        </TabsList>

        {/* Conversion Funnel Tab */}
        <TabsContent value="conversion" className="space-y-6">
          {conversionData && (
            <>
              {/* Funnel Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-white/90">Total Users</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{conversionData.totalUsers.toLocaleString()}</div>
                    <p className="text-xs text-white/80 mt-1">Registered users</p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-white/90">Customers</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{conversionData.customers.toLocaleString()}</div>
                    <p className="text-xs text-white/80 mt-1">
                      {formatPercentage(conversionData.registrationToCustomerRate)} conversion
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-white/90">Completed Orders</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{conversionData.completedCustomers.toLocaleString()}</div>
                    <p className="text-xs text-white/80 mt-1">
                      {formatPercentage(conversionData.overallConversionRate)} overall rate
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Funnel Visualization */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Conversion Funnel
                  </CardTitle>
                  <CardDescription>User journey from registration to completed purchase</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Registration to Customer */}
                    <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">1</div>
                        <div>
                          <h4 className="font-medium text-[#2C3E50]">Registration to Customer</h4>
                          <p className="text-sm text-[#6C757D]">{conversionData.totalUsers} → {conversionData.customers} customers</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-blue-600">{formatPercentage(conversionData.registrationToCustomerRate)}</div>
                        <div className="w-32 bg-blue-200 rounded-full h-2 mt-1">
                          <div 
                            className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(conversionData.registrationToCustomerRate, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>

                    {/* Customer to Completed */}
                    <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="bg-green-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">2</div>
                        <div>
                          <h4 className="font-medium text-[#2C3E50]">Customer to Completed</h4>
                          <p className="text-sm text-[#6C757D]">{conversionData.customers} → {conversionData.completedCustomers} completed</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-green-600">{formatPercentage(conversionData.customerToCompletedRate)}</div>
                        <div className="w-32 bg-green-200 rounded-full h-2 mt-1">
                          <div 
                            className="bg-green-500 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(conversionData.customerToCompletedRate, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>

                    {/* Overall Conversion */}
                    <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="bg-purple-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">3</div>
                        <div>
                          <h4 className="font-medium text-[#2C3E50]">Overall Conversion</h4>
                          <p className="text-sm text-[#6C757D]">{conversionData.totalUsers} → {conversionData.completedCustomers} completed</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-purple-600">{formatPercentage(conversionData.overallConversionRate)}</div>
                        <div className="w-32 bg-purple-200 rounded-full h-2 mt-1">
                          <div 
                            className="bg-purple-500 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(conversionData.overallConversionRate, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Customer Lifetime Value Tab */}
        <TabsContent value="clv" className="space-y-6">
          {clvData && (
            <>
              {/* CLV Overview */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-[#6C757D]">Total Customers</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-[#2C3E50]">{clvData.totalCustomers}</div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-white/90">Average CLV</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(clvData.avgCLV)}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-[#6C757D]">Median CLV</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-[#2C3E50]">{formatCurrency(clvData.medianCLV)}</div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-white/90">Total CLV</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(clvData.totalCLV)}</div>
                  </CardContent>
                </Card>
              </div>

              {/* Top Customers by CLV */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="h-5 w-5" />
                    Top Customers by Lifetime Value
                  </CardTitle>
                  <CardDescription>Highest value customers in the selected period</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {clvData.topCustomersByCLV.map((customer, index) => (
                      <div key={customer.customerId} className="flex items-center justify-between p-4 bg-[#F8F9FA] rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="bg-[#4682B4] text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
                            #{index + 1}
                          </div>
                          <div>
                            <h4 className="font-medium text-[#2C3E50]">
                              {customer.email || `Customer ${customer.customerId.slice(0, 8)}`}
                            </h4>
                            <p className="text-sm text-[#6C757D]">
                              {customer.totalOrders} orders • {formatCurrency(customer.totalSpent)} spent
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-[#2C3E50]">{formatCurrency(customer.clv)}</div>
                          <p className="text-sm text-[#6C757D]">CLV</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Cohort Analysis Tab */}
        <TabsContent value="cohort" className="space-y-6">
          {cohortData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Customer Retention Cohorts
                </CardTitle>
                <CardDescription>Customer retention rates by acquisition month</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-[#6C757D] border-b">
                        <th className="py-2 pr-4">Cohort</th>
                        <th className="py-2 pr-4">New Customers</th>
                        {Array.from({ length: 6 }, (_, i) => (
                          <th key={i} className="py-2 pr-4 text-center">Month {i + 1}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {cohortData.slice(-6).map(cohort => (
                        <tr key={cohort.month} className="border-b">
                          <td className="py-2 pr-4 text-[#2C3E50] font-medium">{cohort.month}</td>
                          <td className="py-2 pr-4">{cohort.newCustomers}</td>
                          {Array.from({ length: 6 }, (_, i) => {
                            const month = new Date(cohort.month + '-01');
                            month.setMonth(month.getMonth() + i);
                            const monthKey = month.toISOString().slice(0, 7);
                            const retention = cohort.retention.get(monthKey) || 0;
                            return (
                              <td key={i} className="py-2 pr-4 text-center">
                                <Badge variant={retention > 20 ? 'default' : retention > 10 ? 'secondary' : 'outline'}>
                                  {retention.toFixed(1)}%
                                </Badge>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Product Performance Tab */}
        <TabsContent value="products" className="space-y-6">
          {productData && (
            <>
              {/* Product Performance Overview */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-[#6C757D]">Total Products</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-[#2C3E50]">{productData.summary.totalProducts}</div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-white/90">Avg Margin</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatPercentage(productData.summary.avgMargin)}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-[#6C757D]">Avg Velocity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-[#2C3E50]">{productData.summary.avgVelocity.toFixed(2)}/day</div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-white/90">Total Revenue</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(productData.summary.totalRevenue)}</div>
                  </CardContent>
                </Card>
              </div>

              {/* Top Products by Different Metrics */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top by Revenue */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Top Products by Revenue
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {productData.topByRevenue.slice(0, 5).map((product, index) => (
                        <div key={product.id} className="flex items-center justify-between p-3 bg-[#F8F9FA] rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="bg-[#4682B4] text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                              {index + 1}
                            </div>
                            <div>
                              <h4 className="text-sm font-medium text-[#2C3E50]">{product.name}</h4>
                              <p className="text-xs text-[#6C757D]">{product.category}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-bold text-[#2C3E50]">{formatCurrency(product.totalRevenue)}</div>
                            <p className="text-xs text-[#6C757D]">{product.totalSold} sold</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Top by Velocity */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5" />
                      Top Products by Velocity
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {productData.topByVelocity.slice(0, 5).map((product, index) => (
                        <div key={product.id} className="flex items-center justify-between p-3 bg-[#F8F9FA] rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="bg-[#20C997] text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                              {index + 1}
                            </div>
                            <div>
                              <h4 className="text-sm font-medium text-[#2C3E50]">{product.name}</h4>
                              <p className="text-xs text-[#6C757D]">{product.category}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-bold text-[#2C3E50]">{product.velocity.toFixed(2)}/day</div>
                            <p className="text-xs text-[#6C757D]">{product.totalSold} total</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Slow Moving Products Alert */}
              {productData.slowMoving.length > 0 && (
                <Card className="border-orange-200 bg-orange-50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-orange-800">
                      <AlertTriangle className="h-5 w-5" />
                      Slow Moving Products
                    </CardTitle>
                    <CardDescription>Products with low velocity that may need attention</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {productData.slowMoving.slice(0, 5).map(product => (
                        <div key={product.id} className="flex items-center justify-between p-2 bg-white rounded border border-orange-200">
                          <div>
                            <span className="text-sm font-medium text-orange-900">{product.name}</span>
                            <span className="text-xs text-orange-700 ml-2">({product.category})</span>
                          </div>
                          <div className="text-sm text-orange-700">
                            {product.velocity.toFixed(3)}/day • {product.currentStock} in stock
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* Seasonal Trends Tab */}
        <TabsContent value="trends" className="space-y-6">
          <SeasonalTrendsComponent range={range} />
        </TabsContent>

        {/* Predictive Inventory Tab */}
        <TabsContent value="inventory" className="space-y-6">
          <PredictiveInventoryComponent />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Seasonal Trends Component
function SeasonalTrendsComponent({ range }: { range: TimeRange }) {
  const [trendsData, setTrendsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTrends = async () => {
      setLoading(true);
      try {
        const data = await getSeasonalTrends(range);
        setTrendsData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch trends data');
      } finally {
        setLoading(false);
      }
    };
    fetchTrends();
  }, [range]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4682B4]"></div>
        <span className="ml-2 text-[#6C757D]">Loading trends...</span>
      </div>
    );
  }

  if (error || !trendsData) {
    return (
      <div className="text-center py-8 text-[#6C757D]">
        <AlertTriangle className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>{error || 'No trends data available'}</p>
      </div>
    );
  }

  return (
    <>
      {/* Growth Rate Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className={trendsData.growthRates.daily >= 0 ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[#6C757D]">Daily Growth</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {trendsData.growthRates.daily >= 0 ? 
                <ArrowUpRight className="h-4 w-4 text-green-600" /> : 
                <ArrowDownRight className="h-4 w-4 text-red-600" />
              }
              <div className="text-2xl font-bold">{trendsData.growthRates.daily.toFixed(1)}%</div>
            </div>
          </CardContent>
        </Card>

        <Card className={trendsData.growthRates.weekly >= 0 ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[#6C757D]">Weekly Growth</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {trendsData.growthRates.weekly >= 0 ? 
                <ArrowUpRight className="h-4 w-4 text-green-600" /> : 
                <ArrowDownRight className="h-4 w-4 text-red-600" />
              }
              <div className="text-2xl font-bold">{trendsData.growthRates.weekly.toFixed(1)}%</div>
            </div>
          </CardContent>
        </Card>

        <Card className={trendsData.growthRates.monthly >= 0 ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[#6C757D]">Monthly Growth</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {trendsData.growthRates.monthly >= 0 ? 
                <ArrowUpRight className="h-4 w-4 text-green-600" /> : 
                <ArrowDownRight className="h-4 w-4 text-red-600" />
              }
              <div className="text-2xl font-bold">{trendsData.growthRates.monthly.toFixed(1)}%</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Peak Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Peak Hours Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {trendsData.hourly.slice(0, 5).map((hour: any, index: number) => (
                <div key={hour.hour} className="flex items-center justify-between p-3 bg-[#F8F9FA] rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="bg-[#4682B4] text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                      {hour.hour}:00
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#2C3E50]">
                        {hour.hour}:00 - {hour.hour + 1}:00
                      </p>
                      <p className="text-xs text-[#6C757D]">{hour.orders} orders</p>
                    </div>
                  </div>
                  <span className="text-sm text-[#28A745]">R{hour.revenue.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Day of Week Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {trendsData.dayOfWeek.map((day: any, index: number) => {
                const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                return (
                  <div key={day.day} className="flex items-center justify-between p-3 bg-[#F8F9FA] rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="bg-[#20C997] text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                        {day.day}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#2C3E50]">{dayNames[day.day]}</p>
                        <p className="text-xs text-[#6C757D]">{day.orders} orders</p>
                      </div>
                    </div>
                    <span className="text-sm text-[#28A745]">R{day.revenue.toLocaleString()}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Forecast */}
      {trendsData.forecast.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              7-Day Forecast
            </CardTitle>
            <CardDescription>Predicted revenue based on current trends</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
              {trendsData.forecast.map((forecast: any, index: number) => (
                <div key={index} className="p-3 bg-blue-50 rounded-lg text-center">
                  <div className="text-xs text-[#6C757D] mb-1">
                    {new Date(forecast.date).toLocaleDateString('en-US', { weekday: 'short' })}
                  </div>
                  <div className="text-sm font-medium text-[#2C3E50] mb-1">
                    {new Date(forecast.date).getDate()}
                  </div>
                  <div className="text-lg font-bold text-blue-600">
                    R{Math.round(forecast.revenue).toLocaleString()}
                  </div>
                  <div className="text-xs text-[#6C757D]">
                    ~{forecast.orders} orders
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}

// Predictive Inventory Component
function PredictiveInventoryComponent() {
  const [inventoryData, setInventoryData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInventory = async () => {
      setLoading(true);
      try {
        const data = await getPredictiveInventory();
        setInventoryData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch inventory data');
      } finally {
        setLoading(false);
      }
    };
    fetchInventory();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4682B4]"></div>
        <span className="ml-2 text-[#6C757D]">Loading inventory predictions...</span>
      </div>
    );
  }

  if (error || !inventoryData) {
    return (
      <div className="text-center py-8 text-[#6C757D]">
        <AlertTriangle className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>{error || 'No inventory data available'}</p>
      </div>
    );
  }

  return (
    <>
      {/* Risk Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-red-50 border-red-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-800">Critical Risk</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{inventoryData.summary.criticalCount}</div>
            <p className="text-xs text-red-700 mt-1">Products at risk</p>
          </CardContent>
        </Card>

        <Card className="bg-orange-50 border-orange-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-orange-800">High Risk</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{inventoryData.summary.highCount}</div>
            <p className="text-xs text-orange-700 mt-1">Products at risk</p>
          </CardContent>
        </Card>

        <Card className="bg-yellow-50 border-yellow-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-yellow-800">Medium Risk</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{inventoryData.summary.mediumCount}</div>
            <p className="text-xs text-yellow-700 mt-1">Products at risk</p>
          </CardContent>
        </Card>

        <Card className="bg-green-50 border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-800">Low Risk</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{inventoryData.summary.lowCount}</div>
            <p className="text-xs text-green-700 mt-1">Products at risk</p>
          </CardContent>
        </Card>
      </div>

      {/* Critical Products Alert */}
      {inventoryData.critical.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-800">
              <AlertTriangle className="h-5 w-5" />
              Critical Stock Alerts
            </CardTitle>
            <CardDescription>Products that may run out within 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {inventoryData.critical.slice(0, 5).map((product: any) => (
                <div key={product.id} className="flex items-center justify-between p-3 bg-white rounded border border-red-200">
                  <div>
                    <h4 className="font-medium text-red-900">{product.name}</h4>
                    <p className="text-sm text-red-700">
                      {product.currentStock} in stock • {product.dailyVelocity.toFixed(2)}/day velocity
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-red-600">
                      {product.daysUntilStockout} days
                    </div>
                    <p className="text-xs text-red-700">until stockout</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reorder Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Reorder Recommendations
          </CardTitle>
          <CardDescription>Products that should be reordered soon</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {inventoryData.all.filter((p: any) => p.shouldReorder).slice(0, 10).map((product: any) => (
              <div key={product.id} className="flex items-center justify-between p-3 bg-[#F8F9FA] rounded-lg">
                <div>
                  <h4 className="font-medium text-[#2C3E50]">{product.name}</h4>
                  <p className="text-sm text-[#6C757D]">{product.category}</p>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-[#2C3E50]">
                    Order {product.optimalOrderQty} units
                  </div>
                  <p className="text-xs text-[#6C757D]">
                    Reorder at {product.reorderPoint} units
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
