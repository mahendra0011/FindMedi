/** Leave request feature — API response types. */
export interface LeaveItem {
  _id: string;
  leaveType?: string;
  startDate?: string;
  endDate?: string;
  reason?: string;
  status: string;
  createdAt?: string;
  adminNotes?: string;
}

export interface LeaveBalanceEntry {
  total: number;
  used: number;
}

export type LeaveBalance = Record<string, LeaveBalanceEntry> | null;
