import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { CheckCircle, AlertTriangle, RefreshCw, Database, Server } from 'lucide-react';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { useAuth } from '../../contexts/AuthContext';

interface TestResult {
  success: boolean;
  message: string;
  details?: any;
}

export default function RegistrationTestComponent() {
  const [isTestingServer, setIsTestingServer] = useState(false);
  const [isTestingDatabase, setIsTestingDatabase] = useState(false);
  const [isTestingRegistration, setIsTestingRegistration] = useState(false);
  
  const [serverResult, setServerResult] = useState<TestResult | null>(null);
  const [databaseResult, setDatabaseResult] = useState<TestResult | null>(null);
  const [registrationResult, setRegistrationResult] = useState<TestResult | null>(null);
  
  const [testEmail, setTestEmail] = useState('test@example.com');
  const { signUp } = useAuth();

  const testServerConnection = async () => {
    setIsTestingServer(true);
    setServerResult(null);
    
    try {
      console.log('🧪 Testing server connection...');
      
      const response = await fetch(`${window.location.origin}/make-server-8880f2f2/health`);
      
      if (response.ok) {
        const data = await response.json();
        setServerResult({
          success: true,
          message: 'Server is healthy and responding',
          details: data
        });
      } else {
        setServerResult({
          success: false,
          message: `Server returned ${response.status}: ${response.statusText}`,
          details: { status: response.status, statusText: response.statusText }
        });
      }
    } catch (error) {
      console.error('Server test failed:', error);
      setServerResult({
        success: false,
        message: 'Failed to connect to server',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsTestingServer(false);
    }
  };

  const testDatabaseConnection = async () => {
    setIsTestingDatabase(true);
    setDatabaseResult(null);
    
    try {
      console.log('🧪 Testing database connection...');
      
      const response = await fetch(`${window.location.origin}/make-server-8880f2f2/test-db`);
      const data = await response.json();
      
      if (response.ok && data.status === 'success') {
        setDatabaseResult({
          success: true,
          message: 'Database connection successful',
          details: data
        });
      } else {
        setDatabaseResult({
          success: false,
          message: data.message || 'Database connection failed',
          details: data
        });
      }
    } catch (error) {
      console.error('Database test failed:', error);
      setDatabaseResult({
        success: false,
        message: 'Failed to test database connection',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsTestingDatabase(false);
    }
  };

  const testRegistration = async () => {
    if (!testEmail) {
      setRegistrationResult({
        success: false,
        message: 'Please enter a test email address'
      });
      return;
    }

    setIsTestingRegistration(true);
    setRegistrationResult(null);
    
    try {
      console.log('🧪 Testing user registration...');
      
      const result = await signUp(
        testEmail,
        'testpassword123',
        'Test',
        'User',
        'customer'
      );
      
      if (result.success) {
        setRegistrationResult({
          success: true,
          message: 'Registration test successful! User account created.',
          details: result
        });
      } else {
        setRegistrationResult({
          success: false,
          message: result.error || 'Registration test failed',
          details: result
        });
      }
    } catch (error) {
      console.error('Registration test failed:', error);
      setRegistrationResult({
        success: false,
        message: 'Registration test threw an exception',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsTestingRegistration(false);
    }
  };

  const runAllTests = async () => {
    await testServerConnection();
    await new Promise(resolve => setTimeout(resolve, 1000));
    await testDatabaseConnection();
    await new Promise(resolve => setTimeout(resolve, 1000));
    await testRegistration();
  };

  const ResultCard = ({ title, result, isLoading, icon: Icon }: {
    title: string;
    result: TestResult | null;
    isLoading: boolean;
    icon: React.ComponentType<any>;
  }) => (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="h-5 w-5" />
        <h3 className="font-medium">{title}</h3>
        {isLoading && <RefreshCw className="h-4 w-4 animate-spin ml-auto" />}
      </div>
      
      {result && (
        <Alert className={result.success ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}>
          {result.success ? (
            <CheckCircle className="h-4 w-4 text-green-600" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-red-600" />
          )}
          <AlertDescription>
            <div className={result.success ? 'text-green-800' : 'text-red-800'}>
              <div className="font-medium mb-1">{result.message}</div>
              {result.details && (
                <pre className="text-xs bg-white p-2 rounded border mt-2 overflow-x-auto">
                  {JSON.stringify(result.details, null, 2)}
                </pre>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}
      
      {!result && !isLoading && (
        <div className="text-gray-500 text-sm">Not tested yet</div>
      )}
    </Card>
  );

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Registration System Test
        </h1>
        <p className="text-gray-600">
          Test the server connection, database, and user registration functionality
        </p>
      </div>

      <div className="flex flex-wrap gap-4 justify-center">
        <Button
          onClick={testServerConnection}
          disabled={isTestingServer}
          variant="outline"
          className="gap-2"
        >
          <Server className="h-4 w-4" />
          {isTestingServer ? 'Testing...' : 'Test Server'}
        </Button>

        <Button
          onClick={testDatabaseConnection}
          disabled={isTestingDatabase}
          variant="outline"
          className="gap-2"
        >
          <Database className="h-4 w-4" />
          {isTestingDatabase ? 'Testing...' : 'Test Database'}
        </Button>

        <Button
          onClick={runAllTests}
          disabled={isTestingServer || isTestingDatabase || isTestingRegistration}
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Run All Tests
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <ResultCard
            title="Server Health Check"
            result={serverResult}
            isLoading={isTestingServer}
            icon={Server}
          />

          <ResultCard
            title="Database Connection"
            result={databaseResult}
            isLoading={isTestingDatabase}
            icon={Database}
          />
        </div>

        <div className="space-y-4">
          <Card className="p-4">
            <h3 className="font-medium mb-3">Registration Test</h3>
            <div className="space-y-3">
              <Input
                placeholder="Test email address"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
              />
              <Button
                onClick={testRegistration}
                disabled={isTestingRegistration || !testEmail}
                className="w-full gap-2"
              >
                {isTestingRegistration ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Testing Registration...
                  </>
                ) : (
                  'Test User Registration'
                )}
              </Button>
            </div>
          </Card>

          {registrationResult && (
            <Alert className={registrationResult.success ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}>
              {registrationResult.success ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-red-600" />
              )}
              <AlertDescription>
                <div className={registrationResult.success ? 'text-green-800' : 'text-red-800'}>
                  <div className="font-medium mb-1">{registrationResult.message}</div>
                  {registrationResult.details && (
                    <pre className="text-xs bg-white p-2 rounded border mt-2 overflow-x-auto">
                      {JSON.stringify(registrationResult.details, null, 2)}
                    </pre>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">Instructions:</h4>
        <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
          <li>First, run the SQL script in your Supabase SQL Editor</li>
          <li>Test the server connection to ensure the Edge Function is working</li>
          <li>Test the database connection to verify the schema is correct</li>
          <li>Test user registration with a temporary email address</li>
          <li>Check the console logs for detailed debugging information</li>
        </ol>
      </div>
    </div>
  );
}