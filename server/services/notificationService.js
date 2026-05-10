const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL || 'mahendrapra0077@gmail.com';
const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

export const sendEmail = async ({ to, subject, text, html, attachments }) => {
  if (!BREVO_API_KEY) {
    console.log(`📧 Email (simulated): ${to} - ${subject}`);
    return { success: true, simulated: true, message: 'Email simulated (Brevo not configured)' };
  }

  try {
    if (!html && !text) {
      return {
        success: false,
        error: 'Email requires either html or text content before sending to Brevo',
      };
    }

    const payload = {
      sender: { email: BREVO_SENDER_EMAIL, name: 'MediCore Hospital' },
      to: [{ email: to }],
      subject,
      textContent: text,
      htmlContent: html,
    };

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
        'accept': 'application/json',
        'api-key': BREVO_API_KEY,
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Brevo API error: ${response.status} - ${error}`);
    }

    const result = await response.json();
    console.log(`✅ Email sent to ${to}: ${result.messageId}`);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('❌ Email send error:', error.message);
    return { success: false, error: error.message };
  }
};

export const sendAppointmentReminder = async (appointment) => {
  const { patient, doctor, date, time } = appointment;
  
  const subject = 'Appointment Reminder - MediCore Hospital';
  const text = `Dear ${patient.name},\n\nThis is a reminder for your appointment with Dr. ${doctor.name} on ${date} at ${time}.\n\nPlease arrive 15 minutes early.\n\nThank you,\nMediCore Hospital`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Appointment Reminder</h2>
      <p>Dear <strong>${patient.name}</strong>,</p>
      <p>This is a reminder for your upcoming appointment:</p>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr>
          <td style="padding: 10px; border: 1px solid #ddd;"><strong>Doctor</strong></td>
          <td style="padding: 10px; border: 1px solid #ddd;">Dr. ${doctor.name}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #ddd;"><strong>Date</strong></td>
          <td style="padding: 10px; border: 1px solid #ddd;">${date}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #ddd;"><strong>Time</strong></td>
          <td style="padding: 10px; border: 1px solid #ddd;">${time}</td>
        </tr>
      </table>
      <p>Please arrive 15 minutes early.</p>
      <p>Thank you,<br>MediCore Hospital</p>
    </div>
  `;
  
  return sendEmail({ to: patient.email, subject, text, html });
};

export const sendPrescriptionEmail = async (patient, prescription, pdfBuffer) => {
  const subject = 'Your Prescription - MediCore Hospital';
  const text = `Dear ${patient.name},\n\nPlease find attached your prescription from Dr. ${prescription.doctorName}.\n\nThank you,\nMediCore Hospital`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Prescription</h2>
      <p>Dear <strong>${patient.name}</strong>,</p>
      <p>Please find attached your prescription from Dr. ${prescription.doctorName}.</p>
      <p>Thank you,<br>MediCore Hospital</p>
    </div>
  `;
  
  const base64Content = pdfBuffer.toString('base64');
  
  return sendEmail({
    to: patient.email,
    subject,
    text,
    html,
    attachments: [{
      filename: 'prescription.pdf',
      content: base64Content,
      contentType: 'application/pdf',
    }],
  });
};

export const sendLabReportEmail = async (patient, report, pdfBuffer) => {
  const subject = 'Your Lab Report - MediCore Hospital';
  const text = `Dear ${patient.name},\n\nPlease find attached your lab report${report.reportId ? ` (Report ID: ${report.reportId})` : ''}.\n\nThank you,\nMediCore Hospital`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Lab Report</h2>
      <p>Dear <strong>${patient.name}</strong>,</p>
      <p>Please find attached your lab report.</p>
      ${report.reportId ? `<p><strong>Report ID:</strong> ${report.reportId}</p>` : ''}
      <p>Thank you,<br>MediCore Hospital</p>
    </div>
  `;

  return sendEmail({
    to: patient.email,
    subject,
    text,
    html,
    attachments: [{
      filename: `lab-report-${report.reportId || Date.now()}.pdf`,
      content: pdfBuffer.toString('base64'),
      contentType: 'application/pdf',
    }],
  });
};

export const sendDischargeSummaryEmail = async (patient, summary, pdfBuffer) => {
  const subject = 'Your Discharge Summary - MediCore Hospital';
  const text = `Dear ${patient.name},\n\nPlease find attached your discharge summary${summary.admissionId ? ` for admission ${summary.admissionId}` : ''}.\n\nThank you,\nMediCore Hospital`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Discharge Summary</h2>
      <p>Dear <strong>${patient.name}</strong>,</p>
      <p>Please find attached your discharge summary.</p>
      ${summary.admissionId ? `<p><strong>Admission ID:</strong> ${summary.admissionId}</p>` : ''}
      <p>Thank you,<br>MediCore Hospital</p>
    </div>
  `;

  return sendEmail({
    to: patient.email,
    subject,
    text,
    html,
    attachments: [{
      filename: `discharge-summary-${summary.admissionId || Date.now()}.pdf`,
      content: pdfBuffer.toString('base64'),
      contentType: 'application/pdf',
    }],
  });
};

export const sendLabResultAlert = async (patient, report) => {
  const subject = 'Lab Results Available - MediCore Hospital';
  const text = `Dear ${patient.name},\n\nYour lab results (Report ID: ${report.reportId}) are now available. Please log in to view or download them.\n\nThank you,\nMediCore Hospital`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Lab Results Available</h2>
      <p>Dear <strong>${patient.name}</strong>,</p>
      <p>Your lab results are now available.</p>
      <p><strong>Report ID:</strong> ${report.reportId}</p>
      <p>Please log in to view or download your results.</p>
      <p>Thank you,<br>MediCore Hospital</p>
    </div>
  `;
  
  return sendEmail({ to: patient.email, subject, text, html });
};

export const sendAccountVerifiedEmail = async (user) => {
  const dashboardLabel = user.role === 'admin'
    ? 'Admin Dashboard'
    : user.role === 'doctor'
      ? 'Doctor Dashboard'
      : 'Patient Dashboard';

  return sendEmail({
    to: user.email,
    subject: 'Your MediCore Email Is Verified',
    text: `Hi ${user.name}, your MediCore email has been verified. ${user.role === 'doctor' ? 'Your doctor account is now waiting for admin approval.' : `You can now access your ${dashboardLabel}.`}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Email Verified</h2>
        <p>Hi <strong>${user.name}</strong>,</p>
        <p>Your MediCore email has been verified successfully.</p>
        <p>${user.role === 'doctor' ? 'Your doctor account is now waiting for admin approval.' : `You can now access your <strong>${dashboardLabel}</strong>.`}</p>
        <p>Thank you,<br>MediCore Hospital</p>
      </div>
    `,
  });
};

export const sendDoctorPendingReviewEmail = async (doctorUser) => {
  return sendEmail({
    to: doctorUser.email,
    subject: 'MediCore Doctor Account Pending Approval',
    text: `Hi ${doctorUser.name}, your email is verified. Your doctor profile is pending admin approval.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Doctor Approval Pending</h2>
        <p>Hi <strong>${doctorUser.name}</strong>,</p>
        <p>Your email is verified. Your doctor profile is now waiting for admin review.</p>
        <p>You will receive an email when your account is approved.</p>
        <p>Thank you,<br>MediCore Hospital</p>
      </div>
    `,
  });
};

export const sendDoctorApprovalEmail = async (doctorUser) => {
  return sendEmail({
    to: doctorUser.email,
    subject: 'Your MediCore Doctor Account Is Approved',
    text: `Hi ${doctorUser.name}, your doctor account has been approved. You can now login to your Doctor Dashboard.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Doctor Account Approved</h2>
        <p>Hi <strong>${doctorUser.name}</strong>,</p>
        <p>Your doctor account has been approved.</p>
        <p>You can now login and access your Doctor Dashboard.</p>
        <p>Thank you,<br>MediCore Hospital</p>
      </div>
    `,
  });
};

export const sendDoctorRejectionEmail = async (doctorUser) => {
  return sendEmail({
    to: doctorUser.email,
    subject: 'MediCore Doctor Account Review Update',
    text: `Hi ${doctorUser.name}, your doctor account was not approved. Please contact the hospital administrator for details.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Doctor Account Review Update</h2>
        <p>Hi <strong>${doctorUser.name}</strong>,</p>
        <p>Your doctor account was not approved at this time.</p>
        <p>Please contact the hospital administrator for details.</p>
        <p>Thank you,<br>MediCore Hospital</p>
      </div>
    `,
  });
};

export const sendAccountBlockedEmail = async (user) => {
  return sendEmail({
    to: user.email,
    subject: 'MediCore Account Access Blocked',
    text: `Hi ${user.name}, your MediCore account has been blocked. Please contact the administrator.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Account Blocked</h2>
        <p>Hi <strong>${user.name}</strong>,</p>
        <p>Your MediCore account has been blocked.</p>
        <p>Please contact the administrator if you believe this is a mistake.</p>
        <p>Thank you,<br>MediCore Hospital</p>
      </div>
    `,
  });
};

export const sendHostNotificationEmail = async ({ subject, text, html }) => {
  const hostEmail = process.env.HOST_NOTIFICATION_EMAIL || process.env.ADMIN_EMAIL || BREVO_SENDER_EMAIL;
  return sendEmail({
    to: hostEmail,
    subject,
    text,
    html: html || `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><p>${text}</p></div>`,
  });
};

export const sendPasswordChangedEmail = async (user) => {
  return sendEmail({
    to: user.email,
    subject: 'Your MediCore Password Was Updated',
    text: `Hi ${user.name}, your MediCore password was updated successfully. If this was not you, contact the administrator immediately.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Password Updated</h2>
        <p>Hi <strong>${user.name}</strong>,</p>
        <p>Your MediCore password was updated successfully.</p>
        <p>If this was not you, contact the administrator immediately.</p>
      </div>
    `,
  });
};

export const sendSMS = async (phone, message) => {
  console.log(`SMS to ${phone}: ${message}`);
  return { success: true, message: 'SMS simulated (integrate with Twilio/Africastalking)' };
};

export const sendAppointmentReminderSMS = async (phone, patientName, doctorName, date, time) => {
  const message = `Dear ${patientName}, reminder for your appointment with Dr. ${doctorName} on ${date} at ${time}. Please arrive 15 mins early. - MediCore Hospital`;
  return sendSMS(phone, message);
};
