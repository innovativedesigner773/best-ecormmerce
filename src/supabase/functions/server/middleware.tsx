import { createClient } from "@supabase/supabase-js";
import { createErrorResponse } from "./utils.tsx";

// Initialize Supabase client
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// Rate limiting store (in production, use Redis or similar)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Authentication middleware
export async function authenticateUser(c: any, next: any) {
  try {
    const authHeader = c.req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json(createErrorResponse(
        'Authentication required',
        'Please provide a valid authentication token'
      ), 401);
    }

    const token = authHeader.substring(7);
    
    // Verify JWT with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      console.error('Authentication error:', error);
      return c.json(createErrorResponse(
        'Invalid token',
        'Authentication token is invalid or expired'
      ), 401);
    }

    // Check if user is active
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('Profile fetch error:', profileError);
      return c.json(createErrorResponse(
        'Profile verification failed',
        'Unable to verify user profile'
      ), 500);
    }

    if (userProfile && !userProfile.is_active) {
      return c.json(createErrorResponse(
        'Account disabled',
        'Your account has been disabled. Please contact support.'
      ), 403);
    }

    // Attach user and profile to request
    c.set('user', user);
    c.set('userProfile', userProfile);
    await next();
    
  } catch (error) {
    console.error('Authentication middleware error:', error);
    return c.json(createErrorResponse(
      'Authentication service unavailable',
      'Unable to verify authentication'
    ), 500);
  }
}

// Role-based authorization middleware
export function requireRole(allowedRoles: string[]) {
  return async (c: any, next: any) => {
    try {
      const user = c.get('user');
      const userProfile = c.get('userProfile');
      
      if (!user) {
        return c.json(createErrorResponse(
          'Authentication required',
          'Please log in to access this resource'
        ), 401);
      }

      if (!userProfile) {
        // Try to fetch profile if not already fetched
        const { data: profile, error } = await supabase
          .from('user_profiles')
          .select('role, is_active')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Profile fetch error:', error);
          return c.json(createErrorResponse(
            'Profile verification failed',
            'Unable to verify user permissions'
          ), 500);
        }

        if (!profile.is_active) {
          return c.json(createErrorResponse(
            'Account disabled',
            'Your account has been disabled'
          ), 403);
        }

        c.set('userProfile', profile);
        
        if (!allowedRoles.includes(profile.role)) {
          return c.json(createErrorResponse(
            'Insufficient permissions',
            `This action requires one of the following roles: ${allowedRoles.join(', ')}`
          ), 403);
        }
      } else {
        if (!allowedRoles.includes(userProfile.role)) {
          return c.json(createErrorResponse(
            'Insufficient permissions',
            `This action requires one of the following roles: ${allowedRoles.join(', ')}`
          ), 403);
        }
      }

      await next();

    } catch (error) {
      console.error('Authorization middleware error:', error);
      return c.json(createErrorResponse(
        'Authorization service unavailable',
        'Unable to verify permissions'
      ), 500);
    }
  };
}

// Rate limiting middleware
export function rateLimit(options: {
  windowMs: number;
  max: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
}) {
  return async (c: any, next: any) => {
    try {
      const ip = c.req.header('CF-Connecting-IP') || 
                c.req.header('X-Forwarded-For') || 
                'unknown';
      const key = `${ip}:${c.req.path}`;
      const now = Date.now();
      
      const current = rateLimitStore.get(key);
      
      if (!current || now > current.resetTime) {
        // Reset window
        rateLimitStore.set(key, {
          count: 1,
          resetTime: now + options.windowMs
        });
      } else if (current.count >= options.max) {
        // Rate limit exceeded
        return c.json(createErrorResponse(
          'Rate limit exceeded',
          options.message || 'Too many requests, please try again later',
          {
            retryAfter: Math.ceil((current.resetTime - now) / 1000)
          }
        ), 429);
      } else {
        // Increment count
        current.count++;
        rateLimitStore.set(key, current);
      }
      
      await next();
      
    } catch (error) {
      console.error('Rate limiting error:', error);
      // Don't block request on rate limiting errors
      await next();
    }
  };
}

