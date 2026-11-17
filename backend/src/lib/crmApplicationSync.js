/**
 * File 24 §4.12/§4.13 — CRM "event sync" for the supply pipeline.
 *
 * ProviderApplications are the strongest demand-signal the supply CRM has
 * (an organisation literally filled the join wizard), but before this sweep
 * they sat in the join queue with no CRM counterpart. The hourly CRM
 * automation sweep calls this: it upserts a Lead per submitted application,
 * keyed by `linkedApplicationId` (bounded, indexed) with a dedupeKey
 * (name|city|pincode) fallback so a field-sourced lead that existed before
 * the self-serve submission is linked rather than duplicated.
 *
 * Deliberately stage-ADVANCING only: a lead never gets pushed backwards by
 * this job, and a rejected application moves the lead to `churned` with the
 * rejection reason. `activated` is derived from `application.providerId`,
 * the one authoritative activation marker the join flow sets.
 */
import ProviderApplication from '../models/ProviderApplication.js';
import Lead, { LEAD_STAGES_LIST } from '../models/Lead.js';
import { flattenStepData } from './applicationToProvider.js';
import logger from '../config/logger.js';

const NAME_KEYS = [
  'display_name', 'business_name', 'facility_name', 'clinic_name', 'studio_name',
  'centre_name', 'center_name', 'legal_name', 'name',
];
const CITY_KEYS = ['city', 'district'];
const PINCODE_KEYS = ['pincode', 'pin_code', 'zip', 'postal_code'];

const pick = (leaves, keys) => {
  for (const key of keys) {
    const value = leaves.get(key);
    if (value === null || value === undefined || Array.isArray(value)) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return '';
};

const STAGE_BY_STATUS = {
  submitted: 'application_submitted',
  resubmitted: 'application_submitted',
  under_review: 'under_review',
  needs_info: 'under_review',
  approved: 'approved',
  rejected: 'churned',
};

const stageIndex = (stage) => {
  const i = LEAD_STAGES_LIST.indexOf(stage);
  return i === -1 ? 0 : i;
};

export async function syncCrmFromApplications({ limit = 300, now = new Date() } = {}) {
  const since = new Date(now.getTime() - 45 * 86400_000);
  const apps = await ProviderApplication.find({
    status: { $nin: ['draft'] },
    $or: [
      { submittedAt: { $gte: since } },
      { providerId: { $ne: null }, updatedAt: { $gte: since } },
      { decidedAt: { $gte: since } },
    ],
  }).sort({ submittedAt: -1 }).limit(limit).lean();

  let created = 0, updated = 0, linked = 0, skipped = 0;
  for (const app of apps) {
    try {
      const leaves = flattenStepData(app?.draft?.stepData || {});
      const businessName = (pick(leaves, NAME_KEYS) || String(app?.typeKey || 'Provider')).trim().slice(0, 200);
      const city = pick(leaves, CITY_KEYS).slice(0, 80).toLowerCase();
      const pincode = pick(leaves, PINCODE_KEYS).slice(0, 10);
      const dedupeKey = `${businessName.toLowerCase()}|${city}|${pincode}`;
      const wantedStage = app?.providerId
        ? 'activated'
        : (app?.status === 'rejected' ? 'churned' : STAGE_BY_STATUS[app?.status] || 'application_submitted');

      let lead = await Lead.findOne({ linkedApplicationId: app._id });
      if (!lead) {
        // Link a pre-existing (usually field-sourced) lead instead of duplicating it.
        lead = await Lead.findOne({
          dedupeKey,
          $or: [{ linkedApplicationId: null }, { linkedApplicationId: { $exists: false } }],
        });
        if (lead) {
          lead.linkedApplicationId = app._id;
          linked += 1;
        }
      }

      if (!lead) {
        lead = new Lead({
          businessName,
          typeKey: String(app?.typeKey || '').slice(0, 60),
          city,
          pincode,
          source: 'inbound',
          stage: wantedStage,
          linkedApplicationId: app._id,
          linkedProviderId: app.providerId ?? null,
          dedupeKey,
          nextAction: { type: 'review_application', dueAt: null },
        });
        if (app?.status === 'rejected') lead.lostReason = String(app?.rejectionReason || 'application rejected').slice(0, 500);
        await lead.save();
        created += 1;
        continue;
      }

      // Advancing-only: never push an existing lead backwards, and a rejected
      // application always lands in churned with the reason attached.
      if (app?.status === 'rejected') {
        lead.stage = 'churned';
        lead.lostReason = String(app?.rejectionReason || lead.lostReason || 'application rejected').slice(0, 500);
      } else if (stageIndex(wantedStage) >= stageIndex(lead.stage)) {
        lead.stage = wantedStage;
      }
      if (app?.providerId) lead.linkedProviderId = app.providerId;
      if (!lead.pincode && pincode) lead.pincode = pincode;
      await lead.save();
      updated += 1;
    } catch (err) {
      skipped += 1;
      logger.warn(`[crmApplicationSync] application ${app?._id}: ${err.message}`);
    }
  }
  return { scanned: apps.length, created, updated, linked, skipped };
}
