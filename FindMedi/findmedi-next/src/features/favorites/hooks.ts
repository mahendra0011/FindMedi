/**
 * Favorites feature — React hooks.
 * Uses TanStack Query to wrap API calls with caching and background refresh.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getFavorites, removeFavorite } from './api';

export function useFavorites() {
  return useQuery({
    queryKey: ['patient-favorites'],
    queryFn: () => getFavorites(),
    staleTime: 60_000,
  });
}

export function useRemoveFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => removeFavorite(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['patient-favorites'] }),
  });
}
