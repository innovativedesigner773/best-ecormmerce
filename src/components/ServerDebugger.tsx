import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { 
  Server, 
  CheckCircle, 
  XCircle, 
  Clock, 
  RefreshCw, 
  Code, 
  AlertTriangle 
} from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface EndpointTest {
  name: string;
  url: string;
  method: 'GET' | 'POST';
  requiresAuth: boolean;
  body?: any;
}

const endpoints: EndpointTest[] = [
  {
    name: 'Health Check',
    url: '/make-server-8880f2f2/health',
    method: 'GET',
    requiresAuth: false
  },
  {
    name: 'Get Products',
    url: '/make-server-8880f2f2/products',
    method: 'GET',
    requiresAuth: false
  },
  {
    name: 'Barcode Lookup',
    url: '/make-server-8880f2f2/barcode/lookup',
    method: 'POST',
    requiresAuth: false,
    body: { barcode: '7622210517821' }
  },
  {
    name: 'Check Barcode',
    url: '/make-server-8880f2f2/barcode/check/7622210517821',
    method: 'GET',
    requiresAuth: false
  }
];

interface TestResult {
  endpoint: string;
  status: 'pending' | 'success' | 'error';
  statusCode?: number;
  responseTime?: number;
  error?: string;
  response?: any;
}

export function ServerDebugger() {
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});
  const [isRunningTests, setIsRunningTests] = useState(false);

  const testEndpoint = async (endpoint: EndpointTest): Promise<TestResult> => {
    const startTime = Date.now();
    
    try {
      const url = `https://${projectId}.supabase.co/functions/v1${endpoint.url}`;
      
      const options: RequestInit = {
        method: endpoint.method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      };

      if (endpoint.body && endpoint.method === 'POST') {
        options.body = JSON.stringify(endpoint.body);
      }

      const response = await fetch(url, options);
      const responseTime = Date.now() - startTime;
      
      let responseData;
      try {
        responseData = await response.json();
      } catch {
        responseData = await response.text();
      }

      return {
        endpoint: endpoint.name,
        status: response.ok ? 'success' : 'error',
        statusCode: response.status,
        responseTime,
        response: responseData,
        error: response.ok ? undefined : `HTTP ${response.status}: ${response.statusText}`
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      return {
        endpoint: endpoint.name,
        status: 'error',
        responseTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  };

  const runAllTests = async () => {
    setIsRunningTests(true);
    setTestResults({});

    for (const endpoint of endpoints) {
      setTestResults(prev => ({
        ...prev,
        [endpoint.name]: {
          endpoint: endpoint.name,
          status: 'pending'
        }
      }));

      const result = await testEndpoint(endpoint);
      
      setTestResults(prev => ({
        ...prev,
        [endpoint.name]: result
      }));

      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setIsRunningTests(false);
  };

  const getStatusIcon = (status: 'pending' | 'success' | 'error') => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600 animate-pulse" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />;
    }
  };

  const getStatusColor = (status: 'pending' | 'success' | 'error') => {
    switch (status) {
      case 'pending':
        return 'secondary';
      case 'success':
        return 'default';
      case 'error':
        return 'destructive';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Server className="h-5 w-5" />
          Server Endpoint Debugger
        </CardTitle>
        <CardDescription>
          Test server endpoints to diagnose connection issues
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Testing connection to: <code className="bg-gray-100 px-2 py-1 rounded text-xs">
              {projectId}.supabase.co
            </code>
          </div>
          <Button 
            onClick={runAllTests} 
            disabled={isRunningTests}
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRunningTests ? 'animate-spin' : ''}`} />
            {isRunningTests ? 'Testing...' : 'Test All Endpoints'}
          </Button>
        </div>

        <div className="space-y-3">
          {endpoints.map((endpoint) => {
            const result = testResults[endpoint.name];
            
            return (
              <div key={endpoint.name} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  {result ? getStatusIcon(result.status) : <Code className="h-4 w-4 text-gray-400" />}
                  <div>
                    <div className="font-medium text-sm">{endpoint.name}</div>
                    <div className="text-xs text-gray-500">
                      {endpoint.method} {endpoint.url}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {result?.responseTime && (
                    <span className="text-xs text-gray-600">
                      {result.responseTime}ms
                    </span>
                  )}
                  {result?.statusCode && (
                    <Badge variant={result.statusCode < 400 ? 'default' : 'destructive'}>
                      {result.statusCode}
                    </Badge>
                  )}
                  {result && (
                    <Badge variant={getStatusColor(result.status)}>
                      {result.status}
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Error Summary */}
        {Object.values(testResults).some(r => r.status === 'error') && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="font-medium mb-2">Connection Issues Detected:</div>
              <ul className="text-sm space-y-1">
                {Object.values(testResults)
                  .filter(r => r.status === 'error')
                  .map((result, i) => (
                    <li key={i} className="font-mono text-xs">
                      {result.endpoint}: {result.error}
                    </li>
                  ))
                }
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Success Summary */}
        {Object.values(testResults).length > 0 && 
         Object.values(testResults).every(r => r.status === 'success') && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              All server endpoints are responding correctly!
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}