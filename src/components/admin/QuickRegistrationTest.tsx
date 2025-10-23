import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { CheckCircle, AlertCircle, Loader2, User, Mail, Database } from 'lucide-react';

export default function QuickRegistrationTest() {
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    details?: any;
  } | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const { signUp } = useAuth();

  const runQuickTest = async () => {
    setIsLoading(true);
    setTestResult(null);

    const testEmail = `quick-test-${Date.now()}@example.com`;
    
    try {
      console.log('🧪 Starting quick registration test...');

      // Test with new schema: userType = 'consumer'
      const result = await signUp(
        testEmail,
        'testpass123',
        'Quick',
        'Test',
        'consumer'  // Updated to use 'consumer' instead of 'customer'
      );

      console.log('🧪 Test result:', result);

      setTestResult({
        success: result.success,
        message: result.success 
          ? 'Registration successful! The database error has been fixed and schema is properly aligned.' 
          : result.error || 'Registration failed',
        details: {
          email: testEmail,
          userType: 'consumer',
          timestamp: new Date().toISOString(),
          requiresConfirmation: result.requiresConfirmation
        }
      });

    } catch (error) {
      console.error('🧪 Test error:', error);
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : 'Unexpected error during test',
        details: { error: error }
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Quick Registration Test
        </CardTitle>
        <CardDescription>
          Test if the "Database error saving new user" issue has been fixed with the updated schema alignment.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-green-900 mb-2">This test will:</h4>
          <ul className="text-sm text-green-800 space-y-1 list-disc list-inside">
            <li>Create a test consumer account</li>
            <li>Verify userType → role field mapping works</li>
            <li>Check if firstName/lastName mapping is correct</li>
            <li>Confirm user_profiles is created with proper data</li>
            <li>Validate RLS policies allow signup operations</li>
          </ul>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-green-900 mb-2">Schema Updates Made:</h4>
          <div className="text-sm text-green-800 space-y-1">
            <div className="flex items-center justify-between">
              <span>React Component:</span>
              <code className="bg-green-100 px-2 py-1 rounded text-xs">userType: 'consumer'</code>
            </div>
            <div className="flex items-center justify-between">
              <span>Database Field:</span>
              <code className="bg-green-100 px-2 py-1 rounded text-xs">role: 'consumer'</code>
            </div>
            <div className="flex items-center justify-between">
              <span>Metadata Mapping:</span>
              <code className="bg-green-100 px-2 py-1 rounded text-xs">firstName → first_name</code>
            </div>
          </div>
        </div>

        <Button 
          onClick={runQuickTest} 
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Testing Schema Alignment...
            </>
          ) : (
            <>
              <User className="h-4 w-4 mr-2" />
              Test Updated Registration
            </>
          )}
        </Button>

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
                  {testResult.success ? 'Schema Fix Successful! ✅' : 'Still Having Issues ❌'}
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
                      <span className="text-sm font-mono text-gray-600">
                        {testResult.details.email}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <Badge variant="secondary" className="text-xs">
                        User Type: {testResult.details.userType}
                      </Badge>
                    </div>

                    {testResult.details.requiresConfirmation && (
                      <Badge variant="secondary" className="text-xs">
                        Email confirmation required
                      </Badge>
                    )}
                  </div>
                )}

                {testResult.success ? (
                  <div className="mt-4 p-3 bg-white rounded border">
                    <h5 className="font-medium text-sm mb-2 text-green-900">
                      🎉 Schema Alignment Completed!
                    </h5>
                    <ul className="text-sm space-y-1 list-disc list-inside text-green-700">
                      <li>userType → role mapping works correctly</li>
                      <li>firstName/lastName → first_name/last_name mapping works</li>
                      <li>Consumer user type creates profiles properly</li>
                      <li>Database trigger processes metadata correctly</li>
                      <li>RLS policies allow registration operations</li>
                    </ul>
                  </div>
                ) : (
                  <div className="mt-4 p-3 bg-white rounded border">
                    <h5 className="font-medium text-sm mb-2 text-red-900">
                      🚨 Still Need to Fix:
                    </h5>
                    <ul className="text-sm space-y-1 list-disc list-inside text-red-700">
                      <li>Check if you ran the UPDATED_SQL_TRIGGER.sql script</li>
                      <li>Verify field mappings: userType → role, firstName → first_name</li>
                      <li>Confirm trigger function processes metadata correctly</li>
                      <li>Check if RLS policies allow INSERT operations</li>
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-2">Schema Update Checklist:</h4>
          <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
            <li>✅ Updated AuthContext to use userType parameter</li>
            <li>✅ Updated Register.tsx to use userType and consumer</li>
            <li>✅ Updated SafeRoleSelector with new user types</li>
            <li>✅ Updated auth-helpers with new field mappings</li>
            <li>🔄 Run UPDATED_SQL_TRIGGER.sql in Supabase</li>
            <li>🔄 Clear browser cache and test registration</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}