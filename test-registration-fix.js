// Test Registration Fix
// Run this in your browser console after applying the SQL fix

console.log('🧪 Testing Registration Fix...');

// Test function to verify registration works
async function testRegistration() {
  try {
    console.log('📝 Testing registration with test data...');
    
    // Test data
    const testData = {
      email: `test-${Date.now()}@example.com`,
      password: 'TestPassword123!',
      firstName: 'Test',
      lastName: 'User',
      userType: 'customer'
    };
    
    console.log('📤 Test registration data:', testData);
    
    // This would normally call your registration function
    // For now, just log that we're ready to test
    console.log('✅ Registration test ready - try registering with the form now!');
    console.log('📧 Use this test email:', testData.email);
    
    return true;
  } catch (error) {
    console.error('❌ Registration test failed:', error);
    return false;
  }
}

// Auto-fill registration form for testing
function fillRegistrationForm() {
  const testData = {
    email: `test-${Date.now()}@example.com`,
    password: 'TestPassword123!',
    firstName: 'Test',
    lastName: 'User'
  };
  
  // Try to find and fill form fields
  const emailField = document.querySelector('input[type="email"]');
  const passwordField = document.querySelector('input[type="password"]');
  const firstNameField = document.querySelector('input[name="firstName"], input[placeholder*="First name"]');
  const lastNameField = document.querySelector('input[name="lastName"], input[placeholder*="Last name"]');
  
  if (emailField) {
    emailField.value = testData.email;
    emailField.dispatchEvent(new Event('input', { bubbles: true }));
  }
  
  if (passwordField) {
    passwordField.value = testData.password;
    passwordField.dispatchEvent(new Event('input', { bubbles: true }));
  }
  
  if (firstNameField) {
    firstNameField.value = testData.firstName;
    firstNameField.dispatchEvent(new Event('input', { bubbles: true }));
  }
  
  if (lastNameField) {
    lastNameField.value = testData.lastName;
    lastNameField.dispatchEvent(new Event('input', { bubbles: true }));
  }
  
  console.log('📝 Form auto-filled with test data');
  console.log('📧 Test email:', testData.email);
  console.log('🔑 Test password:', testData.password);
}

// Make functions available globally
window.testRegistration = testRegistration;
window.fillRegistrationForm = fillRegistrationForm;

console.log('✅ Registration test functions loaded!');
console.log('💡 Run testRegistration() to test the registration process');
console.log('💡 Run fillRegistrationForm() to auto-fill the registration form');
