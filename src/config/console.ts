// Suppress specific console errors during development
export function setupConsoleErrorSuppression() {
  if (process.env.NODE_ENV === 'development') {
    const originalError = console.error;
    const originalWarn = console.warn;
    
    console.error = (...args) => {
      const message = args[0];
      if (typeof message === 'string') {
        // Suppress known non-critical errors
        if (
          message.includes('Failed to fetch') ||
          message.includes('TypeError: Failed to fetch') ||
          message.includes('Server connection failed') ||
          message.includes('Server health check failed') ||
          message.includes('NetworkError') ||
          message.includes('fetch')
        ) {
          return; // Suppress these specific errors
        }
      }
      originalError.apply(console, args);
    };

    console.warn = (...args) => {
      const message = args[0];
      if (typeof message === 'string') {
        // Suppress known non-critical warnings
        if (
          message.includes('Server health check failed') ||
          message.includes('Network error')
        ) {
          return; // Suppress these specific warnings
        }
      }
      originalWarn.apply(console, args);
    };
  }
}