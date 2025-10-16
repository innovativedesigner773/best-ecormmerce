import { supabase } from "../lib/supabase";

export type TimeRange = "1W" | "1M" | "6M" | "12M";

function getRangeStart(range: TimeRange): string {
  const now = new Date();
  const start = new Date(now);
  switch (range) {
    case "1W":
      start.setDate(now.getDate() - 7);
      break;
    case "1M":
      start.setMonth(now.getMonth() - 1);
      break;
    case "6M":
      start.setMonth(now.getMonth() - 6);
      break;
    case "12M":
      start.setFullYear(now.getFullYear() - 1);
      break;
  }
  return start.toISOString();
}

function isCompletedStatus(status?: string | null): boolean {
  if (!status) return false;
  return ["confirmed", "processing", "shipped", "delivered", "completed", "paid"].includes(status);
}

export async function getSummary(range: TimeRange) {
  const since = getRangeStart(range);

  const [
    { data: ordersData, error: ordersError },
    productsRes,
    usersRes,
    newProductsRes
  ] = await Promise.all([
    supabase
      .from("orders")
      .select("id, total, total_amount, status, created_at")
      .gte("created_at", since),
    // Avoid head:true to work around some RLS/count header issues
    supabase
      .from("products")
      .select("id", { count: "exact" })
      .range(0, 0),
    supabase
      .from("user_profiles")
      .select("id", { count: "exact" })
      .range(0, 0),
    supabase
      .from("products")
      .select("id", { count: "exact" })
      .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .range(0, 0)
  ]);

  if (ordersError) throw ordersError;
  const { count: productsCount, error: productsError } = productsRes as any;
  const { count: usersCount, error: usersError } = usersRes as any;
  const { count: newProductsCount, error: newProductsError } = newProductsRes as any;
  if (productsError) throw productsError;
  if (usersError) throw usersError;
  if (newProductsError) throw newProductsError;

  const orders = ordersData || [];
  const completedOrders = orders.filter(o => isCompletedStatus(o.status));
  const grossSales = orders.reduce((sum, o) => sum + Number(o.total ?? o.total_amount ?? 0), 0);
  let sales = completedOrders.reduce((sum, o) => sum + Number(o.total ?? o.total_amount ?? 0), 0);

  // Fallback A: if completed sales is 0 but gross > 0, show gross
  if (!sales && grossSales > 0) {
    sales = grossSales;
  }

  // Fallback B: if still 0, derive from order_items for completed orders
  if (!sales && completedOrders.length) {
    const orderIds = completedOrders.map(o => o.id);
    const { data: items, error: itemsError } = await supabase
      .from("order_items")
      .select("order_id, quantity, total_price, unit_price")
      .in("order_id", orderIds);
    if (itemsError) throw itemsError;
    sales = (items || []).reduce((sum, it) => sum + Number(it.total_price ?? ((it.unit_price || 0) * (it.quantity || 0))), 0);
  }
  const pendingOrders = orders.filter(o => (o.status || '').toLowerCase() === 'pending').length;

  return {
    ordersCount: orders.length,
    salesAmount: sales,
    productsCount: productsCount || 0,
    usersCount: usersCount || 0,
    pendingOrders,
    newProductsThisWeek: newProductsCount || 0
  };
}

export async function getSalesTimeSeries(range: TimeRange) {
  const since = getRangeStart(range);
  const { data, error } = await supabase
    .from("orders")
    .select("id, total, total_amount, status, created_at")
    .gte("created_at", since)
    .order("created_at", { ascending: true });
  if (error) throw error;

  const rows = (data || []).filter(r => isCompletedStatus(r.status));
  // First try grouping by order totals
  let map = new Map<string, { date: string; revenue: number; orders: number }>();
  for (const r of rows) {
    const d = new Date(r.created_at);
    const key = d.toISOString().slice(0, 10);
    const entry = map.get(key) || { date: key, revenue: 0, orders: 0 };
    entry.revenue += Number(r.total ?? r.total_amount ?? 0);
    entry.orders += 1;
    map.set(key, entry);
  }
  // Fallback to order_items when totals are zero
  const hasRevenue = Array.from(map.values()).some(e => e.revenue > 0);
  if (!hasRevenue && rows.length) {
    const orderIds = rows.map(r => r.id);
    const { data: items, error: itemsError } = await supabase
      .from("order_items")
      .select("order_id, quantity, total_price, unit_price")
      .in("order_id", orderIds);
    if (itemsError) throw itemsError;
    map = new Map();
    // Build createdAt map for orders
    const orderIdToDate = new Map<string, string>();
    for (const o of rows) {
      const key = new Date(o.created_at).toISOString().slice(0, 10);
      orderIdToDate.set(o.id, key);
    }
    for (const it of items || []) {
      const key = orderIdToDate.get(it.order_id as any) || new Date().toISOString().slice(0, 10);
      const entry = map.get(key) || { date: key, revenue: 0, orders: 0 };
      entry.revenue += Number(it.total_price ?? ((it.unit_price || 0) * (it.quantity || 0)));
      map.set(key, entry);
    }
    // Recompute orders count per day from rows
    for (const r of rows) {
      const key = new Date(r.created_at).toISOString().slice(0, 10);
      const entry = map.get(key) || { date: key, revenue: 0, orders: 0 };
      entry.orders += 1;
      map.set(key, entry);
    }
  }
  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
}

