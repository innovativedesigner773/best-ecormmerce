// ============================================
// FIX REGISTRATION NOW - Complete Solution
// ============================================
// Run this script in browser console AFTER executing COMPREHENSIVE_DATABASE_FIX.sql

console.log('🔧 ============================================');
console.log('🔧 FIX REGISTRATION NOW - STARTING...');
console.log('🔧 ============================================');
console.log('');

// Step 1: Complete Browser Reset
console.log('🧹 STEP 1: Complete browser reset...');

try {
  // Clear all storage
  localStorage.clear();
  sessionStorage.clear();
  console.log('✅ Local and session storage cleared');
  
  // Clear cookies for this domain
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
  
  // Clear service worker caches
  if ('caches' in window) {
    caches.keys().then(names => {
      names.forEach(name => {
        caches.delete(name);
        console.log(`✅ Cache '${name}' cleared`);
      });
    });
  }
  
} catch (error) {
  console.warn('⚠️ Some storage clearing failed:', error);
}

console.log('✅ STEP 1: Browser reset completed');
console.log('');

// Step 2: Registration Test Data
console.log('📝 STEP 2: Preparing registration test data...');

const testUsers = [
  {
    firstName: 'Database',
    lastName: 'Fixed',
    email: `db-fixed-consumer-${Date.now()}@example.com`,
    password: 'testpass123',
    userType: 'consumer'
  },
  {
    firstName: 'Test',
    lastName: 'Cashier',
    email: `db-fixed-cashier-${Date.now()}@example.com`,
    password: 'testpass123',
    userType: 'cashier'
  }
];

console.log('✅ STEP 2: Test data prepared');
console.log('👤 Consumer Test User:', testUsers[0].email);
console.log('👤 Cashier Test User:', testUsers[1].email);
console.log('');

// Step 3: Automated Form Testing
console.log('🤖 STEP 3: Setting up automated form testing...');

window.testDatabaseFix = async function(userIndex = 0) {
  const testUser = testUsers[userIndex] || testUsers[0];
  
  console.log('');
  console.log('🚀 ============================================');
  console.log('🚀 TESTING DATABASE FIX');
  console.log('🚀 ============================================');
  console.log('');
  console.log('📊 Test Details:');
  console.log('  Email:', testUser.email);
  console.log('  User Type:', testUser.userType);
  console.log('  Expected Result: Registration SUCCESS (no database error)');
  console.log('');
  
  // Navigate to register if not already there
  if (window.location.pathname !== '/register') {
    console.log('🔄 Navigating to register page...');
    window.location.href = '/register';
    return;
  }
  
  try {
    // Auto-fill registration form
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
    console.log('');
    
    // Fill basic fields
    fillField('input[name="firstName"], input[id="firstName"]', testUser.firstName);
    fillField('input[name="lastName"], input[id="lastName"]', testUser.lastName);  
    fillField('input[name="email"], input[id="email"]', testUser.email);
    fillField('input[name="password"], input[id="password"]', testUser.password);
    fillField('input[name="confirmPassword"], input[id="confirmPassword"]', testUser.password);
    
    // Handle user type selection - multiple strategies
    console.log(`🎭 Selecting user type: ${testUser.userType}`);
    
    // Try radio button selection
    const userTypeRadio = document.querySelector(`input[value="${testUser.userType}"]`);
    if (userTypeRadio) {
      userTypeRadio.checked = true;
      userTypeRadio.dispatchEvent(new Event('change', { bubbles: true }));
      console.log('✅ User type selected via radio button');
    }
    
    // Try dropdown selection
    const userTypeDropdown = document.querySelector('select');
    if (userTypeDropdown) {
      userTypeDropdown.value = testUser.userType;
      userTypeDropdown.dispatchEvent(new Event('change', { bubbles: true }));
      console.log('✅ User type selected via dropdown');
    }
    
    // Try clicking on role card/button
    const roleCard = document.querySelector(`[data-role="${testUser.userType}"], [data-user-type="${testUser.userType}"]`);
    if (roleCard) {
      roleCard.click();
      console.log('✅ User type selected via role card');
    }
    
    // Accept terms and conditions
    const termsCheckbox = document.querySelector('input[name="acceptTerms"], input[type="checkbox"]');
    if (termsCheckbox && !termsCheckbox.checked) {
      termsCheckbox.checked = true;
      termsCheckbox.dispatchEvent(new Event('change', { bubbles: true }));
      console.log('✅ Terms and conditions accepted');
    }
    
    console.log('');
    console.log('✅ Form auto-filled successfully!');
    console.log('');
    console.log('📋 NEXT STEPS:');
    console.log('1. Review the auto-filled form above');
    console.log('2. Run submitTestForm() to test the registration');
    console.log('3. Watch for SUCCESS (no "Database error saving new user")');
    console.log('');
    
    // Create submit function
    window.submitTestForm = function() {
      console.log('🚀 Submitting registration form...');
      console.log('⏰ Watch for results...');
      console.log('');
      console.log('Expected outcomes:');
      console.log('✅ SUCCESS: Registration completes without database error');
      console.log('✅ SUCCESS: User profile created automatically');
      console.log('✅ SUCCESS: Email confirmation flow works');
      console.log('❌ FAILURE: "Database error saving new user" (database fix needed)');
      console.log('');
      
      const submitButton = document.querySelector('button[type="submit"]');
      if (submitButton) {
        submitButton.click();
      } else {
        console.warn('⚠️ Could not find submit button');
      }
    };
    
    console.log('🎯 Ready to test! Run: submitTestForm()');
    
  } catch (error) {
    console.error('❌ Form auto-fill error:', error);
  }
};

