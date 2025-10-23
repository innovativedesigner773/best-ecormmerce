import React from 'react';
import { BrowserRouter as Router, useLocation } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import { FavouritesProvider } from './contexts/FavouritesContext';
import { OfflineProvider } from './contexts/OfflineContext';
import { StockNotificationsProvider } from './contexts/StockNotificationsContext';

// Components
import Navbar from './components/common/Navbar';
import Footer from './components/common/Footer';
import ErrorBoundary from './components/common/ErrorBoundary';
import { OptimizedErrorBoundary } from './components/common/OptimizedErrorBoundary';
import { SystemThemeProvider } from './components/common/SystemThemeProvider';
import DatabaseStatusBanner from './components/common/DatabaseStatusBanner';
import ServerStatusBanner from './components/common/ServerStatusBanner';
import OfflineIndicator from './components/common/OfflineIndicator';
import AppLoading from './components/common/AppLoading';
import AppRoutes from './routes/AppRoutes';
import BotpressIframeChat from './components/common/BotpressIframeChat';
import { useSVGErrorHandler } from './utils/svg-error-handler';
import { startAutomaticProcessing } from './services/notificationQueueService';
import { AnalyticsErrorBoundary, setupAnalyticsErrorSuppression } from './components/common/AnalyticsErrorBoundary';

// Config
import { queryClient } from './config/queryClient';
import { setupConsoleErrorSuppression } from './config/console';

// Setup console error suppression for development
setupConsoleErrorSuppression();
setupAnalyticsErrorSuppression();

function AppContent() {
  const { user, userProfile, loading } = useAuth();
  const [forceLoad, setForceLoad] = React.useState(false);
  const location = useLocation();
  
  // Initialize SVG error handling for the entire app
  useSVGErrorHandler();

  // Start automatic notification processing only when admin user is authenticated
  React.useEffect(() => {
    if (user && userProfile?.role === 'admin' && !loading) {
      console.log('🔄 Starting automatic notification processing for admin user...');
      const stopProcessing = startAutomaticProcessing(30000); // Process every 30 seconds
      
      return () => {
        console.log('🛑 Stopping automatic notification processing...');
        stopProcessing();
      };
    }
  }, [user, userProfile?.role, loading]);

  // Only log App render in development when there are significant changes
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🎯 App Content State Changed:', { 
        user: user?.id || null, 
        emailConfirmed: user?.email_confirmed_at ? 'confirmed' : 'pending',
        userProfile: userProfile?.role || null,
        loading, 
        forceLoad,
        timestamp: new Date().toISOString() 
      });
    }
  }, [user?.id, userProfile?.role, loading, forceLoad]);

  const handleLoadingTimeout = React.useCallback(() => {
    console.log('⚠️ Loading timeout - forcing app to display');
    setForceLoad(true);
  }, []);

  if (loading && !forceLoad) {
    return <AppLoading onTimeout={handleLoadingTimeout} />;
  }

  // Check if we're on a cashier route
  const isCashierRoute = location.pathname.startsWith('/cashier');

  // Don't render the normal layout for cashier routes
  if (isCashierRoute) {
    return (
      <>
        <AppRoutes />
        <Toaster 
          position="top-right" 
          richColors 
          closeButton
          duration={4000}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <OptimizedErrorBoundary>
        <AnalyticsErrorBoundary>
          <Navbar />
          <OfflineIndicator />
          <ServerStatusBanner />
          <DatabaseStatusBanner />
          
          <main className="min-h-screen">
            <AppRoutes />
          </main>

          <Footer />
        </AnalyticsErrorBoundary>
      </OptimizedErrorBoundary>
      
      <Toaster 
        position="top-right" 
        richColors 
        closeButton
        duration={4000}
      />
    </div>
  );
}

export default function App() {
  console.log('🚀 App Component Mounting');
  
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <SystemThemeProvider>
          <OfflineProvider>
            <AuthProvider>
              <ErrorBoundary>
                <CartProvider>
                  <FavouritesProvider>
                    <StockNotificationsProvider>
                      <AppContent />
                      {/* Fallback iframe-based chat to avoid CDN script issues */}
                      <BotpressIframeChat />
                    </StockNotificationsProvider>
                  </FavouritesProvider>
                </CartProvider>
              </ErrorBoundary>
            </AuthProvider>
          </OfflineProvider>
        </SystemThemeProvider>
      </Router>
    </QueryClientProvider>
  );
}