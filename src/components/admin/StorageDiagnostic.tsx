import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle, RefreshCw, Upload, Database } from 'lucide-react';
import { StorageSetup } from '../../utils/storage-setup';

interface StorageHealth {
  bucketExists: boolean;
  bucketInfo: any;
  uploadTest: { success: boolean; error?: string };
  allBuckets: any[];
}

export default function StorageDiagnostic() {
  const [health, setHealth] = useState<StorageHealth | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const runHealthCheck = async () => {
    setLoading(true);
    try {
      const result = await StorageSetup.healthCheck();
      setHealth(result);
      setLastChecked(new Date());
    } catch (error) {
      console.error('Health check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runHealthCheck();
  }, []);

  const getStatusIcon = (success: boolean) => {
    return success ? (
      <CheckCircle className="w-5 h-5 text-green-500" />
    ) : (
      <XCircle className="w-5 h-5 text-red-500" />
    );
  };

  const getStatusColor = (success: boolean) => {
    return success ? 'text-green-700' : 'text-red-700';
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Database className="w-6 h-6 text-green-600" />
          <h2 className="text-xl font-semibold text-gray-900">Storage Diagnostic</h2>
        </div>
        <button
          onClick={runHealthCheck}
          disabled={loading}
          className="flex items-center space-x-2 px-4 py-2 bg-[#97CF50] text-white rounded-lg hover:bg-[#09215F] disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>{loading ? 'Checking...' : 'Refresh'}</span>
        </button>
      </div>

      {lastChecked && (
        <p className="text-sm text-gray-500 mb-4">
          Last checked: {lastChecked.toLocaleString()}
        </p>
      )}

      {health && (
        <div className="space-y-6">
          {/* Bucket Existence */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              {getStatusIcon(health.bucketExists)}
              <div>
                <h3 className="font-medium text-gray-900">Product Images Bucket</h3>
                <p className="text-sm text-gray-600">Storage bucket "product-images" exists</p>
              </div>
            </div>
            <span className={`font-medium ${getStatusColor(health.bucketExists)}`}>
              {health.bucketExists ? 'Found' : 'Missing'}
            </span>
          </div>

          {/* Bucket Configuration */}
          {health.bucketExists && health.bucketInfo && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Upload className="w-4 h-4 text-green-600" />
                  <span className="font-medium text-gray-900">Public Access</span>
                </div>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(health.bucketInfo.public)}
                  <span className={getStatusColor(health.bucketInfo.public)}>
                    {health.bucketInfo.public ? 'Public' : 'Private'}
                  </span>
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-orange-600" />
                  <span className="font-medium text-gray-900">Size Limit</span>
                </div>
                <span className="text-sm text-gray-600">
                  {Math.round(health.bucketInfo.file_size_limit / 1024 / 1024)}MB
                </span>
              </div>
            </div>
          )}

          {/* Upload Test */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              {getStatusIcon(health.uploadTest.success)}
              <div>
                <h3 className="font-medium text-gray-900">Upload Test</h3>
                <p className="text-sm text-gray-600">Test image upload functionality</p>
                {!health.uploadTest.success && health.uploadTest.error && (
                  <p className="text-sm text-red-600 mt-1">{health.uploadTest.error}</p>
                )}
              </div>
            </div>
            <span className={`font-medium ${getStatusColor(health.uploadTest.success)}`}>
              {health.uploadTest.success ? 'Working' : 'Failed'}
            </span>
          </div>

          {/* All Buckets */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-3">Available Storage Buckets</h3>
            <div className="space-y-2">
              {health.allBuckets.length > 0 ? (
                health.allBuckets.map((bucket) => (
                  <div key={bucket.id} className="flex items-center justify-between p-2 bg-white rounded border">
                    <span className="font-mono text-sm">{bucket.id}</span>
                    <span className="text-xs text-gray-500">
                      {bucket.public ? 'Public' : 'Private'}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500">No storage buckets found</p>
              )}
            </div>
          </div>

          {/* Setup Instructions */}
          {!health.bucketExists && (
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5" />
                <div>
                  <h3 className="font-medium text-orange-900">Storage Bucket Missing</h3>
                  <p className="text-sm text-orange-800 mt-1">
                    The "product-images" storage bucket doesn't exist. Follow these steps to fix:
                  </p>
                  <ol className="text-sm text-orange-800 mt-2 space-y-1 list-decimal list-inside">
                    <li>Go to your Supabase Dashboard → Storage</li>
                    <li>Create a new bucket named "product-images"</li>
                    <li>Enable "Public bucket" option</li>
                    <li>Set file size limit to 5MB</li>
                    <li>Run the SQL script in SUPABASE_STORAGE_SETUP.sql</li>
                  </ol>
                  <p className="text-sm text-orange-800 mt-2">
                    See <code className="bg-orange-100 px-1 rounded">STORAGE_BUCKET_SETUP_GUIDE.md</code> for detailed instructions.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {!health && !loading && (
        <div className="text-center py-8">
          <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">Unable to check storage status</p>
        </div>
      )}
    </div>
  );
}
