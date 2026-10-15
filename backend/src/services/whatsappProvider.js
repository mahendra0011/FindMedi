import crypto from 'node:crypto';
/**
 * Wave 3 — WhatsApp Provider (Msg91 WhatsApp HSM wrapper with graceful fallback).
 *
 * Ground rules:
 * - Silent skip + receipt status: 'skipped' if MSG91_AUTH_KEY is not configured (demo mode).
 * - Format: sendWhatsApp({ to, text, templateName, variables, notificationId }) => { messageId, status }
 */
import logger from '../config/logger.js';

export const sendWhatsApp = async ({ to, text, templateName, variables = {}, notificationId }) => {
  const authKey = process.env.MSG91_AUTH_KEY;
  const integratedNumber = process.env.MSG91_INTEGRATED_NUMBER;
  const defaultTemplate = process.env.WHATSAPP_TEMPLATE_ID || 'appointment_reminder';

  if (!authKey) {
    logger.info(`[WhatsApp] Provider unconfigured. Skipped sending to ${to}: ${text?.substring(0, 40)}...`);
    return {
      success: true,
      status: 'skipped',
      messageId: `sim-wa-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
      simulated: true,
      reason: 'MSG91_AUTH_KEY not configured',
    };
  }

  const cleanTo = String(to).replace(/[^0-9]/g, '');

  try {
    const payload = {
      integrated_number: integratedNumber,
      content_type: 'template',
      payload: {
        to: cleanTo,
        type: 'template',
        template: {
          name: templateName || defaultTemplate,
          language: { code: 'en' },
          components: [
            {
              type: 'body',
              parameters: Object.entries(variables).map(([key, val]) => ({
                type: 'text',
                text: String(val),
              })),
            },
          ],
        },
      },
    };

    const response = await fetch('https://control.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/', {
      method: 'POST',
      headers: {
        'authkey': authKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || data.status === 'error') {
      const err = new Error(data.message || `Msg91 WhatsApp API error: ${response.status}`);
      err.status = response.status;
      throw err;
    }

    const messageId = data?.data?.[0]?.message_id || `msg91-wa-${Date.now()}`;
    logger.info(`[WhatsApp] Sent to ${cleanTo}: ${messageId}`);
    return { success: true, status: 'sent', messageId };
  } catch (error) {
    logger.error(`[WhatsApp] Failed to send to ${to}: ${error.message}`);
    throw error;
  }
};

export default { sendWhatsApp };
