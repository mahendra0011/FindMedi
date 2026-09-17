/**
 * Leave request feature — API wrappers.
 * Re-exports the typed endpoint group so consumers import from one place.
 */
import { leaveRequests } from '@/lib/api';
import type { LeaveItem, LeaveBalance } from './types';

export const getLeaveRequests = async (): Promise<{ leaves: LeaveItem[]; balance: LeaveBalance }> => {
  const res = await leaveRequests.get({});
  return { leaves: res as unknown as LeaveItem[], balance: null };
};

export const createLeaveRequest = (body: {
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string;
}): Promise<Record<string, unknown>> => leaveRequests.create(body);
