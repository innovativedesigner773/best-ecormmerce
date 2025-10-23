import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { CheckCircle2, AlertTriangle, Eye, EyeOff, Copy, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

interface EnvStatus {
  supabaseUrl: boolean;
  anonKey: boolean;
  serviceRoleKey: boolean;
}

export default function EnvironmentSetup() {
  const [envStatus, setEnvStatus] = useState<EnvStatus>({
    supabaseUrl: false,
    anonKey: false,
    serviceRoleKey: false
  });
  const [showKeys, setShowKeys] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    checkEnvironmentVariables();
  }, []);

  const checkEnvironmentVariables = () => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY;
    const serviceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.REACT_APP_SUPABASE_SERVICE_ROLE_KEY;

    setEnvStatus({
      supabaseUrl: Boolean(supabaseUrl),
      anonKey: Boolean(anonKey),
      serviceRoleKey: Boolean(serviceRoleKey)
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const getStatusBadge = (status: boolean) => {
    return status ? (
      <Badge className="bg-green-100 text-green-800 border-green-200">
        <CheckCircle2 className="w-3 h-3 mr-1" />
        Set
      </Badge>
    ) : (
      <Badge className="bg-red-100 text-red-800 border-red-200">
        <AlertTriangle className="w-3 h-3 mr-1" />
        Missing
      </Badge>
    );
  };

  const getCurrentValues = () => {
    if (!isClient) return { supabaseUrl: '', anonKey: '', serviceRoleKey: '' };
    
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL || '';
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY || '';
    const serviceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.REACT_APP_SUPABASE_SERVICE_ROLE_KEY || '';

    return { supabaseUrl, anonKey, serviceRoleKey };
  };

  const currentValues = getCurrentValues();
  const allConfigured = Object.values(envStatus).every(Boolean);

  const envFileContent = `# Best Brightness - Supabase Configuration
# Add these to your .env file in the root of your project

# Your Supabase Project URL
VITE_SUPABASE_URL=your_project_url_here

# Your Supabase Anon Key (public key)
VITE_SUPABASE_ANON_KEY=your_anon_key_here

# Your Supabase Service Role Key (private key - keep secure!)
VITE_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
`;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-[#4682B4]" />
          Environment Configuration
        </CardTitle>
        <CardDescription>
          Configure your Supabase credentials for database access
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <div className="text-sm font-medium text-gray-900">Supabase URL</div>
              <div className="text-xs text-gray-500">Project endpoint</div>
            </div>
            {getStatusBadge(envStatus.supabaseUrl)}
          </div>
          
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <div className="text-sm font-medium text-gray-900">Anon Key</div>
              <div className="text-xs text-gray-500">Public access key</div>
            </div>
            {getStatusBadge(envStatus.anonKey)}
          </div>
          
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <div className="text-sm font-medium text-gray-900">Service Role Key</div>
              <div className="text-xs text-gray-500">Admin access key</div>
            </div>
            {getStatusBadge(envStatus.serviceRoleKey)}
          </div>
        </div>

        {/* Current Values (if any are set) */}
        {isClient && (currentValues.supabaseUrl || currentValues.anonKey || currentValues.serviceRoleKey) && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-gray-900">Current Configuration</h4>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowKeys(!showKeys)}
                className="text-xs"
              >
                {showKeys ? <EyeOff className="w-3 h-3 mr-1" /> : <Eye className="w-3 h-3 mr-1" />}
                {showKeys ? 'Hide' : 'Show'} Keys
              </Button>
            </div>
            
            <div className="space-y-3 text-sm">
              {currentValues.supabaseUrl && (
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-gray-600">SUPABASE_URL:</span>
                  <span className="font-mono text-xs">
                    {showKeys ? currentValues.supabaseUrl : '•••••••••••••••••••••••••••••••••••••••••••••'}
                  </span>
                </div>
              )}
              
              {currentValues.anonKey && (
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-gray-600">ANON_KEY:</span>
                  <span className="font-mono text-xs">
                    {showKeys ? currentValues.anonKey : '•••••••••••••••••••••••••••••••••••••••••••••'}
                  </span>
                </div>
              )}
              
              {currentValues.serviceRoleKey && (
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-gray-600">SERVICE_ROLE_KEY:</span>
                  <span className="font-mono text-xs">
                    {showKeys ? currentValues.serviceRoleKey : '•••••••••••••••••••••••••••••••••••••••••••••'}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Configuration Status */}
        {allConfigured ? (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <strong>Configuration complete!</strong>
              <br />
              All required Supabase credentials are configured. You can now initialize the database.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <strong>Configuration incomplete</strong>
              <br />
              Some Supabase credentials are missing. Database setup will not work until all credentials are provided.
            </AlertDescription>
          </Alert>
        )}

        {/* Setup Instructions */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3">Setup Instructions</h4>
          
          <div className="space-y-4 text-sm text-gray-600">
            <div>
              <h5 className="font-medium text-gray-900">1. Get your Supabase credentials</h5>
              <ul className="list-disc list-inside ml-4 space-y-1 mt-2">
                <li>Go to your <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline">Supabase Dashboard</a></li>
                <li>Select your project</li>
                <li>Go to Settings → API</li>
                <li>Copy the Project URL, anon key, and service_role key</li>
              </ul>
            </div>

            <div>
              <h5 className="font-medium text-gray-900">2. Create your .env file</h5>
              <p className="mt-2">Create a <code className="bg-gray-100 px-1 rounded">.env</code> file in your project root with:</p>
              
              <div className="relative mt-3">
                <pre className="bg-gray-900 text-gray-100 p-3 rounded-lg text-xs overflow-x-auto">
                  <code>{envFileContent}</code>
                </pre>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(envFileContent)}
                  className="absolute top-2 right-2"
                >
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
            </div>

            <div>
              <h5 className="font-medium text-gray-900">3. Restart your development server</h5>
              <p className="mt-2">After adding the environment variables, restart your development server to load the new configuration.</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center pt-4 border-t">
          <Button
            variant="outline"
            onClick={checkEnvironmentVariables}
            size="sm"
          >
            <AlertTriangle className="w-4 h-4 mr-2" />
            Recheck Configuration
          </Button>
          
          <Button
            variant="outline"
            onClick={() => window.open('https://supabase.com/dashboard', '_blank')}
            size="sm"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Open Supabase Dashboard
          </Button>
        </div>

        {!allConfigured && (
          <Alert className="border-yellow-200 bg-yellow-50">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              <strong>Security Note:</strong> Never commit your .env file to version control. 
              Add .env to your .gitignore file to keep your credentials secure.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}