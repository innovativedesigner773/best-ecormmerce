/**
 * Test file for ID Generator Utility
 * Run this to see examples of the ID generator in action
 */

import {
  generateUniqueId,
  generateShortId,
  generateCustomLengthId,
  generateReadableId,
  generateMultipleIds,
  extractTimestampFromId,
  validateId,
  ID_PREFIXES,
  IdGeneratorExamples
} from './id-generator';

// Test function to demonstrate all features
export function testIdGenerator() {
  console.log('=== ID Generator Test Results ===\n');
  
  // Test 1: Generate different types of IDs
  console.log('1. Generating different types of IDs:');
  console.log('Order ID:', generateUniqueId('ORDER'));
  console.log('Product ID:', generateShortId('PRODUCT'));
  console.log('User ID:', generateCustomLengthId('USER', 10));
  console.log('Cart ID:', generateReadableId('CART'));
  console.log('Payment IDs (3):', generateMultipleIds('PAYMENT', 3));
  console.log('');
  
  // Test 2: Validate IDs
  console.log('2. Testing ID validation:');
  const testOrderId = generateUniqueId('ORDER');
  console.log(`Testing ID: ${testOrderId}`);
  console.log(`Is valid: ${validateId(testOrderId)}`);
  console.log(`Is valid order ID: ${validateId(testOrderId, 'ORDER')}`);
  console.log(`Extracted timestamp: ${extractTimestampFromId(testOrderId)}`);
  console.log(`Date from timestamp: ${new Date(extractTimestampFromId(testOrderId) || 0)}`);
  console.log('');
  
  // Test 3: Test with different prefixes
  console.log('3. Testing all available prefixes:');
  Object.keys(ID_PREFIXES).forEach(prefix => {
    const id = generateUniqueId(prefix as keyof typeof ID_PREFIXES);
    console.log(`${prefix}: ${id}`);
  });
  console.log('');
  
  // Test 4: Test edge cases
  console.log('4. Testing edge cases:');
  console.log('Invalid ID validation:', validateId('INVALID-ID'));
  console.log('Empty ID validation:', validateId(''));
  console.log('Wrong format validation:', validateId('OD123456'));
  console.log('');
  
  // Test 5: Performance test
  console.log('5. Performance test (generating 1000 IDs):');
  const startTime = Date.now();
  const ids = generateMultipleIds('TRANSACTION', 1000);
  const endTime = Date.now();
  console.log(`Generated 1000 IDs in ${endTime - startTime}ms`);
  console.log(`First 5 IDs: ${ids.slice(0, 5).join(', ')}`);
  console.log(`All unique: ${new Set(ids).size === ids.length}`);
  
  return {
    testOrderId,
    generatedIds: ids,
    performance: endTime - startTime
  };
}

// Auto-run test if this file is executed directly
if (typeof window !== 'undefined') {
  // Browser environment
  (window as any).testIdGenerator = testIdGenerator;
  console.log('ID Generator test loaded. Run testIdGenerator() in console to test.');
} else {
  // Node environment
  testIdGenerator();
}

export default testIdGenerator;
