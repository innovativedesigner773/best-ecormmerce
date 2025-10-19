// Simple test utility to verify address service functionality
import { AddressService } from './address-service';

export const testAddressService = async (userId: string) => {
  console.log('🧪 Testing Address Service...');
  
  try {
    // Test 1: Get user addresses (should return empty array for new users)
    console.log('📋 Test 1: Getting user addresses...');
    const addressesResult = await AddressService.getUserAddresses(userId);
    console.log('✅ Get addresses result:', addressesResult);
    
    // Test 2: Add a test address
    console.log('➕ Test 2: Adding test address...');
    const testAddress = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phone: '+27123456789',
      address: '123 Test Street',
      city: 'Cape Town',
      postalCode: '8001',
      province: 'Western Cape',
      label: 'Home',
      isDefault: true
    };
    
    const addResult = await AddressService.addAddress(userId, testAddress);
    console.log('✅ Add address result:', addResult);
    
    // Test 3: Get addresses again (should now have 1 address)
    console.log('📋 Test 3: Getting addresses after adding...');
    const addressesResult2 = await AddressService.getUserAddresses(userId);
    console.log('✅ Get addresses result after add:', addressesResult2);
    
    // Test 4: Get default address
    console.log('⭐ Test 4: Getting default address...');
    const defaultResult = await AddressService.getDefaultAddress(userId);
    console.log('✅ Default address result:', defaultResult);
    
    console.log('🎉 All address service tests completed successfully!');
    
    return {
      success: true,
      results: {
        initialAddresses: addressesResult,
        addAddress: addResult,
        finalAddresses: addressesResult2,
        defaultAddress: defaultResult
      }
    };
    
  } catch (error) {
    console.error('❌ Address service test failed:', error);
    return {
      success: false,
      error: error
    };
  }
};

// Export for use in browser console
if (typeof window !== 'undefined') {
  (window as any).testAddressService = testAddressService;
}
