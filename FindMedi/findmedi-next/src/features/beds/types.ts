/** Bed management feature — API response types. */
export interface BedItem {
  _id: string;
  bedNumber: string;
  ward?: string;
  bedType?: string;
  dailyRate?: string | number;
  floor?: string;
  isAC?: boolean;
  status?: string;
  currentPatientName?: string;
}

export interface BedForm {
  bedNumber: string;
  ward: string;
  bedType: string;
  dailyRate: string;
  floor: string;
  isAC: boolean;
}

export interface BedStats {
  total: number;
  available: number;
  occupied: number;
  maintenance: number;
}