export async function getBestSellers(range: TimeRange, by: "quantity" | "revenue", limit = 10) {
  const since = getRangeStart(range);
  // Step 1: fetch completed orders in range
  const { data: orders, error: ordersError } = await supabase
    .from("orders")
    .select("id, status, created_at")
    .gte("created_at", since);
  if (ordersError) throw ordersError;

  const completedOrderIds = (orders || [])
    .filter(o => isCompletedStatus(o.status))
    .map(o => o.id);
  if (completedOrderIds.length === 0) return [];

  // Step 2: fetch items for those orders
  const { data: items, error: itemsError } = await supabase
    .from("order_items")
    .select("product_id, quantity, total_price, unit_price, product:products(name)")
    .in("order_id", completedOrderIds);
  if (itemsError) throw itemsError;

  const agg = new Map<string, { id: string; name: string; quantity: number; revenue: number }>();
  for (const row of items || []) {
    const id = row.product_id as string;
    if (!id) continue;
    const name = (row as any).product?.name || "Unknown";
    const current = agg.get(id) || { id, name, quantity: 0, revenue: 0 };
    current.quantity += row.quantity || 0;
    current.revenue += Number(row.total_price ?? ((row.quantity || 0) * (row as any).unit_price || 0));
    agg.set(id, current);
  }

  const arr = Array.from(agg.values());
  arr.sort((a, b) => (by === "quantity" ? b.quantity - a.quantity : b.revenue - a.revenue));
  return arr.slice(0, limit);
}

export async function getMonthlyStock50Reached() {
  // For current month: estimate starting stock as current + sold_this_month
  const monthStart = new Date();
  monthStart.setDate(1);
  const since = monthStart.toISOString();

  const [{ data: products, error: productsError }, { data: monthOrders, error: ordersError }] = await Promise.all([
    supabase.from("products").select("id, name, stock_quantity"),
    supabase
      .from("orders")
      .select("id, status, created_at")
      .gte("created_at", since)
  ]);
  if (productsError) throw productsError;
  if (ordersError) throw ordersError;

  const completedThisMonth = (monthOrders || []).filter(o => isCompletedStatus(o.status)).map(o => o.id);
  if (completedThisMonth.length === 0) return [];

  const { data: items, error: itemsError } = await supabase
    .from("order_items")
    .select("product_id, quantity")
    .in("order_id", completedThisMonth);
  if (itemsError) throw itemsError;

  const soldMap = new Map<string, number>();
  for (const it of items || []) {
    const completed = isCompletedStatus((it as any).orders?.status);
    if (!completed) continue;
    if (!it.product_id) continue;
    soldMap.set(it.product_id, (soldMap.get(it.product_id) || 0) + (it.quantity || 0));
  }

  const results = [] as Array<{ id: string; name: string; soldThisMonth: number; startingStock: number; percentSold: number }>;
  for (const p of products || []) {
    const sold = soldMap.get(p.id) || 0;
    const starting = (p.stock_quantity || 0) + sold;
    if (starting <= 0) continue;
    const percent = sold / starting;
    if (percent >= 0.5) {
      results.push({ id: p.id, name: p.name, soldThisMonth: sold, startingStock: starting, percentSold: percent });
    }
  }
  // Sort by percent sold desc
  results.sort((a, b) => b.percentSold - a.percentSold);
  return results;
}

export async function getRevenueBreakdown(range: TimeRange) {
  const since = getRangeStart(range);
  // Orders in range
  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, status, subtotal, tax_amount, shipping_amount, discount_amount, total, total_amount, created_at')
    .gte('created_at', since);
  if (error) throw error;

  const completed = (orders || []).filter(o => isCompletedStatus(o.status));
  const sum = (arr: any[], key: string) => arr.reduce((s, o) => s + Number(o[key] || 0), 0);
  const subtotal = sum(completed, 'subtotal');
  const tax = sum(completed, 'tax_amount');
  const shipping = sum(completed, 'shipping_amount');
  const discount = sum(completed, 'discount_amount');
  let total = sum(completed, 'total');
  if (!total) total = sum(completed, 'total_amount');

  // Fallback: compute from items if totals missing
  if (!total && completed.length) {
    const ids = completed.map(o => o.id);
    const { data: items } = await supabase
      .from('order_items')
      .select('order_id, quantity, unit_price, total_price')
      .in('order_id', ids);
    total = (items || []).reduce((s, it) => s + Number(it.total_price ?? ((it.unit_price || 0) * (it.quantity || 0))), 0);
  }

  return { subtotal, tax, shipping, discount, total };
}

