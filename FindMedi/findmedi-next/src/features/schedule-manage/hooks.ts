import { useQuery } from '@tanstack/react-query';
import { getDoctorsForSchedule, getPendingScheduleRequests } from './api';
export function useScheduleDoctors() {
  return useQuery({ queryKey: ['schedule-doctors'], queryFn: getDoctorsForSchedule });
}
export function usePendingScheduleRequests() {
  return useQuery({ queryKey: ['pending-schedule-requests'], queryFn: getPendingScheduleRequests });
}
