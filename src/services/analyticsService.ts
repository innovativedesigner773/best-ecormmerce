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
  const isoString = start.toISOString();
  // Debug logging
  if (process.env.NODE_ENV === 'development') {
    console.log('📅 getRangeStart:', { range, start: isoString, now: now.toISOString() });
  }
  return isoString;
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
      .select("id, total, status, created_at")
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
  const grossSales = orders.reduce((sum, o) => sum + Number(o.total ?? 0), 0);
  let sales = completedOrders.reduce((sum, o) => sum + Number(o.total ?? 0), 0);
  
  // Debug logging
  if (process.env.NODE_ENV === 'development') {
    console.log('📊 getSummary:', { 
      range, 
      since, 
      totalOrders: orders.length, 
      completedOrders: completedOrders.length,
      grossSales,
      sales 
    });
  }

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
    .select("id, total, status, created_at")
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
    entry.revenue += Number(r.total ?? 0);
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
    .select('id, status, subtotal, tax_amount, shipping_amount, discount_amount, total, created_at')
    .gte('created_at', since);
  if (error) throw error;

  const completed = (orders || []).filter(o => isCompletedStatus(o.status));
  const sum = (arr: any[], key: string) => arr.reduce((s, o) => s + Number(o[key] || 0), 0);
  const subtotal = sum(completed, 'subtotal');
  const tax = sum(completed, 'tax_amount');
  const shipping = sum(completed, 'shipping_amount');
  const discount = sum(completed, 'discount_amount');
  const total = sum(completed, 'total');

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
  const active = all.filter(p => (p as any).is_active === true).length;
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
    .select('id, status, total, customer_id, customer_email, created_at')
    .gte('created_at', since);
  if (error) throw error;
  const completed = (orders || []).filter(o => isCompletedStatus(o.status));
  const map = new Map<string, { id: string; name: string; email: string; total: number; orders: number }>();
  for (const o of completed) {
    const key = o.customer_id || o.customer_email || 'unknown';
    const rec = map.get(key) || { id: key, name: '', email: o.customer_email || '', total: 0, orders: 0 };
    rec.total += Number(o.total ?? 0);
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
      .select('id, status, total, customer_id, created_at')
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
  const revenue = completed.reduce((s, o) => s + Number(o.total ?? 0), 0);
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

// Sales mix analytics using existing fields only
export async function getSalesMix(range: TimeRange) {
  const since = getRangeStart(range);
  // Pull orders in range with commonly available columns
  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, status, created_at, total, channel, payment_method, customer_id, customer_email')
    .gte('created_at', since);
  if (error) throw error;

  const completed = (orders || []).filter(o => isCompletedStatus(o.status));

  // Helper to amount
  const getAmount = (o: any) => Number(o.total ?? 0);

  // Channel split (fallback to 'online' when missing)
  const channelAgg = new Map<string, { revenue: number; orders: number }>();
  for (const o of completed) {
    const key = (o as any).channel || 'online';
    const rec = channelAgg.get(key) || { revenue: 0, orders: 0 };
    rec.revenue += getAmount(o);
    rec.orders += 1;
    channelAgg.set(key, rec);
  }

  // Payment method split (fallback to 'unknown')
  const payAgg = new Map<string, { revenue: number; orders: number }>();
  for (const o of completed) {
    const key = (o as any).payment_method || 'unknown';
    const rec = payAgg.get(key) || { revenue: 0, orders: 0 };
    rec.revenue += getAmount(o);
    rec.orders += 1;
    payAgg.set(key, rec);
  }

  // New vs returning revenue based on presence of multiple orders per customer_id/email within range
  const keyOf = (o: any) => o.customer_id || o.customer_email || `anon-${o.id}`;
  const byCustomer = new Map<string, Array<any>>();
  for (const o of completed) {
    const k = keyOf(o);
    const arr = byCustomer.get(k) || [];
    arr.push(o);
    byCustomer.set(k, arr);
  }
  let newRevenue = 0;
  let returningRevenue = 0;
  let newOrders = 0;
  let returningOrders = 0;
  for (const [, arr] of byCustomer) {
    // Sort by created_at to identify first order in range
    arr.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    if (arr.length) {
      newRevenue += getAmount(arr[0]);
      newOrders += 1;
      for (let i = 1; i < arr.length; i++) {
        returningRevenue += getAmount(arr[i]);
        returningOrders += 1;
      }
    }
  }

  // Shape outputs
  const channel = Array.from(channelAgg.entries()).map(([name, v]) => ({ name, revenue: v.revenue, orders: v.orders }));
  const payments = Array.from(payAgg.entries()).map(([name, v]) => ({ name, revenue: v.revenue, orders: v.orders }));
  const newVsReturning = { new: { revenue: newRevenue, orders: newOrders }, returning: { revenue: returningRevenue, orders: returningOrders } };

  // Totals for percentages
  const totalRevenue = completed.reduce((s, o) => s + getAmount(o), 0);
  const totalOrders = completed.length;

  return {
    channel,
    payments,
    newVsReturning,
    totals: { revenue: totalRevenue, orders: totalOrders }
  };
}

// Comprehensive Product Analytics from products table
export async function getProductAnalytics(range: TimeRange) {
  const since = getRangeStart(range);
  
  // Get all products with their details
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('id, name, price, cost_price, stock_quantity, category_id, is_active, created_at, updated_at, categories(name)');
  
  if (productsError) throw productsError;
  
  // Get completed orders in range for sales data
  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('id, status, created_at')
    .gte('created_at', since);
  
  if (ordersError) throw ordersError;
  
  const completedOrderIds = (orders || [])
    .filter(o => isCompletedStatus(o.status))
    .map(o => o.id);
  
  // Get order items for completed orders
  let orderItems: any[] = [];
  if (completedOrderIds.length > 0) {
    const { data: items, error: itemsError } = await supabase
      .from('order_items')
      .select('product_id, quantity, unit_price, total_price')
      .in('order_id', completedOrderIds);
    
    if (itemsError) throw itemsError;
    orderItems = items || [];
  }
  
  // Calculate product performance metrics
  const productStats = new Map<string, {
    id: string;
    name: string;
    category: string;
    price: number;
    costPrice: number;
    currentStock: number;
    isActive: boolean;
    totalSold: number;
    totalRevenue: number;
    profitMargin: number;
    stockTurnover: number;
    daysSinceCreated: number;
    daysSinceUpdated: number;
  }>();
  
  // Initialize all products
  for (const product of products || []) {
    const categoryName = (product as any).categories?.name || 'Uncategorized';
    const daysSinceCreated = Math.floor((Date.now() - new Date(product.created_at).getTime()) / (1000 * 60 * 60 * 24));
    const daysSinceUpdated = Math.floor((Date.now() - new Date(product.updated_at).getTime()) / (1000 * 60 * 60 * 24));
    
    productStats.set(product.id, {
      id: product.id,
      name: product.name,
      category: categoryName,
      price: product.price || 0,
      costPrice: product.cost_price || 0,
      currentStock: product.stock_quantity || 0,
      isActive: product.is_active || false,
      totalSold: 0,
      totalRevenue: 0,
      profitMargin: 0,
      stockTurnover: 0,
      daysSinceCreated,
      daysSinceUpdated
    });
  }
  
  // Aggregate sales data
  for (const item of orderItems) {
    const product = productStats.get(item.product_id);
    if (product) {
      product.totalSold += item.quantity || 0;
      product.totalRevenue += Number(item.total_price || (item.unit_price || 0) * (item.quantity || 0));
    }
  }
  
  // Calculate derived metrics
  const allProducts = Array.from(productStats.values()).map(product => {
    product.profitMargin = product.costPrice > 0 ? 
      ((product.price - product.costPrice) / product.price) * 100 : 0;
    product.stockTurnover = product.currentStock > 0 ? 
      product.totalSold / product.currentStock : 0;
    return product;
  });
  
  // Categorize products
  const topSellers = allProducts
    .filter(p => p.isActive)
    .sort((a, b) => b.totalSold - a.totalSold)
    .slice(0, 10);
    
  const topRevenue = allProducts
    .filter(p => p.isActive)
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, 10);
    
  const lowStock = allProducts
    .filter(p => p.isActive && p.currentStock <= 5)
    .sort((a, b) => a.currentStock - b.currentStock);
    
  const outOfStock = allProducts
    .filter(p => p.isActive && p.currentStock === 0);
    
  const inactiveProducts = allProducts
    .filter(p => !p.isActive);
    
  const highMargin = allProducts
    .filter(p => p.isActive && p.profitMargin > 50)
    .sort((a, b) => b.profitMargin - a.profitMargin);
    
  const slowMoving = allProducts
    .filter(p => p.isActive && p.totalSold === 0 && p.daysSinceCreated > 30)
    .sort((a, b) => b.daysSinceCreated - a.daysSinceCreated);
  
  // Summary statistics
  const totalProducts = allProducts.length;
  const activeProducts = allProducts.filter(p => p.isActive).length;
  const totalInventoryValue = allProducts.reduce((sum, p) => sum + (p.price * p.currentStock), 0);
  const totalCostValue = allProducts.reduce((sum, p) => sum + (p.costPrice * p.currentStock), 0);
  const avgProfitMargin = allProducts.length > 0 ? 
    allProducts.reduce((sum, p) => sum + p.profitMargin, 0) / allProducts.length : 0;
  
  return {
    summary: {
      totalProducts,
      activeProducts,
      inactiveProducts: inactiveProducts.length,
      totalInventoryValue,
      totalCostValue,
      avgProfitMargin,
      lowStockCount: lowStock.length,
      outOfStockCount: outOfStock.length,
      slowMovingCount: slowMoving.length
    },
    topSellers,
    topRevenue,
    lowStock,
    outOfStock,
    inactiveProducts,
    highMargin,
    slowMoving,
    allProducts
  };
}

