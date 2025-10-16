import React from 'react';
import LoadingSpinner from './LoadingSpinner';
import LoadingTimeout from './LoadingTimeout';

interface AppLoadingProps {
  onTimeout: () => void;
}

export default function AppLoading({ onTimeout }: AppLoadingProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <LoadingTimeout onTimeout={onTimeout} />
      <div className="text-center">
        <LoadingSpinner size="large" />
        <p className="mt-4 text-sm text-gray-600">Loading Best Brightness...</p>
        <p className="mt-2 text-xs text-gray-500">
          This is taking longer than usual. The app will load automatically in a few seconds.
        </p>
      </div>
    </div>
  );
}