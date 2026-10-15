/**
 * File 18 §18.1 + Phase-1 WhatsApp/sms automation: the campaign DISPATCH
 * engine. contactCenter.js already lets operators create campaigns and flip
 * their state, but flipping `running` sent nothing — this closes that gap.
 *
 * Consent chain (every send must pass ALL of these):
 *  1. campaign.consentChecked (operator attests the audience consented);
 *  2. per-recipient DND: DndEntry for (hospitalId, phone) on this channel
 *     or 'all' suppresses that recipient (skipped, counted separately);
 *  3. provider-approved template binding at dispatch time: the DLT template
 *     id (sms/whatsapp in India) comes from the dispatch call, never from
 *     stored text, and lintTemplate must report zero errors.
 *
 * Scale note: this runs inline, capped at MAX_RECIPIENTS. Larger blasts stay
 * on the job queue (Bull `notifications` queue) — a future turn wires the
 * same per-recipient core into a worker.
 */
import OutboundCampaign from '../models/OutboundCampaign.js';
import User from '../models/User.js';
import DndEntry from '../models/DndEntry.js';
import { sendSms, sendWhatsApp } from './notificationService.js';
import { lintTemplate, renderTemplate } from '../lib/notifyTemplates.js';
import { auditLog } from '../middleware/audit.js';
import logger from '../config/logger.js';

export const MAX_RECIPIENTS = 1000;

const coded = (code, message, status = 409) => {
  const err = new Error(message);
  err.code = code;
  err.status = status;
  return err;
};

const digits = (raw) => String(raw || '').replace(/[^0-9]/g, '');

const recipientNameOf = (user) => (
  user?.name || user?.patientName || user?.fullName || 'Customer'
);

export async function dispatchCampaign(campaignId, { actorId, ip, dltTemplateId, templateName } = {}) {
  const campaign = await OutboundCampaign.findById(campaignId);
  if (!campaign) throw coded('CAMPAIGN_NOT_FOUND', 'Campaign not found', 404);
  if (!['draft', 'paused'].includes(campaign.status)) {
    throw coded('BAD_STATE', `Only draft/paused campaigns can dispatch (current: ${campaign.status})`);
  }
  if (!campaign.consentChecked) {
    throw coded('CONSENT_REQUIRED', 'Audience consent attestation required before dispatch');
  }
  if (!['sms', 'whatsapp'].includes(campaign.channel)) {
    throw coded('BAD_CHANNEL', `Dispatch supports sms/whatsapp (campaign: ${campaign.channel})`, 400);
  }
  if (!dltTemplateId) {
    throw coded('DLT_REQUIRED', 'Provider-approved DLT template id is required to send', 400);
  }

  const body = String(campaign.template || '');
  if (!body.trim()) throw coded('EMPTY_TEMPLATE', 'Campaign has no template text', 400);
  // Lint first: unknown/empty variables fail LOUD before a single send.
  const lint = lintTemplate({ body, variables: extractAllowed(body), channel: campaign.channel, dltTemplateId });
  if (lint.errors.length) {
    throw coded('TEMPLATE_INVALID', `Template blocked: ${lint.errors.join('; ')}`, 400);
  }

  const userIds = [...new Set((campaign.audience?.userIds || []).map(String))];
  if (!userIds.length) throw coded('NO_AUDIENCE', 'Campaign audience is empty', 400);
  if (userIds.length > MAX_RECIPIENTS) {
    throw coded('AUDIENCE_TOO_LARGE', `Audience capped at ${MAX_RECIPIENTS} per dispatch`, 400);
  }

  campaign.status = 'running';
  campaign.stats = { ...(campaign.stats || {}), queued: userIds.length };
  await campaign.save();

  let sent = 0;
  let failed = 0;
  let skipped = 0;
  const errors = [];
  for (const uid of userIds) {
    try {
      const user = await User.findById(uid).lean();
      const phone = digits(user?.phone);
      if (!user || phone.length < 10) {
        failed += 1;
        errors.push({ userId: uid, reason: 'no reachable phone' });
        continue;
      }
      const dnd = await DndEntry.findOne({
        hospitalId: campaign.hospitalId,
        phone,
        channel: { $in: [campaign.channel, 'all'] },
      }).lean();
      if (dnd) {
        skipped += 1;
        continue;
      }
      const values = {
        patientName: recipientNameOf(user),
        name: recipientNameOf(user),
        phone,
      };
      const text = renderTemplate(body, values, lint.variables);
      const result = campaign.channel === 'whatsapp'
        ? await sendWhatsApp({ to: phone, text, templateName, variables: values })
        : await sendSms({ to: phone, text, templateId: dltTemplateId });
      if (result?.success) sent += 1;
      else {
        failed += 1;
        errors.push({ userId: uid, reason: result?.error || 'send failed' });
      }
    } catch (err) {
      failed += 1;
      errors.push({ userId: uid, reason: err.message });
      logger.error(`[campaign] recipient ${uid} failed: ${err.message}`);
    }
  }

  campaign.status = 'done';
  campaign.stats = { ...(campaign.stats || {}), queued: userIds.length, sent, failed };
  await campaign.save();
  await auditLog('campaign_dispatched', actorId, {
    campaignId: String(campaign._id),
    channel: campaign.channel,
    queued: userIds.length,
    sent,
    failed,
    skipped,
    ip,
  });
  return { id: String(campaign._id), status: campaign.status, queued: userIds.length, sent, failed, skipped };
}

// Allowlist for lint = exactly the variables the template declares. Anything
// the template references is therefore "known"; renderTemplate then enforces
// that every one of them has a value for each recipient.
function extractAllowed(body) {
  const rx = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g;
  const out = new Set();
  let m;
  while ((m = rx.exec(body || '')) !== null) out.add(m[1]);
  return [...out];
}
