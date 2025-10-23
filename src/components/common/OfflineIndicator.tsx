import React from 'react';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Download, 
  Clock,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { useOffline } from '../../contexts/OfflineContext';
import { formatDistanceToNow } from 'date-fns';

export default function OfflineIndicator() {
  const { 
    isOnline, 
    isOffline, 
    syncStatus, 
    lastSync, 
    initializeOfflineData 
  } = useOffline();

  if (isOnline && syncStatus === 'idle') {
    return null; // Don't show anything when fully online and synced
  }

  const getSyncStatusInfo = () => {
    switch (syncStatus) {
      case 'syncing':
        return {
          icon: RefreshCw,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          message: 'Syncing offline changes...'
        };
      case 'error':
        return {
          icon: AlertTriangle,
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          message: 'Sync failed. Will retry automatically.'
        };
      default:
        return isOffline ? {
          icon: WifiOff,
          color: 'text-orange-600',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200',
          message: 'Working offline. Changes will sync when online.'
        } : {
          icon: CheckCircle,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          message: 'All changes synced successfully.'
        };
    }
  };

  const statusInfo = getSyncStatusInfo();
  const StatusIcon = statusInfo.icon;

  return (
    <Alert className={`${statusInfo.borderColor} ${statusInfo.bgColor} shadow-sm rounded-none border-x-0 border-t-0`}>
      <StatusIcon className={`h-4 w-4 ${statusInfo.color} ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
      <AlertDescription className="flex items-center justify-between w-full">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <strong className={statusInfo.color}>
              {isOffline ? 'Offline Mode' : isOnline && syncStatus === 'syncing' ? 'Syncing' : 'Online'}
            </strong>
            <Badge 
              variant="outline" 
              className={`text-xs ${statusInfo.color} ${statusInfo.borderColor}`}
            >
              {isOffline ? (
                <><WifiOff className="w-3 h-3 mr-1" /> Offline</>
              ) : (
                <><Wifi className="w-3 h-3 mr-1" /> Online</>
              )}
            </Badge>
          </div>
          <p className={`text-sm ${statusInfo.color}`}>
            {statusInfo.message}
          </p>
          {lastSync && (
            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Last sync: {formatDistanceToNow(lastSync, { addSuffix: true })}
            </p>
          )}
        </div>
        
        <div className="flex items-center gap-2 ml-4">
          {isOffline && (
            <Button
              size="sm"
              variant="outline"
              onClick={initializeOfflineData}
              className={`${statusInfo.borderColor} ${statusInfo.color} hover:${statusInfo.bgColor}`}
            >
              <Download className="w-4 h-4 mr-2" />
              Load Demo Data
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}