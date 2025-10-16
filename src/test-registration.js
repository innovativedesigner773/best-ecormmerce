// ============================================
// REGISTRATION TEST SCRIPT
// ============================================
// Run this in your browser console (F12) after running the SQL fixes

console.log('🧪 Starting registration test preparation...');

// Step 1: Clear all cached data
console.log('🧹 Clearing all cached data...');

try {
  localStorage.clear();
  sessionStorage.clear();
  console.log('✅ Storage cleared');
} catch (e) {
  console.warn('⚠️ Could not clear storage:', e);
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

// Step 2: Generate test data
const testData = {
  firstName: 'Test',
  lastName: 'User',
  email: `test-${Date.now()}@example.com`,
  password: 'testpass123',
  role: 'customer'
};

console.log('📝 Generated test data:', testData);

// Step 3: Registration test function
window.testRegistration = async function() {
  console.log('🚀 Testing registration with generated data...');
  
  try {
    // Navigate to register page
    if (window.location.pathname !== '/register') {
      console.log('🔄 Navigating to register page...');
      window.location.href = '/register';
      return;
    }
    
    // Fill form fields
    const fillField = (name, value) => {
      const field = document.querySelector(`input[name="${name}"], input[id="${name}"]`);
      if (field) {
        field.value = value;
        field.dispatchEvent(new Event('input', { bubbles: true }));
        field.dispatchEvent(new Event('change', { bubbles: true }));
        console.log(`✅ Filled ${name}: ${value}`);
      } else {
        console.warn(`⚠️ Could not find field: ${name}`);
      }
    };
    
    // Fill all fields
    fillField('firstName', testData.firstName);
    fillField('lastName', testData.lastName);
    fillField('email', testData.email);
    fillField('password', testData.password);
    fillField('confirmPassword', testData.password);
    
    // Handle role selection
    const roleSelector = document.querySelector('select[name="role"], input[value="customer"]');
    if (roleSelector) {
      if (roleSelector.tagName === 'SELECT') {
        roleSelector.value = testData.role;
      } else {
        roleSelector.checked = true;
      }
      roleSelector.dispatchEvent(new Event('change', { bubbles: true }));
      console.log(`✅ Selected role: ${testData.role}`);
    }
    
    // Check terms checkbox
    const termsCheckbox = document.querySelector('input[name="acceptTerms"], input[type="checkbox"]');
    if (termsCheckbox) {
      termsCheckbox.checked = true;
      termsCheckbox.dispatchEvent(new Event('change', { bubbles: true }));
      console.log('✅ Accepted terms');
    }
    
    console.log('📋 Form filled successfully!');
    console.log('🎯 Now click the "Create account" button or call submitForm()');
    
    // Create submit function
    window.submitForm = function() {
      const submitButton = document.querySelector('button[type="submit"], button:contains("Create account")');
      if (submitButton) {
        console.log('🚀 Submitting registration form...');
        submitButton.click();
      } else {
        console.warn('⚠️ Could not find submit button');
      }
    };
    
  } catch (error) {
    console.error('❌ Registration test error:', error);
  }
};

// Step 4: Instructions
console.log('');
console.log('🎉 ============================================');
console.log('🎉 REGISTRATION TEST READY!');
console.log('🎉 ============================================');
console.log('');
console.log('📋 INSTRUCTIONS:');
console.log('1. ✅ Cache cleared - DONE');
console.log('2. 🔄 Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)');
console.log('3. 🧪 Run: testRegistration()');
console.log('4. 📝 Form will be auto-filled with test data');
console.log('5. 🚀 Run: submitForm() to submit the form');
console.log('6. 👀 Watch for success or error messages');
console.log('');
console.log('💡 Test Email: ' + testData.email);
console.log('💡 Test Password: ' + testData.password);
console.log('');
console.log('🔄 Refreshing in 3 seconds...');

// Auto refresh
setTimeout(() => {
  window.location.reload(true);
}, 3000);