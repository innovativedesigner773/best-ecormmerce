import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class AnalyticsErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Check if it's a __VITE_PRELOAD__ error or analytics-related error
    if (error.message.includes('__VITE_PRELOAD__') || 
        error.message.includes('analytics') ||
        error.name === 'ReferenceError') {
      console.warn('Analytics error caught by boundary:', error.message);
      return { hasError: true, error };
    }
    
    // For other errors, don't catch them (let them bubble up)
    throw error;
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.warn('Analytics error boundary caught error:', {
      error: error.message,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString()
    });
  }

  render() {
    if (this.state.hasError) {
      // Silently fail for analytics errors - don't show error UI
      console.warn('Analytics functionality disabled due to error');
      return this.props.children;
    }

    return this.props.children;
  }
}

// Hook to safely handle analytics operations
export function useAnalyticsErrorHandler() {
  const safeAnalyticsCall = React.useCallback((analyticsFunction: () => void) => {
    try {
      analyticsFunction();
    } catch (error) {
      if (error instanceof Error && 
          (error.message.includes('__VITE_PRELOAD__') || 
           error.message.includes('analytics'))) {
        console.warn('Analytics call failed, continuing without analytics:', error.message);
      } else {
        // Re-throw non-analytics errors
        throw error;
      }
    }
  }, []);

  return { safeAnalyticsCall };
}

// Global error handler for __VITE_PRELOAD__ issues
export function setupAnalyticsErrorSuppression() {
  const originalConsoleError = console.error;
  
  console.error = (...args) => {
    const message = args.join(' ');
    
    // Suppress __VITE_PRELOAD__ errors
    if (message.includes('__VITE_PRELOAD__') || 
        message.includes('ReferenceError: __VITE_PRELOAD__ is not defined')) {
      console.warn('Suppressed __VITE_PRELOAD__ error:', message);
      return;
    }
    
    // Suppress analytics-related errors
    if (message.includes('Analytics error') && 
        message.includes('failed to load analytics')) {
      console.warn('Suppressed analytics error:', message);
      return;
    }
    
    // Call original console.error for other errors
    originalConsoleError.apply(console, args);
  };
}
