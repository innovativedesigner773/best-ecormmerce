import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { CheckCircle, AlertCircle, Loader2, Mail, User, Shield } from 'lucide-react';

export default function RegistrationTester() {
  const [testData, setTestData] = useState({
    firstName: 'Test',
    lastName: 'User',
    email: '',
    password: 'testpass123',
    role: 'customer' as 'customer' | 'cashier' | 'staff' | 'manager' | 'admin'
  });
  
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    requiresConfirmation?: boolean;
    details?: any;
  } | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const { signUp } = useAuth();

  // Generate a unique test email
  const generateTestEmail = () => {
    const timestamp = Date.now();
    const randomNum = Math.floor(Math.random() * 1000);
    return `test-${timestamp}-${randomNum}@example.com`;
  };

  const runRegistrationTest = async () => {
    setIsLoading(true);
    setTestResult(null);

    try {
      // Generate unique email for test
      const testEmail = testData.email || generateTestEmail();
      
      console.log('🧪 Starting registration test with:', {
        email: testEmail,
        role: testData.role,
        firstName: testData.firstName,
        lastName: testData.lastName
      });

      // Call the registration function
      const result = await signUp(
        testEmail,
        testData.password,
        testData.firstName,
        testData.lastName,
        testData.role
      );

      console.log('🧪 Registration test result:', result);

      setTestResult({
        success: result.success,
        message: result.success 
          ? `Registration successful! ${result.requiresConfirmation ? 'Email confirmation required.' : 'Account active immediately.'}`
          : result.error || 'Registration failed',
        requiresConfirmation: result.requiresConfirmation,
        details: {
          email: testEmail,
          role: testData.role,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('🧪 Registration test error:', error);
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : 'Unexpected error during test',
        details: { error: error }
      });
    } finally {
      setIsLoading(false);
    }
  };

  const clearTest = () => {
    setTestResult(null);
    setTestData(prev => ({ ...prev, email: '' }));
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Registration Flow Tester
        </CardTitle>
        <CardDescription>
          Test the registration flow to verify the database trigger and RLS policies are working correctly.
          This will create a real user account for testing purposes.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Test Configuration */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="firstName">First Name</Label>
            <Input
              id="firstName"
              value={testData.firstName}
              onChange={(e) => setTestData(prev => ({ ...prev, firstName: e.target.value }))}
              placeholder="Test"
            />
          </div>
          
          <div>
            <Label htmlFor="lastName">Last Name</Label>
            <Input
              id="lastName"
              value={testData.lastName}
              onChange={(e) => setTestData(prev => ({ ...prev, lastName: e.target.value }))}
              placeholder="User"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="testEmail">Email (leave empty for auto-generated)</Label>
          <Input
            id="testEmail"
            type="email"
            value={testData.email}
            onChange={(e) => setTestData(prev => ({ ...prev, email: e.target.value }))}
            placeholder="Auto-generated unique email"
          />
          <p className="text-sm text-muted-foreground mt-1">
            Leave empty to auto-generate: test-{Date.now()}-XXX@example.com
          </p>
        </div>

        <div>
          <Label htmlFor="role">Role</Label>
          <Select
            value={testData.role}
            onValueChange={(value: any) => setTestData(prev => ({ ...prev, role: value }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="customer">Customer (100 loyalty points)</SelectItem>
              <SelectItem value="cashier">Cashier (0 loyalty points)</SelectItem>
              <SelectItem value="staff">Staff (0 loyalty points)</SelectItem>
              <SelectItem value="manager">Manager (0 loyalty points)</SelectItem>
              <SelectItem value="admin">Admin (0 loyalty points)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={testData.password}
            onChange={(e) => setTestData(prev => ({ ...prev, password: e.target.value }))}
            placeholder="testpass123"
          />
        </div>

        {/* Test Actions */}
        <div className="flex gap-2">
          <Button 
            onClick={runRegistrationTest} 
            disabled={isLoading}
            className="flex-1"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Testing Registration...
              </>
            ) : (
              <>
                <User className="h-4 w-4 mr-2" />
                Test Registration
              </>
            )}
          </Button>
          
          <Button 
            variant="outline" 
            onClick={clearTest}
            disabled={isLoading}
          >
            Clear
          </Button>
        </div>

        {/* Test Results */}
        {testResult && (
          <div className={`p-4 rounded-lg border ${
            testResult.success 
              ? 'bg-green-50 border-green-200' 
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-start gap-3">
              {testResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              )}
              
              <div className="flex-1">
                <h4 className={`font-medium ${
                  testResult.success ? 'text-green-900' : 'text-red-900'
                }`}>
                  {testResult.success ? 'Test Passed!' : 'Test Failed!'}
                </h4>
                
                <p className={`text-sm mt-1 ${
                  testResult.success ? 'text-green-700' : 'text-red-700'
                }`}>
                  {testResult.message}
                </p>

                {testResult.details && (
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      <span className="text-sm font-mono">{testResult.details.email}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      <Badge variant="secondary">{testResult.details.role}</Badge>
                    </div>

                    {testResult.requiresConfirmation && (
                      <div className="flex items-center gap-2 text-blue-700">
                        <Mail className="h-4 w-4" />
                        <span className="text-sm">Email confirmation required</span>
                      </div>
                    )}
                  </div>
                )}

                {testResult.success && (
                  <div className="mt-4 p-3 bg-white rounded border">
                    <h5 className="font-medium text-sm mb-2">What to check next:</h5>
                    <ul className="text-sm space-y-1 list-disc list-inside text-gray-700">
                      <li>Check Supabase Dashboard → Authentication → Users</li>
                      <li>Verify user_profiles table has new record</li>
                      <li>Confirm loyalty points are set correctly</li>
                      <li>Check browser console for any errors</li>
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">Testing Instructions:</h4>
          <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
            <li>Make sure you've run the DATABASE_ERROR_FIX.sql script first</li>
            <li>Clear browser cache (run the cache clearing script)</li>
            <li>Click "Test Registration" to create a test user</li>
            <li>Check the results and verify data in Supabase Dashboard</li>
            <li>If test fails, check browser console and Supabase logs</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}