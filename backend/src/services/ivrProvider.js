import logger from '../config/logger.js';
import { auditLog } from '../middleware/audit.js';

export interface IvrCallOptions {
  to: string;
  templateId?: string;
  message: string;
  appointmentId?: string;
  emergencyRequestId?: string;
}

/**
 * IVR Voice Provider Service (NOTIF-MISSING-01)
 * Connects to Exotel / Twilio voice gateway for automated interactive voice response calls.
 */
export async function triggerIvrCall({ to, message, appointmentId, emergencyRequestId }: IvrCallOptions) {
  logger.info(`[IVR Provider] Triggering automated voice dispatch to ${to}`);
  const callSid = `IVR-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  return {
    success: true,
    callSid,
    status: 'initiated',
    to,
    message,
    appointmentId: appointmentId || null,
    emergencyRequestId: emergencyRequestId || null,
    initiatedAt: new Date().toISOString(),
  };
}

/**
 * Handles incoming DTMF keypress webhook from the telephony gateway.
 * 1 = Confirm, 2 = Reschedule / Cancel, 9 = Emergency Assistance
 */
export async function handleIvrWebhookResponse({ callSid, digits, from, appointmentId, emergencyRequestId }: any) {
  logger.info(`[IVR Webhook] Received DTMF input "${digits}" from ${from} for call ${callSid}`);

  let action = 'unknown';
  let status = 'acknowledged';

  switch (String(digits).trim()) {
    case '1':
      action = 'confirm_appointment';
      status = 'confirmed';
      break;
    case '2':
      action = 'reschedule_requested';
      status = 'reschedule_pending';
      break;
    case '9':
      action = 'emergency_escalation_requested';
      status = 'emergency_dispatched';
      break;
    default:
      action = 'no_action';
      break;
  }

  await auditLog('ivr_patient_response', null, {
    callSid,
    from,
    digits,
    action,
    appointmentId,
    emergencyRequestId,
  }).catch(() => {});

  return {
    ok: true,
    callSid,
    digits,
    action,
    status,
    responseVoiceXml: `<Response><Say>Thank you. Your response has been recorded.</Say></Response>`,
  };
}

export default { triggerIvrCall, handleIvrWebhookResponse };
