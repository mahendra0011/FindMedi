import apiClient, { getApiBaseUrl, getServerOrigin, getAccessToken, refreshSession } from './axios';

/**
 * FE-B-01: Authorization headers for raw `fetch` calls that bypass axios.
 *
 * Three receipt downloads used `localStorage.getItem('token')`. That was both a
 * vulnerability (a script-readable copy of the token) and a correctness bug: when
 * localStorage was empty the header was sent literally as `Bearer ` — an empty
 * token — so a genuine session expiry was indistinguishable from a missing header.
 *
 * These calls now read the same in-memory cache the interceptors use, and always
 * send `credentials: 'include'` so the httpOnly cookie authenticates even when
 * the in-memory token has expired but the refresh cookie is still valid.
 */
function authHeaders() {
  const headers = {};
  const token = typeof getAccessToken === 'function' ? getAccessToken() : null;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

export { apiClient, getApiBaseUrl, getServerOrigin };

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

  let type = getFileType(resolved);

  // If already a blob or data url, return directly
  if (resolved.startsWith('blob:') || resolved.startsWith('data:')) {
    return { url: resolved, type, rawUrl: resolved };
  }

  const isLocal = isLocalFileUrl(resolved);
  // Local uploads use the app session. Never forward its bearer token or cookies
  // to a URL supplied by a CDN/external record, where a malicious host could
  // capture credentials.
  const token = isLocal ? getAccessToken() : null;
  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Use session credentials only for uploads served by this application.
  // FE-B-04: retry once on an auth failure. The access token can expire between
  // page render and this fetch, and a raw `fetch` does not run the axios refresh
  // interceptor — so the first attempt legitimately 401s even though the user has
  // a perfectly valid session. One retry through the API client forces the refresh
  // and succeeds, instead of showing a broken thumbnail.
  const fetchBlob = async () => {
    const requestOptions = { credentials: isLocal ? 'include' : 'omit', headers };
    let response = await fetch(resolved, requestOptions);
    if (isLocal && response.status === 401) {
      // Force a token refresh, then retry once.
      if (await refreshSession()) {
        if (isLocal) headers['Authorization'] = `Bearer ${getAccessToken() || ''}`;
        response = await fetch(resolved, requestOptions);
      }
    }
    return response;
  };

  try {
    const response = await fetchBlob();
    if (!response.ok) throw new Error(`Failed to load file (${response.status})`);

    const contentType = (response.headers.get('content-type') || '').toLowerCase();
    if (contentType.includes('application/pdf') || resolved.toLowerCase().endsWith('.pdf')) {
      type = 'pdf';
    } else if (contentType.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(resolved)) {
      type = 'image';
    }

    const blob = await response.blob();
    return { url: URL.createObjectURL(blob), type, rawUrl: resolved };
  } catch (err) {
    console.error('getFilePreviewUrl error:', err);

    // FE-B-04: DO NOT fall back to the raw URL.
    //
    // The old fallback returned `{ url: resolved }`, which handed the browser a
    // bare storage/CDN URL for a file the server just refused to serve. For a
    // PHI document that is both useless (it renders as a broken image) and a
    // quiet information leak (the URL itself may be a guessable or shared link,
    // and it ends up in the DOM, in screenshots and in any "copy image address").
    //
    // The caller gets an explicit error instead, and can distinguish the cases.
    const status = err?.status || null;
    const authFailed = status === 401 || status === 403;
    return {
      url: null,
      type,
      rawUrl: resolved,
      error: true,
      // 401/403 → the session cannot see this file (rightly).
      // otherwise  → the network or the storage backend is at fault.
      reason: authFailed ? 'forbidden' : 'unavailable',
      status,
    };
  }
}

/**
 * FE-B-04: release a preview object URL.
 *
 * `URL.createObjectURL` is not garbage collected — every preview holds its blob
 * alive for the lifetime of the document. A record list that renders 200
 * thumbnails therefore leaks 200 blobs, and re-renders make it worse. Call this
 * from an effect cleanup (or when replacing a preview) so each blob is released
 * exactly once.
 */
