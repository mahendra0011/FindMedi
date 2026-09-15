/**
 * Pharmacy-orders feature — types.
 * No dedicated model file yet; canonical shapes defined here.
 */
export type PharmacyOrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

export interface PharmacyOrderItem {
  medicineId: string;
  medicineName: string;
  quantity: number;
  price: number;
}

export interface PharmacyOrder {
  _id: string;
  items: PharmacyOrderItem[];
  total: number;
  status: PharmacyOrderStatus;
  createdAt: string;
  updatedAt: string;
}
