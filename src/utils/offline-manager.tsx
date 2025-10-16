import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

export interface OfflineStore {
  products: any[];
  cart: any[];
  favourites: any[];
  userProfiles: any[];
  orders: any[];
  lastSync: string | null;
}

class OfflineManager {
  private isOnline: boolean = navigator.onLine;
  private callbacks: Set<(isOnline: boolean) => void> = new Set();
  private syncQueue: Array<{ action: string; data: any; timestamp: number }> = [];

  constructor() {
    this.initializeEventListeners();
    this.loadSyncQueue();
  }

  private initializeEventListeners() {
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
  }

  private handleOnline = () => {
    this.isOnline = true;
    this.notifyCallbacks();
    toast.success('🌐 Back online! Syncing data...', {
      duration: 3000
    });
    this.processSyncQueue();
  };

  private handleOffline = () => {
    this.isOnline = false;
    this.notifyCallbacks();
    toast.warning('📱 Working offline. Changes will sync when online.', {
      duration: 5000
    });
  };

  private notifyCallbacks() {
    this.callbacks.forEach(callback => callback(this.isOnline));
  }

  public subscribe(callback: (isOnline: boolean) => void): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  public getOnlineStatus(): boolean {
    return this.isOnline;
  }

  // Local Storage Management
  public getOfflineData<T>(key: keyof OfflineStore): T[] {
    try {
      const data = localStorage.getItem(`best-brightness-offline-${key}`);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.warn(`Failed to get offline data for ${key}:`, error);
      return [];
    }
  }

  public setOfflineData<T>(key: keyof OfflineStore, data: T[]): void {
    try {
      localStorage.setItem(`best-brightness-offline-${key}`, JSON.stringify(data));
      localStorage.setItem(`best-brightness-offline-lastSync`, new Date().toISOString());
    } catch (error) {
      console.error(`Failed to save offline data for ${key}:`, error);
      toast.error('Failed to save data locally');
    }
  }

  public addToSyncQueue(action: string, data: any): void {
    const queueItem = {
      action,
      data,
      timestamp: Date.now()
    };
    
    this.syncQueue.push(queueItem);
    this.saveSyncQueue();

    if (this.isOnline) {
      this.processSyncQueue();
    }
  }

  private saveSyncQueue(): void {
    try {
      localStorage.setItem('best-brightness-sync-queue', JSON.stringify(this.syncQueue));
    } catch (error) {
      console.error('Failed to save sync queue:', error);
    }
  }

  private loadSyncQueue(): void {
    try {
      const queue = localStorage.getItem('best-brightness-sync-queue');
      this.syncQueue = queue ? JSON.parse(queue) : [];
    } catch (error) {
      console.error('Failed to load sync queue:', error);
      this.syncQueue = [];
    }
  }

  private async processSyncQueue(): Promise<void> {
    if (!this.isOnline || this.syncQueue.length === 0) return;

    const itemsToSync = [...this.syncQueue];
    const successfulSyncs: number[] = [];

    for (let i = 0; i < itemsToSync.length; i++) {
      const item = itemsToSync[i];
      try {
        await this.syncItem(item);
        successfulSyncs.push(i);
      } catch (error) {
        console.warn(`Failed to sync item:`, item, error);
      }
    }

    // Remove successfully synced items
    successfulSyncs.reverse().forEach(index => {
      this.syncQueue.splice(index, 1);
    });

    this.saveSyncQueue();

    if (successfulSyncs.length > 0) {
      toast.success(`✅ Synced ${successfulSyncs.length} offline changes`);
    }
  }

