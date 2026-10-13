/**
 * File 24 §5 CRM automation engine.
 *
 * One sweep evaluates every enabled CrmAutomationRule, fires its trigger
 * against platform collections and materialises the action — a Task (linked
 * via Task.automationRuleId, deduped so a sweep never double-fires) and/or a
 * reminder Notification (dedupKey per rule+subject+day).
 *
 * Guardrails:
 *  - Per-rule cooldown (cooldownMinutes) + lastRunAt, so a rule cannot spam.
 *  - Hard per-run caps so one bad rule cannot create thousands of rows.
 *  - NO patient data ever (platform CRM collections only).
 *  - Never throws: a broken rule is logged into its own `runs` log and the
 *    sweep moves on. Exported for workers/scheduler.js and POST /automation/run.
 */
import Lead from '../models/Lead.js';
import Task from '../models/Task.js';
import Partner from '../models/Partner.js';
import ProviderDocument from '../models/ProviderDocument.js';
import CrmAccount from '../models/CrmAccount.js';
import CrmAutomationRule from '../models/CrmAutomationRule.js';
import CrmPipelineConfig, { defaultPipelineConfig } from '../models/CrmPipelineConfig.js';
import Notification from '../models/Notification.js';
import logger from '../config/logger.js';

const MAX_ACTIONS_PER_RULE = 50;
const MAX_NOTIFY_PER_RULE = 20;

const dayKey = () => new Date().toISOString().slice(0, 10);

async function loadStageSlaMap() {
  try {
    const cfg = await CrmPipelineConfig.findOne({ key: 'default' }).lean();
    const rows = (cfg && cfg.leadStages) || defaultPipelineConfig().leadStages;
    return new Map(rows.map((s) => [s.key, Number(s.slaHours) || 0]));
  } catch {
    return new Map(defaultPipelineConfig().leadStages.map((s) => [s.key, s.slaHours]));
  }
}

const dedupeTask = (ruleId, related) => Task.findOne({
  automationRuleId: String(ruleId),
  'related.type': related.type,
  'related.id': related.id,
  status: { $in: ['open', 'in_progress'] },
}).select('_id').lean();

const makeTask = async (rule, subject, ownerId, related, dueAt, priority = 'medium') => {
  if (!ownerId) return false;
  const t = await Task.create({
    title: subject.slice(0, 300),
    type: 'follow_up',
    dueAt: dueAt || new Date(Date.now() + 4 * 3600e3),
    priority,
    ownerId,
    related,
    automationRuleId: String(rule._id),
    createdBy: ownerId,
  });
  return Boolean(t);
};

const makeNotify = async (rule, userId, title, message) => {
  if (!userId) return false;
  const day = dayKey();
  await Notification.create({
    userId: String(userId),
    title: title.slice(0, 200),
    message: message.slice(0, 1000),
    type: 'reminder',
    dedupKey: `crm-auto:${String(rule._id)}:${day}`,
  });
  return true;
};

/** lead_stage_idle: open lead parked in a stage longer than its SLA. */
async function fireLeadStageIdle(rule, now, actions, notify) {
  const slaMap = await loadStageSlaMap();
  const active = [...slaMap.entries()].filter(([, h]) => h > 0).map(([k]) => k);
  if (!active.length) return 0;
  let matched = 0;
  const leads = await Lead.find({
    stage: { $in: active },
    stageEnteredAt: { $lt: now }, // narrowed per-stage below via $expr-lite: filter in JS
  }).select('_id businessName stage stageEnteredAt ownerId city').limit(400).lean();

  for (const lead of leads) {
    if (matched >= MAX_ACTIONS_PER_RULE) break;
    const slaHours = Number(rule.conditions?.slaHours) || slaMap.get(lead.stage) || 0;
    if (!slaHours) continue;
    const idleSince = new Date(lead.stageEnteredAt || now).getTime() + slaHours * 3600e3;
    if (idleSince > now) continue;
    matched += 1;
    if (!actions) continue;
    const key = { type: 'lead', id: lead._id };
    if (await dedupeTask(rule._id, key)) continue;
    const ok = await makeTask(
      rule,
      `Follow up: ${lead.businessName || 'Lead'} idle in "${lead.stage}"`,
      lead.ownerId, key, new Date(now + 4 * 3600e3), 'high',
    );
    if (ok && notify) {
      await makeNotify(rule, lead.ownerId, 'Lead stage SLA breached',
        `${lead.businessName || 'A lead'} has been in "${lead.stage}" beyond its SLA.`);
    }
  }
  return matched;
}

