import React, { createContext, useContext, useState, useCallback } from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingState {
  isLoading: boolean;
  loadingMessage?: string;
  progress?: number;
}

interface LoadingContextType {
  loadingState: LoadingState;
  setLoading: (isLoading: boolean, message?: string, progress?: number) => void;
  showLoading: (message?: string) => void;
  hideLoading: () => void;
  updateProgress: (progress: number) => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export function LoadingStateProvider({ children }: { children: React.ReactNode }) {
  const [loadingState, setLoadingState] = useState<LoadingState>({
    isLoading: false,
    loadingMessage: undefined,
    progress: undefined
  });

  const setLoading = useCallback((isLoading: boolean, message?: string, progress?: number) => {
    setLoadingState({
      isLoading,
      loadingMessage: message,
      progress
    });
  }, []);

  const showLoading = useCallback((message?: string) => {
    setLoadingState({
      isLoading: true,
      loadingMessage: message,
      progress: undefined
    });
  }, []);

  const hideLoading = useCallback(() => {
    setLoadingState({
      isLoading: false,
      loadingMessage: undefined,
      progress: undefined
    });
  }, []);

  const updateProgress = useCallback((progress: number) => {
    setLoadingState(prev => ({
      ...prev,
      progress: Math.min(100, Math.max(0, progress))
    }));
  }, []);

  return (
    <LoadingContext.Provider value={{
      loadingState,
      setLoading,
      showLoading,
      hideLoading,
      updateProgress
    }}>
      {children}
    </LoadingContext.Provider>
  );
}

export function useLoadingState() {
  const context = useContext(LoadingContext);
  if (context === undefined) {
    throw new Error('useLoadingState must be used within a LoadingStateProvider');
  }
  return context;
}

interface LoadingOverlayProps {
  message?: string;
  progress?: number;
  className?: string;
}

export function LoadingOverlay({ message, progress, className = '' }: LoadingOverlayProps) {
  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 ${className}`}>
      <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4 text-center">
        <div className="flex justify-center mb-4">
          <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
        </div>
        
        {message && (
          <p className="text-gray-700 mb-4">{message}</p>
        )}
        
        {progress !== undefined && (
          <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
        
        {progress !== undefined && (
          <p className="text-sm text-gray-500">{progress}%</p>
        )}
      </div>
    </div>
  );
}

// Global loading overlay component
export function GlobalLoadingOverlay() {
  const { loadingState } = useLoadingState();
  
  if (!loadingState.isLoading) {
    return null;
  }
  
  return (
    <LoadingOverlay
      message={loadingState.loadingMessage}
      progress={loadingState.progress}
    />
  );
}