export async function getInventoryKpis() {
  const [{ data: products, error: pErr }] = await Promise.all([
    supabase.from('products').select('id, stock_quantity, is_active')
  ]);
  if (pErr) throw pErr;
  const all = products || [];
  const outOfStock = all.filter(p => (p.stock_quantity || 0) === 0).length;
  const lowStock = all.filter(p => (p.stock_quantity || 0) > 0 && (p.stock_quantity || 0) <= 5).length;
  const active = all.filter(p => p.is_active).length;
  return { totalProducts: all.length, active, outOfStock, lowStock };
}

export async function getSalesByCategory(range: TimeRange) {
  const since = getRangeStart(range);
  const { data: orders, error: oErr } = await supabase
    .from('orders')
    .select('id, status, created_at')
    .gte('created_at', since);
  if (oErr) throw oErr;
  const completedIds = (orders || []).filter(o => isCompletedStatus(o.status)).map(o => o.id);
  if (completedIds.length === 0) return [];

  const { data: items, error: iErr } = await supabase
    .from('order_items')
    .select('product_id, total_price, quantity, products(category_id), categories:products(category_id)')
    .in('order_id', completedIds);
  if (iErr) throw iErr;

  // Fetch categories names
  const { data: cats } = await supabase.from('categories').select('id, name');
  const idToName = new Map((cats || []).map(c => [c.id, c.name] as [string, string]));

  const agg = new Map<string, { categoryId: string; categoryName: string; revenue: number; orders: number; items: number }>();
  for (const it of items || []) {
    const categoryId = (it as any).products?.category_id || (it as any).categories?.category_id || 'uncategorized';
    const key = categoryId;
    const name = idToName.get(categoryId) || 'Uncategorized';
    const rec = agg.get(key) || { categoryId, categoryName: name, revenue: 0, orders: 0, items: 0 };
    rec.revenue += Number(it.total_price ?? 0);
    rec.items += Number(it.quantity || 0);
    agg.set(key, rec);
  }
  return Array.from(agg.values()).sort((a, b) => b.revenue - a.revenue);
}

export async function getTopCustomers(range: TimeRange, limit = 5) {
  const since = getRangeStart(range);
  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, status, total, total_amount, customer_id, customer_email, created_at')
    .gte('created_at', since);
  if (error) throw error;
  const completed = (orders || []).filter(o => isCompletedStatus(o.status));
  const map = new Map<string, { id: string; name: string; email: string; total: number; orders: number }>();
  for (const o of completed) {
    const key = o.customer_id || o.customer_email || 'unknown';
    const rec = map.get(key) || { id: key, name: '', email: o.customer_email || '', total: 0, orders: 0 };
    rec.total += Number(o.total ?? o.total_amount ?? 0);
    rec.orders += 1;
    map.set(key, rec);
  }
  // Enrich names
  const ids = Array.from(map.keys()).filter(k => k.length === 36);
  if (ids.length) {
    const { data: users } = await supabase
      .from('user_profiles')
      .select('id, first_name, last_name')
      .in('id', ids);
    for (const u of users || []) {
      const rec = map.get(u.id);
      if (rec) rec.name = `${u.first_name || ''} ${u.last_name || ''}`.trim();
    }
  }
  const arr = Array.from(map.values());
  arr.sort((a, b) => b.total - a.total);
  return arr.slice(0, limit);
}

