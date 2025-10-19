import { supabase } from '../lib/supabase';

export type DateRange = 'today' | 'week' | 'month' | 'quarter' | 'year';

export interface SalesReport {
  total: number;
  transactions: number;
  avgTransaction: number;
  growth: number;
  previousPeriod: number;
}

export interface ProductPerformance {
  name: string;
  sold: number;
  revenue: number;
  growth: number;
  category: string;
}

export interface CustomerReport {
  totalCustomers: number;
  newCustomers: number;
  returningCustomers: number;
  avgOrderValue: number;
}

export interface TransactionReport {
  totalTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
  avgTransactionValue: number;
}

function getDateRangeStart(range: DateRange): string {
  const now = new Date();
  const start = new Date(now);
  
  switch (range) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      break;
    case 'week':
      start.setDate(now.getDate() - 7);
      break;
    case 'month':
      start.setMonth(now.getMonth() - 1);
      break;
    case 'quarter':
      start.setMonth(now.getMonth() - 3);
      break;
    case 'year':
      start.setFullYear(now.getFullYear() - 1);
      break;
  }
  
  return start.toISOString();
}

function getPreviousPeriodStart(range: DateRange): string {
  const now = new Date();
  const start = new Date(now);
  
  switch (range) {
    case 'today':
      start.setDate(now.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      break;
    case 'week':
      start.setDate(now.getDate() - 14);
      break;
    case 'month':
      start.setMonth(now.getMonth() - 2);
      break;
    case 'quarter':
      start.setMonth(now.getMonth() - 6);
      break;
    case 'year':
      start.setFullYear(now.getFullYear() - 2);
      break;
  }
  
  return start.toISOString();
}

export async function getSalesReport(range: DateRange): Promise<SalesReport> {
  try {
    console.log(`📊 Fetching sales data for ${range}...`);
    const since = getDateRangeStart(range);
    const previousSince = getPreviousPeriodStart(range);
    
    // Get current period data - FIXED: Only select existing columns
    const { data: currentOrders, error: currentError } = await supabase
      .from('orders')
      .select('id, total, status, created_at')
      .gte('created_at', since)
      .in('status', ['confirmed', 'processing', 'shipped', 'delivered', 'completed', 'paid']);
    
    if (currentError) {
      console.error('❌ Error fetching current orders:', currentError);
      throw currentError;
    }
    
    // Get previous period data - FIXED: Only select existing columns
    const { data: previousOrders, error: previousError } = await supabase
      .from('orders')
      .select('id, total, status, created_at')
      .gte('created_at', previousSince)
      .lt('created_at', since)
      .in('status', ['confirmed', 'processing', 'shipped', 'delivered', 'completed', 'paid']);
    
    if (previousError) {
      console.error('❌ Error fetching previous orders:', previousError);
      throw previousError;
    }
    
    console.log(`✅ Found ${currentOrders?.length || 0} current orders, ${previousOrders?.length || 0} previous orders`);
    
    const currentTotal = (currentOrders || []).reduce((sum, order) => 
      sum + (order.total || 0), 0);
    
    const previousTotal = (previousOrders || []).reduce((sum, order) => 
      sum + (order.total || 0), 0);
    
    const transactions = currentOrders?.length || 0;
    const avgTransaction = transactions > 0 ? currentTotal / transactions : 0;
    const growth = previousTotal > 0 ? ((currentTotal - previousTotal) / previousTotal) * 100 : 0;
    
    console.log(`📈 Sales report: R${currentTotal}, ${transactions} transactions, ${growth.toFixed(1)}% growth`);
    
    return {
      total: currentTotal,
      transactions,
      avgTransaction,
      growth,
      previousPeriod: previousTotal
    };
  } catch (error) {
    console.error('❌ Error in getSalesReport:', error);
    return {
      total: 0,
      transactions: 0,
      avgTransaction: 0,
      growth: 0,
      previousPeriod: 0
    };
  }
}

export async function getProductPerformance(range: DateRange): Promise<ProductPerformance[]> {
  try {
    console.log(`📦 Fetching product performance for ${range}...`);
    const since = getDateRangeStart(range);
    
    const { data, error } = await supabase
      .from('order_items')
      .select(`
        product_id,
        product_snapshot,
        quantity,
        total_price,
        orders!inner(created_at, status)
      `)
      .gte('orders.created_at', since)
      .in('orders.status', ['confirmed', 'processing', 'shipped', 'delivered', 'completed', 'paid']);
    
    if (error) {
      console.error('❌ Error fetching product performance:', error);
      throw error;
    }
    
    console.log(`✅ Found ${data?.length || 0} order items`);
    
    // Group by product
    const productMap = new Map<string, {
      name: string;
      category: string;
      sold: number;
      revenue: number;
    }>();
    
    (data || []).forEach(item => {
      const productId = item.product_id;
      const snapshot = item.product_snapshot || {};
      const name = snapshot.name || 'Unknown Product';
      const category = snapshot.category || 'Uncategorized';
      
      if (!productMap.has(productId)) {
        productMap.set(productId, {
          name,
          category,
          sold: 0,
          revenue: 0
        });
      }
      
      const product = productMap.get(productId)!;
      product.sold += item.quantity;
      product.revenue += item.total_price;
    });
    
    // Convert to array and sort by revenue
    const result = Array.from(productMap.values())
      .map(product => ({
        name: product.name,
        sold: product.sold,
        revenue: product.revenue,
        growth: 0, // TODO: Calculate growth compared to previous period
        category: product.category
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10); // Top 10 products
    
    console.log(`📊 Product performance: ${result.length} products`);
    return result;
  } catch (error) {
    console.error('❌ Error in getProductPerformance:', error);
    return [];
  }
}

export async function getCustomerReport(range: DateRange): Promise<CustomerReport> {
  try {
    console.log(`👥 Fetching customer report for ${range}...`);
    const since = getDateRangeStart(range);
    
    // Get total customers
    const { count: totalCustomers, error: totalError } = await supabase
      .from('user_profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'customer');
    
    if (totalError) {
      console.error('❌ Error fetching total customers:', totalError);
      throw totalError;
    }
    
    // Get new customers in period
    const { count: newCustomers, error: newError } = await supabase
      .from('user_profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'customer')
      .gte('created_at', since);
    
    if (newError) {
      console.error('❌ Error fetching new customers:', newError);
      throw newError;
    }
    
    // Get returning customers (customers with multiple orders)
    const { data: returningData, error: returningError } = await supabase
      .from('orders')
      .select('customer_id')
      .gte('created_at', since)
      .in('status', ['confirmed', 'processing', 'shipped', 'delivered', 'completed', 'paid']);
    
    if (returningError) {
      console.error('❌ Error fetching returning customers:', returningError);
      throw returningError;
    }
    
    const customerOrderCounts = new Map<string, number>();
    (returningData || []).forEach(order => {
      if (order.customer_id) {
        customerOrderCounts.set(order.customer_id, (customerOrderCounts.get(order.customer_id) || 0) + 1);
      }
    });
    
    const returningCustomers = Array.from(customerOrderCounts.values()).filter(count => count > 1).length;
    
    // Get average order value
    const { data: ordersData, error: ordersError } = await supabase
      .from('orders')
      .select('total')
      .gte('created_at', since)
      .in('status', ['confirmed', 'processing', 'shipped', 'delivered', 'completed', 'paid']);
    
    if (ordersError) {
      console.error('❌ Error fetching orders for avg value:', ordersError);
      throw ordersError;
    }
    
    const totalRevenue = (ordersData || []).reduce((sum, order) => 
      sum + (order.total || 0), 0);
    const avgOrderValue = ordersData?.length ? totalRevenue / ordersData.length : 0;
    
    console.log(`👥 Customer report: ${totalCustomers} total, ${newCustomers} new, ${returningCustomers} returning`);
    
    return {
      totalCustomers: totalCustomers || 0,
      newCustomers: newCustomers || 0,
      returningCustomers,
      avgOrderValue
    };
  } catch (error) {
    console.error('❌ Error in getCustomerReport:', error);
    return {
      totalCustomers: 0,
      newCustomers: 0,
      returningCustomers: 0,
      avgOrderValue: 0
    };
  }
}

export async function getTransactionReport(range: DateRange): Promise<TransactionReport> {
  try {
    console.log(`💳 Fetching transaction report for ${range}...`);
    const since = getDateRangeStart(range);
    
    const { data: orders, error } = await supabase
      .from('orders')
      .select('id, total, status, payment_status, created_at')
      .gte('created_at', since);
    
    if (error) {
      console.error('❌ Error fetching transactions:', error);
      throw error;
    }
    
    const totalTransactions = orders?.length || 0;
    const successfulTransactions = orders?.filter(order => 
      order.status === 'completed' || order.payment_status === 'paid'
    ).length || 0;
    const failedTransactions = totalTransactions - successfulTransactions;
    
    const totalValue = (orders || []).reduce((sum, order) => 
      sum + (order.total || 0), 0);
    const avgTransactionValue = totalTransactions > 0 ? totalValue / totalTransactions : 0;
    
    console.log(`💳 Transaction report: ${totalTransactions} total, ${successfulTransactions} successful, ${failedTransactions} failed`);
    
    return {
      totalTransactions,
      successfulTransactions,
      failedTransactions,
      avgTransactionValue
    };
  } catch (error) {
    console.error('❌ Error in getTransactionReport:', error);
    return {
      totalTransactions: 0,
      successfulTransactions: 0,
      failedTransactions: 0,
      avgTransactionValue: 0
    };
  }
}
