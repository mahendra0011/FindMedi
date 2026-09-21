import { BREVO_API_KEY, BREVO_SENDER_EMAIL, BREVO_SENDER_NAME } from "../config/env.js";

/**
 * Send a transactional email via Brevo (Sendinblue) API.
 * @param {Object} options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.htmlContent - HTML body
 * @param {string} [options.textContent] - Plain text fallback
 * @returns {Promise<Object>}
 */
export async function sendBrevoEmail({ to, subject, htmlContent, textContent = "" }) {
  if (!BREVO_API_KEY || BREVO_API_KEY === "your_brevo_api_key_here") {
    console.warn("[emailService] BREVO_API_KEY not configured. Skipping email send.");
    return { skipped: true, reason: "API key not configured" };
  }

  const payload = {
    sender: { email: BREVO_SENDER_EMAIL, name: BREVO_SENDER_NAME },
    to: [{ email: to }],
    subject,
    htmlContent,
    textContent: textContent || subject,
  };

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": BREVO_API_KEY,
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(`Brevo email send failed (${response.status}): ${errorBody}`);
  }

  return response.json();
}

/**
 * Send OTP verification email via Brevo.
 * @param {string} email - Recipient email
 * @param {string} otpCode - 6-digit OTP
 * @param {string} userName - User's name
 */
export async function sendOtpEmail(email, otpCode, userName = "User") {
  const subject = "Your MindSupport OTP Verification Code";
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f4f6fb; margin: 0; padding: 0; }
    .container { max-width: 480px; margin: 30px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 8px 32px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #4f7cff 0%, #8b5cf6 100%); padding: 28px 24px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 22px; font-weight: 600; }
    .body { padding: 28px 24px; }
    .otp-box { background: #f0f4ff; border: 2px dashed #4f7cff; border-radius: 12px; padding: 20px; text-align: center; margin: 20px 0; }
    .otp-code { font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #4f7cff; font-family: 'Courier New', monospace; }
    .info { color: #6b7280; font-size: 14px; line-height: 1.6; margin: 16px 0; }
    .footer { text-align: center; padding: 20px 24px; border-top: 1px solid #e5e7eb; color: #9ca3af; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔐 MindSupport Verification</h1>
    </div>
    <div class="body">
      <p style="font-size: 16px; color: #374151;">Hi <strong>${userName}</strong>,</p>
      <p class="info">Use the OTP below to verify your email address. This code expires in <strong>10 minutes</strong>.</p>
      <div class="otp-box">
        <div class="otp-code">${otpCode}</div>
      </div>
      <p class="info">If you didn't request this, you can safely ignore this email.</p>
      <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">
        Warm regards,<br/>
        <strong>MindSupport Team</strong>
      </p>
    </div>
    <div class="footer">
      <p>MindSupport — Your mental wellness companion</p>
      <p>This is an automated message, please do not reply.</p>
    </div>
  </div>
</body>
</html>`;

  return sendBrevoEmail({ to: email, subject, htmlContent });
}

/**
 * Send welcome email after successful registration.
 * @param {string} email - Recipient email
 * @param {string} userName - User's name
 */
export async function sendWelcomeEmail(email, userName = "User") {
  const subject = "Welcome to MindSupport!";
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f4f6fb; margin: 0; padding: 0; }
    .container { max-width: 480px; margin: 30px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 8px 32px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #4f7cff 0%, #8b5cf6 100%); padding: 28px 24px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 22px; font-weight: 600; }
    .body { padding: 28px 24px; }
    .info { color: #6b7280; font-size: 14px; line-height: 1.6; margin: 16px 0; }
    .footer { text-align: center; padding: 20px 24px; border-top: 1px solid #e5e7eb; color: #9ca3af; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Welcome to MindSupport!</h1>
    </div>
    <div class="body">
      <p style="font-size: 16px; color: #374151;">Hi <strong>${userName}</strong>,</p>
      <p class="info">
        Thank you for joining MindSupport! We're here to help you on your mental wellness journey.
      </p>
      <p class="info">
        You can now book counselling sessions, track your mood, journal privately, and connect with peer support.
      </p>
      <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">
        Warm regards,<br/>
        <strong>MindSupport Team</strong>
      </p>
    </div>
    <div class="footer">
      <p>MindSupport — Your mental wellness companion</p>
      <p>This is an automated message, please do not reply.</p>
    </div>
  </div>
</body>
</html>`;

  return sendBrevoEmail({ to: email, subject, htmlContent });
}