/**
 * Wave 3 — SMS Provider (Msg91 wrapper with graceful fallback).
 *
 * Ground rules:
 * - Silent skip + receipt status: 'skipped' if MSG91_AUTH_KEY is not configured (demo mode).
 * - Format: sendSms({ to, text, templateId, notificationId }) => receipt / { messageId, status }
 */
import logger from '../config/logger.js';

export const sendSms = async ({ to, text, templateId, notificationId }) => {
  const authKey = process.env.MSG91_AUTH_KEY;
  const senderId = process.env.MSG91_SENDER_ID || 'FNDMED';
  const defaultTemplateId = process.env.MSG91_TEMPLATE_ID;

  if (!authKey) {
    logger.info(`[SMS] Provider unconfigured. Skipped sending to ${to}: ${text?.substring(0, 40)}...`);
    return {
      success: true,
      status: 'skipped',
      messageId: `sim-sms-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      simulated: true,
      reason: 'MSG91_AUTH_KEY not configured',
    };
  }

  // Normalize phone number (strip whitespace, ensure digits)
  const cleanTo = String(to).replace(/[^0-9+]/g, '');

  try {
    const payload = {
      template_id: templateId || defaultTemplateId,
      short_url: '0',
      recipients: [
        {
          mobiles: cleanTo.startsWith('+') ? cleanTo.slice(1) : cleanTo,
          message: text,
        },
      ],
    };

    const response = await fetch('https://control.msg91.com/api/v5/flow/', {
      method: 'POST',
      headers: {
        'authkey': authKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || data.type === 'error') {
      const err = new Error(data.message || `Msg91 API error: ${response.status}`);
      err.status = response.status;
      throw err;
    }

    const messageId = data.message || `msg91-${Date.now()}`;
    logger.info(`[SMS] Sent to ${cleanTo}: ${messageId}`);
    return { success: true, status: 'sent', messageId };
  } catch (error) {
    logger.error(`[SMS] Failed to send to ${to}: ${error.message}`);
    throw error;
  }
};

export default { sendSms };
