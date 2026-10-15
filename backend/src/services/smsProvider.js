import crypto from 'node:crypto';
/**
 * Wave 3 — SMS Provider (Msg91 wrapper with graceful fallback).
 *
 * Ground rules:
 * - Silent skip + receipt status: 'skipped' if MSG91_AUTH_KEY is not configured (demo mode).
 * - Format: sendSms({ to, text, templateId, notificationId }) => receipt / { messageId, status }
 */
import logger from '../config/logger.js';

import { resolveDltTemplate, DLT_CONFIG } from '../config/dltTemplates.js';

export const sendSms = async ({ to, text, templateId, category, variables = {}, notificationId }) => {
  const authKey = process.env.MSG91_AUTH_KEY;
  const dlt = resolveDltTemplate(category, variables);
  const senderId = process.env.MSG91_SENDER_ID || DLT_CONFIG.senderId;
  const activeTemplateId = templateId || process.env.MSG91_TEMPLATE_ID || dlt.templateId;

  if (!authKey) {
    logger.info(`[SMS] Provider unconfigured. Skipped sending to ${to}: ${text?.substring(0, 40)}...`);
    return {
      success: true,
      status: 'skipped',
      messageId: `sim-sms-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
      simulated: true,
      reason: 'MSG91_AUTH_KEY not configured',
    };
  }

  // Normalize phone number (strip whitespace, ensure digits)
  const cleanTo = String(to).replace(/[^0-9+]/g, '');

  try {
    const payload = {
      template_id: activeTemplateId,
      sender: senderId,
      dlt_te_id: dlt.entityId,
      short_url: '0',
      recipients: [
        {
          mobiles: cleanTo.startsWith('+') ? cleanTo.slice(1) : cleanTo,
          message: text || dlt.formattedText,
          ...variables,
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
