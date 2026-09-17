/** Patient dashboard feature — local view-model types. */
export interface BillItem {
  _id: string;
  invoiceId?: string;
  service?: string;
  amount?: number;
  paid?: number;
  status?: string;
}

export interface ReportItem {
  _id: string;
  name: string;
  type: string;
  date: string;
  status: string;
  orderedBy: string;
  labName: string;
}

export interface DashboardNotificationItem {
  _id: string;
  title?: string;
  message?: string;
  read?: boolean;
}

export interface DashboardReviewItem {
  _id: string;
}

export interface PatientDashboardUser {
  _id?: string;
  id?: string;
  name?: string;
}
