import React, { useState } from 'react';
import { CheckCircle, Database, Scan, Package, ArrowRight, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface QuickStartGuideProps {
  onDatabaseInitialized: () => void;
}

export function QuickStartGuide({ onDatabaseInitialized }: QuickStartGuideProps) {
  const [isInitializing, setIsInitializing] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [initSuccess, setInitSuccess] = useState(false);

  const initializeDatabase = async () => {
    try {
      setIsInitializing(true);
      setInitError(null);

      // Get the current auth token
      const authData = JSON.parse(localStorage.getItem('sb-' + projectId.replace(/[^a-zA-Z0-9]/g, '')) + '-auth-token' || '{}');
      const accessToken = authData.access_token;

      if (!accessToken) {
        throw new Error('Not authenticated. Please log in first.');
      }

      const response = await fetch(`${window.location.origin}/make-server-8880f2f2/init-database`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to initialize database');
      }

      const data = await response.json();
      console.log('Database initialized:', data);
      
      setInitSuccess(true);
      onDatabaseInitialized();
    } catch (error) {
      console.error('Database initialization error:', error);
      setInitError(error instanceof Error ? error.message : 'Failed to initialize database');
    } finally {
      setIsInitializing(false);
    }
  };

  const steps = [
    {
      id: 1,
      title: 'Initialize Database',
      description: 'Set up the product database with demo data',
      icon: Database,
      action: initializeDatabase,
      isCompleted: initSuccess,
      isLoading: isInitializing
    },
    {
      id: 2,
      title: 'Scan Barcodes',
      description: 'Use the barcode scanner to add products automatically',
      icon: Scan,
      isCompleted: false
    },
    {
      id: 3,
      title: 'Manage Inventory',
      description: 'View and manage your product catalog',
      icon: Package,
      isCompleted: false
    }
  ];

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          <Package className="h-6 w-6 text-blue-600" />
          Welcome to Best Brightness Product Management
        </CardTitle>
        <CardDescription>
          Get started with barcode scanning and product management in 3 easy steps
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Error Display */}
        {initError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{initError}</AlertDescription>
          </Alert>
        )}

        {/* Success Display */}
        {initSuccess && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Database initialized successfully! You can now start scanning barcodes to add products.
            </AlertDescription>
          </Alert>
        )}

        {/* Steps */}
        <div className="space-y-4">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center gap-4 p-4 border rounded-lg">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                step.isCompleted 
                  ? 'bg-green-100 text-green-600' 
                  : step.isLoading
                  ? 'bg-blue-100 text-blue-600 animate-pulse'
                  : 'bg-gray-100 text-gray-400'
              }`}>
                {step.isCompleted ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  <step.icon className="h-5 w-5" />
                )}
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-medium">{step.title}</h3>
                  {step.isCompleted && <Badge variant="secondary">Complete</Badge>}
                  {step.isLoading && <Badge>In Progress...</Badge>}
                </div>
                <p className="text-sm text-gray-600">{step.description}</p>
              </div>

              {step.action && !step.isCompleted && (
                <Button 
                  onClick={step.action}
                  disabled={step.isLoading}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {step.isLoading ? 'Initializing...' : 'Initialize'}
                </Button>
              )}

              {index < steps.length - 1 && (
                <ArrowRight className="h-4 w-4 text-gray-400 ml-2" />
              )}
            </div>
          ))}
        </div>

        {/* Features Overview */}
        <div className="border-t pt-6">
          <h4 className="font-medium mb-3">What you can do:</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span>Scan barcodes with camera or manual entry</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span>Automatic product data from API</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span>Prevent duplicate products</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span>Stock management and alerts</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}