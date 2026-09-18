/**
 * Saved addresses feature — API wrappers.
 * Placeholder implementations — real endpoints should be added to @/lib/api when the backend is ready.
 */
import type { AddressItem, AddressForm } from './types';

export const getAddresses = (): Promise<{ addresses: AddressItem[] }> => Promise.resolve({ addresses: [] });

export const createAddress = (body: AddressForm): Promise<{ _id: string }> => {
  void body;
  return Promise.resolve({ _id: `ad-${crypto.randomUUID()}` });
};

export const updateAddress = (id: string, body: AddressForm): Promise<Record<string, unknown>> => {
  void id;
  void body;
  return Promise.resolve({});
};

export const deleteAddress = (id: string): Promise<Record<string, unknown>> => {
  void id;
  return Promise.resolve({});
};
