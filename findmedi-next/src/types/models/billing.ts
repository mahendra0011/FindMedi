import type { BaseEntity } from '@/types/api';
import type { BillingStatus, PaymentMethod } from '@/types/enums';

export type BillingSource =
  | 'manual'
  | 'appointment'
  | 'lab'
  | 'pharmacy'
  | 'ipd'
  | 'ot'
  | 'radiology'
  | 'physio'
  | 'diet';

export interface BillingItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  quantity: number;
  category: string;
  discount: number;
}

export interface InsuranceInfo {
  provider: string;
  planType: string;
}

export interface Billing extends BaseEntity {
  invoiceId: string;
  patient: string;
  patientId?: string;
  doctor?: string;
  doctorId?: string;
  appointmentId?: string;
  admissionId?: string;
  service: string;
  services: BillingItem[];
  source: BillingSource;
  amount: number;
  subTotal: number;
  discount: number;
  tax: number;
  taxRate: number;
  taxableAmount: number;
  paid: number;
  balance: number;
  status: BillingStatus;
  date: string;
  dueDate?: string;
  paymentMethod?: PaymentMethod;
  transactionId?: string;
  insuranceClaimId?: string;
  insuranceApprovedAmount: number;
  insuranceStatus: 'Not Submitted' | 'Submitted' | 'Approved' | 'Rejected' | 'Partial';
  hospitalId?: string;
  facilityId?: string;
}

export type Bill = Billing;