// Step 4: Quick test functions
window.testConsumerFix = () => testDatabaseFix(0);
window.testCashierFix = () => testDatabaseFix(1);

// Step 5: Manual verification helper
window.checkRegistrationStatus = function() {
  console.log('');
  console.log('🔍 ============================================');
  console.log('🔍 REGISTRATION STATUS CHECK');
  console.log('🔍 ============================================');
  console.log('');
  
  // Check current page
  console.log('📍 Current Page:', window.location.pathname);
  
  // Check for success indicators
  const successIndicators = [
    'email confirmed',
    'registration successful',
    'account created',
    'welcome',
    'check your email'
  ];
  
  const errorIndicators = [
    'database error saving new user',
    'registration failed',
    'error occurred',
    'something went wrong'
  ];
  
  const pageContent = document.body.textContent.toLowerCase();
  
  let hasSuccess = successIndicators.some(indicator => pageContent.includes(indicator));
  let hasError = errorIndicators.some(indicator => pageContent.includes(indicator));
  
  if (hasSuccess) {
    console.log('✅ SUCCESS DETECTED: Registration appears to have worked!');
    console.log('✅ Database fix is working correctly');
  } else if (hasError) {
    console.log('❌ ERROR DETECTED: Registration failed');
    console.log('❌ Database fix may need to be re-applied');
  } else {
    console.log('ℹ️ No clear success/error indicators found');
    console.log('ℹ️ Check the page manually for results');
  }
  
  console.log('');
  console.log('🔍 Page Analysis Complete');
};

// Step 6: Display instructions
console.log('✅ STEP 3: Automated testing ready');
console.log('');
console.log('🎉 ============================================');
console.log('🎉 DATABASE FIX TESTING READY!');
console.log('🎉 ============================================');
console.log('');
console.log('📋 AVAILABLE COMMANDS:');
console.log('• testDatabaseFix() - Test consumer registration');
console.log('• testConsumerFix() - Test consumer specifically');
console.log('• testCashierFix() - Test cashier registration');
console.log('• submitTestForm() - Submit the auto-filled form');
console.log('• checkRegistrationStatus() - Check if registration succeeded');
console.log('');
console.log('🚀 QUICK START:');
console.log('1. Run: testConsumerFix()');
console.log('2. Run: submitTestForm()');
console.log('3. Run: checkRegistrationStatus()');
console.log('');
console.log('💡 EXPECTED RESULT AFTER DATABASE FIX:');
console.log('✅ No "Database error saving new user" error');
console.log('✅ Registration completes successfully');
console.log('✅ User profile created with correct field mappings');
console.log('✅ Email confirmation flow works properly');
console.log('');
console.log('🔄 Auto-starting test in 3 seconds...');

// Auto-start the test
setTimeout(() => {
  console.log('🚀 Auto-starting registration test...');
  testConsumerFix();
}, 3000);