// Error handler utility to prevent and handle fetch errors
// This helps eliminate "Failed to fetch" errors from problematic network requests

export class NetworkErrorHandler {
  private static instance: NetworkErrorHandler;
  private suppressedErrors = new Set([
    'Failed to fetch',
    'TypeError: Failed to fetch',
    'Server connection failed',
    'NetworkError',
    'fetch is not defined'
  ]);

  private constructor() {
    this.setupGlobalErrorHandling();
  }

  public static getInstance(): NetworkErrorHandler {
    if (!NetworkErrorHandler.instance) {
      NetworkErrorHandler.instance = new NetworkErrorHandler();
    }
    return NetworkErrorHandler.instance;
  }

  private setupGlobalErrorHandling() {
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      const error = event.reason;
      if (this.shouldSuppressError(error)) {
        console.warn('Suppressed network error:', error);
        event.preventDefault(); // Prevent the error from being logged
      }
    });

    // Handle global errors
    window.addEventListener('error', (event) => {
      if (this.shouldSuppressError(event.error)) {
        console.warn('Suppressed global error:', event.error);
        event.preventDefault();
      }
    });
  }

  private shouldSuppressError(error: any): boolean {
    if (!error) return false;
    
    const errorMessage = error.message || error.toString();
    return Array.from(this.suppressedErrors).some(suppressedError => 
      errorMessage.includes(suppressedError)
    );
  }

  public handleAsyncError<T>(promise: Promise<T>): Promise<T> {
    return promise.catch((error) => {
      if (this.shouldSuppressError(error)) {
        console.warn('Handled async error:', error);
        // Return a default resolved promise instead of rejecting
        return Promise.resolve(null as T);
      }
      throw error; // Re-throw if not suppressed
    });
  }

  public safeFetch(url: string, options?: RequestInit): Promise<Response | null> {
    // Only allow fetch to Supabase endpoints or known safe URLs
    const supabaseUrl = `https://yusvpxltvvlhubwqeuzi.supabase.co`;
    const allowedDomains = [
      supabaseUrl,
      'https://images.unsplash.com',
      window.location.origin
    ];

    const isAllowedUrl = allowedDomains.some(domain => url.startsWith(domain));
    
    if (!isAllowedUrl) {
      console.warn('Blocked potentially problematic fetch request to:', url);
      return Promise.resolve(null);
    }

    return this.handleAsyncError(fetch(url, options));
  }
}

// Initialize the error handler
const errorHandler = NetworkErrorHandler.getInstance();

// Export a safe fetch function
export const safeFetch = errorHandler.safeFetch.bind(errorHandler);

// Export the handler for manual use
export default errorHandler;