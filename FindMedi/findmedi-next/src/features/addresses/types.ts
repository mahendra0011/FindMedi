/** Saved addresses feature — API response types. */
export interface AddressItem {
  _id: string;
  label: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  isDefault: boolean;
}

export interface AddressForm {
  label: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  isDefault: boolean;
}