  private async syncItem(item: { action: string; data: any; timestamp: number }): Promise<void> {
    // Mock sync - in real implementation, this would call your API
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log(`Synced offline action: ${item.action}`, item.data);
        resolve();
      }, 1000);
    });
  }

  // Mock data initialization
  public initializeMockData(): void {
    const mockProducts = [
      {
        id: '1',
        name: 'All-Purpose Cleaner',
        brand: 'Best Brightness',
        category: 'Cleaning Supplies',
        description: 'Powerful all-purpose cleaner for multiple surfaces',
        barcode: '1234567890123',
        price: 12.99,
        cost_price: 8.50,
        stock_quantity: 50,
        reorder_level: 10,
        image_url: 'https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?w=300',
        sku: 'BB-APC-001',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: '2',
        name: 'Glass Cleaner',
        brand: 'Best Brightness',
        category: 'Cleaning Supplies',
        description: 'Streak-free glass and window cleaner',
        barcode: '1234567890124',
        price: 8.99,
        cost_price: 5.50,
        stock_quantity: 30,
        reorder_level: 5,
        image_url: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=300',
        sku: 'BB-GC-002',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: '3',
        name: 'Disinfectant Spray',
        brand: 'Best Brightness',
        category: 'Cleaning Supplies',
        description: 'Kills 99.9% of germs and bacteria',
        barcode: '1234567890125',
        price: 15.99,
        cost_price: 10.00,
        stock_quantity: 25,
        reorder_level: 8,
        image_url: 'https://images.unsplash.com/photo-1585435557343-3b092031d8cb?w=300',
        sku: 'BB-DS-003',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: '4',
        name: 'Floor Cleaner',
        brand: 'Best Brightness',
        category: 'Floor Care',
        description: 'Professional floor cleaning solution',
        barcode: '1234567890126',
        price: 18.99,
        cost_price: 12.00,
        stock_quantity: 40,
        reorder_level: 15,
        image_url: 'https://images.unsplash.com/photo-1527515862127-a4fc05baf7a5?w=300',
        sku: 'BB-FC-004',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: '5',
        name: 'Bathroom Cleaner',
        brand: 'Best Brightness',
        category: 'Bathroom Care',
        description: 'Deep cleaning bathroom and tile cleaner',
        barcode: '1234567890127',
        price: 13.99,
        cost_price: 9.00,
        stock_quantity: 35,
        reorder_level: 12,
        image_url: 'https://images.unsplash.com/photo-1556909114-df2529ea00db?w=300',
        sku: 'BB-BC-005',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    if (this.getOfflineData('products').length === 0) {
      this.setOfflineData('products', mockProducts);
      console.log('✅ Initialized offline mock products');
    }
  }

  public clearOfflineData(): void {
    const keys: (keyof OfflineStore)[] = ['products', 'cart', 'favourites', 'userProfiles', 'orders'];
    keys.forEach(key => {
      localStorage.removeItem(`best-brightness-offline-${key}`);
    });
    localStorage.removeItem('best-brightness-offline-lastSync');
    localStorage.removeItem('best-brightness-sync-queue');
    this.syncQueue = [];
    toast.success('🗑️ Offline data cleared');
  }
}

export const offlineManager = new OfflineManager();

// React Hook for offline status
export function useOfflineStatus() {
  const [isOnline, setIsOnline] = useState(offlineManager.getOnlineStatus());

  useEffect(() => {
    return offlineManager.subscribe(setIsOnline);
  }, []);

  return {
    isOnline,
    isOffline: !isOnline
  };
}

// React Hook for offline data
export function useOfflineData<T>(key: keyof OfflineStore) {
  const [data, setData] = useState<T[]>(() => offlineManager.getOfflineData<T>(key));

  const updateData = useCallback((newData: T[]) => {
    offlineManager.setOfflineData(key, newData);
    setData(newData);
  }, [key]);

  const addItem = useCallback((item: T) => {
    const currentData = offlineManager.getOfflineData<T>(key);
    const newData = [...currentData, item];
    updateData(newData);
    offlineManager.addToSyncQueue(`add_${key}`, item);
  }, [key, updateData]);

  const removeItem = useCallback((itemId: string) => {
    const currentData = offlineManager.getOfflineData<T>(key);
    const newData = currentData.filter((item: any) => item.id !== itemId);
    updateData(newData);
    offlineManager.addToSyncQueue(`remove_${key}`, { id: itemId });
  }, [key, updateData]);

  const updateItem = useCallback((itemId: string, updates: Partial<T>) => {
    const currentData = offlineManager.getOfflineData<T>(key);
    const newData = currentData.map((item: any) => 
      item.id === itemId ? { ...item, ...updates } : item
    );
    updateData(newData);
    offlineManager.addToSyncQueue(`update_${key}`, { id: itemId, updates });
  }, [key, updateData]);

  return {
    data,
    setData: updateData,
    addItem,
    removeItem,
    updateItem
  };
}