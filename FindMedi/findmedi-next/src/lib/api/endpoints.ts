/**
 * Typed API endpoint wrappers.
 *
 * Ported from client/src/lib/api.js — the single API surface the frontend uses
 * to talk to the Express/MongoDB backend.
 *
 * Each method delegates to `request<T>()` from `./client`, which handles
 * auth headers, CSRF tokens, auto token refresh, and transient error retries.
 *
 * The backend is kept SEPARATE from Next.js — Next.js consumes it as an
 * external API via the NEXT_PUBLIC_API_URL env var.
 */
import { request, downloadFile, getApiBaseUrl } from './client';
import { resolveFileUrl, withQuery } from '@/lib/utils';
import type { User, AuthResponse, LoginCredentials, RegisterPayload } from '@/types/models/user';
import type { Doctor } from '@/types/models/doctor';
import type { Hospital } from '@/types/models/hospital';
import type { Facility } from '@/types/models/facility';
import type { Appointment, AppointmentStats } from '@/types/models/appointment';
import type { Billing } from '@/types/models/billing';
import type { Prescription } from '@/types/models/prescription';
import type { ListParams } from '@/types/api';

export { getApiBaseUrl, resolveFileUrl };

// ─── Auth endpoints ─────────────────────────────────────────────────────────

export const auth = {
  login: (credentials: LoginCredentials): Promise<AuthResponse> =>
    request<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  register: (body: RegisterPayload): Promise<{ user: User; token: string; refreshToken: string; requiresVerification?: boolean }> =>
    request<{ user: User; token: string; refreshToken: string; requiresVerification?: boolean }>('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  googleAuth: (body: { credential: string; role: string }): Promise<AuthResponse> =>
    request<AuthResponse>('/auth/google', { method: 'POST', body: JSON.stringify(body) }),
  verifyOTP: (body: { email: string; otp: string }): Promise<AuthResponse> =>
    request<AuthResponse>('/auth/verify-otp', { method: 'POST', body: JSON.stringify(body) }),
  resendOTP: (body: { email: string; purpose?: string }): Promise<{ message: string }> =>
    request<{ message: string }>('/auth/resend-otp', { method: 'POST', body: JSON.stringify(body) }),
  forgotPassword: (body: { email: string }): Promise<{ message: string }> =>
    request<{ message: string }>('/auth/forgot-password', { method: 'POST', body: JSON.stringify(body) }),
  resetPassword: (body: { email: string; otp: string; password: string }): Promise<{ message: string }> =>
    request<{ message: string }>('/auth/reset-password', { method: 'POST', body: JSON.stringify(body) }),
  logout: (): Promise<{ message: string }> => request('/auth/logout', { method: 'POST' }),
  me: (): Promise<User> => request<User>('/auth/me'),
  updateProfile: (body: Partial<User>): Promise<User> =>
    request<User>('/auth/profile', { method: 'PUT', body: JSON.stringify(body) }),
  changePassword: (body: { currentPassword: string; newPassword: string }): Promise<{ message: string }> =>
    request<{ message: string }>('/auth/change-password', { method: 'PUT', body: JSON.stringify(body) }),
  uploadAvatar: (file: File): Promise<{ url: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    return request<{ url: string }>('/auth/avatar', { method: 'POST', body: formData });
  },
  uploadFile: (file: File, options?: { uploadType?: string; purpose?: string; createRecord?: boolean }): Promise<Record<string, unknown>> => {
    const formData = new FormData();
    formData.append('file', file);
    if (options?.uploadType) formData.append('uploadType', options.uploadType);
    if (options?.purpose) formData.append('purpose', options.purpose);
    if (options?.createRecord !== undefined) formData.append('createRecord', String(options.createRecord));
    return request('/upload', { method: 'POST', body: formData });
  },

  get2FAStatus: (): Promise<{ enabled: boolean }> => request('/auth/2fa/status'),
  setup2FA: (): Promise<{ qrCode: string; secret: string }> => request('/auth/2fa/setup', { method: 'POST' }),
  verify2FA: (body: { token: string }): Promise<{ verified: boolean }> =>
    request<{ verified: boolean }>('/auth/2fa/verify', { method: 'POST', body: JSON.stringify(body) }),
  disable2FA: (body: { token: string }): Promise<{ disabled: boolean }> =>
    request<{ disabled: boolean }>('/auth/2fa/disable', { method: 'POST', body: JSON.stringify(body) }),

  getMyHospital: (): Promise<Hospital> => request<Hospital>('/hospitals/admin/mine'),
};

// ─── User / Patient endpoints ──────────────────────────────────────────────

export const users = {
  get: (params: ListParams = {}): Promise<User[]> => request<User[]>(withQuery('/users', { ...params })),
  getOne: (id: string): Promise<User> => request<User>(`/users/${id}`),
  create: (body: Partial<User>): Promise<User> =>
    request<User>('/users', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: string, body: Partial<User>): Promise<User> =>
    request<User>(`/users/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (id: string): Promise<{ message: string }> =>
    request<{ message: string }>(`/users/${id}`, { method: 'DELETE' }),
  block: (id: string): Promise<User> => request<User>(`/users/${id}/block`, { method: 'PUT' }),
  flag: (id: string, body: { reason?: string }): Promise<User> =>
    request<User>(`/users/${id}/flag`, { method: 'PUT', body: JSON.stringify(body) }),
  unflag: (id: string): Promise<User> => request<User>(`/users/${id}/unflag`, { method: 'PUT' }),
};

// ─── Doctor endpoints ──────────────────────────────────────────────────────

export const doctors = {
  get: (params: ListParams = {}): Promise<Doctor[]> => request<Doctor[]>(withQuery('/doctors', { ...params })),
  getOne: (id: string): Promise<Doctor> => request<Doctor>(`/doctors/${id}`),
  create: (body: Partial<Doctor>): Promise<Doctor> =>
    request<Doctor>('/doctors', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: string, body: Partial<Doctor>): Promise<Doctor> =>
    request<Doctor>(`/doctors/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (id: string): Promise<{ message: string }> =>
    request<{ message: string }>(`/doctors/${id}`, { method: 'DELETE' }),
  approve: (id: string): Promise<Doctor> => request<Doctor>(`/doctors/${id}/approve`, { method: 'PUT' }),
  reject: (id: string): Promise<Doctor> => request<Doctor>(`/doctors/${id}/reject`, { method: 'PUT' }),
  uploadSignature: (id: string, file: File): Promise<{ url: string }> => {
    const formData = new FormData();
    formData.append('signature', file);
    return request<{ url: string }>(`/doctors/${id}/signature`, { method: 'POST', body: formData });
  },
  updateSchedule: (id: string, schedule: Record<string, unknown>): Promise<Doctor> =>
    request<Doctor>(`/doctors/${id}/schedule`, { method: 'PUT', body: JSON.stringify(schedule) }),
  getAutoConfirmList: (): Promise<Record<string, unknown>> => request('/doctors/my-facility/auto-confirm'),
  updateAutoConfirm: (id: string, value: boolean): Promise<Doctor> =>
    request<Doctor>(`/doctors/${id}/auto-confirm`, { method: 'PUT', body: JSON.stringify({ autoConfirmAppointment: value }) }),
  getMyAutoConfirm: (): Promise<Record<string, unknown>> => request('/doctors/me/auto-confirm'),
  getMySlotCapacity: (): Promise<{ maxBookingsPerSlot: number }> => request('/doctors/me/slot-capacity'),
  updateMySlotCapacity: (n: number): Promise<Record<string, unknown>> =>
    request('/doctors/me/slot-capacity', { method: 'PUT', body: JSON.stringify({ maxBookingsPerSlot: n }) }),
  updateSlotCapacity: (id: string, n: number): Promise<Doctor> =>
    request<Doctor>(`/doctors/${id}/slot-capacity`, { method: 'PUT', body: JSON.stringify({ maxBookingsPerSlot: n }) }),
  getAnalytics: (params?: { doctorId?: string }): Promise<Record<string, unknown>> =>
    request<Record<string, unknown>>(withQuery('/analytics/doctor', params || {})),
};

// ─── Hospital endpoints ────────────────────────────────────────────────────

export const hospitals = {
  get: (params: ListParams = {}): Promise<Hospital[]> => request<Hospital[]>(withQuery('/hospitals', { ...params })),
  getOne: (id: string): Promise<Hospital> => request<Hospital>(`/hospitals/${id}`),
  register: (body: Partial<Hospital>): Promise<Hospital> =>
    request<Hospital>('/hospitals/register', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: string, body: Partial<Hospital>): Promise<Hospital> =>
    request<Hospital>(`/hospitals/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  approve: (id: string): Promise<Hospital> => request<Hospital>(`/hospitals/${id}/approve`, { method: 'PUT' }),
  reject: (id: string, body: { reason: string }): Promise<Hospital> =>
    request<Hospital>(`/hospitals/${id}/reject`, { method: 'PUT', body: JSON.stringify(body) }),
  suspend: (id: string): Promise<Hospital> => request<Hospital>(`/hospitals/${id}/suspend`, { method: 'PUT' }),
  delete: (id: string): Promise<{ message: string }> =>
    request<{ message: string }>(`/hospitals/${id}`, { method: 'DELETE' }),
  getPending: (): Promise<Hospital[]> => request<Hospital[]>('/hospitals/pending'),
};

// ─── Facility endpoints ─────────────────────────────────────────────────────

export const facilities = {
  get: (params: ListParams = {}): Promise<Facility[]> => request<Facility[]>(withQuery('/facilities', { ...params })),
  getOne: (id: string): Promise<Facility> => request<Facility>(`/facilities/${id}`),
  register: (body: Partial<Facility>): Promise<Facility> =>
    request<Facility>('/facilities/register', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: string, body: Partial<Facility>): Promise<Facility> =>
    request<Facility>(`/facilities/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  getMine: (): Promise<Facility> => request<Facility>('/facilities/mine'),
  getSettings: (): Promise<Record<string, unknown>> => request('/facilities/settings'),
  updateSettings: (body: Record<string, unknown>): Promise<Record<string, unknown>> =>
    request('/facilities/settings', { method: 'PUT', body: JSON.stringify(body) }),
  getPending: (type?: string): Promise<Facility[]> =>
    request<Facility[]>(withQuery('/facilities/pending', type ? { type } : {})),
  getClinics: (params: ListParams = {}): Promise<Facility[]> =>
    request<Facility[]>(withQuery('/facilities', { ...params, type: 'clinic' })),
};

// ─── Appointment endpoints ─────────────────────────────────────────────────

export const appointments = {
  get: (params: ListParams = {}): Promise<Appointment[]> => request<Appointment[]>(withQuery('/appointments', { ...params })),
  getMy: (params: ListParams = {}): Promise<Appointment[]> =>
    request<Appointment[]>(withQuery('/appointments/my-appointments', { ...params, _t: Date.now().toString() })),
  getHistory: (): Promise<Appointment[]> => request<Appointment[]>('/appointments/history-with-payments'),
  getBookedSlots: (params: Record<string, string>): Promise<Record<string, unknown>> =>
    request<Record<string, unknown>>(withQuery('/appointments/booked-slots', params)),
  lockSlot: (body: Record<string, unknown>): Promise<Record<string, unknown>> =>
    request<Record<string, unknown>>('/appointments/lock-slot', { method: 'POST', body: JSON.stringify(body) }),
  releaseSlot: (body: Record<string, unknown>): Promise<Record<string, unknown>> =>
    request<Record<string, unknown>>('/appointments/release-slot', { method: 'POST', body: JSON.stringify(body) }),
  create: (body: Partial<Appointment>): Promise<Appointment> =>
    request<Appointment>('/appointments', { method: 'POST', body: JSON.stringify(body) }),
  walkIn: (body: Partial<Appointment>): Promise<Appointment> =>
    request<Appointment>('/appointments/walk-in', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: string, body: Partial<Appointment>): Promise<Appointment> =>
    request<Appointment>(`/appointments/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  submitIntakeForm: (id: string, body: Record<string, unknown>): Promise<Appointment> =>
    request<Appointment>(`/appointments/${id}/intake`, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (id: string): Promise<{ message: string }> =>
    request<{ message: string }>(`/appointments/${id}`, { method: 'DELETE' }),
  getStats: (): Promise<AppointmentStats> => request<AppointmentStats>('/appointments/stats'),
};

// ─── Billing / Payment / Transaction endpoints ─────────────────────────────

export const billing = {
  get: (params: ListParams = {}): Promise<Billing[]> => request<Billing[]>(withQuery('/billing', { ...params })),
  getOne: (id: string): Promise<Billing> => request<Billing>(`/billing/${id}`),
  create: (body: Partial<Billing>): Promise<Billing> =>
    request<Billing>('/billing', { method: 'POST', body: JSON.stringify(body) }),
  pay: (id: string, body: Record<string, unknown>): Promise<Record<string, unknown>> =>
    request<Record<string, unknown>>(`/billing/${id}/pay`, { method: 'POST', body: JSON.stringify(body) }),
  update: (id: string, body: Partial<Billing>): Promise<Billing> =>
    request<Billing>(`/billing/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (id: string): Promise<{ message: string }> =>
    request<{ message: string }>(`/billing/${id}`, { method: 'DELETE' }),
  getServices: (): Promise<Record<string, unknown>[]> => request('/billing/services'),
  downloadInvoice: (billId: string, filename = 'invoice.pdf'): Promise<void> =>
    downloadFile(`/billing/${billId}/invoice`, filename),
};

export const payments = {
  get: (params: ListParams = {}): Promise<Record<string, unknown>[]> => request<Record<string, unknown>[]>(withQuery('/payments', { ...params })),
  getRefunds: (params: ListParams = {}): Promise<Record<string, unknown>[]> =>
    request<Record<string, unknown>[]>(withQuery('/payments', { ...params, status: 'refunded' })),
  create: (body: Record<string, unknown>): Promise<Record<string, unknown>> =>
    request<Record<string, unknown>>('/payments', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: string, body: Record<string, unknown>): Promise<Record<string, unknown>> =>
    request<Record<string, unknown>>(`/payments/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  refund: (id: string, body: Record<string, unknown>): Promise<Record<string, unknown>> =>
    request<Record<string, unknown>>(`/payments/${id}/refund`, { method: 'PUT', body: JSON.stringify(body) }),
};

export const transactions = {
  get: (params: ListParams = {}): Promise<Record<string, unknown>[]> =>
    request<Record<string, unknown>[]>(withQuery('/transactions', { ...params })),
  getOne: (id: string): Promise<Record<string, unknown>> => request(`/transactions/${id}`),
  pay: (body: Record<string, unknown>): Promise<Record<string, unknown>> =>
    request<Record<string, unknown>>('/transactions/pay', { method: 'POST', body: JSON.stringify(body) }),
  verify: (id: string): Promise<Record<string, unknown>> => request(`/transactions/verify/${encodeURIComponent(id)}`),
  getLedger: (params: ListParams = {}): Promise<Record<string, unknown>[]> =>
    request<Record<string, unknown>[]>(withQuery('/transactions/ledger', { ...params })),
  downloadInvoice: (txnId: string, filename = 'invoice.pdf'): Promise<void> => downloadFile(`/transactions/${txnId}/invoice`, filename),
  downloadBill: (txnId: string, filename = 'bill.pdf'): Promise<void> => downloadFile(`/transactions/${txnId}/bill`, filename),
};

// ─── Prescription endpoints ────────────────────────────────────────────────

export const prescriptions = {
  get: (params: ListParams = {}): Promise<Prescription[]> => request<Prescription[]>(withQuery('/records', { ...params })),
  getByPatient: (patientId: string): Promise<Prescription[]> => request<Prescription[]>(`/records/patient/${patientId}`),
  create: (body: Partial<Prescription> | Record<string, unknown>): Promise<Prescription> =>
    request<Prescription>('/records', { method: 'POST', body: JSON.stringify(body) }),
  delete: (id: string): Promise<{ message: string }> =>
    request<{ message: string }>(`/records/${id}`, { method: 'DELETE' }),
  downloadPdf: (recordId: string, filename = 'prescription.pdf'): Promise<void> =>
    downloadFile(`/records/${recordId}/prescription-pdf`, filename),
};

// ─── Pharmacy endpoints ────────────────────────────────────────────────────

export const pharmacy = {
  getStats: (): Promise<Record<string, unknown>> => request('/pharmacy/stats'),
  getMedicines: (params: ListParams = {}): Promise<Record<string, unknown>[]> =>
    request<Record<string, unknown>[]>(withQuery('/pharmacy/medicines', { ...params })),
  createMedicine: (body: Record<string, unknown>): Promise<Record<string, unknown>> =>
    request<Record<string, unknown>>('/pharmacy/medicines', { method: 'POST', body: JSON.stringify(body) }),
  updateMedicine: (id: string, body: Record<string, unknown>): Promise<Record<string, unknown>> =>
    request<Record<string, unknown>>(`/pharmacy/medicines/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteMedicine: (id: string): Promise<{ message: string }> =>
    request<{ message: string }>(`/pharmacy/medicines/${id}`, { method: 'DELETE' }),
  adjustStock: (id: string, body: Record<string, unknown>): Promise<Record<string, unknown>> =>
    request<Record<string, unknown>>(`/pharmacy/medicines/${id}/stock`, { method: 'PUT', body: JSON.stringify(body) }),
  createOrder: (body: Record<string, unknown>): Promise<Record<string, unknown>> =>
    request<Record<string, unknown>>('/pharmacy/orders', { method: 'POST', body: JSON.stringify(body) }),
  getOrders: (params: ListParams = {}): Promise<Record<string, unknown>[]> =>
    request<Record<string, unknown>[]>(withQuery('/pharmacy/orders', { ...params })),
  updateOrder: (id: string, body: Record<string, unknown>): Promise<Record<string, unknown>> =>
    request<Record<string, unknown>>(`/pharmacy/orders/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  forwardOrder: (id: string, body: Record<string, unknown>): Promise<Record<string, unknown>> =>
    request<Record<string, unknown>>(`/pharmacy/orders/${id}/forward`, { method: 'POST', body: JSON.stringify(body) }),
  rejectOrder: (id: string, body: Record<string, unknown>): Promise<Record<string, unknown>> =>
    request<Record<string, unknown>>(`/pharmacy/orders/${id}/reject`, { method: 'PUT', body: JSON.stringify(body) }),
  validateCoupon: (code: string): Promise<Record<string, unknown>> =>
    request<Record<string, unknown>>('/pharmacy/coupons/validate', { method: 'POST', body: JSON.stringify({ code }) }),
  verifyPrescriptions: (body: Record<string, unknown>): Promise<Record<string, unknown>> =>
    request<Record<string, unknown>>('/pharmacy/orders/verify-prescriptions', { method: 'POST', body: JSON.stringify(body) }),
  getStaff: (params: ListParams = {}): Promise<Record<string, unknown>[]> =>
    request<Record<string, unknown>[]>(withQuery('/pharmacy/staff', { ...params })),
  createStaff: (body: Record<string, unknown>): Promise<Record<string, unknown>> =>
    request<Record<string, unknown>>('/pharmacy/staff', { method: 'POST', body: JSON.stringify(body) }),
  updateStaff: (id: string, body: Record<string, unknown>): Promise<Record<string, unknown>> =>
    request<Record<string, unknown>>(`/pharmacy/staff/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteStaff: (id: string): Promise<{ message: string }> =>
    request<{ message: string }>(`/pharmacy/staff/${id}`, { method: 'DELETE' }),
  getPrescriptions: (params: ListParams = {}): Promise<Prescription[]> =>
    request<Prescription[]>(withQuery('/pharmacy/prescriptions', { ...params })),
  getPrescription: (id: string): Promise<Prescription> => request<Prescription>(`/pharmacy/prescriptions/${id}`),
  dispenseMedicine: (id: string, body: Record<string, unknown>): Promise<Prescription> =>
    request<Prescription>(`/pharmacy/prescriptions/${id}/dispense`, { method: 'PUT', body: JSON.stringify(body) }),
  verifyPrescription: (id: string, body: Record<string, unknown>): Promise<Prescription> =>
    request<Prescription>(`/pharmacy/prescriptions/${id}/verify`, { method: 'PUT', body: JSON.stringify(body) }),
  getOffers: (params: ListParams = {}): Promise<Record<string, unknown>[]> =>
    request<Record<string, unknown>[]>(withQuery('/pharmacy/offers', { ...params })),
  createOffer: (body: Record<string, unknown>): Promise<Record<string, unknown>> =>
    request<Record<string, unknown>>('/pharmacy/offers', { method: 'POST', body: JSON.stringify(body) }),
  updateOffer: (id: string, body: Record<string, unknown>): Promise<Record<string, unknown>> =>
    request<Record<string, unknown>>(`/pharmacy/offers/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteOffer: (id: string): Promise<{ message: string }> =>
    request<{ message: string }>(`/pharmacy/offers/${id}`, { method: 'DELETE' }),
  getReturns: (params: ListParams = {}): Promise<Record<string, unknown>[]> =>
    request<Record<string, unknown>[]>(withQuery('/pharmacy/returns', { ...params })),
  createReturn: (body: Record<string, unknown>): Promise<Record<string, unknown>> =>
    request<Record<string, unknown>>('/pharmacy/returns', { method: 'POST', body: JSON.stringify(body) }),
  updateReturn: (id: string, body: Record<string, unknown>): Promise<Record<string, unknown>> =>
    request<Record<string, unknown>>(`/pharmacy/returns/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  createDelivery: (body: Record<string, unknown>): Promise<Record<string, unknown>> =>
    request<Record<string, unknown>>('/pharmacy/deliveries', { method: 'POST', body: JSON.stringify(body) }),
  updateDelivery: (id: string, body: Record<string, unknown>): Promise<Record<string, unknown>> =>
    request<Record<string, unknown>>(`/pharmacy/deliveries/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  getDeliveries: (params: ListParams = {}): Promise<Record<string, unknown>[]> =>
    request<Record<string, unknown>[]>(withQuery('/pharmacy/deliveries', { ...params })),
  getDeliveryHistory: (userId: string): Promise<{ tasks: Record<string, unknown>[] }> =>
    request<{ tasks: Record<string, unknown>[] }>(withQuery('/delivery/history', { userId })),
  getDeliveryOrders: (userId: string): Promise<{ orders: Record<string, unknown>[] }> =>
    request<{ orders: Record<string, unknown>[] }>(withQuery('/delivery/orders', { userId })),
  getDeliveryZones: (userId: string): Promise<{ zones: Record<string, unknown>[] }> =>
    request<{ zones: Record<string, unknown>[] }>(withQuery('/delivery/zones', { userId })),
  getDeliveryEarnings: (userId: string): Promise<{ earnings: Record<string, unknown>[] }> =>
    request<{ earnings: Record<string, unknown>[] }>(withQuery('/delivery/earnings', { userId })),
  getDeliveryDocuments: (userId: string): Promise<{ documents: Record<string, unknown>[] }> =>
    request<{ documents: Record<string, unknown>[] }>(withQuery('/delivery/documents', { userId })),
  getDeliveryReviews: (userId: string): Promise<{ reviews: Record<string, unknown>[] }> =>
    request<{ reviews: Record<string, unknown>[] }>(withQuery('/delivery/reviews', { userId })),
};

// ─── Lab endpoints ────────────────────────────────────────────────────────

export const lab = {
  getStats: (): Promise<Record<string, unknown>> => request('/lab/stats'),
  getBookings: (params: ListParams = {}): Promise<Record<string, unknown>[]> =>
    request<Record<string, unknown>[]>(withQuery('/lab/bookings', { ...params })),
  createBooking: (body: Record<string, unknown>): Promise<Record<string, unknown>> =>
    request<Record<string, unknown>>('/lab/bookings', { method: 'POST', body: JSON.stringify(body) }),
  updateBooking: (id: string, body: Record<string, unknown>): Promise<Record<string, unknown>> =>
    request<Record<string, unknown>>(`/lab/bookings/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteBooking: (id: string): Promise<{ message: string }> =>
    request<{ message: string }>(`/lab/bookings/${id}`, { method: 'DELETE' }),
  getOrders: (params: ListParams = {}): Promise<Record<string, unknown>[]> =>
    request<Record<string, unknown>[]>(withQuery('/lab/orders', { ...params })),
  getOrder: (id: string): Promise<Record<string, unknown>> => request(`/lab/orders/${id}`),
  createOrder: (body: Record<string, unknown>): Promise<Record<string, unknown>> =>
    request<Record<string, unknown>>('/lab/orders', { method: 'POST', body: JSON.stringify(body) }),
  registerSample: (id: string, body: Record<string, unknown>): Promise<Record<string, unknown>> =>
    request<Record<string, unknown>>(`/lab/orders/${id}/register-sample`, { method: 'PUT', body: JSON.stringify(body) }),
  collectSample: (id: string, body: Record<string, unknown>): Promise<Record<string, unknown>> =>
    request<Record<string, unknown>>(`/lab/orders/${id}/collect-sample`, { method: 'PUT', body: JSON.stringify(body) }),
  enterResult: (id: string, body: Record<string, unknown>): Promise<Record<string, unknown>> =>
    request<Record<string, unknown>>(`/lab/orders/${id}/enter-result`, { method: 'PUT', body: JSON.stringify(body) }),
  verifyResult: (id: string, body: Record<string, unknown>): Promise<Record<string, unknown>> =>
    request<Record<string, unknown>>(`/lab/orders/${id}/verify`, { method: 'PUT', body: JSON.stringify(body) }),
  deliverReport: (id: string, body: Record<string, unknown>): Promise<Record<string, unknown>> =>
    request<Record<string, unknown>>(`/lab/orders/${id}/deliver-report`, { method: 'PUT', body: JSON.stringify(body) }),
  getTests: (): Promise<Record<string, unknown>[]> => request('/lab/tests'),
  getEquipment: (params: ListParams = {}): Promise<Record<string, unknown>[]> =>
    request<Record<string, unknown>[]>(withQuery('/lab/equipment', { ...params })),
  createEquipment: (body: Record<string, unknown>): Promise<Record<string, unknown>> =>
    request<Record<string, unknown>>('/lab/equipment', { method: 'POST', body: JSON.stringify(body) }),
  updateEquipment: (id: string, body: Record<string, unknown>): Promise<Record<string, unknown>> =>
    request<Record<string, unknown>>(`/lab/equipment/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteEquipment: (id: string): Promise<{ message: string }> =>
    request<{ message: string }>(`/lab/equipment/${id}`, { method: 'DELETE' }),
  getPackages: (params: ListParams = {}): Promise<Record<string, unknown>[]> =>
    request<Record<string, unknown>[]>(withQuery('/lab/packages', { ...params })),
  createPackage: (body: Record<string, unknown>): Promise<Record<string, unknown>> =>
    request<Record<string, unknown>>('/lab/packages', { method: 'POST', body: JSON.stringify(body) }),
  updatePackage: (id: string, body: Record<string, unknown>): Promise<Record<string, unknown>> =>
    request<Record<string, unknown>>(`/lab/packages/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deletePackage: (id: string): Promise<{ message: string }> =>
    request<{ message: string }>(`/lab/packages/${id}`, { method: 'DELETE' }),
  getDeliveries: (params: ListParams = {}): Promise<Record<string, unknown>[]> =>
    request<Record<string, unknown>[]>(withQuery('/pharmacy/deliveries', { ...params })),
};

// ─── Preferred Pharmacy endpoints ─────────────────────────────────────────

export interface PreferredPharmacy {
  _id?: string;
  id?: string;
  pharmacyId?: string;
  facilityId?: string;
  name: string;
  priority: number;
}

export const preferredPharmacies = {
  get: (): Promise<{ pharmacies: PreferredPharmacy[] }> =>
    request<{ pharmacies: PreferredPharmacy[] }>('/users/preferred-pharmacies'),
  add: (body: { pharmacyId: string; name: string }): Promise<PreferredPharmacy> =>
    request<PreferredPharmacy>('/users/preferred-pharmacies', { method: 'POST', body: JSON.stringify(body) }),
  delete: (id: string): Promise<{ message: string }> =>
    request<{ message: string }>(`/users/preferred-pharmacies/${id}`, { method: 'DELETE' }),
  reorder: (body: { orderedIds: string[] }): Promise<{ message: string }> =>
    request<{ message: string }>('/users/preferred-pharmacies/reorder', { method: 'PUT', body: JSON.stringify(body) }),
};

// ─── Dashboard endpoints ──────────────────────────────────────────────────

export const dashboard = {
  getStats: (): Promise<Record<string, unknown>> => request('/dashboard/stats'),
};

// ─── Notification endpoints ───────────────────────────────────────────────

export const notifications = {
  get: (params: ListParams = {}): Promise<NotificationItem[]> =>
    request<NotificationItem[]>(withQuery('/notifications', { ...params })),
  getUnreadCount: (): Promise<{ count: number }> => request('/notifications/unread-count'),
  markAllRead: (): Promise<{ message: string }> =>
    request<{ message: string }>('/notifications/mark-all-read', { method: 'PUT' }),
  clearAll: (): Promise<{ message: string }> =>
    request<{ message: string }>('/notifications/clear-all', { method: 'DELETE' }),
  markRead: (id: string): Promise<Record<string, unknown>> =>
    request<Record<string, unknown>>(`/notifications/${id}/read`, { method: 'PUT' }),
  create: (body: Record<string, unknown>): Promise<NotificationItem> =>
    request<NotificationItem>('/notifications', { method: 'POST', body: JSON.stringify(body) }),
  delete: (id: string): Promise<{ message: string }> =>
    request<{ message: string }>(`/notifications/${id}`, { method: 'DELETE' }),
};

export interface NotificationItem {
  _id: string;
  title: string;
  message: string;
  type: 'appointment' | 'message' | 'prescription' | 'payment' | 'system' | 'lab_result' | 'review' | 'general';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  read: boolean;
  readAt?: string;
  link?: string;
  recipientId?: string;
  senderId?: string;
  relatedId?: string;
  relatedType?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Test catalog endpoints ───────────────────────────────────────────────

export const tests = {
  get: (params: ListParams = {}): Promise<Record<string, unknown>[]> =>
    request<Record<string, unknown>[]>(withQuery('/tests', { ...params })),
  getStats: (): Promise<Record<string, unknown>> => request('/tests/stats'),
  create: (body: Record<string, unknown>): Promise<Record<string, unknown>> =>
    request<Record<string, unknown>>('/tests', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: string, body: Record<string, unknown>): Promise<Record<string, unknown>> =>
    request<Record<string, unknown>>(`/tests/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (id: string): Promise<{ message: string }> =>
    request<{ message: string }>(`/tests/${id}`, { method: 'DELETE' }),
};

// ─── Review endpoints ──────────────────────────────────────────────────────

export const reviews = {
  get: (params: ListParams = {}): Promise<Record<string, unknown>[]> =>
    request<Record<string, unknown>[]>(withQuery('/reviews', { ...params })),
  create: (body: Record<string, unknown>): Promise<Record<string, unknown>> =>
    request<Record<string, unknown>>('/reviews', { method: 'POST', body: JSON.stringify(body) }),
  reply: (id: string, body: { reply: string }): Promise<Record<string, unknown>> =>
    request<Record<string, unknown>>(`/reviews/${id}/reply`, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (id: string): Promise<{ message: string }> =>
    request<{ message: string }>(`/reviews/${id}`, { method: 'DELETE' }),
  getModeration: (params: ListParams = {}): Promise<Record<string, unknown>[]> =>
    request<Record<string, unknown>[]>(withQuery('/reviews/moderation', { ...params })),
  flag: (id: string, body: Record<string, unknown>): Promise<Record<string, unknown>> =>
    request<Record<string, unknown>>(`/reviews/moderation/${id}/flag`, { method: 'PUT', body: JSON.stringify(body) }),
  unflag: (id: string): Promise<Record<string, unknown>> =>
    request<Record<string, unknown>>(`/reviews/moderation/${id}/unflag`, { method: 'PUT' }),
};

// ─── Category endpoints ──────────────────────────────────────────────────

export const categories = {
  get: (params: ListParams = {}): Promise<Record<string, unknown>[]> =>
    request<Record<string, unknown>[]>(withQuery('/categories', { ...params })),
  create: (body: Record<string, unknown>): Promise<Record<string, unknown>> =>
    request<Record<string, unknown>>('/categories', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: string, body: Record<string, unknown>): Promise<Record<string, unknown>> =>
    request<Record<string, unknown>>(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (id: string): Promise<{ message: string }> =>
    request<{ message: string }>(`/categories/${id}`, { method: 'DELETE' }),
  merge: (body: Record<string, unknown>): Promise<Record<string, unknown>> =>
    request<Record<string, unknown>>('/categories/merge', { method: 'POST', body: JSON.stringify(body) }),
};

// ─── License endpoints ───────────────────────────────────────────────────

export const licenses = {
  get: (params: ListParams = {}): Promise<Record<string, unknown>[]> =>
    request<Record<string, unknown>[]>(withQuery('/licenses', { ...params })),
  update: (id: string, body: Record<string, unknown>): Promise<Record<string, unknown>> =>
    request<Record<string, unknown>>(`/licenses/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  getExpiring: (): Promise<Record<string, unknown>[]> => request('/licenses/expiring'),
  getStats: (): Promise<Record<string, unknown>> => request('/licenses/stats'),
};

// ─── Platform / System endpoints ─────────────────────────────────────────

export const platform = {
  register: (body: Record<string, unknown>): Promise<Record<string, unknown>> =>
    request<Record<string, unknown>>('/platform/register', { method: 'POST', body: JSON.stringify(body) }),
  getCoupons: (params: ListParams = {}): Promise<Record<string, unknown>[]> =>
    request<Record<string, unknown>[]>(withQuery('/platform-coupons', { ...params })),
  getCouponStats: (): Promise<Record<string, unknown>> => request('/platform-coupons/stats'),
  createCoupon: (body: Record<string, unknown>): Promise<Record<string, unknown>> =>
    request<Record<string, unknown>>('/platform-coupons', { method: 'POST', body: JSON.stringify(body) }),
  updateCoupon: (id: string, body: Record<string, unknown>): Promise<Record<string, unknown>> =>
    request<Record<string, unknown>>(`/platform-coupons/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteCoupon: (id: string): Promise<{ message: string }> =>
    request<{ message: string }>(`/platform-coupons/${id}`, { method: 'DELETE' }),
  getFeaturedListings: (params: ListParams = {}): Promise<Record<string, unknown>[]> =>
    request<Record<string, unknown>[]>(withQuery('/featured-listings', { ...params })),
  createFeaturedListing: (body: Record<string, unknown>): Promise<Record<string, unknown>> =>
    request<Record<string, unknown>>('/featured-listings', { method: 'POST', body: JSON.stringify(body) }),
  updateFeaturedListing: (id: string, body: Record<string, unknown>): Promise<Record<string, unknown>> =>
    request<Record<string, unknown>>(`/featured-listings/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteFeaturedListing: (id: string): Promise<{ message: string }> =>
    request<{ message: string }>(`/featured-listings/${id}`, { method: 'DELETE' }),
  getCities: (params: ListParams = {}): Promise<Record<string, unknown>[]> =>
    request<Record<string, unknown>[]>(withQuery('/cities', { ...params })),
  createCity: (body: Record<string, unknown>): Promise<Record<string, unknown>> =>
    request<Record<string, unknown>>('/cities', { method: 'POST', body: JSON.stringify(body) }),
  updateCity: (id: string, body: Record<string, unknown>): Promise<Record<string, unknown>> =>
    request<Record<string, unknown>>(`/cities/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteCity: (id: string): Promise<{ message: string }> =>
    request<{ message: string }>(`/cities/${id}`, { method: 'DELETE' }),
  getContent: (key: string): Promise<Record<string, unknown>> => request(`/platform-content/${key}`),
  getAllContent: (params: ListParams = {}): Promise<Record<string, unknown>[]> =>
    request<Record<string, unknown>[]>(withQuery('/platform-content', { ...params })),
  updateContent: (key: string, body: Record<string, unknown>): Promise<Record<string, unknown>> =>
    request<Record<string, unknown>>(`/platform-content/${key}`, { method: 'PUT', body: JSON.stringify(body) }),
  getSystemSettings: (): Promise<Record<string, unknown>> => request('/system-settings'),
  updateSystemSetting: (key: string, body: Record<string, unknown>): Promise<Record<string, unknown>> =>
    request<Record<string, unknown>>(`/system-settings/${key}`, { method: 'PUT', body: JSON.stringify(body) }),
  getIntegrations: (): Promise<Record<string, unknown>[]> => request('/integrations'),
  updateIntegration: (key: string, body: Record<string, unknown>): Promise<Record<string, unknown>> =>
    request<Record<string, unknown>>(`/integrations/${key}`, { method: 'PUT', body: JSON.stringify(body) }),
  testIntegration: (key: string): Promise<Record<string, unknown>> =>
    request<Record<string, unknown>>(`/integrations/${key}/test`, { method: 'POST' }),
  getDriveStatus: (): Promise<Record<string, unknown>> => request('/drive/status'),
  getDriveAuthUrl: (): Promise<{ url: string }> => request('/drive/auth-url'),
  disconnectDrive: (): Promise<{ message: string }> =>
    request<{ message: string }>('/drive/disconnect', { method: 'DELETE' }),
  uploadToDrive: (file: File): Promise<Record<string, unknown>> => {
    const formData = new FormData();
    formData.append('file', file);
    return request<Record<string, unknown>>('/drive/upload', { method: 'POST', body: formData });
  },
  getAuditLogs: (params: ListParams = {}): Promise<Record<string, unknown>[]> =>
    request<Record<string, unknown>[]>(withQuery('/audit-logs', { ...params })),
  getAuditLogStats: (): Promise<Record<string, unknown>> => request('/audit-logs/stats'),
};

// ─── Emergency endpoints ──────────────────────────────────────────

export const emergency = {
  get: (params: ListParams = {}): Promise<Record<string, unknown>[]> =>
    request<Record<string, unknown>[]>(withQuery('/emergency', { ...params })),
  create: (body: Record<string, unknown>): Promise<Record<string, unknown>> =>
    request<Record<string, unknown>>('/emergency', { method: 'POST', body: JSON.stringify(body) }),
  assignDoctor: (id: string, docId: string, docName: string): Promise<Record<string, unknown>> =>
    request<Record<string, unknown>>(`/emergency/${id}/assign`, { method: 'PUT', body: JSON.stringify({ doctorId: docId, doctorName: docName }) }),
  updateStatus: (id: string, status: string): Promise<Record<string, unknown>> =>
    request<Record<string, unknown>>(`/emergency/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
  addNote: (id: string, text: string): Promise<Record<string, unknown>> =>
    request<Record<string, unknown>>(`/emergency/${id}/notes`, { method: 'POST', body: JSON.stringify({ text }) }),
  getStats: (): Promise<Record<string, unknown>> => request('/emergency/stats'),
};

// ─── Commission endpoints ──────────────────────────────────────────

export const commission = {
  getConfigs: (): Promise<Record<string, unknown>[]> => request('/commission/config'),
  updateConfig: (id: string, body: Record<string, unknown>): Promise<Record<string, unknown>> =>
    request<Record<string, unknown>>(`/commission/config/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  getLedger: (params: ListParams = {}): Promise<Record<string, unknown>[]> =>
    request<Record<string, unknown>[]>(withQuery('/commission/ledger', { ...params })),
  getPayouts: (params: ListParams = {}): Promise<Record<string, unknown>[]> =>
    request<Record<string, unknown>[]>(withQuery('/commission/payouts', { ...params })),
  createPayout: (body: Record<string, unknown>): Promise<Record<string, unknown>> =>
    request<Record<string, unknown>>('/commission/payouts', { method: 'POST', body: JSON.stringify(body) }),
  markPayoutPaid: (id: string, body: Record<string, unknown>): Promise<Record<string, unknown>> =>
    request<Record<string, unknown>>(`/commission/payouts/${id}/pay`, { method: 'PUT', body: JSON.stringify(body) }),
  getStats: (): Promise<Record<string, unknown>> => request('/commission/stats'),
};

// ─── Dispute endpoints ────────────────────────────────────────────

export const disputes = {
  get: (params: ListParams = {}): Promise<Record<string, unknown>[]> =>
    request<Record<string, unknown>[]>(withQuery('/disputes', { ...params })),
  updateStatus: (id: string, body: Record<string, unknown>): Promise<Record<string, unknown>> =>
    request<Record<string, unknown>>(`/disputes/${id}/status`, { method: 'PUT', body: JSON.stringify(body) }),
  assign: (id: string, body: Record<string, unknown>): Promise<Record<string, unknown>> =>
    request<Record<string, unknown>>(`/disputes/${id}/assign`, { method: 'PUT', body: JSON.stringify(body) }),
  getStats: (): Promise<Record<string, unknown>> => request('/disputes/stats'),
};

// ─── Leave request endpoints ────────────────────────────────────────

export const leaveRequests = {
  get: (params: ListParams = {}): Promise<Record<string, unknown>[]> =>
    request<Record<string, unknown>[]>(withQuery('/leave-requests', { ...params })),
  create: (body: Record<string, unknown>): Promise<Record<string, unknown>> =>
    request<Record<string, unknown>>('/leave-requests', { method: 'POST', body: JSON.stringify(body) }),
  getPending: (): Promise<Record<string, unknown>[]> => request('/leave-requests/pending'),
  updateStatus: (id: string, body: Record<string, unknown>): Promise<Record<string, unknown>> =>
    request<Record<string, unknown>>(`/leave-requests/${id}/status`, { method: 'PUT', body: JSON.stringify(body) }),
  cancel: (id: string): Promise<Record<string, unknown>> =>
    request<Record<string, unknown>>(`/leave-requests/${id}/cancel`, { method: 'PUT' }),
};

// ─── Schedule change request endpoints ────────────────────────────

export const scheduleChangeRequests = {
  get: (params: ListParams = {}): Promise<Record<string, unknown>[]> =>
    request<Record<string, unknown>[]>(withQuery('/schedule-change-requests', { ...params })),
  create: (body: Record<string, unknown>): Promise<Record<string, unknown>> =>
    request<Record<string, unknown>>('/schedule-change-requests', { method: 'POST', body: JSON.stringify(body) }),
  getPending: (): Promise<Record<string, unknown>[]> => request('/schedule-change-requests/pending'),
  decide: (id: string, body: Record<string, unknown>): Promise<Record<string, unknown>> =>
    request<Record<string, unknown>>(`/schedule-change-requests/${id}/decision`, { method: 'PUT', body: JSON.stringify(body) }),
  cancel: (id: string): Promise<Record<string, unknown>> =>
    request<Record<string, unknown>>(`/schedule-change-requests/${id}/cancel`, { method: 'PUT' }),
};

// ─── Inventory endpoints ──────────────────────────────────────────

export const inventory = {
  getItems: (params: ListParams = {}): Promise<Record<string, unknown>[]> =>
    request<Record<string, unknown>[]>(withQuery('/inventory/items', { ...params })),
  createItem: (body: Record<string, unknown>): Promise<Record<string, unknown>> =>
    request<Record<string, unknown>>('/inventory/items', { method: 'POST', body: JSON.stringify(body) }),
  addStock: (id: string, body: Record<string, unknown>): Promise<Record<string, unknown>> =>
    request<Record<string, unknown>>(`/inventory/items/${id}/stock`, { method: 'PUT', body: JSON.stringify(body) }),
  issueItem: (id: string, body: Record<string, unknown>): Promise<Record<string, unknown>> =>
    request<Record<string, unknown>>(`/inventory/items/${id}/stock`, { method: 'PUT', body: JSON.stringify({ ...body, type: 'deduct' }) }),
  createPurchaseRequest: (body: Record<string, unknown>): Promise<Record<string, unknown>> =>
    request<Record<string, unknown>>('/inventory/items', { method: 'POST', body: JSON.stringify({ ...body, requestType: 'purchase_request' }) }),
  createPurchaseOrder: (body: Record<string, unknown>): Promise<Record<string, unknown>> =>
    request<Record<string, unknown>>('/inventory/items', { method: 'POST', body: JSON.stringify({ ...body, requestType: 'purchase_order' }) }),
  receiveGRN: (id: string, body: Record<string, unknown>): Promise<Record<string, unknown>> =>
    request<Record<string, unknown>>(`/inventory/items/${id}/stock`, { method: 'PUT', body: JSON.stringify({ ...body, type: 'add' }) }),
  getStats: (): Promise<Record<string, unknown>> => request('/inventory/stats'),
};

// ─── Housekeeping endpoints ──────────────────────────────────────

export const housekeeping = {
  getTasks: (params: ListParams = {}): Promise<Record<string, unknown>[]> =>
    request<Record<string, unknown>[]>(withQuery('/housekeeping/tasks', { ...params })),
  createTask: (body: Record<string, unknown>): Promise<Record<string, unknown>> =>
    request<Record<string, unknown>>('/housekeeping/tasks', { method: 'POST', body: JSON.stringify(body) }),
  completeTask: (id: string, body: Record<string, unknown>): Promise<Record<string, unknown>> =>
    request<Record<string, unknown>>(`/housekeeping/tasks/${id}/complete`, { method: 'PUT', body: JSON.stringify(body) }),
  verifyTask: (id: string, body: Record<string, unknown>): Promise<Record<string, unknown>> =>
    request<Record<string, unknown>>(`/housekeeping/tasks/${id}/verify`, { method: 'PUT', body: JSON.stringify(body) }),
  autoCreateOnDischarge: (body: Record<string, unknown>): Promise<Record<string, unknown>> =>
    request<Record<string, unknown>>('/housekeeping/auto-create-on-discharge', { method: 'POST', body: JSON.stringify(body) }),
  getStats: (): Promise<Record<string, unknown>> => request('/housekeeping/stats'),
};

// ─── Nursing endpoints ───────────────────────────────────────────

export const nursing = {
  getCharts: (params: ListParams = {}): Promise<Record<string, unknown>[]> =>
    request<Record<string, unknown>[]>(withQuery('/nursing', { ...params })),
  createVitals: (body: Record<string, unknown>): Promise<Record<string, unknown>> =>
    request<Record<string, unknown>>('/nursing/vitals', { method: 'POST', body: JSON.stringify(body) }),
  createMAR: (body: Record<string, unknown>): Promise<Record<string, unknown>> =>
    request<Record<string, unknown>>('/nursing/mar', { method: 'POST', body: JSON.stringify(body) }),
  createIO: (body: Record<string, unknown>): Promise<Record<string, unknown>> =>
    request<Record<string, unknown>>('/nursing/io', { method: 'POST', body: JSON.stringify(body) }),
  createWound: (body: Record<string, unknown>): Promise<Record<string, unknown>> =>
    request<Record<string, unknown>>('/nursing/wound-dressing', { method: 'POST', body: JSON.stringify(body) }),
  getShiftCharts: (admissionId: string, date: string): Promise<Record<string, unknown>> =>
    request<Record<string, unknown>>(`/nursing/shift/${admissionId}/${date}`),
  getStats: (): Promise<Record<string, unknown>> => request('/nursing/stats'),
};

// ─── Token (OPD) endpoints ────────────────────────────────────────

export const tokens = {
  get: (params: ListParams = {}): Promise<Record<string, unknown>[]> =>
    request<Record<string, unknown>[]>(withQuery('/tokens', { ...params })),
  generate: (body: Record<string, unknown>): Promise<Record<string, unknown>> =>
    request<Record<string, unknown>>('/tokens/generate', { method: 'POST', body: JSON.stringify(body) }),
  call: (id: string): Promise<Record<string, unknown>> =>
    request<Record<string, unknown>>(`/tokens/${id}/call`, { method: 'PUT' }),
  startConsultation: (id: string): Promise<Record<string, unknown>> =>
    request<Record<string, unknown>>(`/tokens/${id}/start-consultation`, { method: 'PUT' }),
  complete: (id: string): Promise<Record<string, unknown>> =>
    request<Record<string, unknown>>(`/tokens/${id}/complete`, { method: 'PUT' }),
  skip: (id: string, body: Record<string, unknown>): Promise<Record<string, unknown>> =>
    request<Record<string, unknown>>(`/tokens/${id}/skip`, { method: 'PUT', body: JSON.stringify(body) }),
  recall: (id: string): Promise<Record<string, unknown>> =>
    request<Record<string, unknown>>(`/tokens/${id}/recall`, { method: 'PUT' }),
  getStats: (): Promise<Record<string, unknown>> => request('/tokens/stats'),
};

// ─── Delivery Boy endpoints ───────────────────────────────────────

export const deliveryBoys = {
  register: (body: Record<string, unknown>): Promise<Record<string, unknown>> =>
    request<Record<string, unknown>>('/delivery-boy/register', { method: 'POST', body: JSON.stringify(body) }),
  uploadDocs: (userId: string, docs: Record<string, File>): Promise<Record<string, unknown>> => {
    const formData = new FormData();
    Object.entries(docs).forEach(([key, file]) => {
      if (file) formData.append(key, file);
    });
    return request<Record<string, unknown>>(`/delivery-boy/upload-docs/${userId}`, { method: 'POST', body: formData });
  },
  getPending: (): Promise<Record<string, unknown>[]> => request('/delivery-boy/pending'),
  getAll: (): Promise<Record<string, unknown>[]> => request('/delivery-boy/all'),
  approve: (id: string, body: Record<string, unknown>): Promise<Record<string, unknown>> =>
    request<Record<string, unknown>>(`/delivery-boy/approve/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  updateLocation: (id: string, body: { lat: number; lng: number }): Promise<Record<string, unknown>> =>
    request<Record<string, unknown>>(`/delivery-boy/location/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  getNearby: (lat: number, lng: number, radius = 10): Promise<Record<string, unknown>[]> =>
    request<Record<string, unknown>[]>(withQuery('/delivery-boy/nearby', { lat, lng, radius })),
  getProfile: (id: string): Promise<Record<string, unknown>> => request(`/delivery-boy/profile/${id}`),
  updateProfile: (id: string, body: Record<string, unknown>): Promise<Record<string, unknown>> =>
    request<Record<string, unknown>>(`/delivery-boy/profile/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
};

// ─── Support ticket endpoints ──────────────────────────────────────

export const supportTickets = {
  get: (params: ListParams = {}): Promise<Record<string, unknown>[]> =>
    request<Record<string, unknown>[]>(withQuery('/support-tickets', { ...params })),
  create: (body: Record<string, unknown>): Promise<Record<string, unknown>> =>
    request<Record<string, unknown>>('/support-tickets', { method: 'POST', body: JSON.stringify(body) }),
  getMy: (params: ListParams = {}): Promise<Record<string, unknown>[]> =>
    request<Record<string, unknown>[]>(withQuery('/support-tickets/my-tickets', { ...params })),
  updateStatus: (id: string, body: { status: string }): Promise<Record<string, unknown>> =>
    request<Record<string, unknown>>(`/support-tickets/${id}/status`, { method: 'PUT', body: JSON.stringify(body) }),
  assign: (id: string, body: { assigneeId: string }): Promise<Record<string, unknown>> =>
    request<Record<string, unknown>>(`/support-tickets/${id}/assign`, { method: 'PUT', body: JSON.stringify(body) }),
  addMessage: (id: string, body: { message: string }): Promise<Record<string, unknown>> =>
    request<Record<string, unknown>>(`/support-tickets/${id}/messages`, { method: 'POST', body: JSON.stringify(body) }),
  getStats: (): Promise<Record<string, unknown>> => request('/support-tickets/stats'),
};

// ─── Announcements endpoints ───────────────────────────────────────

export const announcements = {
  get: (params: ListParams = {}): Promise<Record<string, unknown>[]> =>
    request<Record<string, unknown>[]>(withQuery('/announcements', { ...params })),
  create: (body: Record<string, unknown>): Promise<Record<string, unknown>> =>
    request<Record<string, unknown>>('/announcements', { method: 'POST', body: JSON.stringify(body) }),
};

/**
 * The main `api` object — domain-namespaced to prevent method-name
 * collisions (e.g. both `users.get` and `doctors.get` exist).
 *
 * Backward-compatible flat aliases are provided for auth methods
 * (used by authSlice.ts) and legacy download/patient aliases.
 */
// ─── Clinic-specific aliases (compat with old client src/lib/api.js) ─
export const clinic = {
  getProfile: (): Promise<Record<string, unknown>> => request('/facilities/mine'),
  updateProfile: (body: Record<string, unknown>): Promise<Record<string, unknown>> => request('/facilities/mine', { method: 'PUT', body: JSON.stringify(body) }),
  getStaff: (params: ListParams = {}): Promise<Record<string, unknown>[]> => request(withQuery('/facilities/staff', params)),
  createStaff: (body: Record<string, unknown>): Promise<Record<string, unknown>> => request('/facilities/staff', { method: 'POST', body: JSON.stringify(body) }),
  updateStaff: (id: string, body: Record<string, unknown>): Promise<Record<string, unknown>> => request('/facilities/staff/'+id, { method: 'PUT', body: JSON.stringify(body) }),
  deleteStaff: (id: string): Promise<{message:string}> => request('/facilities/staff/'+id, { method: 'DELETE' }),
};


export const api = {
  auth,
  doctors,
  hospitals,
  facilities,
  users,
  appointments,
  billing,
  payments,
  transactions,
  prescriptions,
  pharmacy,
  lab,
  dashboard,
  notifications,
  tests,
  reviews,
  categories,
  licenses,
  platform,
  emergency,
  commission,
  disputes,
  leaveRequests,
  scheduleChangeRequests,
  inventory,
  housekeeping,
  nursing,
  tokens,
  deliveryBoys,
  supportTickets,
  announcements,
  preferredPharmacies,
  // ─── Flat aliases for backward compatibility ─
  login: auth.login,
  register: auth.register,
  googleAuth: auth.googleAuth,
  verifyOTP: auth.verifyOTP,
  resendOTP: auth.resendOTP,
  forgotPassword: auth.forgotPassword,
  resetPassword: auth.resetPassword,
  logout: auth.logout,
  me: auth.me,
  updateProfile: auth.updateProfile,
  changePassword: auth.changePassword,
  uploadAvatar: auth.uploadAvatar,
  uploadFile: auth.uploadFile,
  get2FAStatus: auth.get2FAStatus,
  setup2FA: auth.setup2FA,
  verify2FA: auth.verify2FA,
  disable2FA: auth.disable2FA,
  getMyHospital: auth.getMyHospital,
  // Legacy download aliases
  downloadInvoicePdf: billing.downloadInvoice,
  downloadPaymentInvoice: transactions.downloadInvoice,
  downloadBillPdf: transactions.downloadBill,
  downloadPrescriptionPdf: prescriptions.downloadPdf,
  // Legacy patient aliases
  getPatients: users.get,
  createPatient: users.create,
  updatePatient: (id: string, body: Partial<User>) => users.update(id, body),
  deletePatient: users.delete,
  getOrder: (id: string): Promise<Record<string, unknown>> =>
    request<Record<string, unknown>>(withQuery('/pharmacy/orders', { orderId: id })),
  getBookings: lab.getBookings,
  getLabBookings: lab.getBookings,
  getTransactions: transactions.get,
  getLicenses: licenses.get,
  getLicenseStats: licenses.getStats,
  getAppointments: appointments.get,
  updateAppointment: appointments.update,
  getReviews: reviews.get,
  getBilling: billing.get,
  getRecords: prescriptions.get,
  getRefunds: payments.getRefunds,
  getDoctor: doctors.getOne,
  getBookedSlots: appointments.getBookedSlots,
  walkInAppointment: appointments.walkIn,
  createRecord: prescriptions.create,
  createNotification: notifications.create,
  createBill: billing.create,
  submitIntakeForm: appointments.submitIntakeForm,
  getDoctors: doctors.get,
  payTransaction: transactions.pay,
  lockAppointmentSlot: appointments.lockSlot,
  releaseAppointmentSlot: appointments.releaseSlot,
  deleteAppointment: appointments.delete,
  getPayments: payments.get,
  getPharmacyOrders: pharmacy.getOrders,
  getPharmacyPrescriptions: pharmacy.getPrescriptions,
  getNotifications: notifications.get,
  createSupportTicket: supportTickets.create,
  getPharmacyStats: pharmacy.getStats,
  getLabStats: lab.getStats,
  getLabOrders: lab.getOrders,
  getLabTests: lab.getTests,
  getPharmacyMedicines: pharmacy.getMedicines,
  getPharmacyReturns: pharmacy.getReturns,
  // ── Calls & Video Calls ──
  getCalls: (p: Record<string, unknown> = {}): Promise<{ success: boolean; data: Record<string, unknown>[] }> =>
    request(withQuery('/calls', p as Record<string, string | number | boolean>)),
  getCallStats: (): Promise<{ success: boolean; stats: Record<string, unknown> }> => request('/calls/stats'),
  getCallContacts: (): Promise<{ success: boolean; contacts: Record<string, unknown>[] }> => request('/calls/contacts'),
  initiateCallLog: (body: unknown): Promise<{ success: boolean; data: Record<string, unknown> }> =>
    request('/calls/initiate', { method: 'POST', body: JSON.stringify(body) }),
  updateCallStatus: (id: string, body: unknown): Promise<{ success: boolean; data: Record<string, unknown> }> =>
    request(`/calls/${id}/status`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteCallLog: (id: string): Promise<{ success: boolean; message: string }> =>
    request(`/calls/${id}`, { method: 'DELETE' }),
  clearAllCallLogs: (): Promise<{ success: boolean; message: string }> =>
    request('/calls/clear/all', { method: 'DELETE' }),
  // ── Dashboard & Superadmin ──
  dashboardStats: (): Promise<Record<string, unknown>> => request('/dashboard/stats'),
  getCommissionStats: (): Promise<Record<string, unknown>> => request('/superadmin/commission/stats'),
  getPendingHospitals: (): Promise<Record<string, unknown>> => request('/superadmin/pending-hospitals'),
  // ── Delivery Partner ──
  getDeliveryProfile: (): Promise<Record<string, unknown>> => request('/delivery-partners/profile/me'),
  getMyDeliveries: (): Promise<Record<string, unknown>> => request('/delivery-partners/my-deliveries'),
  updateDeliveryProfile: (id: string, body: unknown): Promise<Record<string, unknown>> =>
    request(`/delivery-partners/profile/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  updateDeliveryStatus: (id: string, status: string): Promise<Record<string, unknown>> =>
    request(`/delivery-partners/deliveries/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
  getDeliveryHistory: pharmacy.getDeliveryHistory,
  getDeliveryOrders: pharmacy.getDeliveryOrders,
  getDeliveryZones: pharmacy.getDeliveryZones,
  getDeliveryEarnings: pharmacy.getDeliveryEarnings,
  getDeliveryDocuments: pharmacy.getDeliveryDocuments,
  getDeliveryReviews: pharmacy.getDeliveryReviews,
  // ── Superadmin legacy aliases (compat with old client) ─
  getUsers: (p: Record<string, unknown> = {}): Promise<Record<string, unknown>> => request(withQuery('/users', p as Record<string, string | number | boolean>)),
  deleteUser: (id: string): Promise<{ message: string }> => request(`/users/${id}`, { method: 'DELETE' }),
  blockUser: (id: string): Promise<Record<string, unknown>> => request(`/users/${id}/block`, { method: 'PUT' }),
  flagUser: (id: string, body: Record<string, unknown>): Promise<Record<string, unknown>> => request(`/users/${id}/flag`, { method: 'PUT', body: JSON.stringify(body) }),
  unflagUser: (id: string): Promise<Record<string, unknown>> => request(`/users/${id}/unflag`, { method: 'PUT' }),
  getHospitals: (p: Record<string, unknown> = {}): Promise<Record<string, unknown>> => request(withQuery('/hospitals', p as Record<string, string | number | boolean>)),
  suspendHospital: (id: string): Promise<Record<string, unknown>> => request(`/hospitals/${id}/suspend`, { method: 'PUT' }),
  deleteHospital: (id: string): Promise<{ message: string }> => request(`/hospitals/${id}`, { method: 'DELETE' }),
  approveHospital: (id: string): Promise<Record<string, unknown>> => request(`/hospitals/${id}/approve`, { method: 'PUT' }),
  rejectHospital: (id: string, body: Record<string, unknown>): Promise<Record<string, unknown>> => request(`/hospitals/${id}/reject`, { method: 'PUT', body: JSON.stringify(body) }),
  getPendingFacilities: (type?: string): Promise<Record<string, unknown>> => request(withQuery('/facilities/pending', type ? { type } : {})),
  approveFacility: (id: string): Promise<Record<string, unknown>> => request(`/facilities/${id}/approve`, { method: 'PUT' }),
  rejectFacility: (id: string, body: Record<string, unknown>): Promise<Record<string, unknown>> => request(`/facilities/${id}/reject`, { method: 'PUT', body: JSON.stringify(body) }),
  getSupportTickets: (p: Record<string, unknown> = {}): Promise<Record<string, unknown>> => request(withQuery('/support-tickets', p as Record<string, string | number | boolean>)),
  getTicketStats: (): Promise<Record<string, unknown>> => request('/support-tickets/stats'),
  addTicketMessage: (id: string, body: Record<string, unknown>): Promise<Record<string, unknown>> => request(`/support-tickets/${id}/messages`, { method: 'POST', body: JSON.stringify(body) }),
  updateTicketStatus: (id: string, body: Record<string, unknown>): Promise<Record<string, unknown>> => request(`/support-tickets/${id}/status`, { method: 'PUT', body: JSON.stringify(body) }),
  getDisputes: (p: Record<string, unknown> = {}): Promise<Record<string, unknown>> => request(withQuery('/disputes', p as Record<string, string | number | boolean>)),
  getDisputeStats: (): Promise<Record<string, unknown>> => request('/disputes/stats'),
  updateDisputeStatus: (id: string, body: Record<string, unknown>): Promise<Record<string, unknown>> => request(`/disputes/${id}/status`, { method: 'PUT', body: JSON.stringify(body) }),
  getFlaggedReviews: (p: Record<string, unknown> = {}): Promise<Record<string, unknown>> => request(withQuery('/reviews/moderation', p as Record<string, string | number | boolean>)),
  flagReview: (id: string, body: Record<string, unknown>): Promise<Record<string, unknown>> => request(`/reviews/moderation/${id}/flag`, { method: 'PUT', body: JSON.stringify(body) }),
  unflagReview: (id: string): Promise<Record<string, unknown>> => request(`/reviews/moderation/${id}/unflag`, { method: 'PUT' }),
  deleteReview: (id: string): Promise<{ message: string }> => request(`/reviews/${id}`, { method: 'DELETE' }),
  getCategories: (p: Record<string, unknown> = {}): Promise<Record<string, unknown>> => request(withQuery('/categories', p as Record<string, string | number | boolean>)),
  createCategory: (body: Record<string, unknown>): Promise<Record<string, unknown>> => request('/categories', { method: 'POST', body: JSON.stringify(body) }),
  updateCategory: (id: string, body: Record<string, unknown>): Promise<Record<string, unknown>> => request(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteCategory: (id: string): Promise<{ message: string }> => request(`/categories/${id}`, { method: 'DELETE' }),
  getPlatformCoupons: (p: Record<string, unknown> = {}): Promise<Record<string, unknown>> => request(withQuery('/platform-coupons', p as Record<string, string | number | boolean>)),
  getPlatformCouponStats: (): Promise<Record<string, unknown>> => request('/platform-coupons/stats'),
  createPlatformCoupon: (body: Record<string, unknown>): Promise<Record<string, unknown>> => request('/platform-coupons', { method: 'POST', body: JSON.stringify(body) }),
  updatePlatformCoupon: (id: string, body: Record<string, unknown>): Promise<Record<string, unknown>> => request(`/platform-coupons/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  getFeaturedListings: (p: Record<string, unknown> = {}): Promise<Record<string, unknown>> => request(withQuery('/featured-listings', p as Record<string, string | number | boolean>)),
  createFeaturedListing: (body: Record<string, unknown>): Promise<Record<string, unknown>> => request('/featured-listings', { method: 'POST', body: JSON.stringify(body) }),
  deleteFeaturedListing: (id: string): Promise<{ message: string }> => request(`/featured-listings/${id}`, { method: 'DELETE' }),
  getCities: (p: Record<string, unknown> = {}): Promise<Record<string, unknown>> => request(withQuery('/cities', p as Record<string, string | number | boolean>)),
  createCity: (body: Record<string, unknown>): Promise<Record<string, unknown>> => request('/cities', { method: 'POST', body: JSON.stringify(body) }),
  updateCity: (id: string, body: Record<string, unknown>): Promise<Record<string, unknown>> => request(`/cities/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteCity: (id: string): Promise<{ message: string }> => request(`/cities/${id}`, { method: 'DELETE' }),
  getIntegrations: (): Promise<Record<string, unknown>> => request('/integrations'),
  updateIntegration: (key: string, body: Record<string, unknown>): Promise<Record<string, unknown>> => request(`/integrations/${key}`, { method: 'PUT', body: JSON.stringify(body) }),
  testIntegration: (key: string): Promise<Record<string, unknown>> => request(`/integrations/${key}/test`, { method: 'POST' }),
  getWebhooks: (provider: string): Promise<Record<string, unknown>> => request(`/integrations/${provider}/webhooks`),
  createWebhook: (provider: string, body: Record<string, unknown>): Promise<Record<string, unknown>> => request(`/integrations/${provider}/webhooks`, { method: 'POST', body: JSON.stringify(body) }),
  deleteWebhook: (provider: string, webhookId: string): Promise<{ message: string }> => request(`/integrations/${provider}/webhooks/${webhookId}`, { method: 'DELETE' }),
  getSystemSettings: (): Promise<Record<string, unknown>> => request('/system-settings'),
  updateSystemSetting: (key: string, body: Record<string, unknown>): Promise<Record<string, unknown>> => request(`/system-settings/${key}`, { method: 'PUT', body: JSON.stringify(body) }),
  getPlatformContent: (key: string): Promise<Record<string, unknown>> => request(`/platform-content/${key}`),
  updatePlatformContent: (key: string, body: Record<string, unknown>): Promise<Record<string, unknown>> => request(`/platform-content/${key}`, { method: 'PUT', body: JSON.stringify(body) }),
  getBroadcasts: (p: Record<string, unknown> = {}): Promise<Record<string, unknown>> => request(withQuery('/broadcast', p as Record<string, string | number | boolean>)),
  createBroadcast: (body: Record<string, unknown>): Promise<Record<string, unknown>> => request('/broadcast', { method: 'POST', body: JSON.stringify(body) }),
  getAuditLogs: (p: Record<string, unknown> = {}): Promise<Record<string, unknown>> => request(withQuery('/audit-logs', p as Record<string, string | number | boolean>)),
  getAuditLogStats: (): Promise<Record<string, unknown>> => request('/audit-logs/stats'),
  getCommissionConfigs: (): Promise<Record<string, unknown>> => request('/commission/config'),
  updateCommissionConfig: (id: string, body: Record<string, unknown>): Promise<Record<string, unknown>> => request(`/commission/config/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  getTransactionLedger: (p: Record<string, unknown> = {}): Promise<Record<string, unknown>> => request(withQuery('/transactions/ledger', p as Record<string, string | number | boolean>)),
  getPayouts: (p: Record<string, unknown> = {}): Promise<Record<string, unknown>> => request(withQuery('/commission/payouts', p as Record<string, string | number | boolean>)),
  markPayoutPaid: (id: string, body: Record<string, unknown>): Promise<Record<string, unknown>> => request(`/commission/payouts/${id}/pay`, { method: 'PUT', body: JSON.stringify(body) }),
  getTests: (p: Record<string, unknown> = {}): Promise<Record<string, unknown>> => request(withQuery('/tests', p as Record<string, string | number | boolean>)),
  getMedicines: (p: Record<string, unknown> = {}): Promise<Record<string, unknown>> => request(withQuery('/pharmacy/medicines', p as Record<string, string | number | boolean>)),
  getClinicProfile: clinic.getProfile,
  updateClinicProfile: clinic.updateProfile,
  getClinicStaff: clinic.getStaff,
  createClinicStaff: clinic.createStaff,
  updateClinicStaff: clinic.updateStaff,
  deleteClinicStaff: clinic.deleteStaff,
  getMyFacility: (): Promise<Record<string, unknown>> => request('/facilities/mine'),
  getDoctorAnalytics: (params?: Record<string, unknown>): Promise<Record<string, unknown>> => request(withQuery('/analytics/doctor', params as Record<string,string> || {})),
  updateDoctorSchedule: doctors.updateSchedule,
  updateDoctor: doctors.update,
  getTestStats: tests.getStats,
  createTest: tests.create,
  updateTest: tests.update,
  deleteTest: tests.delete,
  updateNotification: (id:string, body:Record<string,unknown>):Promise<Record<string,unknown>> => request('/notifications/'+id, {method:'PUT', body: JSON.stringify(body)}),
  deleteNotification: (id:string):Promise<{message:string}> => request('/notifications/'+id, {method:'DELETE'}),
  updateBill: billing.update,
  deleteBill: billing.delete,
  updateLabBooking: lab.updateBooking,
  deleteLabBooking: lab.deleteBooking,
  getLabEquipment: lab.getEquipment,
  // Generic dispatch passthrough
  dispatch: (path: string, options: { method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'; body?: unknown; headers?: Record<string, string> }) =>
    request(path, { method: options.method, body: options.body, headers: options.headers }),
  get: (path: string): Promise<unknown> => request(path),
  put: (path: string, body?: unknown): Promise<unknown> => request(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  post: (path: string, body?: unknown): Promise<unknown> => request(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  del: (path: string): Promise<unknown> => request(path, { method: 'DELETE' }),
};

export { request, downloadFile } from './client';