// Request validation middleware
export function validateRequest(schema: any) {
  return async (c: any, next: any) => {
    try {
      const body = await c.req.json();
      
      // Basic validation function (you can replace with a proper validation library)
      const errors: string[] = [];
      
      for (const [field, rules] of Object.entries(schema)) {
        const value = body[field];
        const fieldRules = rules as any;
        
        if (fieldRules.required && (value === undefined || value === null || value === '')) {
          errors.push(`${field} is required`);
          continue;
        }
        
        if (value !== undefined && value !== null) {
          if (fieldRules.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            errors.push(`${field} must be a valid email address`);
          }
          
          if (fieldRules.minLength && value.length < fieldRules.minLength) {
            errors.push(`${field} must be at least ${fieldRules.minLength} characters`);
          }
          
          if (fieldRules.maxLength && value.length > fieldRules.maxLength) {
            errors.push(`${field} must be no more than ${fieldRules.maxLength} characters`);
          }
          
          if (fieldRules.pattern && !fieldRules.pattern.test(value)) {
            errors.push(`${field} format is invalid`);
          }
        }
      }
      
      if (errors.length > 0) {
        return c.json(createErrorResponse(
          'Validation failed',
          'Please check your input data',
          { errors }
        ), 400);
      }

      c.set('validatedBody', body);
      await next();
      
    } catch (error) {
      console.error('Request validation error:', error);
      return c.json(createErrorResponse(
        'Invalid request',
        'Unable to parse request data'
      ), 400);
    }
  };
}

// Global error handling middleware
export async function errorHandler(error: any, c: any) {
  console.error('Global error:', {
    message: error.message,
    stack: error.stack,
    url: c.req.url,
    method: c.req.method,
    timestamp: new Date().toISOString(),
    userId: c.get('user')?.id || 'anonymous'
  });

  // Supabase specific errors
  if (error.code) {
    switch (error.code) {
      case '23505': // Unique violation
        return c.json(createErrorResponse(
          'Duplicate entry',
          'This record already exists',
          { code: error.code }
        ), 409);
        
      case '23503': // Foreign key violation
        return c.json(createErrorResponse(
          'Invalid reference',
          'Referenced record does not exist',
          { code: error.code }
        ), 400);
        
      case '23502': // Not null violation
        return c.json(createErrorResponse(
          'Missing required field',
          'Required field cannot be empty',
          { code: error.code }
        ), 400);
        
      case 'PGRST116': // No rows found
        return c.json(createErrorResponse(
          'Not found',
          'The requested resource was not found',
          { code: error.code }
        ), 404);
    }
  }

  // Network/timeout errors
  if (error.code === 'ETIMEDOUT' || error.code === 'ECONNRESET') {
    return c.json(createErrorResponse(
      'Service temporarily unavailable',
      'Please try again in a moment',
      { code: error.code }
    ), 503);
  }

  // Default server error
  return c.json(createErrorResponse(
    'Internal server error',
    'An unexpected error occurred',
    Deno.env.get('NODE_ENV') === 'development' ? { stack: error.stack } : undefined
  ), 500);
}

// Security headers middleware
export async function securityHeaders(c: any, next: any) {
  await next();
  
  // Set security headers
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'DENY');
  c.header('X-XSS-Protection', '1; mode=block');
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
}

// CORS middleware with proper configuration
export function corsMiddleware() {
  return async (c: any, next: any) => {
    const origin = c.req.header('Origin');
    const allowedOrigins = [
      'http://localhost:3000',
      'https://localhost:3000',
      // Add your production domains here
    ];
    
    // Set CORS headers
    if (allowedOrigins.includes(origin) || !origin) {
      c.header('Access-Control-Allow-Origin', origin || '*');
    }
    
    c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    c.header('Access-Control-Allow-Credentials', 'true');
    c.header('Access-Control-Max-Age', '86400');
    
    // Handle preflight OPTIONS requests
    if (c.req.method === 'OPTIONS') {
      return new Response(null, { status: 204 });
    }
    
    await next();
  };
}

// Clean up rate limit store periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Clean up every minute

export { supabase };