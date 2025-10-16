// Utility functions for Best Brightness E-Commerce Server

// Generate unique order number
export function generateOrderNumber(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 7);
  return `ORD-${timestamp}-${random}`.toUpperCase();
}

// Generate unique product SKU
export function generateSKU(category: string, name: string): string {
  const categoryPrefix = category.substring(0, 3).toUpperCase();
  const namePrefix = name.replace(/[^a-zA-Z0-9]/g, '').substring(0, 5).toUpperCase();
  const timestamp = Date.now().toString(36).substring(-4);
  return `${categoryPrefix}-${namePrefix}-${timestamp}`;
}

// Generate EAN-13 barcode
export function generateBarcode(): string {
  const prefix = '123456'; // Company prefix
  const productCode = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
  const code = prefix + productCode;
  
  // Calculate check digit (simplified)
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(code[i]) * (i % 2 === 0 ? 1 : 3);
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  
  return code + checkDigit;
}

// Validation helpers
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validatePassword(password: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

export function validatePhone(phone: string): boolean {
  // Simple phone validation - can be enhanced based on requirements
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
}

// Sanitization helpers
export function sanitizeString(input: string): string {
  return input.trim().replace(/[<>]/g, '');
}

export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// Error response helpers
export function createErrorResponse(
  error: string,
  message: string,
  details?: any,
  code?: number
) {
  return {
    success: false,
    error,
    message,
    ...(details && { details }),
    ...(code && { code }),
    timestamp: new Date().toISOString()
  };
}

export function createSuccessResponse(
  message: string,
  data?: any,
  meta?: any
) {
  return {
    success: true,
    message,
    ...(data && { data }),
    ...(meta && { meta }),
    timestamp: new Date().toISOString()
  };
}

// Rate limiting helpers
export function getRateLimitKey(ip: string, endpoint: string): string {
  return `rate_limit:${endpoint}:${ip}`;
}

// Sample product data generator (for initial setup only)
export function generateInitialProducts() {
  return [
    {
      id: 'prod-1',
      name: 'Professional All-Purpose Cleaner 5L',
      slug: 'professional-all-purpose-cleaner-5l',
      category_id: 'cat-1',
      price: 24.99,
      compare_at_price: 29.99,
      sku: generateSKU('All-Purpose', 'Professional Cleaner'),
      barcode: generateBarcode(),
      description: 'Heavy-duty all-purpose cleaner suitable for all surfaces. Professional grade formula.',
      images: ['https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?w=400&h=400&fit=crop'],
      stock_quantity: 150,
      status: 'active' as const,
      is_featured: true,
      rating_average: 4.8,
      rating_count: 124
    },
    {
      id: 'prod-2',
      name: 'Heavy Duty Floor Cleaner 2L',
      slug: 'heavy-duty-floor-cleaner-2l',
      category_id: 'cat-2',
      price: 18.99,
      compare_at_price: 22.99,
      sku: generateSKU('Floor', 'Heavy Duty Cleaner'),
      barcode: generateBarcode(),
      description: 'Powerful floor cleaner for industrial and commercial use. Safe on all floor types.',
      images: ['https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=400&h=400&fit=crop'],
      stock_quantity: 89,
      status: 'active' as const,
      is_featured: true,
      rating_average: 4.7,
      rating_count: 89
    },
    {
      id: 'prod-3',
      name: 'Glass & Window Cleaner Kit',
      slug: 'glass-window-cleaner-kit',
      category_id: 'cat-3',
      price: 15.99,
      sku: generateSKU('Glass', 'Window Kit'),
      barcode: generateBarcode(),
      description: 'Complete kit for streak-free glass and window cleaning. Includes spray and cloth.',
      images: ['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop'],
      stock_quantity: 67,
      status: 'active' as const,
      is_featured: true,
      rating_average: 4.9,
      rating_count: 67
    }
  ];
}