export function revokeFilePreview(preview) {
  if (preview?.url && typeof preview.url === 'string' && preview.url.startsWith('blob:')) {
    try {
      URL.revokeObjectURL(preview.url);
    } catch {
      // Already revoked, or the document is unloading — nothing to do.
    }
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

function normalizePaginated(res) {
  if (res && typeof res === 'object' && Array.isArray(res.data) && !Array.isArray(res)) {
    const arr = [...res.data];
    Object.assign(arr, res);
    return arr;
  }
  return res;
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
  return normalizePaginated(response.data);
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

/**
 * ADM-M-02: the audit-trail CSV export. The filename comes from the server's
 * Content-Disposition (it carries a timestamp), so two exports in one sitting
 * do not silently overwrite each other in Downloads.
 */
export async function downloadAuditExport(params = {}) {
  try {
    const qs = new URLSearchParams(params).toString();
    const response = await apiClient.get(`/audit-logs/export${qs ? `?${qs}` : ''}`, {
      responseType: 'blob',
    });
    const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const disposition = response.headers?.['content-disposition'] || '';
    const match = /filename="([^"]+)"/.exec(disposition);
    a.download = match ? match[1] : 'audit-export.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (error) {
    throw new Error(error.message || 'Unable to export audit logs');
  }
}

/** File 22 P1-16: GSTR CSV download (auth via apiClient interceptors). */
export async function downloadGstr(month) {
  try {
    const response = await apiClient.get(`/finance/gstr?month=${encodeURIComponent(month)}`, {
      responseType: 'blob',
    });
    const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gstr-${month}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (error) {
    throw new Error(error.message || 'Unable to export GSTR');
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

function qs(p = {}) {
  return Object.keys(p).length ? '?' + new URLSearchParams(p) : '';
}

export const api = {
  dispatch,
  post:               (path, body) => request(path, { method:'POST', body: JSON.stringify(body) }),
  get:                (path)      => request(path),
  put:                (path, body) => request(path, { method:'PUT', body: JSON.stringify(body) }),
  del:                (path)      => request(path, { method:'DELETE' }),
  login:              (body)    => request('/auth/login',            { method:'POST', body: JSON.stringify(body) }),
  googleAuth:         (body)    => request('/auth/google',           { method:'POST', body: JSON.stringify(body) }),
  googleRegister:     (body)    => request('/auth/google-register',  { method:'POST', body: JSON.stringify(body) }),
  setDoctorPassword:  (body)    => request('/auth/doctor-setup',     { method:'POST', body: JSON.stringify(body) }),
  register:           (body)    => request('/auth/register',         { method:'POST', body: JSON.stringify(body) }),
  verifyOTP:          (body)    => request('/auth/verify-otp',       { method:'POST', body: JSON.stringify(body) }),
  resendOTP:          (body)    => request('/auth/resend-otp',       { method:'POST', body: JSON.stringify(body) }),
  forgotPassword:     (body)    => request('/auth/forgot-password',  { method:'POST', body: JSON.stringify(body) }),
  resetPassword:      (body)    => request('/auth/reset-password',   { method:'POST', body: JSON.stringify(body) }),
  logout:             ()        => request('/auth/logout',           { method:'POST' }),
  logoutAll:          ()        => request('/auth/logout-all',       { method:'POST' }),
  // AUTH-M-02: session management. `logoutAll` existed on the server and
  // `getAdminSessions`/`killAdminSession` existed for superadmin, but a patient
  // had no way to see or end an individual device session.
  getSessions:        ()        => request('/auth/sessions'),
  revokeSession:      (jti)     => request(`/auth/sessions/${encodeURIComponent(jti)}`, { method:'DELETE' }),
  me:                 ()        => request('/auth/me'),
  updateProfile:      (body)    => request('/auth/profile',          { method:'PUT',  body: JSON.stringify(body) }),
  uploadAvatar:       (file)    => {
    const body = new FormData();
    body.append('file', file);
    return request('/auth/avatar', { method:'POST', body });
  },
  uploadFile:         (file, options = {}) => {
    const body = new FormData();
    body.append('file', file);
    if (options.uploadType) body.append('uploadType', options.uploadType);
    if (options.purpose) body.append('purpose', options.purpose);
    if (options.createRecord !== undefined) body.append('createRecord', String(options.createRecord));
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
  lockAppointmentSlot:(body)    => request('/appointments/lock-slot', { method:'POST', body: JSON.stringify(body) }),
  releaseAppointmentSlot:(body) => request('/appointments/release-slot', { method:'POST', body: JSON.stringify(body) }),
  createAppointment:  (body)    => request('/appointments',         { method:'POST',   body: JSON.stringify(body) }),
  walkInAppointment:  (body)    => request('/appointments/walk-in', { method:'POST',   body: JSON.stringify(body) }),
  updateAppointment:  (id,b)    => request(`/appointments/${id}`,   { method:'PUT',    body: JSON.stringify(b) }),
  submitIntakeForm:   (id,b)    => request(`/appointments/${id}/intake`, { method:'PUT', body: JSON.stringify(b) }),
  updateAppointmentTransit: (id,b) => request(`/appointments/${id}/transit`, { method:'PUT', body: JSON.stringify(b) }),
  deleteAppointment:  (id)      => request(`/appointments/${id}`,   { method:'DELETE' }),

  // APPT-M-01: waitlist for a full slot - join, view own queue, accept a paid
  // 15-minute offer, or leave/decline.
  joinWaitlist:       (body)    => request('/appointments/waitlist', { method:'POST', body: JSON.stringify(body) }),
  getMyWaitlist:      ()        => request('/appointments/waitlist/mine'),
  acceptWaitlistOffer:(id)      => request(`/appointments/waitlist/${id}/accept`, { method:'POST' }),
  leaveWaitlist:      (id)      => request(`/appointments/waitlist/${id}`, { method:'DELETE' }),

  // APPT-M-02: recurring series - book N occurrences of one slot, list them
  // with their occurrence appointments, or cancel every not-yet-terminal one.
  // Occurrence-level cancel/reschedule stays on updateAppointment/deleteAppointment
  // (each occurrence is a normal Appointment).
  createAppointmentSeries:(body) => request('/appointments/series',          { method:'POST',   body: JSON.stringify(body) }),
  getMyAppointmentSeries: ()     => request('/appointments/series/mine'),
  cancelAppointmentSeries:(id)   => request(`/appointments/series/${id}`,    { method:'DELETE' }),

  getRecords:         (p={})    => request('/records?' + new URLSearchParams(p)),
  getPatientRecords:  (pid)     => request(`/records/patient/${pid}`),
  createRecord:       (body)    => request('/records',              { method:'POST',   body: JSON.stringify(body) }),
  deleteRecord:       (id)      => request(`/records/${id}`,        { method:'DELETE' }),

  getBilling:         (p={})    => request('/billing?' + new URLSearchParams(p)),
  createBill:             (body)    => request('/billing',              { method:'POST',   body: JSON.stringify(body) }),
  collectBill:            (id, legs)=> request(`/billing/${id}/collect`, { method:'POST', body: JSON.stringify({ payments: legs }) }),
  cancelBill:             (id, reason)=> request(`/billing/${id}/cancel`, { method:'POST', body: JSON.stringify({ reason }) }),
  doctorFees:             (p={})    => request('/billing/doctor-fees' + qs(p)),
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
  payTransaction:   (body, options = {})  => request('/billing/pay',  { method:'POST', body: JSON.stringify(body), ...options }),
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
    return request(`/delivery-partners/upload-document`, { method:'POST', body });
  },
  getPendingDeliveryBoys: () => request('/delivery-partners/pending'),
  getAllDeliveryBoys:   ()  => request('/delivery-partners/all'),
  approveDeliveryBoy:   (id, body) => request(`/delivery-partners/${id}/verify`, { method:'PUT', body: JSON.stringify(body) }),
  updateDeliveryLocation: (id, body) => request(`/delivery-partners/profile/${id}`, { method:'PUT', body: JSON.stringify(body) }),
  getNearbyDeliveryBoys: (lat, lng, radius) => request(`/delivery-partners/nearby?lat=${lat}&lng=${lng}&radius=${radius || 10}`),
  getDeliveryProfile:   (id) => request(`/delivery-partners/profile/${id}`),
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
  updatePharmacyOrderStatus: (id,status) => request(`/pharmacy/orders/${id}/status`, { method:'PUT', body: JSON.stringify({ status }) }),
  cancelPharmacyOrder:    (id) => request(`/pharmacy/orders/${id}/cancel`, { method:'POST', body: JSON.stringify({}) }),
  collectPharmacyCOD:    (id) => request(`/pharmacy/orders/${id}/collect-cod`, { method:'POST', body: JSON.stringify({}) }),
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
  dispatchLabReport:    (bookingId, body) => request(`/lab/bookings/${bookingId}/dispatch-report`, { method:'POST', body: JSON.stringify(body) }),
  getLabReportTask:     (bookingId)       => request(`/lab/bookings/${bookingId}/dispatch-report`),
  dispatchLabOrder:     (orderId, body)   => request(`/lab/orders/${orderId}/dispatch-report`,   { method:'POST', body: JSON.stringify(body) }),
  getReportDeliveries:  (p = {})          => request('/lab/report-deliveries?' + new URLSearchParams(p)),
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

  // ADM-M-05: superadmin ops freshness/health snapshot (backend reports, never gates).
  getOpsHealth:               ()        => request('/ops-health'),

  replyToReview:              (id,b)    => request(`/reviews/${id}/reply`, { method:'PUT', body: JSON.stringify(b) }),

  getFlaggedReviews:          (p={})    => request('/reviews/moderation?' + new URLSearchParams(p)),
  flagReview:                 (id,b)    => request(`/reviews/moderation/${id}/flag`,   { method:'PUT', body: JSON.stringify(b) }),
  unflagReview:               (id)      => request(`/reviews/moderation/${id}/unflag`, { method:'PUT' }),

  getSystemSettings:          ()        => request('/system-settings'),
  updateSystemSetting:        (key,b)   => request(`/system-settings/${key}`, { method:'PUT', body: JSON.stringify(b) }),

  // ADM-M-06: per-tenant API quota management (superadmin).
  getTenantQuotas:            ()        => request('/tenant-quotas'),
  setTenantQuota:             (id,b)    => request(`/tenant-quotas/${id}`, { method:'PUT', body: JSON.stringify(b) }),
  deleteTenantQuota:          (id)      => request(`/tenant-quotas/${id}`, { method:'DELETE' }),

  getCommissionConfigs:       ()        => request('/commission/config'),
  updateCommissionConfig:     (id,b)    => request(`/commission/config/${id}`, { method:'PUT', body: JSON.stringify(b) }),
  getTransactionLedger:       (p={})    => request('/commission/ledger?' + new URLSearchParams(p)),
  getPayouts:                 (p={})    => request('/commission/payouts?' + new URLSearchParams(p)),
  createPayout:               (body)    => request('/commission/payouts', { method:'POST', body: JSON.stringify(body) }),
  markPayoutPaid:             (id,b)    => request(`/commission/payouts/${id}/pay`, { method:'PUT', body: JSON.stringify(b) }),
  approvePayout:              (id)      => request(`/commission/payouts/${id}/approve`, { method:'PUT' }),
  getCommissionStats:         ()        => request('/commission/stats'),
  getTaxSummary:              (q)       => request('/commission/tax-summary?quarter=' + encodeURIComponent(q)),
  // SA-M5 security + SA-M4 AI safety
  getAdminSessions:           ()        => request('/admin/security/sessions'),
  killAdminSession:           (id)      => request(`/admin/security/sessions/${id}`, { method:'DELETE' }),
  get2faStatus:               ()        => request('/admin/security/2fa-status'),
  reset2fa:                   (userId)  => request(`/admin/security/2fa-reset/${userId}`, { method:'POST' }),
  getAiSafetyEvents:          (p={})    => request('/admin/security/ai-safety/events?' + new URLSearchParams(p)),
  getAiSafetyStats:           ()        => request('/admin/security/ai-safety/stats'),

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
  getPublicCategories:    (p={})    => request('/categories/public?' + new URLSearchParams(p)),
  createCategory:         (body)    => request('/categories', { method:'POST', body: JSON.stringify(body) }),
  updateCategory:         (id,b)    => request(`/categories/${id}`, { method:'PUT', body: JSON.stringify(b) }),
  deleteCategory:         (id)      => request(`/categories/${id}`, { method:'DELETE' }),
  mergeCategories:        (body)    => request('/categories/merge', { method:'POST', body: JSON.stringify(body) }),

  getLicenses:            (p={})    => request('/licenses?' + new URLSearchParams(p)),
  updateLicense:         (id,b)    => request(`/licenses/${id}`, { method:'PUT', body: JSON.stringify(b) }),
  getExpiringLicenses:    ()        => request('/licenses/expiring'),
  getLicenseStats:        ()        => request('/licenses/stats'),

  // File 23 §4.2 break-glass queue (step-up enforced server-side)
  getBreakGlass:          (p={})    => request('/admin/break-glass?' + new URLSearchParams(p)),
  requestBreakGlass:      (body)    => request('/admin/break-glass', { method:'POST', body: JSON.stringify(body) }),
  decideBreakGlass:       (id,b)    => request(`/admin/break-glass/${id}/decision`, { method:'POST', body: JSON.stringify(b) }),
  revokeBreakGlass:       (id)      => request(`/admin/break-glass/${id}/revoke`, { method:'POST' }),

  // File 09 OT suite + payroll + P&L
  getSurgeries:          (p={})    => request('/ot/surgeries?' + new URLSearchParams(p)),
  setSurgeryPac:         (id,b)    => request(`/ot/surgeries/${id}/pac`, { method:'PUT', body: JSON.stringify(b) }),
  setSurgeryWho:         (id,b)    => request(`/ot/surgeries/${id}/who-checklist`, { method:'PUT', body: JSON.stringify(b) }),
  saveOpNote:            (id,b)    => request(`/ot/surgeries/${id}/op-note`, { method:'PUT', body: JSON.stringify(b) }),
  getStaffList:          (p={})    => request('/staff?' + new URLSearchParams(p)),
  calcPayroll:           (body)    => request('/staff/payroll/calculate', { method:'POST', body: JSON.stringify(body) }),
  getPayrollHistory:     (p={})    => request('/staff/payroll/history?' + new URLSearchParams(p)),
  getPnl:                (p={})    => request('/finance/pnl?' + new URLSearchParams(p)),

  // File 09 CSSD
  getCssdCycles:         (p={})    => request('/cssd/cycles?' + new URLSearchParams(p)),
  startCssdCycle:        (body)    => request('/cssd/cycles', { method:'POST', body: JSON.stringify(body) }),
  setCssdIndicators:     (id,b)    => request(`/cssd/cycles/${id}/indicators`, { method:'PUT', body: JSON.stringify(b) }),

  // File 09 §02 dashboard v2 (aggregated, tenant-scoped)
  getOpsTiles:           ()        => request('/dashboard/operations'),
  getDashOverview:        (p={})    => request('/dashboard/overview' + qs(p)),
  getDashQueue:           ()        => request('/dashboard/queue'),
  getRevenueSplit:       (p={})    => request('/dashboard/revenue?' + new URLSearchParams(p)),
  getDashAlerts:         (p={})    => request('/dashboard/alerts?' + new URLSearchParams(p)),
  ackDashAlert:          (id,b)    => request(`/dashboard/alerts/${id}/ack`, { method:'PUT', body: JSON.stringify(b) }),
  getBedHeatmap:         ()        => request('/dashboard/beds/heatmap'),
  getStaffOnDuty:        ()        => request('/dashboard/staff/on-duty'),
  getTpaPipeline:        ()        => request('/tpa/pipeline'),
  getTrialBalance:       (p={})    => request('/finance/trial-balance?' + new URLSearchParams(p)),
  getInsurers:           ()        => request('/tpa/insurers'),
  getPreAuths:           (p={})    => request('/tpa/preauth?' + new URLSearchParams(p)),
  createPreAuth:         (body)    => request('/tpa/preauth', { method:'POST', body: JSON.stringify(body) }),
  setPreAuthStatus:      (id,b)    => request(`/tpa/preauth/${id}/status`, { method:'PUT', body: JSON.stringify(b) }),
  createClaim:           (body)    => request('/tpa/claims', { method:'POST', body: JSON.stringify(body) }),
  settleClaim:           (id,b)    => request(`/tpa/claims/${id}/settle`, { method:'PUT', body: JSON.stringify(b) }),

  // File 09 discharge desk + roster
  getRunningBill:        (id)      => request(`/ipd/admissions/${id}/running-bill`),
  initDischarge:         (id,b)    => request(`/ipd/admissions/${id}/discharge/initiate`, { method:'POST', body: JSON.stringify(b || {}) }),
  approveDischarge:      (id,b)    => request(`/ipd/admissions/${id}/discharge/approve`, { method:'PUT', body: JSON.stringify(b || {}) }),
  clearDischarge:        (id,stage,b) => request(`/ipd/admissions/${id}/discharge/clear/${stage}`, { method:'PUT', body: JSON.stringify(b || {}) }),
  finalizeDischarge:     (id,b)    => request(`/ipd/admissions/${id}/discharge/finalize`, { method:'POST', body: JSON.stringify(b || {}) }),
  getRosters:            (p={})    => request('/roster?' + new URLSearchParams(p)),
  saveRoster:            (body)    => request('/roster', { method:'POST', body: JSON.stringify(body) }),
  publishRoster:         (id)      => request(`/roster/${id}/publish`, { method:'POST' }),

  // Doc 11 doctor workspace: aggregate, queue actions, referrals
  getDoctorDashboard:    (p={})    => request('/doctor/dashboard?' + new URLSearchParams(p)),
  getDoctorTasks:         ()        => request('/doctor/tasks'),
  getWorkspace:          (id)      => request(`/doctor/workspace/${id}`),
  signWorkspace:         (id)      => request(`/doctor/workspace/${id}/sign`, { method:'POST' }),
  saveWorkspaceNote:     (id,b)    => request(`/doctor/workspace/${id}/notes`, { method:'POST', body: JSON.stringify(b) }),
  getLatestEncounter:     (pid)     => request(`/doctor/patient/${pid}/latest-encounter`),
  setDutyStatus:         (body)    => request('/doctor/duty', { method:'PUT', body: JSON.stringify(body) }),
  getEarningsStatement:  (p={})    => request('/doctor/earnings/statement?' + new URLSearchParams(p)),
  getOnCall:             ()        => request('/doctor/oncall'),
  scribeDraft:           (body)    => request('/clinical/scribe/draft', { method:'POST', body: JSON.stringify(body) }),
  getEmrTemplates:       (p={})    => request('/clinical/emr/templates?' + new URLSearchParams(p)),
  getRxTemplates:        ()        => request('/clinical/rx-templates'),
  getClinicOverview:     (p={})    => request('/clinics/overview?' + new URLSearchParams(p)),
  setClinicModules:      (body)    => request('/clinics/modules', { method:'PUT', body: JSON.stringify(body) }),
  getClinicRosterToday:   ()        => request('/clinics/roster/today'),
  getClinicCamps:          ()        => request('/clinics/camps'),
  getRecallDues:           ()        => request('/recalls/dues'),
  sendRecalls:            (body)    => request('/recalls/send', { method:'POST', body: JSON.stringify(body) }),
  callNextToken:         (body)    => request('/tokens/call-next', { method:'POST', body: JSON.stringify(body || {}) }),
  callToken:             (id)      => request(`/tokens/${id}/call`, { method:'PUT' }),
  skipToken:             (id)      => request(`/tokens/${id}/skip`, { method:'PUT' }),
  noShowToken:           (id)      => request(`/tokens/${id}/no-show`, { method:'PUT' }),
  getSecondOpinionInbox: ()        => request('/second-opinions/inbox'),
  getChemoProtocols:      ()        => request('/oncology/protocols'),
  createChemoProtocol:    (body)    => request('/oncology/protocols', { method:'POST', body: JSON.stringify(body) }),
  getChemoCycles:         (p={})    => request('/oncology/cycles?' + new URLSearchParams(p)),
  scheduleChemo:          (body)    => request('/oncology/cycles/schedule', { method:'POST', body: JSON.stringify(body) }),
  administerChemo:        (id,b)    => request(`/oncology/cycles/${id}/administer`, { method:'POST', body: JSON.stringify(b || {}) }),
  getMortuary:           (p={})    => request('/mortuary?' + new URLSearchParams(p)),
  receiveBody:           (body)    => request('/mortuary/receive', { method:'POST', body: JSON.stringify(body) }),
  releaseBody:           (id,b)    => request(`/mortuary/${id}/release`, { method:'POST', body: JSON.stringify(b) }),
  getKitchenSheet:        ()        => request('/diet/kitchen/sheet'),
  getIcuFlowsheet:       (p={})    => request('/clinical/icu/flowsheet?' + new URLSearchParams(p)),
  saveIcuRow:            (body)    => request('/clinical/icu/flowsheet', { method:'POST', body: JSON.stringify(body) }),
  getCases:               (p={})    => request('/cases?' + new URLSearchParams(p)),
  createCase:             (body)    => request('/cases', { method:'POST', body: JSON.stringify(body) }),
  presentCase:            (id,b)    => request(`/cases/${id}/present`, { method:'PUT', body: JSON.stringify(b || {}) }),

  // File 14 forms + print + signatures + queues
  getFormTemplates:      (p={})    => request('/forms/templates?' + new URLSearchParams(p)),
  createFormTemplate:    (body)    => request('/forms/templates', { method:'POST', body: JSON.stringify(body) }),
  seedScoreForms:        ()        => request('/forms/templates/seed-scores', { method:'POST' }),
  publishFormTemplate:   (id)      => request(`/forms/templates/${id}/publish`, { method:'POST' }),
  submitFormResponse:    (body)    => request('/forms/responses', { method:'POST', body: JSON.stringify(body) }),
  // ── File 22 P1-20: clinical score seeds ──
  seedScoreForms:        ()        => request('/forms/templates/seed-scores', { method:'POST' }),
  // ── File 22 P1-21: donor screening ──
  donorScreenings:       (p={})    => request('/bloodbank/screenings' + qs(p)),
  createDonorScreening:  (body)    => request('/bloodbank/screenings', { method: 'POST', body: JSON.stringify(body) }),
  getPrintTemplates:     (p={})    => request('/print/templates?' + new URLSearchParams(p)),
  createPrintTemplate:   (body)    => request('/print/templates', { method:'POST', body: JSON.stringify(body) }),
  renderPrint:           (body)    => request('/print/render', { method:'POST', body: JSON.stringify(body) }),
  renderLabel:           (body)    => request('/print/labels/render', { method:'POST', body: JSON.stringify(body) }),
  signL1:                (body)    => request('/signatures/l1', { method:'POST', body: JSON.stringify(body) }),
  signL2:                (body)    => request('/signatures/l2', { method:'POST', body: JSON.stringify(body) }),
  getQueues:             ()        => request('/queues'),
  createQueue:           (body)    => request('/queues', { method:'POST', body: JSON.stringify(body) }),
  queueBoard:            (id)      => request(`/queues/${id}/board`),
  issueDisplayToken:     (body)    => request('/queues/display-tokens', { method:'POST', body: JSON.stringify(body) }),

  // File 09 queue display (public, no PHI) + doctor workspace
  getQueueDisplay:       (p={})    => request('/tokens/display?' + new URLSearchParams(p)),
  getReviewInbox:        ()        => request('/orders/review-inbox'),
  reviewLabOrder:        (id)      => request(`/orders/review-lab/${id}`, { method:'PUT' }),
  getMyRounds:           ()        => request('/orders/my-rounds'),
  getMyOt:               (p={})    => request('/orders/my-ot?' + new URLSearchParams(p)),
  reviewLabOrder:        (id)      => request(`/orders/review-lab/${id}`, { method:'PUT' }),

  // File 25 tenant Access Control Center
  getIamPolicies:        ()        => request('/iam/policies'),
  getIamTemplates:       ()        => request('/iam/policies/templates'),
  createIamPolicy:       (body)    => request('/iam/policies', { method:'POST', body: JSON.stringify(body) }),
  getIamRoles:          ()        => request('/iam/roles'),
  createIamRole:        (body)    => request('/iam/roles', { method:'POST', body: JSON.stringify(body) }),
  createIamAssignment:  (body)    => request('/iam/assignments', { method:'POST', body: JSON.stringify(body) }),
  revokeIamAssignment:  (id)      => request(`/iam/assignments/${id}`, { method:'DELETE' }),
  getIamGroups:         ()        => request('/iam/groups'),
  createIamGroup:       (body)    => request('/iam/groups', { method:'POST', body: JSON.stringify(body) }),
  iamSimulate:          (body)    => request('/iam/simulate', { method:'POST', body: JSON.stringify(body) }),
  createIamRequest:     (body)    => request('/iam/requests', { method:'POST', body: JSON.stringify(body) }),
  decideIamRequest:     (id,b)    => request(`/iam/requests/${id}/decision`, { method:'POST', body: JSON.stringify(b) }),
  createIamGrant:       (body)    => request('/iam/grants', { method:'POST', body: JSON.stringify(body) }),
  decideIamGrant:       (id,b)    => request(`/iam/grants/${id}/decision`, { method:'POST', body: JSON.stringify(b) }),
  createIamApiKey:      (body)    => request('/iam/apikeys', { method:'POST', body: JSON.stringify(body) }),
  revokeIamApiKey:      (id)      => request(`/iam/apikeys/${id}/revoke`, { method:'POST' }),

  // File 24 supply/partnership CRM
  getCommandCenter:       (p={})    => request('/crm/command-center?' + new URLSearchParams(p)),
  getCrmLeads:           (p={})    => request('/crm/leads?' + new URLSearchParams(p)),
  createCrmLead:         (body)    => request('/crm/leads', { method:'POST', body: JSON.stringify(body) }),
  moveCrmLead:           (id,b)    => request(`/crm/leads/${id}/stage`, { method:'PATCH', body: JSON.stringify(b) }),
  convertCrmLead:        (id,b)    => request(`/crm/leads/${id}/convert`, { method:'POST', body: JSON.stringify(b) }),
  getCrmPartners:        (p={})    => request('/crm/partners?' + new URLSearchParams(p)),
  createCrmPartner:      (body)    => request('/crm/partners', { method:'POST', body: JSON.stringify(body) }),
  getCrmTasks:           (p={})    => request('/crm/tasks?' + new URLSearchParams(p)),
  createCrmTask:         (body)    => request('/crm/tasks', { method:'POST', body: JSON.stringify(body) }),
  updateCrmTask:         (id,b)    => request(`/crm/tasks/${id}`, { method:'PATCH', body: JSON.stringify(b) }),

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
  // AUTH-B-03: exchange the pending-login ticket for a real session.
  complete2FA: (body) => request('/auth/2fa/complete', { method: 'POST', body: JSON.stringify(body) }),
  // AUTHZ-M-03 (F7): mint a single-use step-up grant for one sensitive scope.
  stepUp: (scope, code) => request('/auth/step-up', { method: 'POST', body: JSON.stringify({ scope, code }) }),

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
  getServiceCities:         (p={})    => request('/service-cities?' + new URLSearchParams(p)),
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
  },

  // ── Additional Transactions & Billing aliases ──
  getTransaction:         (id)      => request(`/transactions/${id}`),
  getBill:                (id)      => request(`/billing/${id}`),
  createBilling:          (body)    => request('/billing', { method:'POST', body: JSON.stringify(body) }),
  updateBilling:          (id,body) => request(`/billing/${id}`, { method:'PUT', body: JSON.stringify(body) }),
  deleteBilling:          (id)      => request(`/billing/${id}`, { method:'DELETE' }),

  // ── 1-to-1 Audio Calls ──
  getCalls:               (p={})    => request('/calls?' + new URLSearchParams(p)),
  getCallStats:           ()        => request('/calls/stats'),
  getCallContacts:        ()        => request('/calls/contacts'),
  initiateCallLog:        (body)    => request('/calls/initiate', { method:'POST', body: JSON.stringify(body) }),
  updateCallStatus:       (id,body) => request(`/calls/${id}/status`, { method:'PUT', body: JSON.stringify(body) }),
  deleteCallLog:          (id)      => request(`/calls/${id}`, { method:'DELETE' }),
  clearAllCallLogs:       ()        => request('/calls/clear/all', { method:'DELETE' }),

  // ── Vehicle Booking & Rides ──
  estimateRide:           (body)    => request('/ride/estimate', { method: 'POST', body: JSON.stringify(body) }),
  bookRide:               (body)    => request('/ride/book', { method: 'POST', body: JSON.stringify(body) }),
  getActiveRide:          ()        => request('/ride/active'),
  getMyRides:             (p={})    => request('/ride/my-rides?' + new URLSearchParams(p)),
  getRiderHistory:        (p={})    => request('/ride/rider-history?' + new URLSearchParams(p)),
  getRide:                (id)      => request(`/ride/${id}`),
  acceptRide:             (id)      => request(`/ride/${id}/accept`, { method: 'POST' }),
  declineRide:            (id)      => request(`/ride/${id}/decline`, { method: 'POST' }),
  markRideArrived:        (id, body = {}) => request(`/ride/${id}/arrived`, { method: 'POST', body: JSON.stringify(body) }),
  startRide:              (id, body = {}) => request(`/ride/${id}/start`, { method: 'POST', body: JSON.stringify(typeof body === 'string' ? { otp: body } : body) }),
  completeRide:           (id)      => request(`/ride/${id}/complete`, { method: 'POST' }),
  cancelRide:             (id, reason) => request(`/ride/${id}/cancel`, { method: 'POST', body: JSON.stringify({ reason }) }),
  rateRide:               (id, body) => request(`/ride/${id}/rate`, { method: 'POST', body: JSON.stringify(body) }),
  getRideReceiptUrl:      (id)      => `${BASE}/ride/${id}/receipt`,
  downloadRideReceipt:    async (id, filename) => {
    const res = await fetch(`${BASE}/ride/${id}/receipt`, {
      // FE-B-01: in-memory token + the httpOnly cookie. Previously this
      // sent an empty Bearer whenever localStorage was empty, which hid
      // real session expiries as a bare 401.
      headers: authHeaders(),
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to download receipt');
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `Ride-Receipt-${id}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  // ── Rider Driver APIs ──
  getRiderProfile:        ()        => request('/rider/profile'),
  updateRiderProfile:     (body)    => request('/rider/profile', { method: 'PUT', body: JSON.stringify(body) }),
  uploadRiderDocument:    (body)    => request('/rider/documents', { method: 'POST', body: JSON.stringify(body) }),
  setRiderStatus:         (isOnline)=> request('/rider/status', { method: 'PUT', body: JSON.stringify({ isOnline }) }),
  updateRiderLocation:    (lat, lng)=> request('/rider/location', { method: 'PUT', body: JSON.stringify({ lat, lng }) }),
  getRiderEarnings:       ()        => request('/rider/earnings'),
  withdrawRiderDemo:      (amount)  => request('/rider/withdraw-demo', { method: 'POST', body: JSON.stringify({ amount }) }),

  // ── Demo Payment ──
  payDemoRide:            (body)    => request('/payment/demo/pay', { method: 'POST', body: JSON.stringify(body) }),
  getDemoPaymentStatus:   (rideId)  => request(`/payment/demo/${rideId}`),

  // ── Admin Vehicle & Rides Management ──
  getPendingRiders:       ()        => request('/admin/riders/pending'),
  approveRider:           (id)      => request(`/admin/riders/${id}/approve`, { method: 'PUT' }),
  rejectRider:            (id, reason) => request(`/admin/riders/${id}/reject`, { method: 'PUT', body: JSON.stringify({ reason }) }),
  suspendRider:           (id, suspend = true) => request(`/admin/riders/${id}/suspend`, { method: 'PUT', body: JSON.stringify({ suspend }) }),
  getAdminRiders:         (p={})    => request('/admin/riders/all?' + new URLSearchParams(p)),
  getAdminVehicles:       (p={})    => request('/admin/riders/vehicles?' + new URLSearchParams(p)),
  getAdminRides:          (p={})    => request('/admin/riders/rides?' + new URLSearchParams(p)),
  getRideAnalytics:       ()        => request('/admin/riders/analytics'),

  // ── Public Document Upload (for Registration) ──
  uploadPublicDocument:   (file)    => {
    const formData = new FormData();
    formData.append('file', file);
    return request('/upload/public', { method: 'POST', body: formData });
  },

  // ── Hospital Assistant & Attendant Booking ──
  getAssistants:             (p={})    => request('/assistant?' + new URLSearchParams(p)),
  searchAssistants:          (body)    => request('/assistant/search', { method: 'POST', body: JSON.stringify(body) }),
  getAssistantById:          (id)      => request(`/assistant/${id}`),
  getMyAssistantProfile:     ()        => request('/assistant/profile'),
  updateAssistantProfile:    (body)    => request('/assistant/profile', { method: 'PUT', body: JSON.stringify(body) }),
  setAssistantStatus:        (isAvailable) => request('/assistant/status', { method: 'PUT', body: JSON.stringify({ isAvailable }) }),
  getAssistantEarnings:      ()        => request('/assistant/earnings'),
  withdrawAssistantDemo:     (amount)  => request('/assistant/withdraw-demo', { method: 'POST', body: JSON.stringify({ amount }) }),

  // ── Assistant Booking Management ──
  bookAssistant:             (body)    => request('/assistant-booking/book', { method: 'POST', body: JSON.stringify(body) }),
  createAssistantBooking:    (body)    => request('/assistant-booking/book', { method: 'POST', body: JSON.stringify(body) }),
  broadcastAssistantFallback:(id)      => request(`/assistant-booking/${id}/broadcast-fallback`, { method: 'POST' }),
  getActiveAssistantBooking: ()        => request('/assistant-booking/active'),
  getAssistantPendingRequests:()       => request('/assistant-booking/pending-requests'),
  getMyAssistantBookings:    (p={})    => request('/assistant-booking/my-bookings?' + new URLSearchParams(p)),
  getAssistantBookingHistory:(p={})    => request('/assistant-booking/assistant-history?' + new URLSearchParams(p)),
  getAssistantBooking:       (id)      => request(`/assistant-booking/${id}`),
  acceptAssistantBooking:    (id)      => request(`/assistant-booking/${id}/accept`, { method: 'POST' }),
  declineAssistantBooking:   (id, reason) => request(`/assistant-booking/${id}/decline`, { method: 'POST', body: JSON.stringify({ reason }) }),
  checkInAssistantBooking:   (id)      => request(`/assistant-booking/${id}/check-in`, { method: 'POST' }),
  updateAssistantTask:       (id, taskId, isDone) => request(`/assistant-booking/${id}/task/${taskId}`, { method: 'PUT', body: JSON.stringify({ isDone }) }),
  addAssistantCustomTask:    (id, label, category) => request(`/assistant-booking/${id}/task`, { method: 'POST', body: JSON.stringify({ label, category }) }),
  completeAssistantBooking:  (id, completionSummary) => request(`/assistant-booking/${id}/complete`, { method: 'POST', body: JSON.stringify({ completionSummary }) }),
  cancelAssistantBooking:    (id, reason) => request(`/assistant-booking/${id}/cancel`, { method: 'POST', body: JSON.stringify({ reason }) }),
  rescheduleAssistantBooking:(id, body) => request(`/assistant-booking/${id}/reschedule`, { method: 'POST', body: JSON.stringify(body) }),
  rateAssistantBooking:      (id, body) => request(`/assistant-booking/${id}/rate`, { method: 'POST', body: JSON.stringify(body) }),
  getFavoriteAssistants:     ()        => request('/assistant-booking/favorites'),
  downloadAssistantReceipt:  async (id, filename) => {
    const res = await fetch(`${BASE}/assistant-booking/${id}/receipt`, {
      // FE-B-01: in-memory token + the httpOnly cookie. Previously this
      // sent an empty Bearer whenever localStorage was empty, which hid
      // real session expiries as a bare 401.
      headers: authHeaders(),
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to download receipt');
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `Assistant-Receipt-${id}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  // ── Admin Assistant Management ──
  getPendingAssistants:      ()        => request('/admin/assistants/pending'),
  approveAssistant:          (id)      => request(`/admin/assistants/${id}/approve`, { method: 'PUT' }),
  rejectAssistant:           (id, reason) => request(`/admin/assistants/${id}/reject`, { method: 'PUT', body: JSON.stringify({ reason }) }),
  suspendAssistant:          (id, suspend = true, reason) => request(`/admin/assistants/${id}/suspend`, { method: 'PUT', body: JSON.stringify({ suspend, reason }) }),
  getAdminAssistants:        (p={})    => request('/admin/assistants/all?' + new URLSearchParams(p)),
  getAdminAssistantBookings: (p={})    => request('/admin/assistants/bookings?' + new URLSearchParams(p)),
  getAssistantAnalytics:     ()        => request('/admin/assistants/analytics'),

  // ── Lawyer & Legal Services ──
  searchLawyers:             (body)    => request('/lawyer/search', { method: 'POST', body: JSON.stringify(body) }),
  getLawyerById:             (id)      => request(`/lawyer/${id}`),
  getMyLawyerProfile:        ()        => request('/lawyer/profile'),
  updateLawyerProfile:       (body)    => request('/lawyer/profile', { method: 'PUT', body: JSON.stringify(body) }),
  setLawyerStatus:           (isAvailable) => request('/lawyer/status', { method: 'PUT', body: JSON.stringify({ isAvailable }) }),
  getLawyerEarnings:         ()        => request('/lawyer/earnings'),
  withdrawLawyerDemo:        (amount)  => request('/lawyer/withdraw-demo', { method: 'POST', body: JSON.stringify({ amount }) }),

  // ── Lawyer Directory & Booking ──
  getLawyers:                (p={})    => request('/lawyer?' + new URLSearchParams(Object.fromEntries(Object.entries(p).filter(([_, v]) => v !== undefined && v !== null && v !== '')))),
  getLawyer:                 (id)      => request(`/lawyer/${id}`),
  createLawyerBooking:       (body)    => request('/lawyer-booking/book', { method: 'POST', body: JSON.stringify(body) }),
  bookLawyer:                (body)    => request('/lawyer-booking/book', { method: 'POST', body: JSON.stringify(body) }),
  fallbackBroadcastLawyerBooking: (id) => request(`/lawyer-booking/${id}/broadcast-fallback`, { method: 'POST' }),
  getFamilyMembers:          ()        => request('/patient/family'),
  getActiveLawyerBooking:    ()        => request('/lawyer-booking/active'),
  getMyLawyerBookings:       ()        => request('/lawyer-booking/my-bookings'),
  getMyLawyerCases:          ()        => request('/lawyer-booking/my-cases'),
  closeLawyerCase:           (threadId)=> request(`/lawyer-booking/case/${threadId}/close`, { method: 'PUT' }),
  getLawyerBookingHistory:   ()        => request('/lawyer-booking/lawyer-history'),
  getLawyerPendingRequests:  ()        => request('/lawyer-booking/lawyer-requests'),
  getLawyerBooking:          (id)      => request(`/lawyer-booking/${id}`),
  acceptLawyerBooking:       (id)      => request(`/lawyer-booking/${id}/accept`, { method: 'POST' }),
  proposeLawyerTime:         (id, body)=> request(`/lawyer-booking/${id}/propose-time`, { method: 'POST', body: JSON.stringify(body) }),
  declineLawyerBooking:      (id, reason) => request(`/lawyer-booking/${id}/decline`, { method: 'POST', body: JSON.stringify({ reason }) }),
  startLawyerConsultation:   (id)      => request(`/lawyer-booking/${id}/start`, { method: 'POST' }),
  addLawyerCaseNote:         (id, body)=> request(`/lawyer-booking/${id}/note`, { method: 'POST', body: JSON.stringify(body) }),
  completeLawyerConsultation:(id, finalCaseSummary) => request(`/lawyer-booking/${id}/complete`, { method: 'POST', body: JSON.stringify({ finalCaseSummary }) }),
  cancelLawyerBooking:       (id, reason) => request(`/lawyer-booking/${id}/cancel`, { method: 'POST', body: JSON.stringify({ reason }) }),
  rescheduleLawyerBooking:   (id, body)=> request(`/lawyer-booking/${id}/reschedule`, { method: 'POST', body: JSON.stringify(body) }),
  bookLawyerFollowUp:        (id, body)=> request(`/lawyer-booking/${id}/follow-up`, { method: 'POST', body: JSON.stringify(body) }),
  rateLawyerBooking:         (id, body)=> request(`/lawyer-booking/${id}/rate`, { method: 'POST', body: JSON.stringify(body) }),
  getLawyerDocuments:        ()        => request('/lawyer-booking/documents'),
  getFavoriteLawyers:        ()        => request('/lawyer-booking/favorites'),
  downloadLawyerReceipt:     async (id, filename) => {
    const res = await fetch(`${BASE}/lawyer-booking/${id}/receipt`, {
      // FE-B-01: in-memory token + the httpOnly cookie. Previously this
      // sent an empty Bearer whenever localStorage was empty, which hid
      // real session expiries as a bare 401.
      headers: authHeaders(),
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to download legal receipt');
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `Lawyer-Receipt-${id}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  // ── Admin Lawyer Management ──
  getAdminPendingLawyers:    ()        => request('/admin/lawyers/pending'),
  getAdminAllLawyers:        (p={})    => request('/admin/lawyers/all?' + new URLSearchParams(p)),
  approveAdminLawyer:        (id)      => request(`/admin/lawyers/${id}/approve`, { method: 'PUT' }),
  rejectAdminLawyer:         (id, reason) => request(`/admin/lawyers/${id}/reject`, { method: 'PUT', body: JSON.stringify({ reason }) }),
  suspendAdminLawyer:        (id)      => request(`/admin/lawyers/${id}/suspend`, { method: 'PUT' }),
  getAdminLawyerBookings:    (p={})    => request('/admin/lawyers/bookings?' + new URLSearchParams(p)),
  getAdminLawyerAnalytics:   ()        => request('/admin/lawyers/analytics'),
  // Aliases used by pages/admin/AdminLawyers.tsx
  getPendingLawyers:         ()        => request('/admin/lawyers/pending'),
  getAdminLawyers:           (p={})    => request('/admin/lawyers/all?' + new URLSearchParams(p)),
  approveLawyer:             (id)      => request(`/admin/lawyers/${id}/approve`, { method: 'PUT' }),
  rejectLawyer:              (id, reason) => request(`/admin/lawyers/${id}/reject`, { method: 'PUT', body: JSON.stringify(typeof reason === 'object' ? reason : { reason }) }),
  suspendLawyer:             (id, suspend, reason) => request(`/admin/lawyers/${id}/suspend`, { method: 'PUT', body: JSON.stringify(typeof suspend === 'object' ? suspend : { suspend, reason }) }),
  getLawyerAnalytics:        ()        => request('/admin/lawyers/analytics'),

  // ── Medicine Reminders & Adherence ──
  getMedicineReminders:      (p={})    => request('/medicine-reminders' + (Object.keys(p).length ? '?' + new URLSearchParams(p) : '')),
  getMedicineReminder:       (id)      => request(`/medicine-reminders/${id}`),
  createMedicineReminder:    (body)    => request('/medicine-reminders', { method: 'POST', body: JSON.stringify(body) }),
  updateMedicineReminder:    (id, body)=> request(`/medicine-reminders/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  pauseMedicineReminder:     (id)      => request(`/medicine-reminders/${id}/pause`, { method: 'PUT' }),
  resumeMedicineReminder:    (id)      => request(`/medicine-reminders/${id}/resume`, { method: 'PUT' }),
  deleteMedicineReminder:    (id)      => request(`/medicine-reminders/${id}`, { method: 'DELETE' }),
  respondMedicineDose:       (id, body)=> request(`/medicine-reminders/${id}/dose/respond`, { method: 'POST', body: JSON.stringify(body) }),
  getMedicineAdherence:      (p={})    => request('/medicine-reminders/adherence' + (Object.keys(p).length ? '?' + new URLSearchParams(p) : '')),
  getAlarmSounds:            ()        => request('/medicine-reminders/alarm-sounds'),
  getPrescriptions:          (p={})    => request('/pharmacy/prescriptions' + (Object.keys(p).length ? '?' + new URLSearchParams(p) : '')),

  // ── Vitals Self-Tracking ──
  getVitals:                 (p={})    => request('/vitals' + (Object.keys(p).length ? '?' + new URLSearchParams(p) : '')),
  logVital:                  (body)    => request('/vitals', { method: 'POST', body: JSON.stringify(body) }),
  updateVital:               (id, body)=> request(`/vitals/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteVital:               (id)      => request(`/vitals/${id}`, { method: 'DELETE' }),
  getVitalsTrends:           (p={})    => request('/vitals/trends' + (Object.keys(p).length ? '?' + new URLSearchParams(p) : '')),
  getVitalsReferenceRanges:  ()        => request('/vitals/reference-ranges'),
  getVitalsReminders:        ()        => request('/vitals-reminders/all'),
  createVitalsReminder:      (body)    => request('/vitals-reminders', { method: 'POST', body: JSON.stringify(body) }),
  updateVitalsReminder:      (id, body)=> request(`/vitals-reminders/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteVitalsReminder:      (id)      => request(`/vitals-reminders/${id}`, { method: 'DELETE' }),

  // ── Chronic Disease Care Plans ──
  getCarePlans:              ()        => request('/care-plans'),
  getCarePlan:               (id)      => request(`/care-plans/${id}`),
  createCarePlan:            (body)    => request('/care-plans', { method: 'POST', body: JSON.stringify(body) }),
  updateCarePlan:            (id, body)=> request(`/care-plans/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  updateCarePlanStatus:      (id, st)  => request(`/care-plans/${id}/status`, { method: 'PUT', body: JSON.stringify({ status: st }) }),
  updateCarePlanConsent:     (id, sh)  => request(`/care-plans/${id}/consent`, { method: 'PUT', body: JSON.stringify({ shareWithDoctor: sh }) }),
  getCarePlanToday:          (id)      => request(`/care-plans/${id}/today`),
  getDoctorCarePlans:        ()        => request('/care-plans/doctor-view'),

  // ── File 13: platform engines (workflows, approvals, rules+tasks, masters+flags) ──
  wfDefinitions:             (p={})    => request('/workflows/definitions' + qs(p)),
  wfCreateDefinition:        (body)    => request('/workflows/definitions', { method: 'POST', body: JSON.stringify(body) }),
  wfPublish:                (id)      => request(`/workflows/definitions/${id}/publish`, { method: 'POST' }),
  wfStartInstance:          (body)    => request('/workflows/instances', { method: 'POST', body: JSON.stringify(body) }),
  wfInstance:               (id)      => request(`/workflows/instances/${id}`),
  wfFireEvent:              (id, body)=> request(`/workflows/instances/${id}/events`, { method: 'POST', body: JSON.stringify(body) }),
  wfInbox:                  ()        => request('/workflows/inbox'),
  approvalPolicies:         ()        => request('/approvals/policies'),
  approvalRequests:         (p={})    => request('/approvals/requests' + qs(p)),
  approvalDecide:           (id, body)=> request(`/approvals/requests/${id}/decide`, { method: 'POST', body: JSON.stringify(body) }),
  approvalDelegations:      ()        => request('/approvals/delegations'),
  createDelegation:         (body)    => request('/approvals/delegations', { method: 'POST', body: JSON.stringify(body) }),
  ruleDatasets:            ()        => request('/rules/datasets'),
  listRules:               ()        => request('/rules/rules'),
  createRule:              (body)    => request('/rules/rules', { method: 'POST', body: JSON.stringify(body) }),
  seedClinicalRules:       ()        => request('/rules/rules/seed-clinical', { method: 'POST' }),
  patchRule:               (id, body)=> request(`/rules/rules/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  testRule:                (id)      => request(`/rules/rules/${id}/test`, { method: 'POST' }),
  backtestRule:            (body)    => request('/rules/backtest', { method: 'POST', body: JSON.stringify(body) }),
  workTasks:               (p={})    => request('/rules/tasks' + qs(p)),
  createWorkTask:          (body)    => request('/rules/tasks', { method: 'POST', body: JSON.stringify(body) }),
  patchWorkTask:           (id, body)=> request(`/rules/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  masterSearch:            (q)       => request('/search/all?q=' + encodeURIComponent(q)),
  listLocations:           ()        => request('/masters/locations'),
  createLocation:          (body)    => request('/masters/locations', { method: 'POST', body: JSON.stringify(body) }),
  listWardTypes:           ()        => request('/masters/ward-types'),
  listReasonCodes:         (module)  => request('/masters/reason-codes' + (module ? '?module=' + encodeURIComponent(module) : '')),
  patientFlags:            (pid)     => request(`/masters/patient-flags/${pid}`),
  createPatientFlag:       (body)    => request('/masters/patient-flags', { method: 'POST', body: JSON.stringify(body) }),
  clearPatientFlag:        (id)      => request(`/masters/patient-flags/${id}/clear`, { method: 'POST' }),

  // ── File 16: RCM, checkout, recon, enterprise ──
  rcmPipeline:             ()        => request('/rcm/pipeline'),
  rcmGaps:                (p={})    => request('/rcm/gaps' + qs(p)),
  rcmCloseGap:            (id)      => request(`/rcm/gaps/${id}/close`, { method: 'POST' }),
  rcmDetect:              ()        => request('/rcm/detect', { method: 'POST' }),
  rcmMetrics:             ()        => request('/rcm/metrics'),
  paymentIntent:          (body)    => request('/checkout/intents', { method: 'POST', body: JSON.stringify(body) }),
  refundCheckoutPayment: (id, body)=> request(`/checkout/${id}/refund`, { method: 'POST', body: JSON.stringify(body || {}) }),
  checkoutReconcile:     (gateway) => request('/checkout/reconcile', { method: 'POST', body: JSON.stringify({ gateway }) }),
  createPaymentLink:     (body)    => request('/checkout/payment-links', { method: 'POST', body: JSON.stringify(body) }),
  reconAccounts:          ()        => request('/recon/accounts'),
  createReconAccount:     (body)    => request('/recon/accounts', { method: 'POST', body: JSON.stringify(body) }),
  importStatement:        (body)    => request('/recon/imports', { method: 'POST', body: JSON.stringify(body) }),
  importTxns:             (id, p={})=> request(`/recon/imports/${id}/txns` + qs(p)),
  automatchImport:        (id)      => request(`/recon/imports/${id}/automatch`, { method: 'POST' }),
  matchTxn:               (id, body)=> request(`/recon/txns/${id}/match`, { method: 'POST', body: JSON.stringify(body) }),
  closeRecon:             (id)      => request(`/recon/imports/${id}/close`, { method: 'POST' }),
  reconRules:             ()        => request('/recon/rules'),
  createReconRule:        (body)    => request('/recon/rules', { method: 'POST', body: JSON.stringify(body) }),
  listCorporates:         ()        => request('/enterprise/corporates'),
  createCorporate:        (body)    => request('/enterprise/corporates', { method: 'POST', body: JSON.stringify(body) }),
  corporateEligibility:   (id, p={})=> request(`/enterprise/corporates/${id}/eligibility` + qs(p)),
  corporateStatement:     (id)      => request(`/enterprise/corporates/${id}/statement`),
  listContracts:          (p={})    => request('/enterprise/contracts' + qs(p)),
  createContract:         (body)    => request('/enterprise/contracts', { method: 'POST', body: JSON.stringify(body) }),
  vendorScorecards:       (p={})    => request('/enterprise/vendors/scorecards' + qs(p)),
  computeScorecard:       (sid, period) => request(`/enterprise/vendors/${sid}/scorecards/compute`, { method: 'POST', body: JSON.stringify({ period }) }),
  // ── File 22 P1-16: accounts ──
  coa:                    ()        => request('/finance/accounts'),
  seedCoa:                ()        => request('/finance/accounts/seed', { method: 'POST' }),
  vendorBills:            (p={})    => request('/finance/vendor-bills' + qs(p)),
  createVendorBill:       (body)    => request('/finance/vendor-bills', { method: 'POST', body: JSON.stringify(body) }),
  postVendorBill:         (id)      => request(`/finance/vendor-bills/${id}/post`, { method: 'POST' }),
  bankBook:               (p={})    => request('/finance/bank-books' + qs(p)),

  // ── File 17: report studio, KPIs, AI ──
  studioCatalogue:        ()        => request('/report-studio/catalogue'),
  runStudioReport:        (key, body) => request(`/report-studio/${key}/run`, { method: 'POST', body: JSON.stringify(body || {}) }),
  runStudioAsync:         (key, body) => request(`/report-studio/${key}/run-async`, { method: 'POST', body: JSON.stringify(body || {}) }),
  studioRunStatus:        (id)      => request(`/report-studio/runs/${id}`),
  studioViews:            ()        => request('/report-studio/views'),
  createStudioView:       (body)    => request('/report-studio/views', { method: 'POST', body: JSON.stringify(body) }),
  studioSchedules:        ()        => request('/report-studio/schedules'),
  createStudioSchedule:   (body)    => request('/report-studio/schedules', { method: 'POST', body: JSON.stringify(body) }),
  kpiCompute:             ()        => request('/insights/kpis/compute'),
  dailyMetrics:           ()        => request('/insights/metrics/daily'),
  computeDailyMetrics:    ()        => request('/insights/metrics/daily/compute', { method: 'POST' }),
  aiDischargeDraft:       (fields)  => request('/insights/ai/discharge-draft', { method: 'POST', body: JSON.stringify({ fields }) }),
  aiNoshow:               (body)    => request('/insights/ai/noshow-score', { method: 'POST', body: JSON.stringify(body) }),
  aiForecast:             (counts)  => request('/insights/ai/forecast', { method: 'POST', body: JSON.stringify({ dailyCounts: counts }) }),
  aiInvocations:          ()        => request('/insights/ai/invocations'),

  // ── File 18: contact center + hub ──
  ccInteractions:         (p={})    => request('/contact-center/interactions' + qs(p)),
  ccCreateInteraction:    (body)    => request('/contact-center/interactions', { method: 'POST', body: JSON.stringify(body) }),
  ccDispose:              (id, body)=> request(`/contact-center/interactions/${id}/dispose`, { method: 'PATCH', body: JSON.stringify(body) }),
  ccQueue:                ()        => request('/contact-center/queue'),
  ccAssign:               (id)      => request(`/contact-center/queue/${id}/assign`, { method: 'POST' }),
  ccQueueDone:            (id, missed) => request(`/contact-center/queue/${id}/done`, { method: 'POST', body: JSON.stringify({ missed: !!missed }) }),
  ccAgentSession:         (status)  => request('/contact-center/agents/session', { method: 'POST', body: JSON.stringify({ status }) }),
  ccWallboard:            ()        => request('/contact-center/wallboard'),
  ccCampaigns:            ()        => request('/contact-center/campaigns'),
  ccDnd:                 (p={})    => request('/contact-center/dnd' + qs(p)),
  ccAddDnd:              (body)    => request('/contact-center/dnd', { method: 'POST', body: JSON.stringify(body) }),
  ccRemoveDnd:           (id)      => request(`/contact-center/dnd/${id}`, { method: 'DELETE' }),
  ccScreenPop:           (phone)   => request('/contact-center/screen-pop?phone=' + encodeURIComponent(phone)),
  ccCreateCampaign:       (body)    => request('/contact-center/campaigns', { method: 'POST', body: JSON.stringify(body) }),
  ccCampaignState:        (id, state) => request(`/contact-center/campaigns/${id}/state`, { method: 'POST', body: JSON.stringify({ state }) }),
  hubIntegrations:        ()        => request('/hub'),
  hubSaveIntegration:     (body)    => request('/hub', { method: 'POST', body: JSON.stringify(body) }),
  hubMessages:            (p={})    => request('/hub/messages' + qs(p)),
  hubRetryMessage:        (id)      => request(`/hub/messages/${id}/retry`, { method: 'POST' }),
  hubMappings:            ()        => request('/hub/mappings'),
  hubSaveMapping:         (body)    => request('/hub/mappings', { method: 'POST', body: JSON.stringify(body) }),
  hubSubs:                ()        => request('/hub/webhooks/subs'),
  hubCreateSub:           (body)    => request('/hub/webhooks/subs', { method: 'POST', body: JSON.stringify(body) }),
  hubDeleteSub:           (id)      => request(`/hub/webhooks/subs/${id}`, { method: 'DELETE' }),
  hubDeliveries:          (p={})    => request('/hub/webhooks/deliveries' + qs(p)),

  // ── File 22 P2-35: notification templates ──
  notifyTemplates:         (p={})    => request('/notify/templates' + qs(p)),
  saveNotifyTemplate:     (body)    => request('/notify/templates', { method: 'POST', body: JSON.stringify(body) }),
  previewNotifyTemplate:  (id, values) => request(`/notify/templates/${id}/preview`, { method: 'POST', body: JSON.stringify({ values }) }),

  // ── File 22 P1-15: TPA depth ──
  tpaRoomRent:            (id, body)  => request(`/tpa/claims/${id}/room-rent`, { method: 'POST', body: JSON.stringify(body) }),
  tpaQuery:               (id, body)  => request(`/tpa/claims/${id}/query`, { method: 'POST', body: JSON.stringify(body) }),
  tpaAppeal:              (id, grounds) => request(`/tpa/claims/${id}/appeal`, { method: 'POST', body: JSON.stringify({ grounds }) }),
  pmjayList:              (p={})    => request('/tpa/pmjay' + qs(p)),
  pmjayUpsert:            (body)    => request('/tpa/pmjay', { method: 'POST', body: JSON.stringify(body) }),

  // ── File 22 P1-11: LIS depth ──
  labReject:               (id, idx, reason) => request(`/lab/orders/${id}/tests/${idx}/reject`, { method: 'PUT', body: JSON.stringify({ reason }) }),
  labRecollect:            (id, idx) => request(`/lab/orders/${id}/tests/${idx}/recollect`, { method: 'PUT' }),
  labOutsource:            (id, idx, body) => request(`/lab/orders/${id}/tests/${idx}/outsource`, { method: 'PUT', body: JSON.stringify(body) }),
  labCallback:             (id, body) => request(`/lab/orders/${id}/callback`, { method: 'POST', body: JSON.stringify(body) }),
  labTat:                 ()        => request('/lab/tat'),
  qcCreate:               (body)    => request('/lab/qc', { method: 'POST', body: JSON.stringify(body) }),
  qcChart:                (p={})    => request('/lab/qc/chart' + qs(p)),

  // ── File 22 P0-5/P0-6: safety ledgers + front-office + payroll/payouts ──
  safetyList:              (path, p={}) => request('/safety/' + path + qs(p)),
  safetyCreate:            (path, body) => request('/safety/' + path, { method: 'POST', body: JSON.stringify(body) }),
  safetyPatch:             (path, id, body) => request(`/safety/${path}/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  safetyExpiring:          (days=60) => request(`/safety/credentials/expiring?days=${days}`),
  enquiries:               (p={})    => request('/frontoffice/enquiries' + qs(p)),
  createEnquiry:           (body)    => request('/frontoffice/enquiries', { method: 'POST', body: JSON.stringify(body) }),
  patchEnquiry:            (id, body)=> request(`/frontoffice/enquiries/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  // ── File 22 P1-12: duplicates + merge + ABHA ──
  patientDuplicates:       ()        => request('/patients/duplicates'),
  mergePatients:           (id, duplicateId) => request(`/patients/${id}/merge`, { method: 'POST', body: JSON.stringify({ duplicateId }) }),
  linkAbha:                (id, abhaAddress) => request(`/patients/${id}/abha`, { method: 'POST', body: JSON.stringify({ abhaAddress }) }),
  payouts:                 (p={})    => request('/finance/payouts' + qs(p)),
  createPayout:            (body)    => request('/finance/payouts', { method: 'POST', body: JSON.stringify(body) }),
  payoutState:             (id, state) => request(`/finance/payouts/${id}/state`, { method: 'POST', body: JSON.stringify({ state }) }),
  assetMaintenance:        (p={})    => request('/enterprise/maintenance' + qs(p)),
  createMaintenance:       (body)    => request('/enterprise/maintenance', { method: 'POST', body: JSON.stringify(body) }),
  patchMaintenance:        (id, body)=> request(`/enterprise/maintenance/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  shiftSwaps:              (p={})    => request('/roster/swaps' + qs(p)),
  createSwap:              (body)    => request('/roster/swaps', { method: 'POST', body: JSON.stringify(body) }),
  decideSwap:              (id, decision) => request(`/roster/swaps/${id}/decide`, { method: 'POST', body: JSON.stringify({ decision }) }),
  payslips:                (p={})    => request('/staff/payslips' + qs(p)),
  createPayslip:           (body)    => request('/staff/payslips', { method: 'POST', body: JSON.stringify(body) }),
  releasePayslip:          (id)      => request(`/staff/payslips/${id}/release`, { method: 'POST' }),
};
