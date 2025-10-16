import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Progress } from '../ui/progress';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { CheckCircle2, AlertTriangle, Database, RefreshCw, Play, Settings, Copy, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { setupDatabase, checkDatabaseHealth, DatabaseSetup } from '../../utils/database-setup';
import EnvironmentSetup from './EnvironmentSetup';
import { useAuth } from '../../contexts/AuthContext';
import { 
  testExecSqlFunction, 
  createExecSqlFunction, 
  MANUAL_EXEC_SQL_SCRIPT, 
  MANUAL_SETUP_INSTRUCTIONS 
} from '../../utils/exec-sql-setup';

interface DatabaseHealth {
  isHealthy: boolean;
  missingTables: string[];
  tableCount: number;
  hasData: boolean;
}

export default function DatabaseSetupComponent() {
  const { refreshDatabaseStatus } = useAuth();
  const [isSetupRunning, setIsSetupRunning] = useState(false);
  const [setupProgress, setSetupProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [setupComplete, setSetupComplete] = useState(false);
  const [dbHealth, setDbHealth] = useState<DatabaseHealth | null>(null);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [showManualSetup, setShowManualSetup] = useState(false);
  const [execSqlAvailable, setExecSqlAvailable] = useState<boolean | null>(null);
  const [isTestingExecSql, setIsTestingExecSql] = useState(false);

  useEffect(() => {
    // Test exec_sql function and check database health on component mount
    handleInitialChecks();
  }, []);

  const handleInitialChecks = async () => {
    await testExecSql();
    await handleHealthCheck();
  };

  const testExecSql = async () => {
    setIsTestingExecSql(true);
    try {
      const result = await testExecSqlFunction();
      setExecSqlAvailable(result.available);
      
      if (!result.available) {
        console.warn('exec_sql function not available:', result.error);
        if (result.needsManualSetup) {
          toast.warning('Database setup requires manual configuration');
        }
      } else {
        console.log('✅ exec_sql function is available');
      }
    } catch (error) {
      console.error('Error testing exec_sql function:', error);
      setExecSqlAvailable(false);
    } finally {
      setIsTestingExecSql(false);
    }
  };

  const handleHealthCheck = async () => {
    setIsCheckingHealth(true);
    setSetupError(null);
    
    try {
      const health = await checkDatabaseHealth();
      setDbHealth(health);
      
      if (health.isHealthy && health.hasData) {
        setSetupComplete(true);
        toast.success('Database is healthy and contains data');
      } else if (health.isHealthy && !health.hasData) {
        toast.info('Database structure exists but needs demo data');
      } else {
        toast.warning(`Database needs setup - ${health.missingTables.length} tables missing`);
      }
    } catch (error: any) {
      console.error('Health check failed:', error);
      if (error.message?.includes('exec_sql')) {
        setExecSqlAvailable(false);
        setSetupError('Database setup requires the exec_sql function to be created first');
      } else {
        setSetupError(error.message || 'Failed to check database health');
      }
      toast.error('Failed to check database health');
    } finally {
      setIsCheckingHealth(false);
    }
  };

  const handleCreateExecSql = async () => {
    setIsSetupRunning(true);
    setSetupError(null);
    
    try {
      await createExecSqlFunction();
      setExecSqlAvailable(true);
      toast.success('exec_sql function created successfully');
      
      // Test the function again to be sure
      await testExecSql();
    } catch (error: any) {
      console.error('Failed to create exec_sql function:', error);
      setSetupError(error.message || 'Failed to create exec_sql function');
      setShowManualSetup(true);
      toast.error('Automatic setup failed. Manual setup required.');
    } finally {
      setIsSetupRunning(false);
    }
  };

  const handleSetupDatabase = async () => {
    // First check if exec_sql is available
    if (execSqlAvailable === false) {
      setShowManualSetup(true);
      toast.error('exec_sql function is required for database setup');
      return;
    }

    setIsSetupRunning(true);
    setSetupProgress(0);
    setCurrentStep('Initializing...');
    setSetupError(null);
    setSetupComplete(false);

    try {
      await setupDatabase((step, current, total) => {
        setCurrentStep(step);
        setSetupProgress((current / total) * 100);
      });

      setSetupComplete(true);
      setSetupProgress(100);
      setCurrentStep('Setup complete!');
      
      // Refresh health check and auth context
      setTimeout(async () => {
        await handleHealthCheck();
        await refreshDatabaseStatus();
      }, 1000);

    } catch (error: any) {
      console.error('Database setup failed:', error);
      setSetupError(error.message || 'Database setup failed');
      
      if (error.message?.includes('exec_sql')) {
        setExecSqlAvailable(false);
        setShowManualSetup(true);
      }
      
      toast.error('Database setup failed. Check console for details.');
    } finally {
      setIsSetupRunning(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const getHealthStatusBadge = () => {
    if (!dbHealth) return null;

    if (dbHealth.isHealthy && dbHealth.hasData) {
      return <Badge className="bg-green-100 text-green-800 border-green-200"><CheckCircle2 className="w-3 h-3 mr-1" />Healthy</Badge>;
    } else if (dbHealth.isHealthy && !dbHealth.hasData) {
      return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200"><AlertTriangle className="w-3 h-3 mr-1" />Needs Data</Badge>;
    } else {
      return <Badge className="bg-red-100 text-red-800 border-red-200"><AlertTriangle className="w-3 h-3 mr-1" />Needs Setup</Badge>;
    }
  };

  const getExecSqlStatusBadge = () => {
    if (isTestingExecSql) {
      return <Badge className="bg-gray-100 text-gray-800 border-gray-200"><RefreshCw className="w-3 h-3 mr-1 animate-spin" />Testing...</Badge>;
    }
    
    if (execSqlAvailable === true) {
      return <Badge className="bg-green-100 text-green-800 border-green-200"><CheckCircle2 className="w-3 h-3 mr-1" />Available</Badge>;
    } else if (execSqlAvailable === false) {
      return <Badge className="bg-red-100 text-red-800 border-red-200"><AlertTriangle className="w-3 h-3 mr-1" />Missing</Badge>;
    }
    
    return <Badge className="bg-gray-100 text-gray-800 border-gray-200">Unknown</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-medium text-gray-900">Database Management</h2>
          <p className="text-sm text-gray-600 mt-1">
            Initialize and manage the Best Brightness database schema
          </p>
        </div>
        <div className="flex items-center gap-2">
          {getHealthStatusBadge()}
          <Button
            variant="outline"
            size="sm"
            onClick={handleHealthCheck}
            disabled={isCheckingHealth}
            className="min-w-[100px]"
          >
            {isCheckingHealth ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Checking...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Environment Configuration */}
      <EnvironmentSetup />

      {/* exec_sql Function Status */}
      <Card className="border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-[#4682B4]" />
            Prerequisites Check
          </CardTitle>
          <CardDescription>
            Required database functions and permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-900">exec_sql Function</h4>
              <p className="text-xs text-gray-500 mt-1">
                Required for automated database setup and management
              </p>
            </div>
            <div className="flex items-center gap-2">
              {getExecSqlStatusBadge()}
              {execSqlAvailable === false && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowManualSetup(true)}
                  className="border-red-200 text-red-700 hover:bg-red-50"
                >
                  Setup Required
                </Button>
              )}
            </div>
          </div>
          
          {execSqlAvailable === false && (
            <Alert className="border-red-200 bg-red-50 mt-4">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                <strong>Manual setup required:</strong>
                <br />
                The exec_sql function needs to be created before database initialization can proceed.
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => setShowManualSetup(true)}
                  className="p-0 h-auto text-red-700 hover:text-red-900 ml-1"
                >
                  View setup instructions →
                </Button>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Database Health Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5 text-[#4682B4]" />
            Database Status
          </CardTitle>
          <CardDescription>
            Current state of the Best Brightness database
          </CardDescription>
        </CardHeader>
        <CardContent>
          {dbHealth ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600">Tables</div>
                <div className="text-2xl font-medium text-gray-900">
                  {dbHealth.tableCount}/12
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {dbHealth.missingTables.length > 0 
                    ? `${dbHealth.missingTables.length} missing`
                    : 'All tables present'
                  }
                </div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600">Demo Data</div>
                <div className="text-2xl font-medium text-gray-900">
                  {dbHealth.hasData ? 'Yes' : 'No'}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {dbHealth.hasData ? 'Sample products loaded' : 'No demo data found'}
                </div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600">Status</div>
                <div className="text-2xl font-medium text-gray-900">
                  {dbHealth.isHealthy ? 'Ready' : 'Setup Needed'}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {dbHealth.isHealthy ? 'Database operational' : 'Requires initialization'}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <Database className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Click refresh to check database status</p>
            </div>
          )}

          {dbHealth?.missingTables && dbHealth.missingTables.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Missing Tables:</h4>
              <div className="flex flex-wrap gap-2">
                {dbHealth.missingTables.map((table) => (
                  <Badge key={table} variant="outline" className="text-red-600 border-red-200">
                    {table}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Setup Progress */}
      {isSetupRunning && (
        <Card>
          <CardHeader>
            <CardTitle>Database Setup in Progress</CardTitle>
            <CardDescription>
              Please wait while we initialize your database...
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">{currentStep}</span>
                  <span className="text-sm text-gray-500">{Math.round(setupProgress)}%</span>
                </div>
                <Progress value={setupProgress} className="h-3" />
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center">
                  <RefreshCw className="w-5 h-5 text-blue-600 animate-spin mr-3" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">Setting up database...</p>
                    <p className="text-xs text-blue-700 mt-1">This may take a few minutes to complete.</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Setup Complete */}
      {setupComplete && !isSetupRunning && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <strong>Database setup completed successfully!</strong>
            <br />
            Your Best Brightness e-commerce platform is now ready to use with demo products, categories, and promotions.
          </AlertDescription>
        </Alert>
      )}

      {/* Error Alert */}
      {setupError && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>Database setup failed:</strong>
            <br />
            {setupError}
            {setupError.includes('exec_sql') && (
              <Button
                variant="link"
                size="sm"
                onClick={() => setShowManualSetup(true)}
                className="p-0 h-auto text-red-700 hover:text-red-900 ml-1"
              >
                View manual setup instructions →
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Action Buttons */}
      <Card>
        <CardHeader>
          <CardTitle>Database Actions</CardTitle>
          <CardDescription>
            Initialize or manage your database setup
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              onClick={handleSetupDatabase}
              disabled={isSetupRunning || isCheckingHealth || execSqlAvailable === false}
              className="bg-[#4682B4] hover:bg-[#2C3E50] text-white min-w-[200px]"
            >
              {isSetupRunning ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Setting up...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Initialize Database
                </>
              )}
            </Button>

            {execSqlAvailable === false && (
              <Button
                variant="outline"
                onClick={handleCreateExecSql}
                disabled={isSetupRunning}
                className="min-w-[200px] border-yellow-200 text-yellow-700 hover:bg-yellow-50"
              >
                <Settings className="w-4 h-4 mr-2" />
                Try Auto-Setup exec_sql
              </Button>
            )}

            <Button
              variant="outline"
              onClick={() => setShowManualSetup(true)}
              disabled={isSetupRunning || isCheckingHealth}
              className="min-w-[150px]"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Manual Setup
            </Button>
          </div>

          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-900 mb-2">What gets created:</h4>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• Complete database schema with 12 tables</li>
              <li>• Product categories and sample cleaning products</li>
              <li>• Promotion and combo deal structures</li>
              <li>• User roles and security policies</li>
              <li>• Order management and payment tracking</li>
              <li>• Review and rating system</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Manual Setup Dialog */}
      <Dialog open={showManualSetup} onOpenChange={setShowManualSetup}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Manual Database Setup
            </DialogTitle>
            <DialogDescription>
              Follow these steps to manually set up your database
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Step 1: Create exec_sql Function</h3>
              <p className="text-sm text-gray-600 mb-3">
                Copy and paste this SQL into your Supabase SQL Editor:
              </p>
              
              <div className="relative">
                <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
                  <code>{MANUAL_EXEC_SQL_SCRIPT}</code>
                </pre>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(MANUAL_EXEC_SQL_SCRIPT)}
                  className="absolute top-2 right-2"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Step 2: Access Supabase SQL Editor</h3>
              <ol className="text-sm text-gray-600 space-y-2 list-decimal list-inside">
                <li>Go to your Supabase project dashboard</li>
                <li>Navigate to the "SQL Editor" section</li>
                <li>Create a new query</li>
                <li>Paste the code from Step 1</li>
                <li>Click "Run" - you should see "Success" as the result</li>
              </ol>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Step 3: Return and Initialize</h3>
              <p className="text-sm text-gray-600 mb-3">
                Once the exec_sql function is created, close this dialog and click "Initialize Database" again.
              </p>
            </div>

            <Alert className="border-blue-200 bg-blue-50">
              <AlertTriangle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                <strong>Important:</strong> Make sure you're using your Service Role Key, not the anon key, 
                for database setup operations. The Service Role Key can be found in your Supabase project settings.
              </AlertDescription>
            </Alert>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowManualSetup(false)}>
                Close
              </Button>
              <Button 
                onClick={() => {
                  setShowManualSetup(false);
                  testExecSql();
                }}
                className="bg-[#4682B4] hover:bg-[#2C3E50] text-white"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Test Again
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}