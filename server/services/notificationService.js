import { renderEmailTemplate, renderPlainText } from './emailTemplates.js';

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL || 'mahendrapra0077@gmail.com';
const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

const dashboardUrl = (path = '/dashboard') => {
  const baseUrl = CLIENT_URL.replace(/\/$/, '');
  const routePath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}/#${routePath}`;
};

const doctorLabel = (doctor = {}) => {
  const name = doctor.name || doctor.doctorName || doctor;
  if (!name) return 'Your doctor';
  return String(name).trim().toLowerCase().startsWith('dr.') ? name : `Dr. ${name}`;
};

const templateEmail = (template) => ({
  text: renderPlainText(template),
  html: renderEmailTemplate(template),
});

const attachmentFromPdf = (filename, pdfBuffer) => ({
  filename,
  content: pdfBuffer.toString('base64'),
  contentType: 'application/pdf',
});

export const sendEmail = async ({ to, subject, text, html, attachments }) => {
  if (!BREVO_API_KEY) {
    const allowSimulation = process.env.ALLOW_EMAIL_SIMULATION === 'true' || process.env.EMAIL_SIMULATION === 'true';
    if (allowSimulation) {
      console.log(`Email simulated: ${to} - ${subject}`);
      return { success: true, simulated: true, message: 'Email simulated (Brevo not configured)' };
    }

    return {
      success: false,
      error: 'Brevo API key is not configured. Set BREVO_API_KEY on the server to send real emails.',
    };
  }

  try {
    const safeText = text || subject || 'MediCore Hospital notification';
    const safeHtml = html || renderEmailTemplate({
      title: subject || 'MediCore Hospital',
      badge: 'MediCore Notification',
      paragraphs: [safeText],
    });

    const payload = {
      sender: { email: BREVO_SENDER_EMAIL, name: 'MediCore Hospital' },
      to: [{ email: to }],
      subject,
      textContent: safeText,
      htmlContent: safeHtml,
    };

    if (process.env.BREVO_REPLY_TO || BREVO_SENDER_EMAIL) {
      payload.replyTo = { email: process.env.BREVO_REPLY_TO || BREVO_SENDER_EMAIL };
    }

    if (attachments && attachments.length > 0) {
      payload.attachment = attachments.map(att => ({
        filename: att.filename,
        content: att.content,
        contentType: att.contentType || 'application/octet-stream',
      }));
    }

    const response = await fetch(BREVO_API_URL, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'api-key': BREVO_API_KEY,
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    let result = {};
    if (responseText) {
      try {
        result = JSON.parse(responseText);
      } catch {
        result = { raw: responseText };
      }
    }

    if (!response.ok) {
      const providerMessage = result?.message || result?.raw || responseText || 'Unknown Brevo error';
      throw new Error(`Brevo API error: ${response.status} - ${providerMessage}`);
    }

    console.log(`Email sent to ${to}: ${result.messageId}`);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Email send error:', error.message);
    return { success: false, error: error.message };
  }
};

export const sendAppointmentReminder = async (appointment) => {
  const { patient, doctor, date, time } = appointment;
  const subject = 'Appointment Reminder - MediCore Hospital';
  const email = templateEmail({
    title: 'Your appointment is coming up',
    subtitle: 'We have reserved your consultation slot in the MediCore system.',
    badge: 'Appointment Reminder',
    greeting: `Hi ${patient.name},`,
    paragraphs: [
      `This is a reminder for your appointment with ${doctorLabel(doctor)}.`,
      'Please arrive 15 minutes early so our care team can complete your check-in smoothly.',
    ],
    details: [
      { label: 'Doctor', value: doctorLabel(doctor) },
      { label: 'Date', value: date },
      { label: 'Time', value: time },
    ],
    cta: { label: 'Open Dashboard', url: dashboardUrl('/dashboard') },
    note: 'If you need to reschedule, please contact the hospital desk before your appointment time.',
    preheader: `Reminder for your appointment on ${date} at ${time}.`,
  });

  return sendEmail({ to: patient.email, subject, ...email });
};

export const sendPrescriptionEmail = async (patient, prescription, pdfBuffer) => {
  const doctorName = doctorLabel(prescription.doctorName);
  const subject = 'Your Prescription - MediCore Hospital';
  const email = templateEmail({
    title: 'Prescription attached',
    subtitle: 'Your prescription PDF is ready and attached to this email.',
    badge: 'Medical Report',
    greeting: `Hi ${patient.name},`,
    paragraphs: [
      `Your prescription from ${doctorName} has been generated.`,
      'Keep this email for your records and follow the dosage instructions given by your doctor.',
    ],
    details: [
      { label: 'Patient', value: patient.name },
      { label: 'Doctor', value: doctorName },
      { label: 'Document', value: 'Prescription PDF' },
    ],
    cta: { label: 'View Records', url: dashboardUrl('/patient/records') },
    note: 'The attached PDF uses the professional MediCore report format.',
    preheader: 'Your MediCore prescription PDF is attached.',
  });

  return sendEmail({
    to: patient.email,
    subject,
    ...email,
    attachments: [attachmentFromPdf('prescription.pdf', pdfBuffer)],
  });
};

export const sendLabReportEmail = async (patient, report, pdfBuffer) => {
  const reportId = report.reportId || report.id || '';
  const subject = 'Your Lab Report - MediCore Hospital';
  const email = templateEmail({
    title: 'Lab report attached',
    subtitle: 'Your diagnostic report is ready for review.',
    badge: 'Lab Report',
    greeting: `Hi ${patient.name},`,
    paragraphs: [
      'Your lab report has been generated and attached as a PDF.',
      'Please review it with your doctor if any result needs medical interpretation.',
    ],
    details: [
      { label: 'Patient', value: patient.name },
      { label: 'Report ID', value: reportId },
      { label: 'Document', value: 'Lab Report PDF' },
    ],
    cta: { label: 'Open Reports', url: dashboardUrl('/patient/reports') },
    note: 'For urgent or critical findings, please contact the hospital care team immediately.',
    preheader: reportId ? `Your lab report ${reportId} is attached.` : 'Your MediCore lab report is attached.',
  });

  return sendEmail({
    to: patient.email,
    subject,
    ...email,
    attachments: [attachmentFromPdf(`lab-report-${reportId || Date.now()}.pdf`, pdfBuffer)],
  });
};

export const sendDischargeSummaryEmail = async (patient, summary, pdfBuffer) => {
  const admissionId = summary.admissionId || '';
  const subject = 'Your Discharge Summary - MediCore Hospital';
  const email = templateEmail({
    title: 'Discharge summary attached',
    subtitle: 'Your discharge document is ready for your records.',
    badge: 'Discharge Summary',
    greeting: `Hi ${patient.name},`,
    paragraphs: [
      'Your discharge summary has been generated and attached as a PDF.',
      'Please follow the after-care instructions and keep your follow-up appointment if one is scheduled.',
    ],
    details: [
      { label: 'Patient', value: patient.name },
      { label: 'Admission ID', value: admissionId },
      { label: 'Document', value: 'Discharge Summary PDF' },
    ],
    cta: { label: 'Open Reports', url: dashboardUrl('/patient/reports') },
    note: 'If symptoms return or worsen, contact emergency care immediately.',
    preheader: admissionId ? `Discharge summary for admission ${admissionId} is attached.` : 'Your MediCore discharge summary is attached.',
  });

  return sendEmail({
    to: patient.email,
    subject,
    ...email,
    attachments: [attachmentFromPdf(`discharge-summary-${admissionId || Date.now()}.pdf`, pdfBuffer)],
  });
};

export const sendLabResultAlert = async (patient, report) => {
  const subject = 'Lab Results Available - MediCore Hospital';
  const email = templateEmail({
    title: 'Your lab results are available',
    subtitle: 'A new lab result has been added to your MediCore records.',
    badge: 'Results Ready',
    greeting: `Hi ${patient.name},`,
    paragraphs: [
      'Your latest lab results are now available in the patient dashboard.',
      'You can view, download, or share the report with your doctor from your reports section.',
    ],
    details: [
      { label: 'Report ID', value: report.reportId },
      { label: 'Status', value: 'Available' },
    ],
    cta: { label: 'View Lab Results', url: dashboardUrl('/patient/reports') },
    preheader: `Lab report ${report.reportId} is ready.`,
  });

  return sendEmail({ to: patient.email, subject, ...email });
};

export const sendAccountVerifiedEmail = async (user) => {
  const dashboardLabel = user.role === 'admin'
    ? 'Admin Dashboard'
    : user.role === 'doctor'
      ? 'Doctor Dashboard'
      : 'Patient Dashboard';

  const isDoctor = user.role === 'doctor';
  const email = templateEmail({
    title: 'Email verified successfully',
    subtitle: isDoctor ? 'Your doctor profile is now waiting for admin approval.' : `Your ${dashboardLabel} is ready.`,
    badge: 'Account Verified',
    greeting: `Hi ${user.name},`,
    paragraphs: [
      'Your MediCore email address has been verified successfully.',
      isDoctor
        ? 'The admin team will review your doctor profile and notify you after approval.'
        : `You can now access your ${dashboardLabel} securely.`,
    ],
    details: [
      { label: 'Account', value: user.email },
      { label: 'Role', value: user.role },
      { label: 'Status', value: isDoctor ? 'Pending admin approval' : 'Verified' },
    ],
    cta: !isDoctor ? { label: `Open ${dashboardLabel}`, url: dashboardUrl('/dashboard') } : undefined,
    tone: 'success',
    preheader: 'Your MediCore email has been verified.',
  });

  return sendEmail({
    to: user.email,
    subject: 'Your MediCore Email Is Verified',
    ...email,
  });
};

export const sendDoctorPendingReviewEmail = async (doctorUser) => {
  const email = templateEmail({
    title: 'Doctor approval pending',
    subtitle: 'Your verified doctor profile is now in admin review.',
    badge: 'Admin Review',
    greeting: `Hi ${doctorUser.name},`,
    paragraphs: [
      'Your email is verified and your doctor profile has moved to the approval queue.',
      'You will receive another email as soon as an administrator approves or updates your profile status.',
    ],
    details: [
      { label: 'Account', value: doctorUser.email },
      { label: 'Status', value: 'Pending approval' },
    ],
    note: 'Dashboard access will be enabled after admin approval.',
    tone: 'warning',
    preheader: 'Your doctor profile is pending MediCore admin approval.',
  });

  return sendEmail({
    to: doctorUser.email,
    subject: 'MediCore Doctor Account Pending Approval',
    ...email,
  });
};

export const sendDoctorApprovalEmail = async (doctorUser) => {
  const email = templateEmail({
    title: 'Doctor account approved',
    subtitle: 'Your MediCore Doctor Dashboard is now active.',
    badge: 'Approval Complete',
    greeting: `Hi ${doctorUser.name},`,
    paragraphs: [
      'Your doctor account has been approved by the administrator.',
      'You can now manage appointments, patients, reports, schedule, and consultations from your dashboard.',
    ],
    details: [
      { label: 'Account', value: doctorUser.email },
      { label: 'Status', value: 'Approved' },
    ],
    cta: { label: 'Open Doctor Dashboard', url: dashboardUrl('/dashboard') },
    tone: 'success',
    preheader: 'Your MediCore doctor account is approved.',
  });

  return sendEmail({
    to: doctorUser.email,
    subject: 'Your MediCore Doctor Account Is Approved',
    ...email,
  });
};

export const sendDoctorRejectionEmail = async (doctorUser) => {
  const email = templateEmail({
    title: 'Doctor account review update',
    subtitle: 'Your doctor profile could not be approved at this time.',
    badge: 'Review Update',
    greeting: `Hi ${doctorUser.name},`,
    paragraphs: [
      'Your doctor account was not approved at this time.',
      'Please contact the hospital administrator for more details or to update your submitted credentials.',
    ],
    details: [
      { label: 'Account', value: doctorUser.email },
      { label: 'Status', value: 'Not approved' },
    ],
    tone: 'danger',
    preheader: 'Your MediCore doctor account review has been updated.',
  });

  return sendEmail({
    to: doctorUser.email,
    subject: 'MediCore Doctor Account Review Update',
    ...email,
  });
};

export const sendAccountBlockedEmail = async (user) => {
  const email = templateEmail({
    title: 'Account access blocked',
    subtitle: 'Your MediCore dashboard access has been restricted.',
    badge: 'Security Notice',
    greeting: `Hi ${user.name},`,
    paragraphs: [
      'Your MediCore account has been blocked by an administrator.',
      'If you believe this is a mistake, please contact the hospital administrator for assistance.',
    ],
    details: [
      { label: 'Account', value: user.email },
      { label: 'Status', value: 'Blocked' },
    ],
    tone: 'danger',
    preheader: 'Your MediCore account access has been blocked.',
  });

  return sendEmail({
    to: user.email,
    subject: 'MediCore Account Access Blocked',
    ...email,
  });
};

export const sendHostNotificationEmail = async ({ subject, text, html }) => {
  const hostEmail = process.env.HOST_NOTIFICATION_EMAIL || process.env.ADMIN_EMAIL || BREVO_SENDER_EMAIL;
  const email = html
    ? { text: text || subject, html }
    : templateEmail({
      title: subject,
      badge: 'Host Notification',
      paragraphs: [text || subject],
      details: [{ label: 'Recipient', value: 'MediCore host/admin' }],
      preheader: subject,
    });

  return sendEmail({
    to: hostEmail,
    subject,
    ...email,
  });
};

export const sendPasswordChangedEmail = async (user) => {
  const email = templateEmail({
    title: 'Password updated',
    subtitle: 'Your MediCore account password was changed successfully.',
    badge: 'Security Notice',
    greeting: `Hi ${user.name},`,
    paragraphs: [
      'Your password was updated successfully.',
      'If this was not you, contact the hospital administrator immediately so your account can be secured.',
    ],
    details: [
      { label: 'Account', value: user.email },
      { label: 'Status', value: 'Password changed' },
    ],
    tone: 'warning',
    preheader: 'Your MediCore password was updated.',
  });

  return sendEmail({
    to: user.email,
    subject: 'Your MediCore Password Was Updated',
    ...email,
  });
};

export const sendSMS = async (phone, message) => {
  console.log(`SMS to ${phone}: ${message}`);
  return { success: true, message: 'SMS simulated (integrate with Twilio/Africastalking)' };
};

export const sendAppointmentReminderSMS = async (phone, patientName, doctorName, date, time) => {
  const message = `Dear ${patientName}, reminder for your appointment with ${doctorLabel(doctorName)} on ${date} at ${time}. Please arrive 15 mins early. - MediCore Hospital`;
  return sendSMS(phone, message);
};
