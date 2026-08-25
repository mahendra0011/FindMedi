import apiClient, { getApiBaseUrl, getServerOrigin } from './axios';

export { getApiBaseUrl, getServerOrigin };

const BASE = getApiBaseUrl();

// Server se relative path milne par (e.g. "/uploads/documents/x.jpg" — local
// storage fallback) use API origin se prefix karo; Cloudinary/absolute URL
// ko waise hi chhodo. Nahin to doctor view me "View File" 404 deta hai.
export function resolveFileUrl(url) {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url;
  if (url.startsWith('/')) return getServerOrigin() + url;
  return url;
}

/**
 * True only when the value is an actual usable file URL.
 * Bare filenames (stored when an upload previously failed) are NOT valid —
 * opening them produces a bogus relative URL.
 */
export function isValidFileUrl(url) {
  if (!url) return false;
  return /^https?:\/\//i.test(url) || url.startsWith('/') || url.startsWith('data:') || url.startsWith('blob:');
}

/**
 * Detect file type from a URL or filename.
 * Returns 'image' | 'pdf' | 'other'
 */
export function getFileType(url = '') {
  if (/\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(url)) return 'image';
  if (/\.pdf$/i.test(url)) return 'pdf';
  return 'other';
}

// API origin (without /api) — used to detect local-server URLs that need auth.
const API_ORIGIN = BASE.replace(/\/api\/?$/, '');

/**
 * Returns true when the (resolved) URL points to the local Express server
 * (auth-protected static middleware) rather than an external CDN such as
 * Cloudinary.  External URLs are publicly accessible and can be used directly;
 * local URLs require credentials that <img>/<iframe> do not send.
 */
export function isLocalFileUrl(url = '') {
  if (!url) return false;
  // Relative paths (e.g. "/uploads/documents/x.jpg") are local by definition.
  if (url.startsWith('/') && !url.startsWith('//')) return true;
  // Absolute URLs on the same origin as the API server.
  return url.startsWith(API_ORIGIN + '/') || url.startsWith(API_ORIGIN);
}

/**
 * Resolve a file URL for inline preview (<img>, <iframe>).
 *
 * Local / auth-protected URLs are fetched with `credentials: 'include'` so
 * they pass the server's `/uploads` middleware, then converted to a blob URL
 * that the browser can render without re-sending auth.  External URLs
 * (Cloudinary, etc.) are returned as-is.
 *
 * @param {string} url - raw file URL stored on the appointment/record
 * @returns {Promise<{url: string, type: 'image'|'pdf'|'other'} | null>}
 */
export async function getFilePreviewUrl(url) {
  const resolved = resolveFileUrl(url);
  if (!resolved) return null;

  const type = getFileType(resolved);

  if (!isLocalFileUrl(resolved)) {
    // External CDN (Cloudinary) — publicly accessible, use directly.
    return { url: resolved, type };
  }

  // Local / auth-protected — fetch with credentials → blob URL.
  try {
    const response = await fetch(resolved, { credentials: 'include' });
    if (!response.ok) throw new Error(`Failed to load file (${response.status})`);
    const blob = await response.blob();
    return { url: URL.createObjectURL(blob), type };
  } catch (err) {
    console.error('getFilePreviewUrl error:', err);
    return null;
  }
}

/**
 * Map a Payment doc (from /api/transactions) into the "bill" shape that
 * EarningsAnalytics and the clinic dashboard revenue widgets expect.
 *
 * /api/billing is patient-scoped and /api/payments returns hospital-wide
 * data, so earnings must come from /api/transactions (already filtered to
 * this doctor's own payments).  Statuses are converted to the capitalized
 * variants used by STATUS_META (Paid/Pending/Partial/Overdue).
 */
export function txToEarningsBill(t) {
  const created = t.createdAt ? new Date(t.createdAt) : new Date();
  const ist = new Date(created.getTime() + 5.5 * 60 * 60 * 1000);
  const iso = ist.toISOString();
  return {
    _id: t._id,
    amount: Number(t.amount) || 0,
    paid: t.status === 'completed' ? Number(t.amount) || 0 : 0,
    date: iso.slice(0, 10),
    time: iso.slice(11, 16),
    status: t.status === 'completed' ? 'Paid'
      : t.status === 'pending' ? 'Pending'
      : t.status === 'failed' ? 'Failed'
      : t.status === 'refunded' ? 'Refunded'
      : t.status,
    patient: t.patient_name || t.patient || 'Patient',
    service: t.serviceType === 'appointment' ? 'Appointment'
      : t.serviceType === 'test' ? 'Test'
      : t.serviceType === 'medicine' ? 'Medicine'
      : t.serviceType || 'General',
    method: t.method,
    provider: t.provider,
    transaction_id: t.transaction_id,
    invoice_id: t.invoice_id,
  };
}

export function dispatch(_fallback, path, options = {}) {
  return request(path, options);
}

async function request(path, options = {}) {
  const { method = 'GET', body, headers: extraHeaders } = options;
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  const response = await apiClient({
    url: path,
    method,
    data: body,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...extraHeaders,
    },
  });
  return response.data;
}

