/**
 * TRAI TCCCPR-2018 Statutory DLT (Distributed Ledger Technology) Registry Configuration.
 * 
 * In India, every SMS transmitted via telecom operators (Airtel, Jio, Vi, BSNL)
 * must be pre-registered on a DLT platform (Vilpower, PingConnect, TrueConnect) with:
 *   - Entity ID (Principal Entity registration number)
 *   - Sender Header ID (6-character approved alpha header, e.g. FNDMED)
 *   - Template ID (Numerical ID matching exact registered copy with {#var#})
 */

export const DLT_CONFIG = {
  entityId: process.env.DLT_ENTITY_ID || '1101569840000034125',
  senderId: process.env.DLT_SENDER_ID || process.env.MSG91_SENDER_ID || 'FNDMED',
};

export const DLT_TEMPLATES = {
  // Authentication & Security
  otp: {
    id: process.env.DLT_TPL_OTP || '1107161829304192841',
    name: 'FINDMEDI_LOGIN_OTP',
    text: (vars) => `Your FindMedi verification code is ${vars.otp}. Valid for 5 minutes. Do not share this code with anyone.`,
  },
  password_reset: {
    id: process.env.DLT_TPL_RESET || '1107161829304192842',
    name: 'FINDMEDI_PASSWORD_RESET',
    text: (vars) => `Use OTP ${vars.otp} to reset your FindMedi account password. If not requested by you, call support immediately.`,
  },

  // Clinical & Consultations
  booking_confirmed: {
    id: process.env.DLT_TPL_BOOKING || '1107161829304192843',
    name: 'FINDMEDI_BOOKING_CONFIRMED',
    text: (vars) => `Your appointment with Dr. ${vars.doctorName} at ${vars.hospitalName} is confirmed for ${vars.time} on ${vars.date}. Token: ${vars.token}.`,
  },
  appointment_reminder: {
    id: process.env.DLT_TPL_REMINDER || '1107161829304192844',
    name: 'FINDMEDI_APPT_REMINDER',
    text: (vars) => `Reminder: You have an appointment with Dr. ${vars.doctorName} today at ${vars.time}. Please arrive 15 minutes before your slot.`,
  },
  prescription_ready: {
    id: process.env.DLT_TPL_RX || '1107161829304192845',
    name: 'FINDMEDI_RX_DISPATCHED',
    text: (vars) => `Your prescription from Dr. ${vars.doctorName} is now ready. View and download your digital prescription at findmedi.online/records`,
  },

  // Emergency SOS & Ambulance
  sos_dispatched: {
    id: process.env.DLT_TPL_SOS || '1107161829304192846',
    name: 'FINDMEDI_SOS_DISPATCHED',
    text: (vars) => `EMERGENCY ALERT: Ambulance ${vars.vehicleNo} has been dispatched to your location. Driver contact: ${vars.driverPhone}. Stay on the line.`,
  },

  // Pharmacy & Diagnostics
  lab_results_ready: {
    id: process.env.DLT_TPL_LAB || '1107161829304192847',
    name: 'FINDMEDI_LAB_REPORT',
    text: (vars) => `Your lab test report for Order #${vars.orderId} is verified and ready. View your secure report at findmedi.online/records`,
  },
};

/**
 * Resolve DLT template details by notification category.
 */
export function resolveDltTemplate(category = 'otp', variables = {}) {
  const tpl = DLT_TEMPLATES[category] || DLT_TEMPLATES.otp;
  return {
    templateId: tpl.id,
    templateName: tpl.name,
    entityId: DLT_CONFIG.entityId,
    senderId: DLT_CONFIG.senderId,
    formattedText: typeof tpl.text === 'function' ? tpl.text(variables) : '',
  };
}

export default { DLT_CONFIG, DLT_TEMPLATES, resolveDltTemplate };
