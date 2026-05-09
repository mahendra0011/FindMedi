import nodemailer from 'nodemailer';

let transporter = null;

const getTransporter = () => {
  if (transporter) return transporter;
   
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('⚠️ SMTP not configured. Email features will be simulated.');
    return null;
  }
   
  console.log('🔧 Creating SMTP transporter with:', {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    user: process.env.SMTP_USER,
    from: process.env.SMTP_FROM
  });

  const port = parseInt(process.env.SMTP_PORT, 10) || 587;
  const secure = port === 465;

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port,
    secure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    // Add connection timeout to prevent hanging
    connectionTimeout: 10000, // 10 seconds
    // Add greeting timeout
    greetingTimeout: 10000, // 10 seconds
    // Add socket timeout
    socketTimeout: 20000, // 20 seconds
  });
   
  transporter.verify((error, success) => {
    if (error) {
      console.error('❌ SMTP verification error:', error.message);
      console.error('❌ SMTP error code:', error.code);
    } else {
      console.log('✅ SMTP connection verified');
    }
  });

  return transporter;
};

export const sendEmail = async ({ to, subject, text, html, attachments }) => {
  const transporter = getTransporter();
   
  if (!transporter) {
    console.log(`📧 Email (simulated): ${to} - ${subject}`);
    return { success: true, simulated: true, message: 'Email simulated (SMTP not configured)' };
  }

  try {
    const mailOptions = {
      // Defaulting to SMTP user avoids domain mismatch rejections by many providers.
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject,
      text,
      html,
      attachments,
    };
    
    // Add timeout to the sendMail operation
    const info = await Promise.race([
      transporter.sendMail(mailOptions),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Email sending timeout')), 30000)) // 30 seconds
    ]);
    
    console.log(`✅ Email sent: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Email send error:', error.message);
    console.error('❌ Error details:', error);
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
  
  return sendEmail({
    to: patient.email,
    subject,
    text,
    html,
    attachments: [{
      filename: 'prescription.pdf',
      content: pdfBuffer,
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

export const sendSMS = async (phone, message) => {
  console.log(`SMS to ${phone}: ${message}`);
  return { success: true, message: 'SMS simulated (integrate with Twilio/Africastalking)' };
};

export const sendAppointmentReminderSMS = async (phone, patientName, doctorName, date, time) => {
  const message = `Dear ${patientName}, reminder for your appointment with Dr. ${doctorName} on ${date} at ${time}. Please arrive 15 mins early. - MediCore Hospital`;
  return sendSMS(phone, message);
};