export async function getBusinessValue(range: TimeRange) {
  const since = getRangeStart(range);
  // Orders and items in range
  const [{ data: orders, error: oErr }] = await Promise.all([
    supabase
      .from('orders')
      .select('id, status, total, total_amount, customer_id, created_at')
      .gte('created_at', since)
  ]);
  if (oErr) throw oErr;

  const completed = (orders || []).filter(o => isCompletedStatus(o.status));
  const orderIds = completed.map(o => o.id);

  let items: any[] = [];
  if (orderIds.length) {
    const { data: it, error: iErr } = await supabase
      .from('order_items')
      .select('order_id, quantity, unit_price, total_price');
    if (iErr) throw iErr;
    items = (it || []).filter(x => orderIds.includes(x.order_id));
  }

  // AOV and items per order
  const revenue = completed.reduce((s, o) => s + Number(o.total ?? o.total_amount ?? 0), 0);
  const ordersCount = completed.length;
  const itemsCount = items.reduce((s, it) => s + Number(it.quantity || 0), 0);
  const aov = ordersCount ? revenue / ordersCount : 0;
  const itemsPerOrder = ordersCount ? itemsCount / ordersCount : 0;

  // Repeat customer rate
  const customerOrderCounts = new Map<string, number>();
  for (const o of completed) {
    const key = o.customer_id || `anon-${o.id}`;
    customerOrderCounts.set(key, (customerOrderCounts.get(key) || 0) + 1);
  }
  const customers = Array.from(customerOrderCounts.values());
  const repeatCustomers = customers.filter(c => c > 1).length;
  const uniqueCustomers = customers.length || 1;
  const repeatRate = repeatCustomers / uniqueCustomers;

  // Inventory: approximate inventory value & sell-through
  const { data: products } = await supabase
    .from('products')
    .select('id, price, cost_price, stock_quantity');
  const productList = products || [];
  const inventoryValueRetail = productList.reduce((s, p) => s + Number(p.price || 0) * Number(p.stock_quantity || 0), 0);
  const inventoryValueCost = productList.reduce((s, p) => s + Number(p.cost_price || 0) * Number(p.stock_quantity || 0), 0);
  const grossMargin = revenue && inventoryValueCost >= 0 ? (revenue - inventoryValueCost) / Math.max(revenue, 1) : 0;

  // Sell-through: items sold vs (items sold + current stock) for SKUs touched
  const soldByProduct = new Map<string, number>();
  if (orderIds.length) {
    const { data: joined } = await supabase
      .from('order_items')
      .select('product_id, quantity')
      .in('order_id', orderIds);
    for (const it of joined || []) {
      if (!it.product_id) continue;
      soldByProduct.set(it.product_id, (soldByProduct.get(it.product_id) || 0) + Number(it.quantity || 0));
    }
  }
  let sellThrough = 0;
  if (soldByProduct.size) {
    let sold = 0;
    let starting = 0;
    for (const [pid, qty] of soldByProduct.entries()) {
      const p = productList.find(x => x.id === pid);
      const stock = Number(p?.stock_quantity || 0);
      sold += qty;
      starting += (qty + stock);
    }
    sellThrough = starting ? sold / starting : 0;
  }

  // Refund rate (if status "cancelled" present)
  const cancelled = (orders || []).filter(o => (o.status || '').toLowerCase() === 'cancelled').length;
  const refundRate = (orders || []).length ? cancelled / (orders || []).length : 0;

  return {
    aov,
    itemsPerOrder,
    repeatRate,
    grossMargin,
    inventoryValueRetail,
    inventoryValueCost,
    sellThrough,
    refundRate,
    revenue,
    ordersCount,
    itemsCount
  };
}

// Conversion Funnel Analytics
export async function getConversionFunnel(range: TimeRange) {
  const since = getRangeStart(range);
  
  // Get total users (registered)
  const { count: totalUsers } = await supabase
    .from('user_profiles')
    .select('id', { count: 'exact' })
    .range(0, 0);
  
  // Get users who have placed orders (customers)
  const { data: orders } = await supabase
    .from('orders')
    .select('customer_id')
    .gte('created_at', since);
  
  const uniqueCustomers = new Set((orders || []).map(o => o.customer_id).filter(Boolean));
  const customersCount = uniqueCustomers.size;
  
  // Get users who have completed orders
  const { data: completedOrders } = await supabase
    .from('orders')
    .select('customer_id, status')
    .gte('created_at', since);
  
  const completedCustomers = new Set(
    (completedOrders || [])
      .filter(o => isCompletedStatus(o.status))
      .map(o => o.customer_id)
      .filter(Boolean)
  );
  const completedCustomersCount = completedCustomers.size;
  
  // Calculate conversion rates
  const registrationToCustomerRate = totalUsers ? (customersCount / totalUsers) * 100 : 0;
  const customerToCompletedRate = customersCount ? (completedCustomersCount / customersCount) * 100 : 0;
  const overallConversionRate = totalUsers ? (completedCustomersCount / totalUsers) * 100 : 0;
  
  return {
    totalUsers: totalUsers || 0,
    customers: customersCount,
    completedCustomers: completedCustomersCount,
    registrationToCustomerRate,
    customerToCompletedRate,
    overallConversionRate
  };
}

