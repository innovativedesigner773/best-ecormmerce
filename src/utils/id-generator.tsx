/**
 * Unique ID Generator Utility
 * Converts timestamps to alphanumeric codes with meaningful prefixes
 */

// Base36 character set for encoding (0-9, A-Z)
const BASE36_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

// Meaningful prefixes for different entity types
export const ID_PREFIXES = {
  ORDER: 'OD',           // Order
  PRODUCT: 'PR',         // Product
  USER: 'US',            // User
  CART: 'CT',            // Cart
  PAYMENT: 'PA',         // Payment
  PROMOTION: 'PM',       // Promotion
  STAFF: 'ST',           // Staff
  CUSTOMER: 'CU',        // Customer
  TRANSACTION: 'TX',     // Transaction
  INVENTORY: 'IN',       // Inventory
  CATEGORY: 'CA',        // Category
  SUPPLIER: 'SU',        // Supplier
  REFUND: 'RF',          // Refund
  DISCOUNT: 'DC',        // Discount
  REVIEW: 'RV',          // Review
  NOTIFICATION: 'NT',    // Notification
  SESSION: 'SS',         // Session
  REPORT: 'RP',          // Report
  BACKUP: 'BK',          // Backup
  LOG: 'LG',             // Log
} as const;

export type IDPrefix = keyof typeof ID_PREFIXES;

/**
 * Converts a number to base36 string
 */
function toBase36(num: number): string {
  if (num === 0) return '0';
  
  let result = '';
  while (num > 0) {
    result = BASE36_CHARS[num % 36] + result;
    num = Math.floor(num / 36);
  }
  return result;
}

/**
 * Converts a base36 string back to number
 */
function fromBase36(str: string): number {
  let result = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str[i].toUpperCase();
    const index = BASE36_CHARS.indexOf(char);
    if (index === -1) throw new Error(`Invalid base36 character: ${char}`);
    result = result * 36 + index;
  }
  return result;
}

/**
 * Generates a unique ID with timestamp and random component
 */
export function generateUniqueId(prefix: IDPrefix): string {
  const timestamp = Date.now();
  const randomComponent = Math.floor(Math.random() * 1000); // 0-999
  
  // Convert timestamp to base36 (shorter representation)
  const timestampBase36 = toBase36(timestamp);
  
  // Convert random component to base36
  const randomBase36 = toBase36(randomComponent).padStart(2, '0');
  
  // Combine: prefix + timestamp + random
  return `${ID_PREFIXES[prefix]}-${timestampBase36}${randomBase36}`;
}

/**
 * Generates a shorter unique ID (timestamp only, no random component)
 */
export function generateShortId(prefix: IDPrefix): string {
  const timestamp = Date.now();
  const timestampBase36 = toBase36(timestamp);
  
  return `${ID_PREFIXES[prefix]}-${timestampBase36}`;
}

/**
 * Generates a unique ID with custom length
 */
export function generateCustomLengthId(prefix: IDPrefix, length: number = 8): string {
  const timestamp = Date.now();
  const randomComponent = Math.floor(Math.random() * 10000);
  
  // Create a combined number from timestamp and random
  const combined = timestamp + randomComponent;
  const base36 = toBase36(combined);
  
  // Truncate or pad to desired length
  const id = base36.slice(-length).padStart(length, '0');
  
  return `${ID_PREFIXES[prefix]}-${id}`;
}

/**
 * Extracts timestamp from a generated ID
 */
export function extractTimestampFromId(id: string): number | null {
  try {
    const parts = id.split('-');
    if (parts.length !== 2) return null;
    
    const prefix = parts[0];
    const idPart = parts[1];
    
    // Find the prefix in our mapping
    const prefixKey = Object.keys(ID_PREFIXES).find(
      key => ID_PREFIXES[key as IDPrefix] === prefix
    );
    
    if (!prefixKey) return null;
    
    // Try to extract timestamp (first part before random component)
    // For short IDs, the entire part is timestamp
    if (idPart.length <= 8) {
      return fromBase36(idPart);
    }
    
    // For longer IDs, try to extract the timestamp part
    // This is a heuristic - we'll try different lengths
    for (let i = 6; i <= idPart.length - 2; i++) {
      const timestampPart = idPart.substring(0, i);
      const timestamp = fromBase36(timestampPart);
      
      // Check if this looks like a reasonable timestamp (within last 10 years)
      const now = Date.now();
      const tenYearsAgo = now - (10 * 365 * 24 * 60 * 60 * 1000);
      
      if (timestamp >= tenYearsAgo && timestamp <= now) {
        return timestamp;
      }
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Validates if an ID has the correct format
 */
export function validateId(id: string, expectedPrefix?: IDPrefix): boolean {
  try {
    const parts = id.split('-');
    if (parts.length !== 2) return false;
    
    const prefix = parts[0];
    const idPart = parts[1];
    
    // Check if prefix is valid
    if (expectedPrefix && ID_PREFIXES[expectedPrefix] !== prefix) {
      return false;
    }
    
    // Check if prefix exists in our mapping
    const prefixExists = Object.values(ID_PREFIXES).includes(prefix as any);
    if (!prefixExists) return false;
    
    // Check if ID part contains only valid base36 characters
    const validChars = /^[0-9A-Z]+$/i;
    if (!validChars.test(idPart)) return false;
    
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Generates multiple unique IDs at once
 */
export function generateMultipleIds(prefix: IDPrefix, count: number): string[] {
  const ids: string[] = [];
  const usedIds = new Set<string>();
  
  for (let i = 0; i < count; i++) {
    let id: string;
    let attempts = 0;
    
    // Ensure uniqueness (though very unlikely to have collisions)
    do {
      id = generateUniqueId(prefix);
      attempts++;
    } while (usedIds.has(id) && attempts < 10);
    
    if (attempts >= 10) {
      // Fallback: add index to ensure uniqueness
      id = generateUniqueId(prefix) + `-${i}`;
    }
    
    ids.push(id);
    usedIds.add(id);
  }
  
  return ids;
}

/**
 * Generates a human-readable ID with date component
 */
export function generateReadableId(prefix: IDPrefix): string {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const timestamp = Date.now();
  
  const datePart = `${year}${month}${day}`;
  const timePart = toBase36(timestamp).slice(-4);
  
  return `${ID_PREFIXES[prefix]}-${datePart}-${timePart}`;
}

// Example usage and testing functions
export const IdGeneratorExamples = {
  // Generate different types of IDs
  examples: () => {
    console.log('Order ID:', generateUniqueId('ORDER'));
    console.log('Product ID:', generateShortId('PRODUCT'));
    console.log('User ID:', generateCustomLengthId('USER', 10));
    console.log('Readable ID:', generateReadableId('CART'));
    console.log('Multiple IDs:', generateMultipleIds('PAYMENT', 3));
  },
  
  // Test ID validation
  testValidation: (id: string) => {
    console.log(`ID: ${id}`);
    console.log(`Valid: ${validateId(id)}`);
    console.log(`Timestamp: ${extractTimestampFromId(id)}`);
  }
};

export default {
  generateUniqueId,
  generateShortId,
  generateCustomLengthId,
  generateReadableId,
  generateMultipleIds,
  extractTimestampFromId,
  validateId,
  ID_PREFIXES,
  IdGeneratorExamples
};
