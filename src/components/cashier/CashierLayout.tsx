import React from 'react';
import CashierNavbar from './CashierNavbar';
import ErrorBoundary from '../common/ErrorBoundary';
import OfflineIndicator from '../common/OfflineIndicator';
import ServerStatusBanner from '../common/ServerStatusBanner';
import DatabaseStatusBanner from '../common/DatabaseStatusBanner';

interface CashierLayoutProps {
  children: React.ReactNode;
}

export default function CashierLayout({ children }: CashierLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <ErrorBoundary>
        <CashierNavbar />
        <OfflineIndicator />
        <ServerStatusBanner />
        <DatabaseStatusBanner />
        
        <main className="min-h-screen">
          {children}
        </main>
      </ErrorBoundary>
    </div>
  );
}
