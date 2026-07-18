import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

/**
 * Standardized React Query hook for GET requests
 * @param {Array|string} key - Query key (e.g., ['doctors'] or ['doctor', id])
 * @param {Function} apiFn - API function to call (e.g., () => api.getDoctors())
 * @param {Object} options - Additional React Query options
 */
export function useApiQuery(key, apiFn, options = {}) {
  const {
    enabled = true,
    staleTime = 30000,        // 30s default stale time
    cacheTime = 5 * 60 * 1000, // 5min cache
    refetchOnWindowFocus = false,
    onError,
    ...restOptions
  } = options;

  return useQuery({
    queryKey: Array.isArray(key) ? key : [key],
    queryFn: apiFn,
    enabled,
    staleTime,
    gcTime: cacheTime,
    refetchOnWindowFocus,
    onError: (err) => {
      console.error(`Query error [${key}]:`, err);
      if (onError) onError(err);
    },
    ...restOptions,
  });
}

/**
 * Standardized React Query hook for POST/PUT/DELETE requests
 * @param {Function} apiFn - API function to call
 * @param {Object} options - Options including invalidateKeys, successMessage, onSuccess, onError
 */
export function useApiMutation(apiFn, options = {}) {
  const queryClient = useQueryClient();
  const {
    invalidateKeys = [],     // Keys to invalidate after success (e.g., ['doctors'])
    successMessage,
    errorMessage = 'Operation failed',
    onSuccess,
    onError,
    showToast = true,
    ...restOptions
  } = options;

  return useMutation({
    mutationFn: apiFn,
    onSuccess: (data, variables, context) => {
      // Invalidate related queries
      if (invalidateKeys.length > 0) {
        invalidateKeys.forEach(key => {
          queryClient.invalidateQueries({ queryKey: Array.isArray(key) ? key : [key] });
        });
      }
      
      // Show success toast
      if (showToast && successMessage) {
        toast.success(successMessage);
      }
      
      if (onSuccess) onSuccess(data, variables, context);
    },
    onError: (err, variables, context) => {
      console.error('Mutation error:', err);
      if (showToast) {
        toast.error(err?.message || errorMessage);
      }
      if (onError) onError(err, variables, context);
    },
    ...restOptions,
  });
}

/**
 * Hook for paginated queries
 */
export function usePaginatedQuery(key, apiFn, { page = 1, limit = 20, ...params } = {}) {
  return useApiQuery(
    [...(Array.isArray(key) ? key : [key]), { page, limit, ...params }],
    () => apiFn({ page, limit, ...params }),
    { keepPreviousData: true }
  );
}