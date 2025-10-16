import React from 'react';

interface LoadingTimeoutProps {
  onTimeout: () => void;
  timeoutMs?: number;
}

export default function LoadingTimeout({ onTimeout, timeoutMs = 5000 }: LoadingTimeoutProps) {
  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      console.log('⏰ Loading timeout reached - forcing app to load');
      onTimeout();
    }, timeoutMs);

    return () => clearTimeout(timeoutId);
  }, [onTimeout, timeoutMs]);

  return null;
}