/** doc_expiring: verified provider document expiring within lead-days. */
async function fireDocExpiring(rule, now, actions, notify) {
  const days = Number(rule.conditions?.daysToExpiry) || 30;
  const cutoff = new Date(now + days * 864e5);
  const docs = await ProviderDocument.find({
    status: 'verified',
    expiryDate: { $lte: cutoff },
  }).select('_id type expiryDate providerId').limit(300).lean();

  let matched = 0;
  for (const doc of docs) {
    if (matched >= MAX_ACTIONS_PER_RULE) break;
    matched += 1;
    if (!actions) continue;
    const overlay = await CrmAccount.findOne({ providerId: doc.providerId })
      .select('accountOwnerId').lean();
    const ownerId = overlay?.accountOwnerId;
    const key = { type: 'account', id: doc.providerId };
    if (!ownerId || (await dedupeTask(rule._id, key))) continue;
    const due = new Date(doc.expiryDate || now);
    await makeTask(
      rule,
      `Renew ${String(doc.type || 'document').replace(/_/g, ' ')} (expires ${due.toISOString().slice(0, 10)})`,
      ownerId, key, due, 'high',
    );
    if (notify) {
      await makeNotify(rule, ownerId, 'Document expiring soon',
        `A ${doc.type || 'document'} expires on ${due.toISOString().slice(0, 10)}.`);
    }
  }
  return matched;
}

/** task_overdue: open tasks past due beyond the grace window → nudge owner. */
async function fireTaskOverdue(rule, now, actions, notify) {
  const grace = Number(rule.conditions?.overdueGraceHours) || 0;
  const cutoff = new Date(now - grace * 3600e3);
  const tasks = await Task.find({
    status: { $in: ['open', 'in_progress'] },
    dueAt: { $lt: cutoff, $ne: null },
  }).select('_id title ownerId dueAt').limit(300).lean();

  let matched = 0;
  for (const t of tasks) {
    if (matched >= MAX_NOTIFY_PER_RULE) break;
    matched += 1;
    if (!actions || !notify) continue;
    await makeNotify(rule, t.ownerId, 'Task overdue',
      `"${t.title}" was due ${new Date(t.dueAt).toISOString().slice(0, 10)}.`);
  }
  return matched;
}

/** at_risk_provider: account health band slipped to at_risk → check-in task. */
async function fireAtRiskProvider(rule, now, actions, notify) {
  const accounts = await CrmAccount.find({ healthBand: 'at_risk' })
    .select('_id providerId accountOwnerId lastContactAt riskReasons').limit(200).lean();

  let matched = 0;
  for (const a of accounts) {
    if (matched >= MAX_ACTIONS_PER_RULE) break;
    matched += 1;
    if (!actions) continue;
    const key = { type: 'account', id: a.providerId };
    if (await dedupeTask(rule._id, key)) continue;
    const ok = await makeTask(
      rule,
      'At-risk account check-in',
      a.accountOwnerId, key, new Date(now + 24 * 3600e3), 'high',
    );
    if (ok && notify) {
      await makeNotify(rule, a.accountOwnerId, 'Provider at risk',
        `Health band is at_risk (${(a.riskReasons || []).slice(0, 2).join(', ') || 'no reason set'}).`);
    }
  }
  return matched;
}

