// Test Reports Connection - Run this in browser console
console.log('🧪 Testing Reports Database Connection...');

// Test 1: Check if Supabase client is available
if (typeof window !== 'undefined' && window.supabase) {
  console.log('✅ Supabase client found');
} else {
  console.log('❌ Supabase client not found in window object');
}

// Test 2: Try to fetch orders directly
async function testOrdersConnection() {
  try {
    console.log('🔍 Testing orders table connection...');
    
    // This will only work if you have access to the supabase client
    if (window.supabase) {
      const { data, error } = await window.supabase
        .from('orders')
        .select('id, total, status, created_at')
        .limit(5);
      
      if (error) {
        console.error('❌ Orders query error:', error);
        console.log('🔧 Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
      } else {
        console.log('✅ Orders query successful:', data);
        console.log(`📊 Found ${data?.length || 0} orders`);
      }
    } else {
      console.log('⚠️ Cannot test - Supabase client not available in window');
    }
  } catch (err) {
    console.error('❌ Connection test failed:', err);
  }
}

// Test 3: Check user authentication
async function testAuth() {
  try {
    if (window.supabase) {
      const { data: { user }, error } = await window.supabase.auth.getUser();
      if (error) {
        console.error('❌ Auth error:', error);
      } else {
        console.log('✅ User authenticated:', user?.email || 'No user');
      }
    }
  } catch (err) {
    console.error('❌ Auth test failed:', err);
  }
}

// Run tests
testAuth();
testOrdersConnection();

console.log('💡 If you see errors above, that explains why reports are empty');
console.log('💡 Check the Network tab for 400/401/403 errors when loading reports');