// Customer Lifetime Value Analytics
export async function getCustomerLifetimeValue(range: TimeRange) {
  const since = getRangeStart(range);
  
  // Get all completed orders with customer info
  const { data: orders } = await supabase
    .from('orders')
    .select('customer_id, customer_email, total, total_amount, status, created_at')
    .gte('created_at', since);
  
  const completedOrders = (orders || []).filter(o => isCompletedStatus(o.status));
  
  // Calculate CLV per customer
  const customerStats = new Map<string, {
    customerId: string;
    email: string;
    totalOrders: number;
    totalSpent: number;
    firstOrder: string;
    lastOrder: string;
    avgOrderValue: number;
    clv: number;
  }>();
  
  for (const order of completedOrders) {
    const key = order.customer_id || order.customer_email || 'anonymous';
    const existing = customerStats.get(key) || {
      customerId: key,
      email: order.customer_email || '',
      totalOrders: 0,
      totalSpent: 0,
      firstOrder: order.created_at,
      lastOrder: order.created_at,
      avgOrderValue: 0,
      clv: 0
    };
    
    existing.totalOrders += 1;
    existing.totalSpent += Number(order.total ?? order.total_amount ?? 0);
    existing.firstOrder = existing.firstOrder < order.created_at ? existing.firstOrder : order.created_at;
    existing.lastOrder = existing.lastOrder > order.created_at ? existing.lastOrder : order.created_at;
    
    customerStats.set(key, existing);
  }
  
  // Calculate averages and CLV
  const customers = Array.from(customerStats.values());
  for (const customer of customers) {
    customer.avgOrderValue = customer.totalOrders ? customer.totalSpent / customer.totalOrders : 0;
    // Simple CLV calculation: total spent + projected future value based on repeat rate
    const repeatRate = customer.totalOrders > 1 ? 0.3 : 0.1; // Estimated repeat rates
    customer.clv = customer.totalSpent * (1 + repeatRate);
  }
  
  // Calculate overall metrics
  const totalCLV = customers.reduce((sum, c) => sum + c.clv, 0);
  const avgCLV = customers.length ? totalCLV / customers.length : 0;
  const medianCLV = customers.length ? 
    customers.sort((a, b) => a.clv - b.clv)[Math.floor(customers.length / 2)]?.clv || 0 : 0;
  
  // Top customers by CLV
  const topCustomersByCLV = customers
    .sort((a, b) => b.clv - a.clv)
    .slice(0, 10);
  
  return {
    totalCustomers: customers.length,
    avgCLV,
    medianCLV,
    totalCLV,
    topCustomersByCLV,
    allCustomers: customers
  };
}

// Cohort Analysis for Customer Retention
export async function getCohortAnalysis(range: TimeRange) {
  const since = getRangeStart(range);
  
  // Get all orders with customer and date info
  const { data: orders } = await supabase
    .from('orders')
    .select('customer_id, customer_email, created_at, status')
    .gte('created_at', since)
    .order('created_at', { ascending: true });
  
  const completedOrders = (orders || []).filter(o => isCompletedStatus(o.status));
  
  // Group orders by customer and find first order month
  const customerFirstOrder = new Map<string, string>();
  const customerOrdersByMonth = new Map<string, Set<string>>();
  
  for (const order of completedOrders) {
    const key = order.customer_id || order.customer_email || 'anonymous';
    const orderMonth = order.created_at.slice(0, 7); // YYYY-MM format
    
    if (!customerFirstOrder.has(key)) {
      customerFirstOrder.set(key, orderMonth);
    }
    
    if (!customerOrdersByMonth.has(key)) {
      customerOrdersByMonth.set(key, new Set());
    }
    customerOrdersByMonth.get(key)!.add(orderMonth);
  }
  
  // Create cohort data
  const cohorts = new Map<string, {
    month: string;
    newCustomers: number;
    retention: Map<string, number>; // month -> retention rate
  }>();
  
  for (const [customerId, firstMonth] of customerFirstOrder) {
    if (!cohorts.has(firstMonth)) {
      cohorts.set(firstMonth, {
        month: firstMonth,
        newCustomers: 0,
        retention: new Map()
      });
    }
    
    const cohort = cohorts.get(firstMonth)!;
    cohort.newCustomers += 1;
    
    // Calculate retention for each subsequent month
    const customerOrders = customerOrdersByMonth.get(customerId)!;
    for (const orderMonth of customerOrders) {
      if (orderMonth !== firstMonth) {
        const existing = cohort.retention.get(orderMonth) || 0;
        cohort.retention.set(orderMonth, existing + 1);
      }
    }
  }
  
  // Convert to percentage retention rates
  const cohortData = Array.from(cohorts.values()).map(cohort => {
    const retentionRates = new Map<string, number>();
    for (const [month, count] of cohort.retention) {
      retentionRates.set(month, (count / cohort.newCustomers) * 100);
    }
    return {
      ...cohort,
      retention: retentionRates
    };
  });
  
  return cohortData.sort((a, b) => a.month.localeCompare(b.month));
}

