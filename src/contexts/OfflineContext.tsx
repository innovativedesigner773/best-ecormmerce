import React, { createContext, useContext, useEffect, useState } from 'react';
import { offlineManager, useOfflineStatus, OfflineStore } from '../utils/offline-manager';
import { toast } from 'sonner';

interface OfflineContextType {
  isOnline: boolean;
  isOffline: boolean;
  syncStatus: 'idle' | 'syncing' | 'error';
  lastSync: Date | null;
  initializeOfflineData: () => void;
  clearOfflineData: () => void;
  getOfflineData: <T>(key: keyof OfflineStore) => T[];
  setOfflineData: <T>(key: keyof OfflineStore, data: T[]) => void;
  addToSyncQueue: (action: string, data: any) => void;
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  const { isOnline, isOffline } = useOfflineStatus();
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error'>('idle');
  const [lastSync, setLastSync] = useState<Date | null>(null);

  useEffect(() => {
    // Initialize offline data on first load
    offlineManager.initializeMockData();
    
    // Load last sync timestamp
    const lastSyncStr = localStorage.getItem('best-brightness-offline-lastSync');
    if (lastSyncStr) {
      setLastSync(new Date(lastSyncStr));
    }
  }, []);

  useEffect(() => {
    if (isOnline && syncStatus === 'idle') {
      // Auto-sync when coming back online
      const syncQueue = JSON.parse(localStorage.getItem('best-brightness-sync-queue') || '[]');
      if (syncQueue.length > 0) {
        setSyncStatus('syncing');
        // Simulate sync process
        setTimeout(() => {
          setSyncStatus('idle');
          setLastSync(new Date());
        }, 2000);
      }
    }
  }, [isOnline, syncStatus]);

  const initializeOfflineData = () => {
    offlineManager.initializeMockData();
    toast.success('📦 Offline data initialized');
  };

  const clearOfflineData = () => {
    offlineManager.clearOfflineData();
    setLastSync(null);
  };

  const getOfflineData = <T,>(key: keyof OfflineStore): T[] => {
    return offlineManager.getOfflineData<T>(key);
  };

  const setOfflineData = <T,>(key: keyof OfflineStore, data: T[]) => {
    offlineManager.setOfflineData(key, data);
    setLastSync(new Date());
  };

  const addToSyncQueue = (action: string, data: any) => {
    offlineManager.addToSyncQueue(action, data);
  };

  const value: OfflineContextType = {
    isOnline,
    isOffline,
    syncStatus,
    lastSync,
    initializeOfflineData,
    clearOfflineData,
    getOfflineData,
    setOfflineData,
    addToSyncQueue
  };

  return (
    <OfflineContext.Provider value={value}>
      {children}
    </OfflineContext.Provider>
  );
}

export function useOffline(): OfflineContextType {
  const context = useContext(OfflineContext);
  if (context === undefined) {
    throw new Error('useOffline must be used within an OfflineProvider');
  }
  return context;
}