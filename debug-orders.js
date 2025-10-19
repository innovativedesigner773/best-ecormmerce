// Debug Orders - Run this in your browser console
console.log('🔍 Debugging Orders Issue...');

// Check localStorage for cached data
console.log('📦 LocalStorage data:');
Object.keys(localStorage).forEach(key => {
  if (key.includes('order') || key.includes('cart') || key.includes('auth')) {
    console.log(`${key}:`, localStorage.getItem(key));
  }
});

// Check if there are any cached orders
const cachedOrders = localStorage.getItem('bb:orders');
if (cachedOrders) {
  console.log('📋 Cached orders found:', JSON.parse(cachedOrders));
} else {
  console.log('📋 No cached orders found');
}

// Clear all cached data
function clearAllCache() {
  console.log('🧹 Clearing all cached data...');
  
  // Clear localStorage
  Object.keys(localStorage).forEach(key => {
    if (key.includes('bb:') || key.includes('best-brightness')) {
      localStorage.removeItem(key);
      console.log(`Cleared: ${key}`);
    }
  });
  
  // Clear sessionStorage
  sessionStorage.clear();
  
  console.log('✅ All cache cleared!');
  console.log('🔄 Please refresh the page and try again');
}

// Test Supabase connection
async function testSupabaseConnection() {
  console.log('🔌 Testing Supabase connection...');
  
  try {
    // This will only work if you have access to the supabase client
    if (window.supabase) {
      const { data, error } = await window.supabase
        .from('orders')
        .select('id, order_number, created_at')
        .limit(5);
      
      if (error) {
        console.error('❌ Supabase error:', error);
      } else {
        console.log('✅ Supabase connection working:', data);
      }
    } else {
      console.log('⚠️ Supabase client not available in window object');
    }
  } catch (err) {
    console.error('❌ Connection test failed:', err);
  }
}

// Make functions available globally
window.clearAllCache = clearAllCache;
window.testSupabaseConnection = testSupabaseConnection;

console.log('💡 Available commands:');
console.log('  - clearAllCache() - Clear all cached data');
console.log('  - testSupabaseConnection() - Test database connection');
console.log('  - Check the Network tab for API calls to /rest/v1/orders');
