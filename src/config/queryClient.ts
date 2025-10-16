import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (renamed from cacheTime)
      retry: (failureCount, error: any) => {
        // Don't retry on authentication errors or network errors
        if (error?.status === 401 || error?.status === 403 || error?.name === 'TypeError') {
          return false;
        }
        return failureCount < 2; // Reduced retry attempts
      },
      refetchOnWindowFocus: false, // Disable refetch on window focus to prevent unnecessary requests
    },
  },
});