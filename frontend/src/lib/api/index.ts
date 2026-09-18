import { api } from './endpoints';
export { request, downloadFile, apiClient, setAuthTokens, clearAuthTokens, refreshAccessToken } from './client';
export { api } from './endpoints';
export * from './endpoints';
// Export legacy standalone download methods
export const downloadInvoicePdf = (billId: string, filename = 'invoice.pdf') => api.downloadInvoicePdf(billId, filename);
export const downloadPaymentInvoice = (txnId: string, filename = 'invoice.pdf') => api.downloadPaymentInvoice(txnId, filename);
export const downloadBillPdf = (txnId: string, filename = 'bill.pdf') => api.downloadBillPdf(txnId, filename);
export const downloadPrescriptionPdf = (recordId: string, filename = 'prescription.pdf') => api.downloadPrescriptionPdf(recordId, filename);

export function txToEarningsBill(t: Record<string, unknown>) {
  const created = t?.createdAt ? new Date(t.createdAt as string | number | Date) : new Date();
  const ist = new Date(created.getTime() + 5.5 * 60 * 60 * 1000);
  const iso = ist.toISOString();
  return {
    _id: t?._id as string | undefined,
    amount: Number(t?.amount) || 0,
    paid: t?.status === 'completed' ? Number(t?.amount) || 0 : 0,
    date: iso.slice(0, 10),
    time: iso.slice(11, 16),
    status: t?.status === 'completed' ? 'Paid'
      : t?.status === 'pending' ? 'Pending'
      : t?.status === 'failed' ? 'Failed'
      : t?.status === 'refunded' ? 'Refunded'
      : (t?.status as string | undefined),
    patient: (t?.patient_name as string) || (t?.patient as string) || 'Patient',
    service: t?.serviceType === 'appointment' ? 'Appointment'
      : t?.serviceType === 'test' ? 'Test'
      : t?.serviceType === 'medicine' ? 'Medicine'
      : ((t?.serviceType as string) || 'General'),
    method: t?.method as string | undefined,
    provider: t?.provider as string | undefined,
    transaction_id: t?.transaction_id as string | undefined,
    invoice_id: t?.invoice_id as string | undefined,
  };
}
// Re-export auth types from the API barrel so slices can import from '@/lib/api'
export type { AuthResponse, LoginCredentials, RegisterPayload } from '@/types/models/user';