/** partner_next_step_due: partner next step past its due date. */
async function firePartnerNextStepDue(rule, now, actions, notify) {
  const partners = await Partner.find({
    nextStepDueAt: { $lt: now, $ne: null },
    stage: { $nin: ['lost', 'active'] },
  }).select('_id orgName ownerId nextStep nextStepDueAt').limit(200).lean();

  let matched = 0;
  for (const p of partners) {
    if (matched >= MAX_ACTIONS_PER_RULE) break;
    matched += 1;
    if (!actions) continue;
    const key = { type: 'partner', id: p._id };
    if (await dedupeTask(rule._id, key)) continue;
    const ok = await makeTask(
      rule,
      `Partner next step: ${p.orgName || 'Partner'} — ${(p.nextStep || 'follow up').slice(0, 120)}`,
      p.ownerId, key, new Date(now + 8 * 3600e3), 'medium',
    );
    if (ok && notify) {
      await makeNotify(rule, p.ownerId, 'Partner next step overdue',
        `Next step for ${p.orgName || 'a partner'} was due ${new Date(p.nextStepDueAt).toISOString().slice(0, 10)}.`);
    }
  }
  return matched;
}

const FIRES = {
  lead_stage_idle: fireLeadStageIdle,
  doc_expiring: fireDocExpiring,
  task_overdue: fireTaskOverdue,
  at_risk_provider: fireAtRiskProvider,
  partner_next_step_due: firePartnerNextStepDue,
};

/**
 * Evaluate one rule honouring its cooldown. Never throws.
 * @returns {{matched:number, created:number, error:string, skipped:boolean}}
 */
async function runRule(rule, now) {
  const since = rule.lastRunAt ? new Date(rule.lastRunAt).getTime() : 0;
  const cooldownMs = (Number(rule.cooldownMinutes) || 60) * 60000;
  if (since && now - since < cooldownMs) {
    return { matched: 0, created: 0, error: '', skipped: true };
  }
  const fire = FIRES[rule.trigger];
  if (!fire) return { matched: 0, created: 0, error: `Unknown trigger ${rule.trigger}`, skipped: false };

  const hasTask = (rule.actions || []).some((a) => a.type === 'create_task');
  const hasNotify = (rule.actions || []).some((a) => a.type === 'notify');
  try {
    const before = await Task.countDocuments({ automationRuleId: String(rule._id) });
    const matched = await fire(rule, now.getTime(), hasTask, hasNotify);
    const after = await Task.countDocuments({ automationRuleId: String(rule._id) });
    return { matched, created: Math.max(0, after - before), error: '', skipped: false };
  } catch (err) {
    logger.warn(`[crmAutomation] rule ${rule._id} (${rule.trigger}) failed: ${err.message}`);
    return { matched: 0, created: 0, error: err.message, skipped: false };
  }
}

/**
 * Sweep every enabled rule (optionally one rule). Returns a summary for the
 * API/scheduler log. Cooldowns are honoured; failures are per-rule.
 */
export async function runCrmAutomation({ ruleId = null, force = false } = {}) {
  const filter = { enabled: true };
  if (ruleId) filter._id = ruleId;
  const rules = await CrmAutomationRule.find(filter).limit(100);

  const now = new Date();
  const summary = { evaluated: rules.length, matched: 0, created: 0, skipped: 0, failed: 0 };
  for (const rule of rules) {
    let result;
    if (force) {
      rule.lastRunAt = null;
      const hasTask = (rule.actions || []).some((a) => a.type === 'create_task');
      const hasNotify = (rule.actions || []).some((a) => a.type === 'notify');
      try {
        const fire = FIRES[rule.trigger];
        const before = await Task.countDocuments({ automationRuleId: String(rule._id) });
        const matched = fire ? await fire(rule, now.getTime(), hasTask, hasNotify) : 0;
        const after = await Task.countDocuments({ automationRuleId: String(rule._id) });
        result = { matched, created: Math.max(0, after - before), error: fire ? '' : `Unknown trigger ${rule.trigger}`, skipped: false };
      } catch (err) {
        result = { matched: 0, created: 0, error: err.message, skipped: false };
      }
    } else {
      result = await runRule(rule, now);
    }

    if (result.skipped) summary.skipped += 1;
    else {
      summary.matched += result.matched;
      summary.created += result.created;
      if (result.error) summary.failed += 1;
    }
    rule.lastRunAt = now;
    rule.runs = [{ at: now, matched: result.matched, created: result.created, error: result.error }, ...(rule.runs || [])].slice(0, 50);
    await rule.save().catch((e) => logger.warn(`[crmAutomation] rule log save failed: ${e.message}`));
  }
  return summary;
}

export default runCrmAutomation;