// Product Performance Analytics
export async function getProductPerformance(range: TimeRange) {
  const since = getRangeStart(range);
  
  // Get completed orders in range
  const { data: orders } = await supabase
    .from('orders')
    .select('id, status, created_at')
    .gte('created_at', since);
  
  const completedOrderIds = (orders || [])
    .filter(o => isCompletedStatus(o.status))
    .map(o => o.id);
  
  if (completedOrderIds.length === 0) return [];
  
  // Get order items with product details
  const { data: items } = await supabase
    .from('order_items')
    .select(`
      product_id, 
      quantity, 
      unit_price, 
      total_price,
      products!inner(
        id,
        name,
        price,
        cost_price,
        category_id,
        stock_quantity,
        categories(name)
      )
    `)
    .in('order_id', completedOrderIds);
  
  // Aggregate product performance
  const productStats = new Map<string, {
    id: string;
    name: string;
    category: string;
    totalSold: number;
    totalRevenue: number;
    avgPrice: number;
    costPrice: number;
    profitMargin: number;
    velocity: number; // units sold per day
    stockTurnover: number;
    currentStock: number;
  }>();
  
  const daysInRange = Math.max(1, Math.floor((Date.now() - new Date(since).getTime()) / (1000 * 60 * 60 * 24)));
  
  for (const item of items || []) {
    const product = (item as any).products;
    if (!product) continue;
    
    const key = product.id;
    const existing = productStats.get(key) || {
      id: product.id,
      name: product.name,
      category: product.categories?.name || 'Uncategorized',
      totalSold: 0,
      totalRevenue: 0,
      avgPrice: 0,
      costPrice: product.cost_price || 0,
      profitMargin: 0,
      velocity: 0,
      stockTurnover: 0,
      currentStock: product.stock_quantity || 0
    };
    
    existing.totalSold += item.quantity || 0;
    existing.totalRevenue += Number(item.total_price || (item.unit_price || 0) * (item.quantity || 0));
    
    productStats.set(key, existing);
  }
  
  // Calculate derived metrics
  const products = Array.from(productStats.values()).map(product => {
    product.avgPrice = product.totalSold ? product.totalRevenue / product.totalSold : 0;
    product.profitMargin = product.costPrice ? 
      ((product.avgPrice - product.costPrice) / product.avgPrice) * 100 : 0;
    product.velocity = product.totalSold / daysInRange;
    product.stockTurnover = product.currentStock ? product.totalSold / product.currentStock : 0;
    
    return product;
  });
  
  // Sort by various metrics for insights
  const topByRevenue = [...products].sort((a, b) => b.totalRevenue - a.totalRevenue).slice(0, 10);
  const topByVelocity = [...products].sort((a, b) => b.velocity - a.velocity).slice(0, 10);
  const topByMargin = [...products].sort((a, b) => b.profitMargin - a.profitMargin).slice(0, 10);
  const slowMoving = [...products].filter(p => p.velocity < 0.1).sort((a, b) => a.velocity - b.velocity);
  
  return {
    allProducts: products,
    topByRevenue,
    topByVelocity,
    topByMargin,
    slowMoving,
    summary: {
      totalProducts: products.length,
      avgMargin: products.reduce((sum, p) => sum + p.profitMargin, 0) / products.length,
      avgVelocity: products.reduce((sum, p) => sum + p.velocity, 0) / products.length,
      totalRevenue: products.reduce((sum, p) => sum + p.totalRevenue, 0)
    }
  };
}

