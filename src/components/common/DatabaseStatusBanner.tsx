import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, AlertDescription } from '../ui/alert';
import { Button } from '../ui/button';
import { Database, AlertTriangle, X, Settings } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function DatabaseStatusBanner() {
  const { user, userProfile } = useAuth();
  const [dismissed, setDismissed] = useState(false);

  // Don't show banner if user dismissed it
  if (dismissed) {
    return null;
  }

  // Only show to admin/manager users when they're logged in
  const isAdminUser = userProfile?.role === 'admin' || userProfile?.role === 'manager';
  
  if (!user || !isAdminUser) {
    return null;
  }

  return (
    <Alert className="border-yellow-500 bg-gradient-to-r from-yellow-50 to-orange-50 shadow-sm rounded-none border-x-0 border-t-0">
      <AlertTriangle className="h-4 w-4 text-yellow-600" />
      <AlertDescription className="flex items-center justify-between w-full">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <strong className="text-yellow-800">Database Setup Available</strong>
            <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-0.5 rounded-full">
              Admin Tools
            </span>
          </div>
          <p className="text-sm text-yellow-700">
            Access admin tools to manage database, test registrations, and configure the system.
          </p>
        </div>
        
        <div className="flex items-center gap-3 ml-4">
          <Link to="/admin">
            <Button 
              size="sm"
              className="bg-yellow-600 hover:bg-yellow-700 text-white shadow-sm"
            >
              <Database className="w-4 h-4 mr-2" />
              Admin Panel
            </Button>
          </Link>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDismissed(true)}
            className="text-yellow-600 hover:text-yellow-800 hover:bg-yellow-100"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}