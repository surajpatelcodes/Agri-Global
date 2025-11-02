import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

/**
 * Custom hook for Supabase queries with built-in error handling and caching
 */
export function useSupabaseQuery<T>(
  queryKey: string[],
  queryFn: () => Promise<T>,
  options?: {
    enabled?: boolean;
    staleTime?: number;
  }
) {
  const { toast } = useToast();

  return useQuery({
    queryKey,
    queryFn: async () => {
      try {
        return await queryFn();
      } catch (error) {
        console.error('Query error:', error);
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Failed to fetch data',
          variant: 'destructive',
        });
        throw error;
      }
    },
    staleTime: options?.staleTime,
    enabled: options?.enabled,
  });
}

/**
 * Custom hook for Supabase mutations with optimistic updates
 */
export function useSupabaseMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: {
    invalidateKeys?: string[][];
    successMessage?: string;
    errorMessage?: string;
  }
) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn,
    onSuccess: (data, variables) => {
      // Invalidate and refetch queries
      if (options?.invalidateKeys) {
        options.invalidateKeys.forEach((key) => {
          queryClient.invalidateQueries({ queryKey: key });
        });
      }

      // Show success message
      if (options?.successMessage) {
        toast({
          title: 'Success',
          description: options.successMessage,
        });
      }
    },
    onError: (error: Error, variables) => {
      console.error('Mutation error:', error);
      toast({
        title: 'Error',
        description: options?.errorMessage || (error instanceof Error ? error.message : 'Operation failed'),
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to get current authenticated user with caching
 */
export function useCurrentUser() {
  return useSupabaseQuery(
    ['currentUser'],
    async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      return user;
    },
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );
}
