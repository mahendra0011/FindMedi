/** Radiology feature — API response types. */
export type RadiologyStatus = 'Ordered' | 'Scheduled' | 'In Progress' | 'Completed' | 'Reported' | 'Delivered';

export interface RadiologyOrder {
  _id: string;
  orderId?: string;
  patientName: string;
  patientId?: string;
  modality: string;
  bodyPart?: string;
  doctorName?: string;
  status: RadiologyStatus;
  priority?: string;
  createdAt: string;
  scheduledAt?: string;
  performedBy?: string;
  clinicalHistory?: string;
  findings?: string;
  impression?: string;
  reportedAt?: string;
}

export interface RadiologyStats {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  reported: number;
}
