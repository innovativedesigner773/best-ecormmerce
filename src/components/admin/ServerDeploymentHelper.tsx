import React, { useState } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { 
  Server, 
  ExternalLink, 
  Copy, 
  CheckCircle, 
  AlertTriangle, 
  Terminal,
  Download,
  Rocket
} from 'lucide-react';
import { projectId } from '../../utils/supabase/info';

export default function ServerDeploymentHelper() {
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null);

  const copyToClipboard = async (text: string, commandType: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCommand(commandType);
      setTimeout(() => setCopiedCommand(null), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const deploymentCommands = [
    {
      id: 'install-cli',
      title: 'Install Supabase CLI',
      description: 'Install the Supabase CLI tool',
      commands: {
        macOS: 'brew install supabase/tap/supabase',
        Windows: 'scoop install supabase',
        Linux: 'curl -fsSL https://raw.githubusercontent.com/supabase/cli/main/install.sh | sh'
      }
    },
    {
      id: 'login',
      title: 'Login to Supabase',
      description: 'Authenticate with your Supabase account',
      commands: {
        all: 'supabase login'
      }
    },
    {
      id: 'link',
      title: 'Link to Project',
      description: `Link to your Best Brightness project`,
      commands: {
        all: `supabase link --project-ref ${projectId}`
      }
    },
    {
      id: 'deploy',
      title: 'Deploy Edge Function',
      description: 'Deploy your server function to Supabase',
      commands: {
        all: 'supabase functions deploy server'
      }
    },
    {
      id: 'set-secrets',
      title: 'Set Environment Variables (Optional)',
      description: 'Set your barcode lookup API key',
      commands: {
        all: 'supabase secrets set BARCODE_LOOKUP_API_KEY=your_api_key_here'
      }
    }
  ];

  const testUrls = [
    {
      name: 'Health Check',
      url: `https://${projectId}.supabase.co/functions/v1/make-server-8880f2f2/health`,
      description: 'Basic server health check'
    },
    {
      name: 'Database Test',
      url: `https://${projectId}.supabase.co/functions/v1/make-server-8880f2f2/test-db`,
      description: 'Test database connectivity'
    },
    {
      name: 'Products API',
      url: `https://${projectId}.supabase.co/functions/v1/make-server-8880f2f2/products`,
      description: 'Get all products'
    }
  ];

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Server className="h-8 w-8 text-[#4682B4]" />
          <h1 className="text-3xl font-bold text-[#2C3E50]">Server Deployment Helper</h1>
        </div>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Your Best Brightness Edge Function needs to be deployed to Supabase to enable server features like barcode scanning, product management, and user registration.
        </p>
      </div>

      {/* Current Status */}
      <Alert className="border-yellow-500 bg-yellow-50">
        <AlertTriangle className="h-4 w-4 text-yellow-600" />
        <AlertDescription className="text-yellow-800">
          <strong>Server Not Deployed:</strong> Your Edge Function is not accessible. Follow the steps below to deploy it.
        </AlertDescription>
      </Alert>

      {/* Quick Deploy Option */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Rocket className="h-6 w-6 text-[#4682B4]" />
          <h2 className="text-xl font-semibold text-[#2C3E50]">Quick Deploy Options</h2>
        </div>
        
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <div className="border rounded-lg p-4">
            <h3 className="font-medium mb-2 flex items-center gap-2">
              <Terminal className="h-4 w-4" />
              Automated Script
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              Run our deployment script that handles everything automatically.
            </p>
            <div className="bg-gray-900 text-green-400 p-3 rounded font-mono text-sm mb-3">
              node deploy-server.js
            </div>
            <Button
              size="sm"
              onClick={() => copyToClipboard('node deploy-server.js', 'auto-script')}
              className="gap-2"
            >
              {copiedCommand === 'auto-script' ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copiedCommand === 'auto-script' ? 'Copied!' : 'Copy Command'}
            </Button>
          </div>

          <div className="border rounded-lg p-4">
            <h3 className="font-medium mb-2 flex items-center gap-2">
              <ExternalLink className="h-4 w-4" />
              Manual Dashboard
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              Deploy directly through the Supabase Dashboard interface.
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.open('https://supabase.com/dashboard/projects', '_blank')}
              className="gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Open Dashboard
            </Button>
          </div>
        </div>
      </Card>

      {/* Step by Step Instructions */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Terminal className="h-6 w-6 text-[#4682B4]" />
          <h2 className="text-xl font-semibold text-[#2C3E50]">Step-by-Step CLI Deployment</h2>
        </div>

        <div className="space-y-6">
          {deploymentCommands.map((step, index) => (
            <div key={step.id} className="border rounded-lg p-4">
              <div className="flex items-start gap-4">
                <Badge variant="outline" className="mt-1">
                  {index + 1}
                </Badge>
                <div className="flex-1">
                  <h3 className="font-medium mb-1">{step.title}</h3>
                  <p className="text-sm text-gray-600 mb-3">{step.description}</p>
                  
                  {step.commands.all ? (
                    <div className="bg-gray-900 text-green-400 p-3 rounded font-mono text-sm mb-3 flex items-center justify-between">
                      <span>{step.commands.all}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(step.commands.all!, step.id)}
                        className="text-green-400 hover:text-green-300 p-1 h-auto"
                      >
                        {copiedCommand === step.id ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {Object.entries(step.commands).map(([os, command]) => (
                        <div key={os} className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {os}
                          </Badge>
                          <div className="bg-gray-900 text-green-400 p-2 rounded font-mono text-sm flex-1 flex items-center justify-between">
                            <span>{command}</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => copyToClipboard(command, `${step.id}-${os}`)}
                              className="text-green-400 hover:text-green-300 p-1 h-auto"
                            >
                              {copiedCommand === `${step.id}-${os}` ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Test URLs */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <CheckCircle className="h-6 w-6 text-[#4682B4]" />
          <h2 className="text-xl font-semibold text-[#2C3E50]">Test Your Deployment</h2>
        </div>
        
        <p className="text-gray-600 mb-4">
          After deployment, test these URLs to verify your server is working:
        </p>

        <div className="grid gap-3">
          {testUrls.map((test) => (
            <div key={test.name} className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <div className="font-medium">{test.name}</div>
                <div className="text-sm text-gray-600">{test.description}</div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(test.url, `test-${test.name}`)}
                >
                  {copiedCommand === `test-${test.name}` ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
                <Button
                  size="sm"
                  onClick={() => window.open(test.url, '_blank')}
                  className="gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  Test
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Success Message */}
      <Alert className="border-green-500 bg-green-50">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          <strong>After successful deployment:</strong> Refresh your Best Brightness app and the "Server Connection Issue" banner will disappear. All server features including barcode scanning will be fully functional.
        </AlertDescription>
      </Alert>
    </div>
  );
}