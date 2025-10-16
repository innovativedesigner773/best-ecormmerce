// ============================================
// TEST FIXED REGISTRATION
// ============================================
// Run this after executing FINAL_DATABASE_FIX.sql

console.log('🧪 Testing Fixed Registration System...');

// Step 1: Complete cache clearing
console.log('🧹 Clearing all browser data...');

// Clear storage
try {
  localStorage.clear();
  sessionStorage.clear();
  console.log('✅ Storage cleared');
} catch (e) {
  console.warn('⚠️ Storage clearing failed:', e);
}

// Clear cookies
document.cookie.split(";").forEach(function(c) { 
  document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
});
console.log('✅ Cookies cleared');

// Clear IndexedDB
if ('indexedDB' in window) {
  const dbNames = ['supabase-auth', 'supabase', 'best-brightness-auth'];
  dbNames.forEach(dbName => {
    const deleteReq = indexedDB.deleteDatabase(dbName);
    deleteReq.onsuccess = () => console.log(`✅ IndexedDB '${dbName}' cleared`);
  });
}

// Step 2: Generate test data for the new schema
const testUsers = [
  {
    firstName: 'Test',
    lastName: 'Consumer',
    email: `test-consumer-${Date.now()}@example.com`,
    password: 'testpass123',
    userType: 'consumer'
  },
  {
    firstName: 'Test',
    lastName: 'Cashier',
    email: `test-cashier-${Date.now()}@example.com`,
    password: 'testpass123',
    userType: 'cashier'
  }
];

console.log('📝 Generated test users:', testUsers);

// Step 3: Function to test registration programmatically
window.testFixedRegistration = async function(userIndex = 0) {
  const testUser = testUsers[userIndex] || testUsers[0];
  
  console.log('🚀 Testing registration with fixed database schema...');
  console.log('👤 Test user:', testUser);
  
  try {
    // Check if we can access the auth context
    if (typeof window.supabase === 'undefined') {
      console.warn('⚠️ Supabase client not available in window');
    }
    
    // Navigate to register page if not already there
    if (window.location.pathname !== '/register') {
      console.log('🔄 Navigating to register page...');
      window.location.href = '/register';
      return;
    }
    
    // Auto-fill the registration form
    const fillField = (selector, value) => {
      const field = document.querySelector(selector);
      if (field) {
        field.value = value;
        field.dispatchEvent(new Event('input', { bubbles: true }));
        field.dispatchEvent(new Event('change', { bubbles: true }));
        console.log(`✅ Filled ${selector}: ${value}`);
        return true;
      } else {
        console.warn(`⚠️ Could not find field: ${selector}`);
        return false;
      }
    };
    
    console.log('📝 Auto-filling registration form...');
    
    // Fill form fields with various selectors
    fillField('input[name="firstName"], input[id="firstName"]', testUser.firstName);
    fillField('input[name="lastName"], input[id="lastName"]', testUser.lastName);  
    fillField('input[name="email"], input[id="email"]', testUser.email);
    fillField('input[name="password"], input[id="password"]', testUser.password);
    fillField('input[name="confirmPassword"], input[id="confirmPassword"]', testUser.password);
    
    // Handle user type selection
    const userTypeSelector = document.querySelector(`input[value="${testUser.userType}"], option[value="${testUser.userType}"]`);
    if (userTypeSelector) {
      if (userTypeSelector.tagName === 'INPUT') {
        userTypeSelector.checked = true;
      } else if (userTypeSelector.tagName === 'OPTION') {
        userTypeSelector.selected = true;
        userTypeSelector.parentElement.value = testUser.userType;
      }
      userTypeSelector.dispatchEvent(new Event('change', { bubbles: true }));
      console.log(`✅ Selected user type: ${testUser.userType}`);
    }
    
    // Accept terms
    const termsCheckbox = document.querySelector('input[name="acceptTerms"], input[type="checkbox"]');
    if (termsCheckbox) {
      termsCheckbox.checked = true;
      termsCheckbox.dispatchEvent(new Event('change', { bubbles: true }));
      console.log('✅ Accepted terms');
    }
    
    console.log('✅ Form auto-filled successfully!');
    console.log('');
    console.log('📋 MANUAL STEPS:');
    console.log('1. Review the auto-filled form');
    console.log('2. Click "Create account" button');
    console.log('3. Watch for success/error messages');
    console.log('4. Check browser console for detailed logs');
    console.log('');
    console.log('💡 Expected Result: Registration should complete without "Database error saving new user"');
    
    // Create submit function for manual testing
    window.submitTestForm = function() {
      const submitButton = document.querySelector('button[type="submit"]');
      if (submitButton) {
        console.log('🚀 Submitting registration form...');
        submitButton.click();
      } else {
        console.warn('⚠️ Could not find submit button');
      }
    };
    
    console.log('');
    console.log('🎯 To submit the form, run: submitTestForm()');
    
  } catch (error) {
    console.error('❌ Registration test error:', error);
  }
};

// Step 4: Test different user types
window.testConsumer = () => testFixedRegistration(0);
window.testCashier = () => testFixedRegistration(1);

// Step 5: Instructions
console.log('');
console.log('🎉 ============================================');
console.log('🎉 FIXED REGISTRATION TEST READY!');
console.log('🎉 ============================================');
console.log('');
console.log('📋 AVAILABLE COMMANDS:');
console.log('• testFixedRegistration() - Test with default consumer');
console.log('• testConsumer() - Test consumer registration');
console.log('• testCashier() - Test cashier registration (needs auth code)');
console.log('• submitTestForm() - Submit the auto-filled form');
console.log('');
console.log('📋 EXPECTED RESULTS AFTER DATABASE FIX:');
console.log('✅ No "Database error saving new user" error');
console.log('✅ userType correctly mapped to role field');
console.log('✅ firstName/lastName mapped to first_name/last_name');
console.log('✅ Consumer gets 100 loyalty points');
console.log('✅ User profile created automatically');
console.log('✅ Email confirmation flow works');
console.log('');
console.log('🔄 Auto-refreshing in 5 seconds to start fresh...');

// Auto refresh after showing instructions
setTimeout(() => {
  window.location.reload(true);
}, 5000);