import { QueryClient } from '@tanstack/react-query';

// Optimized QueryClient configuration for production
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Stale time: 10 minutes - keep dashboard data fresh without constant refetches
      staleTime: 10 * 60 * 1000,
      // Cache time: 30 minutes - keep data in memory longer
      gcTime: 30 * 60 * 1000,
      // Retry failed requests
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // ⭐ CRITICAL FIX: Don't refetch on every window focus (was causing repeated queries)
      // This was making dashboard slower each time you switched tabs
      refetchOnWindowFocus: false,
      // Refetch on mount if the data is already there
      refetchOnMount: false,
    },
    mutations: {
      // Retry failed mutations once
      retry: 1,
    },
  },
});
