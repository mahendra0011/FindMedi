/**
 * Lab-tests feature — React hooks.
 */
import { useQuery } from '@tanstack/react-query';
import { labApi, testsApi } from './api';

export function useLabTests() {
  return useQuery({
    queryKey: ['lab-tests'],
    queryFn: () => testsApi.get(),
  });
}

export function useLabStats() {
  return useQuery({
    queryKey: ['lab-stats'],
    queryFn: () => labApi.getStats(),
  });
}

export function useLabBookings() {
  return useQuery({
    queryKey: ['lab-bookings'],
    queryFn: () => labApi.getBookings(),
  });
}
