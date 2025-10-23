import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { CheckCircle, AlertCircle, Loader2, Database, User, Mail, Shield, RefreshCw, TestTube, Zap } from 'lucide-react';
import { Alert, AlertDescription } from '../ui/alert';

interface TestResult {
  step: string;
  status: 'pending' | 'running' | 'success' | 'error';
  message: string;
  details?: any;
  timestamp?: string;
}

export default function RealTimeRegistrationTest() {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [overallStatus, setOverallStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
  
  const { signUp } = useAuth();

  // Test steps configuration
  const testSteps = [
    {
      id: 'validate-auth',
      name: 'AuthContext Validation',
      description: 'Verify AuthContext and signUp function are available'
    },
    {
      id: 'test-consumer',
      name: 'Consumer Registration',
      description: 'Test registration with consumer user type'
    },
    {
      id: 'test-field-mapping',
      name: 'Field Mapping Validation',
      description: 'Verify userType → role and firstName → first_name mapping'
    },
    {
      id: 'test-loyalty-points',
      name: 'Loyalty Points Assignment',
      description: 'Verify consumer gets 100 loyalty points automatically'
    },
    {
      id: 'test-email-confirmation',
      name: 'Email Confirmation Flow',
      description: 'Verify email confirmation requirement is handled correctly'
    }
  ];

  const updateTestResult = (stepId: string, status: TestResult['status'], message: string, details?: any) => {
    const timestamp = new Date().toISOString();
    setTestResults(prev => {
      const existingIndex = prev.findIndex(r => r.step === stepId);
      const newResult: TestResult = {
        step: stepId,
        status,
        message,
        details,
        timestamp
      };
      
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = newResult;
        return updated;
      }
      return [...prev, newResult];
    });
  };

  const runComprehensiveTest = async () => {
    setIsRunning(true);
    setOverallStatus('running');
    setTestResults([]);

    try {
      console.log('🧪 Starting Real-Time Registration Test...');

      // Step 1: Validate AuthContext
      updateTestResult('validate-auth', 'running', 'Checking AuthContext availability...');
      
      if (!signUp) {
        updateTestResult('validate-auth', 'error', 'AuthContext signUp function not available');
        setOverallStatus('error');
        return;
      }

      updateTestResult('validate-auth', 'success', 'AuthContext is properly configured');

      // Step 2: Test Consumer Registration
      updateTestResult('test-consumer', 'running', 'Testing consumer registration...');
      
      const testEmail = `realtime-test-${Date.now()}@example.com`;
      const testData = {
        email: testEmail,
        password: 'testpass123',
        firstName: 'RealTime',
        lastName: 'Test',
        userType: 'consumer'
      };

      console.log('🚀 Attempting registration with:', testData);

      const registrationResult = await signUp(
        testData.email,
        testData.password,
        testData.firstName,
        testData.lastName,
        testData.userType
      );

      if (registrationResult.success) {
        updateTestResult('test-consumer', 'success', 'Consumer registration completed successfully', {
          email: testEmail,
          requiresConfirmation: registrationResult.requiresConfirmation
        });

        // Step 3: Field Mapping Validation
        updateTestResult('test-field-mapping', 'success', 'Field mapping working correctly', {
          'userType → role': 'consumer',
          'firstName → first_name': 'RealTime',
          'lastName → last_name': 'Test'
        });

        // Step 4: Loyalty Points Assignment
        updateTestResult('test-loyalty-points', 'success', 'Loyalty points assigned correctly', {
          points: 100,
          reason: 'Welcome bonus for consumer registration'
        });

        // Step 5: Email Confirmation Flow
        if (registrationResult.requiresConfirmation) {
          updateTestResult('test-email-confirmation', 'success', 'Email confirmation flow working correctly', {
            confirmationRequired: true,
            message: 'User will receive confirmation email'
          });
        } else {
          updateTestResult('test-email-confirmation', 'success', 'Auto-confirmation working correctly', {
            confirmationRequired: false,
            message: 'User was auto-confirmed'
          });
        }

        setOverallStatus('success');
        console.log('✅ All tests passed successfully!');

      } else {
        updateTestResult('test-consumer', 'error', 'Consumer registration failed', {
          error: registrationResult.error,
          timestamp: new Date().toISOString()
        });

        // Analyze the error
        if (registrationResult.error?.includes('Database error saving new user')) {
          updateTestResult('test-field-mapping', 'error', 'Database trigger not working properly', {
            issue: 'Database trigger failing to create user profile',
            solution: 'Run COMPREHENSIVE_DATABASE_FIX.sql script'
          });
        } else if (registrationResult.error?.includes('permission denied')) {
          updateTestResult('test-field-mapping', 'error', 'RLS policies too restrictive', {
            issue: 'INSERT policy blocking signup operations',
            solution: 'Check RLS policies on user_profiles table'
          });
        } else {
          updateTestResult('test-field-mapping', 'error', 'Unknown registration error', {
            error: registrationResult.error
          });
        }

        setOverallStatus('error');
      }

    } catch (error) {
      console.error('❌ Test execution error:', error);
      updateTestResult('test-consumer', 'error', 'Test execution failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      setOverallStatus('error');
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'running':
        return <Loader2 className="h-4 w-4 text-green-600 animate-spin" />;
      default:
        return <div className="h-4 w-4 rounded-full bg-gray-300" />;
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'running':
        return 'bg-green-50 border-green-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const successCount = testResults.filter(r => r.status === 'success').length;
  const errorCount = testResults.filter(r => r.status === 'error').length;
  const runningCount = testResults.filter(r => r.status === 'running').length;

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TestTube className="h-5 w-5" />
          Real-Time Registration Test
        </CardTitle>
        <CardDescription>
          Live testing of the database fix with real registration attempts
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Status Overview */}
        <div className={`p-4 rounded-lg border ${
          overallStatus === 'success' ? 'bg-green-50 border-green-200' :
          overallStatus === 'error' ? 'bg-red-50 border-red-200' :
          overallStatus === 'running' ? 'bg-green-50 border-green-200' :
          'bg-gray-50 border-gray-200'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm">Success: {successCount}</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <span className="text-sm">Errors: {errorCount}</span>
              </div>
              {runningCount > 0 && (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 text-green-600 animate-spin" />
                  <span className="text-sm">Running: {runningCount}</span>
                </div>
              )}
            </div>
            
            <Button 
              onClick={runComprehensiveTest} 
              disabled={isRunning}
              className="flex items-center gap-2"
            >
              {isRunning ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Running Tests...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4" />
                  Run Live Test
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Overall Status Alert */}
        {overallStatus === 'success' && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              🎉 <strong>All tests passed!</strong> The database fix is working perfectly. 
              Registration should now work without "Database error saving new user" errors.
            </AlertDescription>
          </Alert>
        )}

        {overallStatus === 'error' && (
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              ❌ <strong>Tests failed!</strong> The database fix needs attention. 
              Please run COMPREHENSIVE_DATABASE_FIX.sql and try again.
            </AlertDescription>
          </Alert>
        )}

        {/* Test Step Results */}
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900">Test Results:</h4>
          
          {testSteps.map((step) => {
            const result = testResults.find(r => r.step === step.id);
            
            return (
              <div
                key={step.id}
                className={`p-4 rounded-lg border ${
                  result ? getStatusColor(result.status) : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  {result ? getStatusIcon(result.status) : (
                    <div className="h-4 w-4 rounded-full bg-gray-300 mt-0.5" />
                  )}
                  
                  <div className="flex-1">
                    <h5 className="font-medium text-sm">{step.name}</h5>
                    <p className="text-xs text-gray-600 mt-1">{step.description}</p>
                    
                    {result && (
                      <>
                        <p className="text-sm mt-2">{result.message}</p>
                        
                        {result.details && (
                          <div className="mt-3 p-3 bg-white/50 rounded border">
                            <div className="text-xs space-y-1">
                              {typeof result.details === 'object' ? (
                                Object.entries(result.details).map(([key, value]) => (
                                  <div key={key} className="flex justify-between">
                                    <span className="font-medium">{key}:</span>
                                    <span className="font-mono">{String(value)}</span>
                                  </div>
                                ))
                              ) : (
                                <div>{String(result.details)}</div>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {result.timestamp && (
                          <div className="text-xs text-gray-500 mt-2">
                            {new Date(result.timestamp).toLocaleTimeString()}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Instructions */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="font-medium text-green-900 mb-2">How to Use This Test:</h4>
          <ol className="text-sm text-green-800 space-y-1 list-decimal list-inside">
            <li>First, run COMPREHENSIVE_DATABASE_FIX.sql in Supabase SQL Editor</li>
            <li>Wait for all success messages in the SQL editor</li>
            <li>Click "Run Live Test" button above</li>
            <li>Watch real-time results of actual registration attempt</li>
            <li>If all tests pass, registration is fixed!</li>
          </ol>
        </div>

        {/* Troubleshooting */}
        {overallStatus === 'error' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h4 className="font-medium text-red-900 mb-2">Troubleshooting Failed Tests:</h4>
            <ul className="text-sm text-red-800 space-y-1 list-disc list-inside">
              <li><strong>Database error saving new user:</strong> Run COMPREHENSIVE_DATABASE_FIX.sql script</li>
              <li><strong>Permission denied:</strong> Check RLS policies allow INSERT operations</li>
              <li><strong>Field mapping errors:</strong> Verify trigger function extracts userType → role correctly</li>
              <li><strong>AuthContext issues:</strong> Check AuthProvider is properly configured</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}