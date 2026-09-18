/** Blood Bank feature — API response types. */
export interface BloodUnit {
  _id: string;
  unitId: string;
  bloodGroup: string;
  status: 'Available' | 'Issued' | 'Expired' | 'Reserved';
  volume: number;
  components: string[];
  donorName?: string;
  donationDate?: string;
  expiryDate?: string;
  hiv: 'Negative' | 'Positive';
  hbsag: 'Negative' | 'Positive';
  hcv: 'Negative' | 'Positive';
  malaria: 'Negative' | 'Positive';
  vdrl: 'Negative' | 'Positive';
}

export interface BloodRequest {
  _id: string;
  requestId: string;
  patientName: string;
  patientId: string;
  bloodGroup: string;
  unitsRequired: number;
  priority: 'Routine' | 'Urgent' | 'Emergency';
  status: 'Pending' | 'Cross-Matching' | 'Issued' | 'Transfusing' | 'Completed' | 'Reaction';
  reason: string;
  doctorName: string;
  createdAt: string;
  crossMatchResult?: 'Compatible' | 'Incompatible';
  crossMatchTechnician?: string;
  transfusionStartTime?: string;
  transfusionCompleteTime?: string;
  reactionReported?: boolean;
  reactionType?: string;
  reactionSeverity?: 'Mild' | 'Moderate' | 'Severe';
}

export interface BloodBankStats {
  total: number;
  available: number;
  issued: number;
  pending: number;
  crossMatching: number;
  expired: number;
}