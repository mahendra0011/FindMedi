/** Insurance feature — API response types. */
export interface InsuranceClaim {
  _id: string;
  patientName?: string;
  patientId?: string;
  insuranceProvider?: string;
  policyNumber?: string;
  insuranceId?: string;
  tpaName?: string;
  tpaContact?: string;
  coverageType?: string;
  diagnosis?: string;
  treatmentPlan?: string;
  estimatedCost?: string;
  claimId?: string;
  preAuthStatus?: string;
  claimStatus?: string;
  createdAt?: string;
  preAuthAmount?: number;
  approvedAmount?: number;
}

export interface InsuranceStats {
  total: number;
  pending: number;
  approved: number;
  filed: number;
  settled: number;
  cashless: number;
}

export interface InsuranceClaimForm {
  patientName: string;
  patientId: string;
  insuranceProvider: string;
  policyNumber: string;
  insuranceId: string;
  tpaName: string;
  tpaContact: string;
  coverageType: string;
  diagnosis: string;
  treatmentPlan: string;
  estimatedCost: string;
}
