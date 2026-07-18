import apiClient from './axios';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

export function getStoredAuthToken() {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem('hms_token') || localStorage.getItem('token');
}

async function request(path, options = {}) {
  const { method = 'GET', body, headers: extraHeaders } = options;
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  try {
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
  } catch (error) {
    throw error;
  }
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

export const api = {
  login:              (body)    => request('/auth/login',            { method:'POST', body: JSON.stringify(body) }),
  googleAuth:         (body)    => request('/auth/google',           { method:'POST', body: JSON.stringify(body) }),
  setDoctorPassword:  (body)    => request('/auth/doctor-setup',     { method:'POST', body: JSON.stringify(body) }),
  register:           (body)    => request('/auth/register',         { method:'POST', body: JSON.stringify(body) }),
  verifyOTP:          (body)    => request('/auth/verify-otp',       { method:'POST', body: JSON.stringify(body) }),
  resendOTP:          (body)    => request('/auth/resend-otp',       { method:'POST', body: JSON.stringify(body) }),
  forgotPassword:     (body)    => request('/auth/forgot-password',  { method:'POST', body: JSON.stringify(body) }),
  resetPassword:      (body)    => request('/auth/reset-password',   { method:'POST', body: JSON.stringify(body) }),
  me:                 ()        => request('/auth/me'),
  updateProfile:      (body)    => request('/auth/profile',          { method:'PUT',  body: JSON.stringify(body) }),
  uploadAvatar:       (file)    => {
    const body = new FormData();
    body.append('file', file);
    return request('/auth/avatar', { method:'POST', body });
  },
  changePassword:     (body)    => request('/auth/change-password',  { method:'PUT', body: JSON.stringify(body) }),
  dashboardStats:     ()        => request('/dashboard/stats'),

  getUsers:           (p={})    => request('/users?' + new URLSearchParams(p)),
  deleteUser:         (id)      => request(`/users/${id}`,           { method:'DELETE' }),
  blockUser:          (id)      => request(`/users/${id}/block`,     { method:'PUT' }),

  getDoctors:         (p={})    => request('/doctors?' + new URLSearchParams(p)),
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

  getPatients:        (p={})    => request('/patients?' + new URLSearchParams(p)),
  createPatient:      (body)    => request('/patients',             { method:'POST',   body: JSON.stringify(body) }),
  updatePatient:      (id,body) => request(`/patients/${id}`,       { method:'PUT',    body: JSON.stringify(body) }),
  deletePatient:      (id)      => request(`/patients/${id}`,       { method:'DELETE' }),

  getAppointments:    (p={})    => request('/appointments?' + new URLSearchParams(p)),
  getMyAppointments:  (p={})    => request('/appointments/my-appointments?' + new URLSearchParams(p)),
  createAppointment:  (body)    => request('/appointments',         { method:'POST',   body: JSON.stringify(body) }),
  updateAppointment:  (id,b)    => request(`/appointments/${id}`,   { method:'PUT',    body: JSON.stringify(b) }),
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
  broadcastNotification:    (body)  => request('/notifications/broadcast',      { method:'POST', body: JSON.stringify(body) }),

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
  createPayment:  (body)  => request('/payments',          { method:'POST',   body: JSON.stringify(body) }),
  updatePayment:  (id,b)  => request(`/payments/${id}`,    { method:'PUT',    body: JSON.stringify(b) }),

  getHospitals:         (p={})  => request('/hospitals?' + new URLSearchParams(p)),
  getHospital:          (id)    => request(`/hospitals/${id}`),
  registerHospital:     (body)  => request('/hospitals/register', { method:'POST', body: JSON.stringify(body) }),
  updateHospital:       (id,b)  => request(`/hospitals/${id}`,    { method:'PUT',  body: JSON.stringify(b) }),
  approveHospital:      (id)    => request(`/hospitals/${id}/approve`, { method:'PUT' }),
  rejectHospital:       (id,b)  => request(`/hospitals/${id}/reject`,  { method:'PUT', body: JSON.stringify(b) }),
  suspendHospital:      (id)    => request(`/hospitals/${id}/suspend`, { method:'PUT' }),
  getPendingHospitals:  ()      => request('/hospitals/pending'),
  getMyHospital:        ()      => request('/hospitals/admin/mine'),
  registerPlatform:     (body)  => request('/platform/register', { method:'POST', body: JSON.stringify(body) }),

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
  getPendingFacilities:  (type)  => request('/facilities/pending?' + (type ? new URLSearchParams({ type }) : '')),
  getClinicProfile:      ()      => request('/clinics/profile'),
  updateClinicProfile:   (body)  => request('/clinics/profile', { method:'PUT', body: JSON.stringify(body) }),
  getClinicStaff:        ()      => request('/clinics/staff'),
  createClinicStaff:     (body)  => request('/clinics/staff',   { method:'POST', body: JSON.stringify(body) }),
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
  getPharmacyDeliveries:  (p={})    => request('/pharmacy/deliveries?' + new URLSearchParams(p)),

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
};