// Seasonal Trends and Forecasting
export async function getSeasonalTrends(range: TimeRange) {
  const since = getRangeStart(range);
  
  // Get all orders with detailed date information
  const { data: orders } = await supabase
    .from('orders')
    .select('id, total, total_amount, status, created_at')
    .gte('created_at', since)
    .order('created_at', { ascending: true });
  
  const completedOrders = (orders || []).filter(o => isCompletedStatus(o.status));
  
  // Group by different time periods
  const daily = new Map<string, { revenue: number; orders: number; date: string }>();
  const weekly = new Map<string, { revenue: number; orders: number; week: string }>();
  const monthly = new Map<string, { revenue: number; orders: number; month: string }>();
  const hourly = new Map<number, { revenue: number; orders: number; hour: number }>();
  const dayOfWeek = new Map<number, { revenue: number; orders: number; day: number }>();
  
  for (const order of completedOrders) {
    const date = new Date(order.created_at);
    const amount = Number(order.total ?? order.total_amount ?? 0);
    
    // Daily aggregation
    const dayKey = date.toISOString().slice(0, 10);
    const dayData = daily.get(dayKey) || { revenue: 0, orders: 0, date: dayKey };
    dayData.revenue += amount;
    dayData.orders += 1;
    daily.set(dayKey, dayData);
    
    // Weekly aggregation (Monday as start of week)
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay() + 1);
    const weekKey = weekStart.toISOString().slice(0, 10);
    const weekData = weekly.get(weekKey) || { revenue: 0, orders: 0, week: weekKey };
    weekData.revenue += amount;
    weekData.orders += 1;
    weekly.set(weekKey, weekData);
    
    // Monthly aggregation
    const monthKey = date.toISOString().slice(0, 7);
    const monthData = monthly.get(monthKey) || { revenue: 0, orders: 0, month: monthKey };
    monthData.revenue += amount;
    monthData.orders += 1;
    monthly.set(monthKey, monthData);
    
    // Hourly aggregation
    const hour = date.getHours();
    const hourData = hourly.get(hour) || { revenue: 0, orders: 0, hour };
    hourData.revenue += amount;
    hourData.orders += 1;
    hourly.set(hour, hourData);
    
    // Day of week aggregation
    const dayOfWeekNum = date.getDay();
    const dayData2 = dayOfWeek.get(dayOfWeekNum) || { revenue: 0, orders: 0, day: dayOfWeekNum };
    dayData2.revenue += amount;
    dayData2.orders += 1;
    dayOfWeek.set(dayOfWeekNum, dayData2);
  }
  
  // Simple forecasting using linear trend
  const dailyArray = Array.from(daily.values()).sort((a, b) => a.date.localeCompare(b.date));
  const forecast = generateSimpleForecast(dailyArray);
  
  // Calculate growth trends
  const growthRates = calculateGrowthRates(dailyArray);
  
  return {
    daily: dailyArray,
    weekly: Array.from(weekly.values()).sort((a, b) => a.week.localeCompare(b.week)),
    monthly: Array.from(monthly.values()).sort((a, b) => a.month.localeCompare(b.month)),
    hourly: Array.from(hourly.values()).sort((a, b) => a.hour - b.hour),
    dayOfWeek: Array.from(dayOfWeek.values()).sort((a, b) => a.day - b.day),
    forecast,
    growthRates,
    summary: {
      totalDays: dailyArray.length,
      avgDailyRevenue: dailyArray.length ? dailyArray.reduce((sum, d) => sum + d.revenue, 0) / dailyArray.length : 0,
      avgDailyOrders: dailyArray.length ? dailyArray.reduce((sum, d) => sum + d.orders, 0) / dailyArray.length : 0,
      peakHour: Array.from(hourly.values()).sort((a, b) => b.revenue - a.revenue)[0]?.hour || 0,
      peakDay: Array.from(dayOfWeek.values()).sort((a, b) => b.revenue - a.revenue)[0]?.day || 0
    }
  };
}

// Helper function for simple forecasting
function generateSimpleForecast(dailyData: Array<{ revenue: number; orders: number; date: string }>) {
  if (dailyData.length < 2) return [];
  
  // Simple linear regression for next 7 days
  const n = dailyData.length;
  const x = dailyData.map((_, i) => i);
  const y = dailyData.map(d => d.revenue);
  
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  const forecast = [];
  const lastDate = new Date(dailyData[dailyData.length - 1].date);
  
  for (let i = 1; i <= 7; i++) {
    const forecastDate = new Date(lastDate);
    forecastDate.setDate(lastDate.getDate() + i);
    
    const forecastValue = Math.max(0, slope * (n + i - 1) + intercept);
    forecast.push({
      date: forecastDate.toISOString().slice(0, 10),
      revenue: forecastValue,
      orders: Math.round(forecastValue / 100), // Rough estimate
      isForecast: true
    });
  }
  
  return forecast;
}