// User Analytics from user_profiles table
export async function getUserAnalytics(range: TimeRange) {
  const since = getRangeStart(range);
  
  // Get all users
  const { data: users, error: usersError } = await supabase
    .from('user_profiles')
    .select('id, first_name, last_name, email, role, created_at, updated_at');
  
  if (usersError) throw usersError;
  
  // Get user registration trends
  const userRegistrations = (users || []).map(user => ({
    id: user.id,
    name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Unknown',
    email: user.email,
    role: user.role,
    created_at: user.created_at,
    daysSinceRegistration: Math.floor((Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24))
  })).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  
  // Get users who registered in the selected period
  const newUsers = userRegistrations.filter(user => 
    new Date(user.created_at) >= new Date(since)
  );
  
  // Get users who registered in the previous period for growth calculation
  const previousSince = new Date(since);
  const previousStart = new Date(previousSince);
  previousStart.setMonth(previousStart.getMonth() - 1);
  
  const previousUsers = userRegistrations.filter(user => 
    new Date(user.created_at) >= previousStart && 
    new Date(user.created_at) < previousSince
  );
  
  // Group by role
  const usersByRole = new Map<string, number>();
  for (const user of users || []) {
    const role = user.role || 'customer';
    usersByRole.set(role, (usersByRole.get(role) || 0) + 1);
  }
  
  // Get customer order data for engagement analysis
  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('customer_id, status, created_at, total')
    .gte('created_at', since);
  
  if (ordersError) throw ordersError;
  
  const completedOrders = (orders || []).filter(o => isCompletedStatus(o.status));
  
  // Calculate customer engagement metrics
  const customerEngagement = new Map<string, {
    customerId: string;
    totalOrders: number;
    totalSpent: number;
    lastOrderDate: string;
    avgOrderValue: number;
    daysSinceLastOrder: number;
  }>();
  
  for (const order of completedOrders) {
    const customerId = order.customer_id;
    if (!customerId) continue;
    
    const existing = customerEngagement.get(customerId) || {
      customerId,
      totalOrders: 0,
      totalSpent: 0,
      lastOrderDate: order.created_at,
      avgOrderValue: 0,
      daysSinceLastOrder: 0
    };
    
    existing.totalOrders += 1;
    existing.totalSpent += Number(order.total ?? 0);
    existing.lastOrderDate = existing.lastOrderDate > order.created_at ? existing.lastOrderDate : order.created_at;
    
    customerEngagement.set(customerId, existing);
  }
  
  // Calculate averages and days since last order
  const engagementData = Array.from(customerEngagement.values()).map(customer => {
    customer.avgOrderValue = customer.totalOrders > 0 ? customer.totalSpent / customer.totalOrders : 0;
    customer.daysSinceLastOrder = Math.floor((Date.now() - new Date(customer.lastOrderDate).getTime()) / (1000 * 60 * 60 * 24));
    return customer;
  });
  
  // Categorize customers
  const activeCustomers = engagementData.filter(c => c.daysSinceLastOrder <= 30);
  const atRiskCustomers = engagementData.filter(c => c.daysSinceLastOrder > 30 && c.daysSinceLastOrder <= 90);
  const inactiveCustomers = engagementData.filter(c => c.daysSinceLastOrder > 90);
  const highValueCustomers = engagementData
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 10);
  
  // Calculate growth rates
  const userGrowthRate = previousUsers.length > 0 ? 
    ((newUsers.length - previousUsers.length) / previousUsers.length) * 100 : 0;
  
  return {
    summary: {
      totalUsers: users?.length || 0,
      newUsers: newUsers.length,
      userGrowthRate,
      activeCustomers: activeCustomers.length,
      atRiskCustomers: atRiskCustomers.length,
      inactiveCustomers: inactiveCustomers.length,
      avgOrdersPerCustomer: engagementData.length > 0 ? 
        engagementData.reduce((sum, c) => sum + c.totalOrders, 0) / engagementData.length : 0,
      avgSpentPerCustomer: engagementData.length > 0 ? 
        engagementData.reduce((sum, c) => sum + c.totalSpent, 0) / engagementData.length : 0
    },
    usersByRole: Array.from(usersByRole.entries()).map(([role, count]) => ({ role, count })),
    recentRegistrations: newUsers.slice(0, 10),
    highValueCustomers,
    activeCustomers,
    atRiskCustomers,
    inactiveCustomers,
    allEngagement: engagementData
  };
}