export async function downloadInvoicePdf(billId, filename = 'invoice.pdf') {
  try {
    const response = await apiClient.get(`/billing/${billId}/invoice`, {
      responseType: 'blob',
    });
    const blob = new Blob([response.data]);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (error) {
    throw new Error(error.message || 'Unable to download invoice');
  }
}

export async function downloadPaymentInvoice(txnId, filename = 'invoice.pdf') {
  try {
    const response = await apiClient.get(`/transactions/${txnId}/invoice`, {
      responseType: 'blob',
    });
    const blob = new Blob([response.data]);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (error) {
    throw new Error(error.message || 'Unable to download invoice');
  }
}

export async function downloadBillPdf(txnId, filename = 'bill.pdf') {
  try {
    const response = await apiClient.get(`/transactions/${txnId}/bill`, {
      responseType: 'blob',
    });
    const blob = new Blob([response.data]);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (error) {
    throw new Error(error.message || 'Unable to download bill');
  }
}

export async function downloadPrescriptionPdf(recordId, filename = 'prescription.pdf') {
  try {
    const response = await apiClient.get(`/records/${recordId}/prescription-pdf`, {
      responseType: 'blob',
    });
    const blob = new Blob([response.data]);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (error) {
    throw new Error(error.message || 'Unable to download prescription');
  }
}

export const api = {
  dispatch,
  post:               (path, body) => request(path, { method:'POST', body: JSON.stringify(body) }),
  get:                (path)      => request(path),
  put:                (path, body) => request(path, { method:'PUT', body: JSON.stringify(body) }),
  del:                (path)      => request(path, { method:'DELETE' }),
  login:              (body)    => request('/auth/login',            { method:'POST', body: JSON.stringify(body) }),
  googleAuth:         (body)    => request('/auth/google',           { method:'POST', body: JSON.stringify(body) }),
  setDoctorPassword:  (body)    => request('/auth/doctor-setup',     { method:'POST', body: JSON.stringify(body) }),
  register:           (body)    => request('/auth/register',         { method:'POST', body: JSON.stringify(body) }),
  verifyOTP:          (body)    => request('/auth/verify-otp',       { method:'POST', body: JSON.stringify(body) }),
  resendOTP:          (body)    => request('/auth/resend-otp',       { method:'POST', body: JSON.stringify(body) }),
  forgotPassword:     (body)    => request('/auth/forgot-password',  { method:'POST', body: JSON.stringify(body) }),
  resetPassword:      (body)    => request('/auth/reset-password',   { method:'POST', body: JSON.stringify(body) }),
  logout:             ()        => request('/auth/logout',           { method:'POST' }),
  me:                 ()        => request('/auth/me'),
  updateProfile:      (body)    => request('/auth/profile',          { method:'PUT',  body: JSON.stringify(body) }),
  uploadAvatar:       (file)    => {
    const body = new FormData();
    body.append('file', file);
    return request('/auth/avatar', { method:'POST', body });
  },
  uploadFile:         (file)    => {
    const body = new FormData();
    body.append('file', file);
    return request('/upload', { method:'POST', body });
  },  changePassword:     (body)    => request('/auth/change-password',  { method:'PUT', body: JSON.stringify(body) }),
  dashboardStats:     ()        => request('/dashboard/stats'),

  getUsers:           (p={})    => request('/users?' + new URLSearchParams(p)),
  deleteUser:             (id)      => request(`/users/${id}`, { method:'DELETE' }),
  blockUser:              (id)      => request(`/users/${id}/block`, { method:'PUT' }),
  flagUser:               (id,b)    => request(`/users/${id}/flag`, { method:'PUT', body: JSON.stringify(b) }),
  unflagUser:             (id)      => request(`/users/${id}/unflag`, { method:'PUT' }),

  getDoctors:         (p={})    => request('/doctors?' + new URLSearchParams(p)),
  getDoctor:           (id)      => request(`/doctors/${id}`),
  createDoctor:       (body)    => request('/doctors',               { method:'POST',   body: JSON.stringify(body) }),
  updateDoctor:       (id,body) => request(`/doctors/${id}`,         { method:'PUT',    body: JSON.stringify(body) }),
  deleteDoctor:       (id)      => request(`/doctors/${id}`,         { method:'DELETE' }),
  updateDoctorClinicProfile: (id,body) => request(`/doctors/${id}/clinic-profile`, { method:'PUT', body: JSON.stringify({ clinicProfile: body }) }),
  updateDoctorSchedule:(id,b)  => request(`/doctors/${id}/schedule`,{ method:'PUT',    body: JSON.stringify(b) }),
   approveDoctor:      (id)      => request(`/doctors/${id}/approve`,{ method:'PUT' }),
   rejectDoctor:       (id)      => request(`/doctors/${id}/reject`, { method:'PUT' }),
   uploadDoctorSignature:(id,file) => {
     const body = new FormData();
     body.append('signature', file);
     return request(`/doctors/${id}/signature`, { method:'POST', body });
   },
   getDoctorAutoConfirmList: () => request('/doctors/my-facility/auto-confirm'),
   updateDoctorAutoConfirm: (id, value) => request(`/doctors/${id}/auto-confirm`, { method:'PUT', body: JSON.stringify({ autoConfirmAppointment: value }) }),
   getMyAutoConfirm: () => request('/doctors/me/auto-confirm'),
   updateMyAutoConfirm: (value) => request('/doctors/me/auto-confirm', { method:'PUT', body: JSON.stringify({ autoConfirmAppointment: value }) }),
   getMySlotCapacity: () => request('/doctors/me/slot-capacity'),
   updateMySlotCapacity: (n) => request('/doctors/me/slot-capacity', { method:'PUT', body: JSON.stringify({ maxBookingsPerSlot: n }) }),
   updateDoctorSlotCapacity: (id, n) => request(`/doctors/${id}/slot-capacity`, { method:'PUT', body: JSON.stringify({ maxBookingsPerSlot: n }) }),

  getPatients:        (p={})    => request('/patients?' + new URLSearchParams(p)),
  createPatient:      (body)    => request('/patients',             { method:'POST',   body: JSON.stringify(body) }),
  updatePatient:      (id,body) => request(`/patients/${id}`,       { method:'PUT',    body: JSON.stringify(body) }),
  deletePatient:      (id)      => request(`/patients/${id}`,       { method:'DELETE' }),

  getAppointments:    (p={})    => request('/appointments?' + new URLSearchParams(p)),
  getMyAppointments:  (p={})    => request('/appointments/my-appointments?' + new URLSearchParams({ ...p, _t: Date.now() })),
  getAppointmentsHistory: ()    => request('/appointments/history-with-payments?_t=' + Date.now()),
  getBookedSlots:     (p={})    => request('/appointments/booked-slots?' + new URLSearchParams(p)),
  createAppointment:  (body)    => request('/appointments',         { method:'POST',   body: JSON.stringify(body) }),
  walkInAppointment:  (body)    => request('/appointments/walk-in', { method:'POST',   body: JSON.stringify(body) }),
  updateAppointment:  (id,b)    => request(`/appointments/${id}`,   { method:'PUT',    body: JSON.stringify(b) }),
  submitIntakeForm:   (id,b)    => request(`/appointments/${id}/intake`, { method:'PUT', body: JSON.stringify(b) }),
  deleteAppointment:  (id)      => request(`/appointments/${id}`,   { method:'DELETE' }),

  getRecords:         (p={})    => request('/records?' + new URLSearchParams(p)),
  getPatientRecords:  (pid)     => request(`/records/patient/${pid}`),
  createRecord:       (body)    => request('/records',              { method:'POST',   body: JSON.stringify(body) }),
  deleteRecord:       (id)      => request(`/records/${id}`,        { method:'DELETE' }),

  getBilling:         (p={})    => request('/billing?' + new URLSearchParams(p)),
  createBill:         (body)    => request('/billing',              { method:'POST',   body: JSON.stringify(body) }),
  payBill:            (id,body) => request(`/billing/${id}/pay`,    { method:'POST',   body: JSON.stringify(body) }),
  updateBill:         (id,body) => request(`/billing/${id}`,        { method:'PUT',    body: JSON.stringify(body) }),
  deleteBill:         (id)      => request(`/billing/${id}`,        { method:'DELETE' }),
  getLabServices:     ()        => request('/billing/services'),

  getReviews:         (p={})    => request('/reviews?' + new URLSearchParams(p)),
  createReview:       (body)    => request('/reviews',              { method:'POST',   body: JSON.stringify(body) }),
  deleteReview:       (id)      => request(`/reviews/${id}`,        { method:'DELETE' }),

  getNotifications:         (p={})  => request('/notifications?' + new URLSearchParams(p)),
  getUnreadCount:           ()      => request('/notifications/unread-count'),
  markAllRead:              ()      => request('/notifications/mark-all-read', { method:'PUT' }),
  clearAllNotifications:    ()      => request('/notifications/clear-all',     { method:'DELETE' }),
  markNotificationRead:     (id)    => request(`/notifications/${id}/read`,    { method:'PUT' }),
  createNotification:       (body)  => request('/notifications',                { method:'POST', body: JSON.stringify(body) }),
  deleteNotification:       (id)    => request(`/notifications/${id}`,          { method:'DELETE' }),
  getDepartments:    ()        => request('/departments'),
  createDepartment:  (body)    => request('/departments',           { method:'POST',   body: JSON.stringify(body) }),
  updateDepartment:  (id,b)    => request(`/departments/${id}`,     { method:'PUT',    body: JSON.stringify(b) }),
  deleteDepartment:  (id)      => request(`/departments/${id}`,     { method:'DELETE' }),

  getEmergencies:        (p={})    => request('/emergency?' + new URLSearchParams(p)),
  createEmergency:       (body)    => request('/emergency',            { method:'POST',   body: JSON.stringify(body) }),
  assignEmergencyDoctor: (id,docId,docName) => request(`/emergency/${id}/assign`, { method:'PUT', body: JSON.stringify({ doctorId: docId, doctorName: docName }) }),
  updateEmergencyStatus: (id,status) => request(`/emergency/${id}/status`, { method:'PUT', body: JSON.stringify({ status }) }),
  addEmergencyNote:      (id,text)  => request(`/emergency/${id}/notes`, { method:'POST', body: JSON.stringify({ text }) }),
  getEmergencyStats:     ()         => request('/emergency/stats'),

  getPayments:    (p={})  => request('/payments?' + new URLSearchParams(p)),
  createPayment:  (body)  => request('/payments',            { method:'POST',   body: JSON.stringify(body) }),
  updatePayment:  (id,b)  => request(`/payments/${id}`,      { method:'PUT',    body: JSON.stringify(b) }),
  refundPayment:  (id,b)  => request(`/payments/${id}/refund`, { method:'PUT',    body: JSON.stringify(b) }),
  getRefunds:     (p={})  => request('/payments?' + new URLSearchParams({ ...p, status: 'refunded' })),

  getTransactions:  (p={})  => request('/transactions?' + new URLSearchParams({ ...p, _t: Date.now() })),
  payTransaction:   (body)  => request('/transactions/pay',  { method:'POST',   body: JSON.stringify(body) }),
  verifyTransaction: (id)   => request(`/transactions/verify/${encodeURIComponent(id)}`),

  getHospitals:         (p={})  => request('/hospitals?' + new URLSearchParams(p)),
  getHospital:          (id)    => request(`/hospitals/${id}`),
  registerHospital:     (body)  => request('/hospitals/register', { method:'POST', body: JSON.stringify(body) }),
  updateHospital:       (id,b)  => request(`/hospitals/${id}`,    { method:'PUT',  body: JSON.stringify(b) }),
  approveHospital:      (id)    => request(`/hospitals/${id}/approve`, { method:'PUT' }),
  rejectHospital:       (id,b)  => request(`/hospitals/${id}/reject`,  { method:'PUT', body: JSON.stringify(b) }),
  suspendHospital:      (id)    => request(`/hospitals/${id}/suspend`, { method:'PUT' }),
  deleteHospital:       (id)    => request(`/hospitals/${id}`,         { method:'DELETE' }),
  getPendingHospitals:  ()      => request('/hospitals/pending'),
  getMyHospital:        ()      => request('/hospitals/admin/mine'),
  registerPlatform:     (body)  => request('/platform/register', { method:'POST', body: JSON.stringify(body) }),

  registerDeliveryBoy:  (body)  => request('/delivery-boy/register', { method:'POST', body: JSON.stringify(body) }),
  uploadDeliveryDocs:   (userId, docs) => {
    const body = new FormData();
    Object.entries(docs).forEach(([key, file]) => { if (file) body.append(key, file); });
    return request(`/delivery-boy/upload-docs/${userId}`, { method:'POST', body });
  },
  getPendingDeliveryBoys: () => request('/delivery-boy/pending'),
  getAllDeliveryBoys:   ()  => request('/delivery-boy/all'),
  approveDeliveryBoy:   (id, body) => request(`/delivery-boy/approve/${id}`, { method:'PUT', body: JSON.stringify(body) }),
  updateDeliveryLocation: (id, body) => request(`/delivery-boy/location/${id}`, { method:'PUT', body: JSON.stringify(body) }),
  getNearbyDeliveryBoys: (lat, lng, radius) => request(`/delivery-boy/nearby?lat=${lat}&lng=${lng}&radius=${radius || 10}`),
  getDeliveryProfile:   (id) => request(`/delivery-boy/profile/${id}`),
  updateDeliveryProfile: (id, body) => request(`/delivery-boy/profile/${id}`, { method:'PUT', body: JSON.stringify(body) }),

  getBeds:        (p={})  => request('/beds?' + new URLSearchParams(p)),
  getBedStats:    ()      => request('/beds/stats'),
  createBed:      (body)  => request('/beds',              { method:'POST',   body: JSON.stringify(body) }),
  updateBed:      (id,b)  => request(`/beds/${id}`,        { method:'PUT',    body: JSON.stringify(b) }),
  deleteBed:      (id)    => request(`/beds/${id}`,        { method:'DELETE' }),

  getTests:       (p={})  => request('/tests?' + new URLSearchParams(p)),
  getTestStats:   ()      => request('/tests/stats'),
  createTest:     (body)  => request('/tests',             { method:'POST',   body: JSON.stringify(body) }),
  updateTest:     (id,b)  => request(`/tests/${id}`,       { method:'PUT',    body: JSON.stringify(b) }),
  deleteTest:     (id)    => request(`/tests/${id}`,       { method:'DELETE' }),

  getFacilities:         (p={})  => request('/facilities?' + new URLSearchParams(p)),
  getFacility:           (id)    => request(`/facilities/${id}`),
  registerFacility:      (body)  => request('/facilities/register', { method:'POST', body: JSON.stringify(body) }),
  approveFacility:       (id)    => request(`/facilities/${id}/approve`, { method:'PUT' }),
  rejectFacility:        (id,b)  => request(`/facilities/${id}/reject`,  { method:'PUT', body: JSON.stringify(b || { reason: '' }) }),
  suspendFacility:       (id)    => request(`/facilities/${id}/suspend`, { method:'PUT' }),
  updateFacility:        (id,b)  => request(`/facilities/${id}`,         { method:'PUT', body: JSON.stringify(b) }),
  getMyFacility:         ()      => request('/facilities/mine'),
  getFacilitySettings:   ()      => request('/facilities/settings'),
  updateFacilitySettings:(body)  => request('/facilities/settings', { method:'PUT', body: JSON.stringify(body) }),
  getPendingFacilities:  (type)  => request('/facilities/pending?' + (type ? new URLSearchParams({ type }) : '')),
  getClinicProfile:      ()      => request('/clinics/profile'),
  updateClinicProfile:   (body)  => request('/clinics/profile', { method:'PUT', body: JSON.stringify(body) }),
  getClinicStaff:        ()      => request('/clinics/staff'),
  createClinicStaff:     (body)  => request('/clinics/staff',   { method:'POST', body: JSON.stringify(body) }),
  updateClinicStaff:     (id,b)  => request(`/clinics/staff/${id}`, { method:'PUT', body: JSON.stringify(b) }),
  deleteClinicStaff:     (id)    => request(`/clinics/staff/${id}`, { method:'DELETE' }),

  getPharmacyStats:       ()        => request('/pharmacy/stats'),
  getPharmacyMedicines:   (p={})    => request('/pharmacy/medicines?' + new URLSearchParams(p)),
  createPharmacyMedicine: (body)    => request('/pharmacy/medicines', { method:'POST', body: JSON.stringify(body) }),
  updatePharmacyMedicine: (id,body) => request(`/pharmacy/medicines/${id}`, { method:'PUT', body: JSON.stringify(body) }),
  deletePharmacyMedicine: (id)      => request(`/pharmacy/medicines/${id}`, { method:'DELETE' }),
  getPharmacyOrders:      (p={})    => request('/pharmacy/orders?' + new URLSearchParams(p)),
  createPharmacyOrder:    (body)    => request('/pharmacy/orders', { method:'POST', body: JSON.stringify(body) }),
  updatePharmacyOrder:    (id,body) => request(`/pharmacy/orders/${id}`, { method:'PUT', body: JSON.stringify(body) }),
  deletePharmacyOrder:    (id)      => request(`/pharmacy/orders/${id}`, { method:'DELETE' }),
  forwardPharmacyOrder:   (id,body) => request(`/pharmacy/orders/${id}/forward`, { method:'POST', body: JSON.stringify(body) }),
  rejectPharmacyOrder:    (id,body) => request(`/pharmacy/orders/${id}/reject`, { method:'PUT', body: JSON.stringify(body) }),
  getPharmacyStaff:       (p={})    => request('/pharmacy/staff?' + new URLSearchParams(p)),
  createPharmacyStaff:    (body)    => request('/pharmacy/staff', { method:'POST', body: JSON.stringify(body) }),
  updatePharmacyStaff:    (id,body) => request(`/pharmacy/staff/${id}`, { method:'PUT', body: JSON.stringify(body) }),
  deletePharmacyStaff:    (id)      => request(`/pharmacy/staff/${id}`, { method:'DELETE' }),
  getPharmacyOffers:      (p={})    => request('/pharmacy/offers?' + new URLSearchParams(p)),
  createPharmacyOffer:    (body)    => request('/pharmacy/offers', { method:'POST', body: JSON.stringify(body) }),
  updatePharmacyOffer:    (id,body) => request(`/pharmacy/offers/${id}`, { method:'PUT', body: JSON.stringify(body) }),
  deletePharmacyOffer:    (id)      => request(`/pharmacy/offers/${id}`, { method:'DELETE' }),
  getPharmacyReturns:     (p={})    => request('/pharmacy/returns?' + new URLSearchParams(p)),
  createPharmacyReturn:   (body)    => request('/pharmacy/returns', { method:'POST', body: JSON.stringify(body) }),
  updatePharmacyReturn:   (id,body) => request(`/pharmacy/returns/${id}`, { method:'PUT', body: JSON.stringify(body) }),
  refundPharmacyOrder:    (id,body) => request(`/pharmacy/orders/${id}/refund`, { method:'POST', body: JSON.stringify(body) }),
  validatePharmacyCoupon: (code)    => request('/pharmacy/coupons/validate', { method:'POST', body: JSON.stringify({ code }) }),
  verifyPharmacyPrescriptions: (body) => request('/pharmacy/orders/verify-prescriptions', { method:'POST', body: JSON.stringify(body) }),
  getPharmacyDeliveries:  (p={})    => request('/pharmacy/deliveries?' + new URLSearchParams(p)),
  getPharmacyPrescriptions: (p={})  => request('/pharmacy/prescriptions?' + new URLSearchParams(p)),
  getPharmacyPrescription:  (id)    => request(`/pharmacy/prescriptions/${id}`),
   dispensePharmacyMedicine: (id,b)  => request(`/pharmacy/prescriptions/${id}/dispense`, { method:'PUT', body: JSON.stringify(b) }),
   verifyPrescription:       (id,b)  => request(`/pharmacy/prescriptions/${id}/verify`, { method:'PUT', body: JSON.stringify(b) }),

  getLabStats:        ()        => request('/lab/stats'),
  getLabBookings:     (p={})    => request('/lab/bookings?' + new URLSearchParams(p)),
  createLabBooking:   (body)    => request('/lab/bookings', { method:'POST', body: JSON.stringify(body) }),
  updateLabBooking:   (id,body) => request(`/lab/bookings/${id}`, { method:'PUT', body: JSON.stringify(body) }),
  deleteLabBooking:   (id)      => request(`/lab/bookings/${id}`, { method:'DELETE' }),
  getLabOrders:       (p={})    => request('/lab/orders?' + new URLSearchParams(p)),
  getLabTests:        ()        => request('/lab/tests'),
  getLabEquipment:    (p={})    => request('/lab/equipment?' + new URLSearchParams(p)),
  createLabEquipment: (body)    => request('/lab/equipment', { method:'POST', body: JSON.stringify(body) }),
  updateLabEquipment: (id,body) => request(`/lab/equipment/${id}`, { method:'PUT', body: JSON.stringify(body) }),
  deleteLabEquipment: (id)      => request(`/lab/equipment/${id}`, { method:'DELETE' }),
  getLabPackages:     (p={})    => request('/lab/packages?' + new URLSearchParams(p)),
  createLabPackage:   (body)    => request('/lab/packages', { method:'POST', body: JSON.stringify(body) }),
  updateLabPackage:   (id,body) => request(`/lab/packages/${id}`, { method:'PUT', body: JSON.stringify(body) }),
  deleteLabPackage:   (id)      => request(`/lab/packages/${id}`, { method:'DELETE' }),
  createLabOrder:     (body)    => request('/lab/orders', { method:'POST', body: JSON.stringify(body) }),
  getLabOrder:        (id)      => request(`/lab/orders/${id}`),
  registerSample:     (id,body) => request(`/lab/orders/${id}/register-sample`, { method:'PUT', body: JSON.stringify(body) }),
  collectSample:      (id,body) => request(`/lab/orders/${id}/collect-sample`, { method:'PUT', body: JSON.stringify(body) }),
  enterResult:        (id,body) => request(`/lab/orders/${id}/enter-result`, { method:'PUT', body: JSON.stringify(body) }),
  verifyLabResult:    (id,body) => request(`/lab/orders/${id}/verify`, { method:'PUT', body: JSON.stringify(body) }),
  deliverLabReport:   (id,body) => request(`/lab/orders/${id}/deliver-report`, { method:'PUT', body: JSON.stringify(body) }),
  exportLabOrders:      (p={})    => request('/lab/export?' + new URLSearchParams(p)),

  getBloodUnits:      (p={})    => request('/bloodbank/units?' + new URLSearchParams(p)),
  addBloodUnit:       (body)    => request('/bloodbank/units', { method:'POST', body: JSON.stringify(body) }),
  getBloodRequests:   (p={})    => request('/bloodbank/requests?' + new URLSearchParams(p)),
  createBloodRequest: (body)    => request('/bloodbank/requests', { method:'POST', body: JSON.stringify(body) }),
  crossMatchBlood:    (id,body) => request(`/bloodbank/requests/${id}/crossmatch`, { method:'PUT', body: JSON.stringify(body) }),
  issueBloodUnits:    (id,body) => request(`/bloodbank/requests/${id}/issue`, { method:'PUT', body: JSON.stringify(body) }),
  startTransfusion:   (id,body) => request(`/bloodbank/requests/${id}/start-transfusion`, { method:'PUT', body: JSON.stringify(body) }),
  completeTransfusion:(id,body) => request(`/bloodbank/requests/${id}/transfuse`, { method:'PUT', body: JSON.stringify(body) }),
  reportReaction:     (id,body) => request(`/bloodbank/requests/${id}/reaction`, { method:'PUT', body: JSON.stringify(body) }),
  getBloodBankStats:  ()        => request('/bloodbank/stats'),

  getDietOrders:      (p={})    => request('/diet/orders?' + new URLSearchParams(p)),
  createDietOrder:    (body)    => request('/diet/orders', { method:'POST', body: JSON.stringify(body) }),
  deliverMeal:        (id,body) => request(`/diet/orders/${id}/deliver-meal`, { method:'PUT', body: JSON.stringify(body) }),
  confirmMeal:        (id,body) => request(`/diet/orders/${id}/confirm-meal`, { method:'PUT', body: JSON.stringify(body) }),
  reviewDiet:         (id,body) => request(`/diet/orders/${id}/review`, { method:'PUT', body: JSON.stringify(body) }),
  addDietFeedback:    (id,body) => request(`/diet/orders/${id}/review`, { method:'PUT', body: JSON.stringify(body) }),
  notifyKitchen:      (id)      => request(`/diet/orders/${id}/review`, { method:'PUT', body: JSON.stringify({ kitchenNotified: true }) }),
  addDietToBilling:   (id,body) => request(`/diet/orders/${id}/create-billing`, { method:'POST', body: JSON.stringify(body) }),
  getDietStats:       ()        => request('/diet/stats'),

  adjustPharmacyMedicineStock: (id,body) => request(`/pharmacy/medicines/${id}/stock`, { method:'PUT', body: JSON.stringify(body) }),
  createPharmacyDelivery:      (body)    => request('/pharmacy/deliveries', { method:'POST', body: JSON.stringify(body) }),
  updatePharmacyDelivery:      (id,body) => request(`/pharmacy/deliveries/${id}`, { method:'PUT', body: JSON.stringify(body) }),

  getAuditLogs:               (p={})    => request('/audit-logs?' + new URLSearchParams(p)),
  getAuditLogStats:           ()        => request('/audit-logs/stats'),

  replyToReview:              (id,b)    => request(`/reviews/${id}/reply`, { method:'PUT', body: JSON.stringify(b) }),

  getFlaggedReviews:          (p={})    => request('/reviews/moderation?' + new URLSearchParams(p)),
  flagReview:                 (id,b)    => request(`/reviews/moderation/${id}/flag`,   { method:'PUT', body: JSON.stringify(b) }),
  unflagReview:               (id)      => request(`/reviews/moderation/${id}/unflag`, { method:'PUT' }),

  getSystemSettings:          ()        => request('/system-settings'),
  updateSystemSetting:        (key,b)   => request(`/system-settings/${key}`, { method:'PUT', body: JSON.stringify(b) }),

  getCommissionConfigs:       ()        => request('/commission/config'),
  updateCommissionConfig:     (id,b)    => request(`/commission/config/${id}`, { method:'PUT', body: JSON.stringify(b) }),
  getTransactionLedger:       (p={})    => request('/commission/ledger?' + new URLSearchParams(p)),
  getPayouts:                 (p={})    => request('/commission/payouts?' + new URLSearchParams(p)),
  createPayout:               (body)    => request('/commission/payouts', { method:'POST', body: JSON.stringify(body) }),
  markPayoutPaid:             (id,b)    => request(`/commission/payouts/${id}/pay`, { method:'PUT', body: JSON.stringify(b) }),
  getCommissionStats:         ()        => request('/commission/stats'),

  getDisputes:            (p={})    => request('/disputes?' + new URLSearchParams(p)),
  updateDisputeStatus:    (id,b)    => request(`/disputes/${id}/status`, { method:'PUT', body: JSON.stringify(b) }),
  assignDispute:          (id,b)    => request(`/disputes/${id}/assign`, { method:'PUT', body: JSON.stringify(b) }),
  getDisputeStats:        ()        => request('/disputes/stats'),

  getLeaveRequests:       (p={})    => request('/leave-requests?' + new URLSearchParams(p)),
  createLeaveRequest:     (body)    => request('/leave-requests', { method:'POST', body: JSON.stringify(body) }),
  updateLeaveRequestStatus: (id,b)  => request(`/leave-requests/${id}/status`, { method:'PUT', body: JSON.stringify(b) }),
  getPendingLeaveRequests: ()       => request('/leave-requests/pending'),

  // Schedule change requests (doctor → admin approval workflow)
  getScheduleChangeRequests:    (p={}) => request('/schedule-change-requests?' + new URLSearchParams(p)),
  createScheduleChangeRequest:  (body) => request('/schedule-change-requests', { method:'POST', body: JSON.stringify(body) }),
  getPendingScheduleChangeRequests: () => request('/schedule-change-requests/pending'),
  decideScheduleChangeRequest:  (id, body) => request(`/schedule-change-requests/${id}/decision`, { method:'PUT', body: JSON.stringify(body) }),
  cancelScheduleChangeRequest:  (id) => request(`/schedule-change-requests/${id}/cancel`, { method:'PUT' }),

  getPreferredPharmacies:       ()      => request('/patient/preferred-pharmacies'),
  addPreferredPharmacy:         (body)  => request('/patient/preferred-pharmacies', { method:'POST', body: JSON.stringify(body) }),
  reorderPreferredPharmacies:   (body)  => request('/patient/preferred-pharmacies/reorder', { method:'PUT', body: JSON.stringify(body) }),
  deletePreferredPharmacy:      (id)    => request(`/patient/preferred-pharmacies/${id}`, { method:'DELETE' }),
  getSupportTickets:            (p={})  => request('/support-tickets?' + new URLSearchParams(p)),
  createSupportTicket:    (body)    => request('/support-tickets', { method:'POST', body: JSON.stringify(body) }),
  getMyTickets:           (p={})    => request('/support-tickets/my-tickets?' + new URLSearchParams(p)),
  updateTicketStatus:     (id,b)    => request(`/support-tickets/${id}/status`, { method:'PUT', body: JSON.stringify(b) }),
  assignTicket:           (id,b)    => request(`/support-tickets/${id}/assign`, { method:'PUT', body: JSON.stringify(b) }),
  addTicketMessage:       (id,b)    => request(`/support-tickets/${id}/messages`, { method:'POST', body: JSON.stringify(b) }),
  getTicketStats:         ()        => request('/support-tickets/stats'),

  getCategories:          (p={})    => request('/categories?' + new URLSearchParams(p)),
  createCategory:         (body)    => request('/categories', { method:'POST', body: JSON.stringify(body) }),
  updateCategory:         (id,b)    => request(`/categories/${id}`, { method:'PUT', body: JSON.stringify(b) }),
  deleteCategory:         (id)      => request(`/categories/${id}`, { method:'DELETE' }),
  mergeCategories:        (body)    => request('/categories/merge', { method:'POST', body: JSON.stringify(body) }),

  getLicenses:            (p={})    => request('/licenses?' + new URLSearchParams(p)),
  updateLicense:          (id,b)    => request(`/licenses/${id}`, { method:'PUT', body: JSON.stringify(b) }),
  getExpiringLicenses:    ()        => request('/licenses/expiring'),
  getLicenseStats:        ()        => request('/licenses/stats'),

  getAnnouncements:       (p={})    => request('/announcements?' + new URLSearchParams(p)),
  createAnnouncement:     (body)    => request('/announcements', { method:'POST', body: JSON.stringify(body) }),
  getBroadcasts:          (p={})    => request('/broadcast?' + new URLSearchParams(p)),
  createBroadcast:        (body)    => request('/broadcast', { method:'POST', body: JSON.stringify(body) }),
  getStaff:               (p={})    => request('/staff?' + new URLSearchParams(p)),
  createStaff:            (body)    => request('/staff', { method:'POST', body: JSON.stringify(body) }),
  updateStaff:            (id,b)    => request(`/staff/${id}`, { method:'PUT', body: JSON.stringify(b) }),
  deleteStaff:            (id)      => request(`/staff/${id}`, { method:'DELETE' }),
  getPharmacies:          (p={})    => request('/facilities?' + new URLSearchParams({ ...p, type: 'pharmacy' })),
  getMedicines:           (p={})    => {
    const { storeId, ...params } = p;
    return storeId
      ? request(`/pharmacy/medicines/store/${storeId}?` + new URLSearchParams(params))
      : request('/pharmacy/medicines?' + new URLSearchParams(params));
  },
  getOrder:               async (id) => {
    const result = await request(`/pharmacy/orders?` + new URLSearchParams({ orderId: id }));
    return result?.order || result?.orders?.[0] || result;
  },
  getBookings:            (p={})    => request('/lab/bookings?' + new URLSearchParams(p)),
  getInventoryItems: (p={}) => request('/inventory/items?' + new URLSearchParams(p)),
  createInventoryItem: (b) => request('/inventory/items', { method: 'POST', body: JSON.stringify(b) }),
  addInventoryStock: (id, b) => request(`/inventory/items/${id}/stock`, { method: 'PUT', body: JSON.stringify(b) }),
  issueInventoryItem: (id, b) => request(`/inventory/items/${id}/stock`, { method: 'PUT', body: JSON.stringify({ ...b, type: 'deduct' }) }),
  createInventoryPR: (b) => request('/inventory/items', { method: 'POST', body: JSON.stringify({ ...b, requestType: 'purchase_request' }) }),
  createInventoryPO: (b) => request('/inventory/items', { method: 'POST', body: JSON.stringify({ ...b, requestType: 'purchase_order' }) }),
  receiveInventoryGRN: (id, b) => request(`/inventory/items/${id}/stock`, { method: 'PUT', body: JSON.stringify({ ...b, type: 'add' }) }),
  getInventoryStats: () => request('/inventory/stats'),

  getHousekeepingTasks: (p={}) => request('/housekeeping/tasks?' + new URLSearchParams(p)),
  createHousekeepingTask: (b) => request('/housekeeping/tasks', { method: 'POST', body: JSON.stringify(b) }),
  completeHousekeepingTask: (id, b) => request(`/housekeeping/tasks/${id}/complete`, { method: 'PUT', body: JSON.stringify(b) }),
  verifyHousekeepingTask: (id, b) => request(`/housekeeping/tasks/${id}/verify`, { method: 'PUT', body: JSON.stringify(b) }),
  autoCreateHousekeepingOnDischarge: (b) => request(`/housekeeping/auto-create-on-discharge`, { method: 'POST', body: JSON.stringify(b) }),
  getHousekeepingStats: () => request('/housekeeping/stats'),

  get2FAStatus: () => request('/auth/2fa/status'),
  setup2FA: () => request('/auth/2fa/setup', { method: 'POST' }),
  verify2FA: (body) => request('/auth/2fa/verify', { method: 'POST', body: JSON.stringify(body) }),
  disable2FA: (body) => request('/auth/2fa/disable', { method: 'POST', body: JSON.stringify(body) }),

  getNursingCharts: (p={}) => request('/nursing?' + new URLSearchParams(p)),
  createVitalsChart: (b) => request('/nursing/vitals', { method: 'POST', body: JSON.stringify(b) }),
  createMARChart: (b) => request('/nursing/mar', { method: 'POST', body: JSON.stringify(b) }),
  createIOChart: (b) => request('/nursing/io', { method: 'POST', body: JSON.stringify(b) }),
  createWoundChart: (b) => request('/nursing/wound-dressing', { method: 'POST', body: JSON.stringify(b) }),
  getNursingShiftCharts: (admissionId, date) => request(`/nursing/shift/${admissionId}/${date}`),
  getNursingStats: () => request('/nursing/stats'),

  getTokens: (p={}) => request('/tokens?' + new URLSearchParams(p)),
  generateToken: (b) => request('/tokens/generate', { method: 'POST', body: JSON.stringify(b) }),
  callToken: (id) => request(`/tokens/${id}/call`, { method: 'PUT' }),
  startTokenConsultation: (id) => request(`/tokens/${id}/start-consultation`, { method: 'PUT' }),
  completeToken: (id) => request(`/tokens/${id}/complete`, { method: 'PUT' }),
  skipToken: (id, b) => request(`/tokens/${id}/skip`, { method: 'PUT', body: JSON.stringify(b) }),
  recallToken: (id) => request(`/tokens/${id}/recall`, { method: 'PUT' }),
  getTokenStats: () => request('/tokens/stats'),

  getPlatformCoupons:       (p={})    => request('/platform-coupons?' + new URLSearchParams(p)),
  getPlatformCouponStats:   ()        => request('/platform-coupons/stats'),
  createPlatformCoupon:     (body)    => request('/platform-coupons', { method:'POST', body: JSON.stringify(body) }),
  updatePlatformCoupon:     (id,b)    => request(`/platform-coupons/${id}`, { method:'PUT', body: JSON.stringify(b) }),
  deletePlatformCoupon:     (id)      => request(`/platform-coupons/${id}`, { method:'DELETE' }),

  getFeaturedListings:      (p={})    => request('/featured-listings?' + new URLSearchParams(p)),
  createFeaturedListing:    (body)    => request('/featured-listings', { method:'POST', body: JSON.stringify(body) }),
  updateFeaturedListing:    (id,b)    => request(`/featured-listings/${id}`, { method:'PUT', body: JSON.stringify(b) }),
  deleteFeaturedListing:    (id)      => request(`/featured-listings/${id}`, { method:'DELETE' }),

  getCities:                (p={})    => request('/cities?' + new URLSearchParams(p)),
  createCity:               (body)    => request('/cities', { method:'POST', body: JSON.stringify(body) }),
  updateCity:               (id,b)    => request(`/cities/${id}`, { method:'PUT', body: JSON.stringify(b) }),
  deleteCity:               (id)      => request(`/cities/${id}`, { method:'DELETE' }),

  getPlatformContent:       (key)     => request(`/platform-content/${key}`),
  getAllPlatformContents:   (p={})    => request('/platform-content?' + new URLSearchParams(p)),
  updatePlatformContent:    (key,b)   => request(`/platform-content/${key}`, { method:'PUT', body: JSON.stringify(b) }),

  getIntegrations:           ()        => request('/integrations'),
  updateIntegration:         (p,b)     => request(`/integrations/${p}`, { method:'PUT', body: JSON.stringify(b) }),
  testIntegration:           (p)       => request(`/integrations/${p}/test`, { method:'POST' }),
  getWebhooks:               (p)       => request(`/integrations/${p}/webhooks`),
  createWebhook:             (p,b)     => request(`/integrations/${p}/webhooks`, { method:'POST', body: JSON.stringify(b) }),
  deleteWebhook:             (p,w)     => request(`/integrations/${p}/webhooks/${w}`, { method:'DELETE' }),

  getDriveStatus:           ()        => request('/drive/status'),
  getDriveAuthUrl:          ()        => request('/drive/auth-url'),
  disconnectDrive:          ()        => request('/drive/disconnect', { method:'DELETE' }),
  uploadToDrive:            (file)    => {
    const formData = new FormData();
    formData.append('file', file);
    return request('/drive/upload', { method:'POST', body: formData });
  },

  getDoctorAnalytics:       (params)  => {
    const query = new URLSearchParams();
    if (params?.doctorId) query.append('doctorId', params.doctorId);
    return request(`/analytics/doctor?${query.toString()}`);
  }
};