// Helper function to calculate growth rates
function calculateGrowthRates(dailyData: Array<{ revenue: number; orders: number; date: string }>) {
  if (dailyData.length < 7) return { daily: 0, weekly: 0, monthly: 0 };
  
  // Daily growth rate (last 7 days vs previous 7 days)
  const last7Days = dailyData.slice(-7);
  const prev7Days = dailyData.slice(-14, -7);
  
  const last7Avg = last7Days.reduce((sum, d) => sum + d.revenue, 0) / 7;
  const prev7Avg = prev7Days.length ? prev7Days.reduce((sum, d) => sum + d.revenue, 0) / 7 : last7Avg;
  const dailyGrowth = prev7Avg ? ((last7Avg - prev7Avg) / prev7Avg) * 100 : 0;
  
  // Weekly growth rate
  const lastWeek = dailyData.slice(-7);
  const prevWeek = dailyData.slice(-14, -7);
  const weeklyGrowth = prevWeek.length ? 
    ((lastWeek.reduce((sum, d) => sum + d.revenue, 0) - prevWeek.reduce((sum, d) => sum + d.revenue, 0)) / 
     prevWeek.reduce((sum, d) => sum + d.revenue, 0)) * 100 : 0;
  
  // Monthly growth rate (if we have enough data)
  const monthlyGrowth = dailyData.length >= 30 ? 
    ((dailyData.slice(-7).reduce((sum, d) => sum + d.revenue, 0) - 
      dailyData.slice(-37, -30).reduce((sum, d) => sum + d.revenue, 0)) / 
     dailyData.slice(-37, -30).reduce((sum, d) => sum + d.revenue, 0)) * 100 : 0;
  
  return {
    daily: dailyGrowth,
    weekly: weeklyGrowth,
    monthly: monthlyGrowth
  };
}

// Predictive Inventory Analytics
export async function getPredictiveInventory() {
  // Get product data with current stock
  const { data: products } = await supabase
    .from('products')
    .select('id, name, stock_quantity, cost_price, price, category_id, categories(name)');
  
  // Get sales data for the last 30 days to calculate velocity
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const { data: orders } = await supabase
    .from('orders')
    .select('id, status, created_at')
    .gte('created_at', thirtyDaysAgo.toISOString());
  
  const completedOrderIds = (orders || [])
    .filter(o => isCompletedStatus(o.status))
    .map(o => o.id);
  
  if (completedOrderIds.length === 0) return [];
  
  const { data: items } = await supabase
    .from('order_items')
    .select('product_id, quantity')
    .in('order_id', completedOrderIds);
  
  // Calculate sales velocity per product
  const salesByProduct = new Map<string, number>();
  for (const item of items || []) {
    if (!item.product_id) continue;
    salesByProduct.set(item.product_id, (salesByProduct.get(item.product_id) || 0) + (item.quantity || 0));
  }
  
  // Generate predictions for each product
  const predictions = (products || []).map(product => {
    const soldLast30Days = salesByProduct.get(product.id) || 0;
    const dailyVelocity = soldLast30Days / 30;
    const currentStock = product.stock_quantity || 0;
    
    // Predict days until stockout
    const daysUntilStockout = dailyVelocity > 0 ? Math.floor(currentStock / dailyVelocity) : 999;
    
    // Predict reorder point (30 days of stock at current velocity)
    const reorderPoint = Math.ceil(dailyVelocity * 30);
    const shouldReorder = currentStock <= reorderPoint;
    
    // Predict optimal order quantity (90 days of stock)
    const optimalOrderQty = Math.ceil(dailyVelocity * 90);
    
    // Risk assessment
    let riskLevel = 'Low';
    if (daysUntilStockout <= 7) riskLevel = 'Critical';
    else if (daysUntilStockout <= 14) riskLevel = 'High';
    else if (daysUntilStockout <= 30) riskLevel = 'Medium';
    
    return {
      id: product.id,
      name: product.name,
      category: (product as any).categories?.name || 'Uncategorized',
      currentStock,
      dailyVelocity,
      daysUntilStockout,
      reorderPoint,
      shouldReorder,
      optimalOrderQty,
      riskLevel,
      costPrice: product.cost_price || 0,
      retailPrice: product.price || 0,
      potentialLostSales: dailyVelocity * 30 * (product.price || 0) // 30 days of potential lost sales
    };
  });
  
  // Sort by risk level and days until stockout
  const critical = predictions.filter(p => p.riskLevel === 'Critical').sort((a, b) => a.daysUntilStockout - b.daysUntilStockout);
  const high = predictions.filter(p => p.riskLevel === 'High').sort((a, b) => a.daysUntilStockout - b.daysUntilStockout);
  const medium = predictions.filter(p => p.riskLevel === 'Medium').sort((a, b) => a.daysUntilStockout - b.daysUntilStockout);
  const low = predictions.filter(p => p.riskLevel === 'Low').sort((a, b) => a.daysUntilStockout - b.daysUntilStockout);
  
  return {
    all: predictions,
    critical,
    high,
    medium,
    low,
    summary: {
      totalProducts: predictions.length,
      criticalCount: critical.length,
      highCount: high.length,
      mediumCount: medium.length,
      lowCount: low.length,
      totalPotentialLostSales: predictions.reduce((sum, p) => sum + p.potentialLostSales, 0),
      avgDaysUntilStockout: predictions.reduce((sum, p) => sum + p.daysUntilStockout, 0) / predictions.length
    }
  };
}


