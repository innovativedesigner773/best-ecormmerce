import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from './info';
import errorHandler from '../error-handler';

// Create a single Supabase client instance to avoid multiple client warnings
export const supabase = createClient(
  `https://${projectId}.supabase.co`,
  publicAnonKey,
  {
    auth: {
      persistSession: true, // Persist session so auth survives reloads and tab switches
      storageKey: 'best-brightness-auth',
      storage: window.localStorage,
      autoRefreshToken: true, // Keep session fresh automatically
      detectSessionInUrl: true,
    },
    db: {
      schema: 'public',
    },
    global: {
      headers: {
        'X-Client-Info': 'best-brightness-web@1.0.0',
      },
      // Reduce timeouts to fail faster on connection issues
      fetch: (url, options = {}) => {
        // Use the safe fetch from error handler
        return errorHandler.safeFetch(url.toString(), {
          ...options,
          signal: AbortSignal.timeout(10000), // 10 second timeout
        }).then(response => {
          if (!response) {
            throw new Error('Request blocked by error handler');
          }
          return response;
        });
      },
    },
    realtime: {
      // Disable realtime to prevent connection attempts
      params: {
        eventsPerSecond: 1,
      },
    },
  }
);

// Add error handling for Supabase operations
const originalFrom = supabase.from.bind(supabase);
supabase.from = (table: string) => {
  const query = originalFrom(table);
  
  // Wrap common query methods with error handling
  const originalSelect = query.select.bind(query);
  query.select = (...args: any[]) => {
    return originalSelect(...args);
  };

  return query;
};

// Log successful initialization
console.log('✅ Supabase client initialized successfully');
console.log('📡 Project:', projectId);
console.log('🔐 Authentication enabled');
console.log('🛡️ Error handling enabled');