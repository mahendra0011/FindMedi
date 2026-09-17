/** Delivery feature — API response types. */
export interface DeliveryProfile {
  _id: string;
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  pincode?: string;
  vehicleType?: string;
  vehicleNumber?: string;
  status?: string;
  isOnline?: boolean;
  isAvailable?: boolean;
  availability?: string;
  workZone?: string[];
  bankDetails?: {
    accountNo?: string;
    ifsc?: string;
    holderName?: string;
    upiId?: string;
  };
  emergencyContact?: { name?: string; phone?: string };
  rating?: number | string;
  totalDeliveries?: number;
  createdAt?: string;
  rejectionReason?: string;
  aadharDoc?: string;
  panDoc?: string;
  photo?: string;
  drivingLicenseDoc?: string;
  vehicleRcDoc?: string;
  insuranceDoc?: string;
  [key: string]: unknown;
}

export interface DeliveryTask {
  _id: string;
  orderId?: string;
  status: string;
  pickupAddress?: string;
  dropAddress?: string;
  deliveryOtp?: string;
  deliveredAt?: string;
  createdAt?: string;
  orderRef?: {
    phone?: string;
    total?: number;
  };
  trackingHistory?: Array<{ timestamp: string; status?: string }>;
  [key: string]: unknown;
}

export interface MyDeliveries {
  active: DeliveryTask[];
  history: DeliveryTask[];
}

export interface DeliveryReview {
  _id: string;
  rating?: number;
  comment?: string;
  userName?: string;
  patientName?: string;
  createdAt: string;
  deliveryPartnerId?: string;
  targetId?: string;
  [key: string]: unknown;
}

export interface DeliveryZoneForm {
  workZone: string[];
  availability: string;
}

export interface DeliverySettingsForm {
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  pincode: string;
  emergencyContact: { name: string; phone: string };
}
