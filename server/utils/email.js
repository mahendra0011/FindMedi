import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  // Check for environment variables
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
    console.warn('⚠️  SMTP credentials not configured. Email sending disabled.');
    return null;
  }

  transporter = nodemailer.createTransport({
    host: smtpHost,
    port: parseInt(smtpPort),
    secure: parseInt(smtpPort) === 465, // true for 465, false for other ports
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  console.log('✅ Email transporter configured');
  return transporter;
}

export async function sendEmail({ to, subject, html, text }) {
  const transporter = getTransporter();
  if (!transporter) {
    console.log('📧 Email (mock):', { to, subject, text });
    return { success: true, mocked: true };
  }

  try {
    const info = await transporter.sendMail({
      from: `MediCore Hospital <${process.env.SMTP_USER}>`,
      to,
      subject,
      text,
      html,
    });
    console.log('📧 Email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Email send error:', error.message);
    return { success: false, error: error.message };
  }
}

export function generateVerificationToken() {
  return require('crypto').randomBytes(32).toString('hex');
}

export function getVerificationLink(token, baseUrl = '') {
  // If baseUrl not provided, try to detect from environment
  const frontendUrl = baseUrl || process.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:8080';
  return `${frontendUrl}/verify-email?token=${token}`;
}
