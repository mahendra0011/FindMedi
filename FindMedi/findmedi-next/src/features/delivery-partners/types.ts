/** delivery-partners feature — API response types. */
export interface DeliveryPartnersItem {
  _id: string;
  name?: string;
  [key: string]: unknown;
}

export interface DeliveryPartnersStats {
  total: number;
  [key: string]: unknown;
}
