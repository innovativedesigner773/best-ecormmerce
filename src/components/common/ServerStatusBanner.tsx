import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '../ui/alert';
import { Button } from '../ui/button';
import { Server, AlertTriangle, CheckCircle, X, RefreshCw } from 'lucide-react';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

interface ServerStatus {
  isOnline: boolean;
  lastChecked: Date | null;
  error?: string;
}

export default function ServerStatusBanner() {
  const [serverStatus, setServerStatus] = useState<ServerStatus>({
    isOnline: false,
    lastChecked: null
  });
  const [dismissed, setDismissed] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [checkAttempts, setCheckAttempts] = useState(0);

  const checkServerHealth = async () => {
    setIsChecking(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-8880f2f2/health`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        mode: 'cors',
        credentials: 'omit',
      });

      clearTimeout(timeoutId);

      const isOnline = response.ok;
      let error: string | undefined;

      if (!isOnline) {
        try {
          const errorData = await response.json();
          error = errorData.error || `Server returned ${response.status}`;
        } catch {
          error = `Server returned ${response.status}: ${response.statusText}`;
        }
      }

      setServerStatus({
        isOnline,
        lastChecked: new Date(),
        error
      });

      setCheckAttempts(prev => prev + 1);
      return isOnline;
    } catch (error) {
      let errorMessage = 'Network error';
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = 'Connection timeout';
        } else if (error.message.includes('Failed to fetch')) {
          errorMessage = 'Unable to reach server';
        } else {
          errorMessage = error.message;
        }
      }

      setServerStatus({
        isOnline: false,
        lastChecked: new Date(),
        error: errorMessage
      });
      setCheckAttempts(prev => prev + 1);
      return false;
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    // Only check server status if we haven't checked yet or if dismissed was reset
    if (!serverStatus.lastChecked && !dismissed) {
      checkServerHealth();
    }
  }, [dismissed]);

  // Don't show banner if server is online, user dismissed it, or we haven't checked yet
  if (serverStatus.isOnline || dismissed || !serverStatus.lastChecked) {
    return null;
  }

  // Don't show after multiple failed attempts to avoid spam
  if (checkAttempts >= 3) {
    return null;
  }

  return (
    <Alert className="border-red-500 bg-gradient-to-r from-red-50 to-pink-50 shadow-sm rounded-none border-x-0 border-t-0">
      <AlertTriangle className="h-4 w-4 text-red-600" />
      <AlertDescription className="flex items-center justify-between w-full">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <strong className="text-red-800">Server Connection Issue</strong>
            <span className="text-xs bg-red-200 text-red-800 px-2 py-0.5 rounded-full">
              Offline
            </span>
          </div>
          <p className="text-sm text-red-700">
            Some features like barcode scanning may not work properly while the server is unavailable.
          </p>
          {serverStatus.error && (
            <p className="text-xs text-red-600 mt-1 font-mono">
              Error: {serverStatus.error}
            </p>
          )}
        </div>
        
        <div className="flex items-center gap-3 ml-4">
          <Button
            size="sm"
            variant="outline"
            onClick={checkServerHealth}
            disabled={isChecking}
            className="border-red-300 text-red-700 hover:bg-red-100"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isChecking ? 'animate-spin' : ''}`} />
            {isChecking ? 'Checking...' : 'Retry'}
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDismissed(true)}
            className="text-red-600 hover:text-red-800 hover:bg-red-100"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}