// Order Analytics from orders table
export async function getOrderAnalytics(range: TimeRange) {
  const since = getRangeStart(range);
  
  // Get all orders in range
  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('id, order_number, status, payment_status, created_at, updated_at, total, customer_id, customer_email, subtotal, tax_amount, shipping_amount, discount_amount, channel, payment_method');
  
  if (ordersError) throw ordersError;
  
  const ordersInRange = (orders || []).filter(o => new Date(o.created_at) >= new Date(since));
  const completedOrders = ordersInRange.filter(o => isCompletedStatus(o.status));
  
  // Order status distribution
  const statusDistribution = new Map<string, number>();
  for (const order of ordersInRange) {
    const status = order.status || 'unknown';
    statusDistribution.set(status, (statusDistribution.get(status) || 0) + 1);
  }
  
  // Payment status distribution
  const paymentStatusDistribution = new Map<string, number>();
  for (const order of ordersInRange) {
    const paymentStatus = order.payment_status || 'unknown';
    paymentStatusDistribution.set(paymentStatus, (paymentStatusDistribution.get(paymentStatus) || 0) + 1);
  }
  
  // Order value analysis
  const orderValues = completedOrders.map(o => Number(o.total ?? 0));
  const totalRevenue = orderValues.reduce((sum, val) => sum + val, 0);
  const avgOrderValue = orderValues.length > 0 ? totalRevenue / orderValues.length : 0;
  const minOrderValue = orderValues.length > 0 ? Math.min(...orderValues) : 0;
  const maxOrderValue = orderValues.length > 0 ? Math.max(...orderValues) : 0;
  
  // Order value ranges
  const valueRanges = {
    under100: orderValues.filter(v => v < 100).length,
    between100500: orderValues.filter(v => v >= 100 && v < 500).length,
    between5001000: orderValues.filter(v => v >= 500 && v < 1000).length,
    over1000: orderValues.filter(v => v >= 1000).length
  };
  
  // Daily order trends
  const dailyOrders = new Map<string, { orders: number; revenue: number }>();
  for (const order of completedOrders) {
    const date = order.created_at.slice(0, 10);
    const existing = dailyOrders.get(date) || { orders: 0, revenue: 0 };
    existing.orders += 1;
    existing.revenue += Number(order.total ?? 0);
    dailyOrders.set(date, existing);
  }
  
  const dailyTrends = Array.from(dailyOrders.entries())
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => a.date.localeCompare(b.date));
  
  // Order processing time analysis
  const processingTimes = completedOrders
    .filter(o => o.updated_at)
    .map(o => {
      const created = new Date(o.created_at);
      const updated = new Date(o.updated_at);
      return Math.floor((updated.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)); // days
    });
  
  const avgProcessingTime = processingTimes.length > 0 ? 
    processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length : 0;
  
  // Channel analysis
  const channelDistribution = new Map<string, { orders: number; revenue: number }>();
  for (const order of completedOrders) {
    const channel = (order as any).channel || 'online';
    const existing = channelDistribution.get(channel) || { orders: 0, revenue: 0 };
    existing.orders += 1;
    existing.revenue += Number(order.total ?? 0);
    channelDistribution.set(channel, existing);
  }
  
  // Payment method analysis
  const paymentMethodDistribution = new Map<string, { orders: number; revenue: number }>();
  for (const order of completedOrders) {
    const method = (order as any).payment_method || 'unknown';
    const existing = paymentMethodDistribution.get(method) || { orders: 0, revenue: 0 };
    existing.orders += 1;
    existing.revenue += Number(order.total ?? 0);
    paymentMethodDistribution.set(method, existing);
  }
  
  // Recent orders
  const recentOrders = ordersInRange
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 10);
  
  return {
    summary: {
      totalOrders: ordersInRange.length,
      completedOrders: completedOrders.length,
      completionRate: ordersInRange.length > 0 ? (completedOrders.length / ordersInRange.length) * 100 : 0,
      totalRevenue,
      avgOrderValue,
      minOrderValue,
      maxOrderValue,
      avgProcessingTime,
      pendingOrders: ordersInRange.filter(o => o.status === 'pending').length,
      cancelledOrders: ordersInRange.filter(o => o.status === 'cancelled').length
    },
    statusDistribution: Array.from(statusDistribution.entries()).map(([status, count]) => ({ status, count })),
    paymentStatusDistribution: Array.from(paymentStatusDistribution.entries()).map(([status, count]) => ({ status, count })),
    valueRanges,
    dailyTrends,
    channelDistribution: Array.from(channelDistribution.entries()).map(([channel, data]) => ({ channel, ...data })),
    paymentMethodDistribution: Array.from(paymentMethodDistribution.entries()).map(([method, data]) => ({ method, ...data })),
    recentOrders
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
    .select('customer_id, customer_email, total, status, created_at')
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
    existing.totalSpent += Number(order.total ?? 0);
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
    .select('id, total, status, created_at')
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
    const amount = Number(order.total ?? 0);
    
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


