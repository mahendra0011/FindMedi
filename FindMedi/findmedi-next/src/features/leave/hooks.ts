/**
 * Leave request feature — React hooks.
 * Uses TanStack Query to wrap API calls with caching and background refresh.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getLeaveRequests, createLeaveRequest } from './api';

export function useLeaveRequests() {
  return useQuery({
    queryKey: ['leave-requests'],
    queryFn: () => getLeaveRequests(),
    staleTime: 30_000,
  });
}

export function useCreateLeaveRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { leaveType: string; startDate: string; endDate: string; reason: string }) =>
      createLeaveRequest(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leave-requests'] }),
  });
}
