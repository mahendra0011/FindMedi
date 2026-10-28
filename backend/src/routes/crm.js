import express from 'express';
import { z } from 'zod';
import Lead, { LEAD_STAGES_LIST } from '../models/Lead.js';
import Partner, { PARTNER_STAGES_LIST } from '../models/Partner.js';
import Activity from '../models/Activity.js';
import Task from '../models/Task.js';
import ProviderApplication from '../models/ProviderApplication.js';
import Provider from '../models/Provider.js';
import ProviderDocument from '../models/ProviderDocument.js';
import Dispute from '../models/Dispute.js';
import SupportTicket from '../models/SupportTicket.js';
import CrmAccount from '../models/CrmAccount.js';
import Territory from '../models/Territory.js';
import Visit from '../models/Visit.js';
import TeamMember from '../models/TeamMember.js';
import Objective from '../models/Objective.js';
import Campaign from '../models/Campaign.js';
import CrmPipelineConfig, { defaultPipelineConfig, LEAD_SOURCE_LIST } from '../models/CrmPipelineConfig.js';
import CrmAutomationRule, { CRM_AUTOMATION_TRIGGERS_LIST } from '../models/CrmAutomationRule.js';
import CrmPlaybook, { PLAYBOOK_CATEGORIES } from '../models/CrmPlaybook.js';
import { boundedShallow } from '../utils/validate.js';
import CrmProject from '../models/CrmProject.js';
import CrmReportSchedule from '../models/CrmReportSchedule.js';
import { ROADMAP_PHASES, DEFINITION_OF_DONE, INITIALLY_EXCLUDED_FEATURES, TOP_RISKS_REGISTER } from '../config/roadmap.js';
import {
  BUSINESS_MODEL_CANVAS,
  REVENUE_STREAMS,
  CATEGORY_BENCHMARKS,
  LEGAL_COMMERCIAL_GUARDRAILS,
} from '../config/unitEconomics.js';
import {
  ANALYTICS_EVENT_CATALOG,
  ANALYTICS_FUNNELS,
  SENSITIVE_CATEGORIES_MASK,
  GLOBAL_ANALYTICS_PROPERTIES,
} from '../config/analyticsEvents.js';
import {
  TEST_PYRAMID,
  TEST_ENVIRONMENTS,
  CRITICAL_E2E_JOURNEYS,
  FEATURE_TEST_MATRICES,
  NON_FUNCTIONAL_TRACKS,
  CLINICAL_SAFETY_QA,
  RELEASE_GATES,
  UAT_PLAN,
  DEFECT_SEVERITIES,
  QA_RELEASE_CHECKLIST,
  CATALOGUE_SPECIFIC_FLOWS,
} from '../config/qaTestPlan.js';
import {
  MOBILE_ARCHITECTURE_DECISION,
  APP_PORTFOLIO,
  PWA_SPECIFICATIONS,
  NATIVE_CAPABILITY_MATRIX,
  MOBILE_SECURITY_CONTROLS,
  MOBILE_PERFORMANCE_TARGETS,
  MOBILE_ROLLOUT_PLAN,
} from '../config/mobileStrategy.js';
import {
  INFRA_STAGES,
  ENV_TOPOLOGY,
  CI_CD_PIPELINE,
  SLO_DEFINITIONS,
  ALERTING_RULES,
  COST_BUCKETS,
  DISASTER_RECOVERY_TIERS,
  SRE_RUNBOOKS,
  HARDENING_GUARDRAILS,
} from '../config/devOpsScaling.js';
import {
  OPERATING_MODEL,
  SUPPORT_CHANNELS_SLAS,
  TICKET_TAXONOMY,
  CORE_SOPS,
  ESCALATION_MATRIX,
  STAFFING_MODEL,
  COMMUNICATION_TEMPLATES,
  OPS_LAUNCH_CHECKLIST,
} from '../config/supportOperations.js';
import {
  BRAND_FOUNDATION,
  HEALTHCARE_MARKETING_PRINCIPLES,
  CHANNEL_STRATEGY,
  SEO_SITE_ARCHITECTURE,
  KEYWORD_CLUSTERS,
  HEALTH_CALENDAR_CAMPAIGNS,
  LIFECYCLE_CRM_JOURNEYS,
  PARTNERSHIP_PLAYBOOK,
  MARKETING_COMPLIANCE_CHECKLIST,
  NINETY_DAY_LAUNCH_PLAN,
} from '../config/marketingSeo.js';
import {
  PITCH_DECK_SLIDES,
  THREE_MINUTE_PITCH,
  NARRATIVE_SCRIPT,
  MARKET_SIZING_FRAMEWORK,
  INVESTOR_QA_MATRIX,
  DUE_DILIGENCE_DATA_ROOM,
  FUNDING_PATH_ALTERNATIVES,
  GTM_THREE_PHASE_ROADMAP,
  calculateCityMarketPotential,
} from '../config/pitchDeck.js';
import {
  SCOPED_ADMIN_ROLES,
  DATA_ACCESS_MATRIX,
  BREAK_GLASS_POLICY,
  MASKING_CONFIG,
  ADMIN_SIDEBAR_SPEC,
  PRIVACY_GUARANTEES,
  maskPatientPii,
  validateBreakGlassRequest,
} from '../config/superAdminGovernance.js';
import {
  CRM_NAV_MODULES,
  HYBRID_ARCHITECTURE_DECISION,
  SUPPLY_PIPELINE_STAGES,
  LOST_REASONS,
  PARTNERSHIP_STAGES,
  LEAD_SCORING_WEIGHTS,
  PROVIDER_HEALTH_WEIGHTS,
  ROLE_BASED_KPIS,
  AUTOMATION_WORKFLOW_RULES,
  CRM_ROLE_PERMISSIONS_MATRIX,
  calculateLeadScore,
  calculateProviderHealthScore,
} from '../config/crmOpsTeam.js';
import { runCrmAutomation } from '../lib/crmAutomation.js';
import { sendEmail } from '../services/notificationService.js';
import Appointment from '../models/Appointment.js';
import User from '../models/User.js';
import { protect, authorize } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';
import { encryptPhi, decryptPhi, looksMasked } from '../utils/phiFields.js';
import logger from '../config/logger.js';

// File 24: Ops CRM & Team Management (Super Admin)
// Scoped to Platform Team & Supply/Partnership Operations.
// STRICT RULES:
// 1. NO patient CRM / NO patient health data (PHI) in this router or its collections.
// 2. Platform TeamMember is strictly separate from hospital-tenant Staff (no salaries, etc.).
// 3. Contact PII encrypted at rest; revealed only to assigned owner or platform_admin/superadmin.
// 4. Territory/ownership visibility enforced.

const router = express.Router();
router.use(protect);

const actorId = (req) => req.user._id ?? req.user.id;
const OBJECT_ID = /^[0-9a-f]{24}$/i;
const requireObjectId = (req, res, next) => (
  OBJECT_ID.test(String(req.params.id)) ? next() : res.status(404).json({ message: 'Not found' })
);
const isPlatformAdmin = (req) => req.user.role === 'platform_admin' || req.user.role === 'superadmin';

const maskContact = (c) => ({
  name: c.name || '',
  role: c.role || '',
  phone: '******',
  email: '***',
});
const revealContact = (c) => ({
  name: c.name || '',
  role: c.role || '',
  phone: decryptPhi('Lead', 'contacts.phone', c.phoneEnc || ''),
  email: decryptPhi('Lead', 'contacts.email', c.emailEnc || ''),
});
const showContacts = (req, item) => {
  const mine = String(item.ownerId || '') === String(actorId(req));
  const list = item.contacts || [];
  return (mine || isPlatformAdmin(req)) ? list.map(revealContact) : list.map(maskContact);
};

// ─── Command Center (Aggregates only, k-anonymous) ───────────────────────────
// authz: role (crm:read)
router.get('/command-center', authorize('crm:read'), async (req, res) => {
  try {
    const { city } = req.query;
    const leadMatch = city ? { city } : {};
    const providerMatch = city ? { 'address.city': city } : {};

    const [
      stages,
      activeProviders,
      pendingApps,
      openDisputes,
      openTickets,
      expiringDocs,
      overdueTasks,
      totalLeads,
      atRiskCount,
      okrs,
    ] = await Promise.all([
      Lead.aggregate([{ $match: leadMatch }, { $group: { _id: '$stage', count: { $sum: 1 } } }]),
      Provider.countDocuments({ status: 'live', ...providerMatch }),
      ProviderApplication.countDocuments({ status: { $in: ['submitted', 'resubmitted', 'under_review'] } }),
      Dispute.countDocuments({ status: { $in: ['open', 'in_review'] } }),
      SupportTicket.countDocuments({ status: { $in: ['open', 'pending'] } }),
      ProviderDocument.countDocuments({ status: 'verified', expiryDate: { $lt: new Date(Date.now() + 30 * 864e5) } }),
      Task.countDocuments({ status: { $in: ['open', 'in_progress'] }, dueAt: { $lt: new Date() } }),
      Lead.countDocuments(leadMatch),
      CrmAccount.countDocuments({ healthBand: 'at_risk' }),
      Objective.find({ status: 'active', ...(city ? { city } : {}) }).limit(10).lean(),
    ]);

    const funnel = {};
    for (const s of stages) funnel[s._id] = s.count;

    return res.json({
      funnel,
      totalLeads,
      activeProviders,
      pendingApps,
      openDisputes,
      openTickets,
      expiringDocs30d: expiringDocs,
      overdueTasks,
      atRiskProviders: atRiskCount,
      okrs: okrs.map((o) => ({
        id: String(o._id),
        title: o.title,
        level: o.level,
        keyResults: o.keyResults || [],
      })),
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    logger.error(`CRM command-center error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// ─── Leads (Supply Pipeline) ─────────────────────────────────────────────────
const leadBody = z.object({
  businessName: z.string().trim().min(2).max(200),
  typeKey: z.string().trim().max(80).optional().default(''),
  subType: z.string().trim().max(80).optional().default(''),
  city: z.string().trim().max(80).optional().default(''),
  area: z.string().trim().max(120).optional().default(''),
  pincode: z.string().trim().max(10).optional().default(''),
  contacts: z.array(z.object({
    name: z.string().max(120).optional().default(''),
    role: z.string().max(80).optional().default(''),
    phone: z.string().max(20).optional().default(''),
    email: z.string().max(160).optional().default(''),
  })).max(5).optional().default([]),
  source: z.enum(['field_visit', 'referral', 'association', 'inbound', 'event', 'ads', 'other']).optional(),
  ownerId: z.string().regex(/^[0-9a-f]{24}$/i).optional(),
  territoryId: z.string().regex(/^[0-9a-f]{24}$/i).optional().nullable(),
  score: z.number().min(0).max(100).optional().default(0),
  tags: z.array(z.string().max(40)).max(20).optional().default([]),
  estMonthlyVolume: z.number().optional().default(0),
}).strict();

const stageBody = z.object({
  stage: z.enum(LEAD_STAGES_LIST),
  lostReason: z.string().max(300).optional().default(''),
}).strict();

// authz: role (crm:read)
router.get('/leads', authorize('crm:read'), async (req, res) => {
  try {
    const { stage, city, owner, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (stage) filter.stage = stage;
    if (city) filter.city = city;
    if (!isPlatformAdmin(req)) {
      filter.$or = [{ ownerId: actorId(req) }, { ownerId: null }];
    } else if (owner) {
      filter.ownerId = owner;
    }

    const [rows, total] = await Promise.all([
      Lead.find(filter)
        .populate('ownerId', 'name email')
        .sort({ updatedAt: -1 })
        .skip((page - 1) * limit)
        .limit(Math.min(100, +limit || 50))
        .lean(),
      Lead.countDocuments(filter),
    ]);

    return res.json({
      leads: rows.map((l) => ({
        ...l,
        id: String(l._id),
        contacts: showContacts(req, l),
      })),
      total,
      page: +page,
    });
  } catch (err) {
    logger.error(`CRM leads error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// authz: role (crm:read)
router.get('/leads/:id', authorize('crm:read'), requireObjectId, async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id)
      .populate('ownerId', 'name email')
      .populate('territoryId', 'name city')
      .lean();
    if (!lead) return res.status(404).json({ message: 'Lead not found' });
    if (!isPlatformAdmin(req) && lead.ownerId && String(lead.ownerId._id || lead.ownerId) !== String(actorId(req))) {
      return res.status(403).json({ message: 'Access denied to this lead' });
    }

    return res.json({
      ...lead,
      id: String(lead._id),
      contacts: showContacts(req, lead),
    });
  } catch (err) {
    logger.error(`CRM get lead error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// authz: role (crm:write)
router.post('/leads', authorize('crm:write'), async (req, res) => {
  try {
    const parsed = leadBody.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: 'Invalid lead', issues: parsed.error.issues });
    const d = parsed.data;
    const contacts = (d.contacts || []).map((c) => ({
      name: c.name,
      role: c.role,
      phoneEnc: looksMasked(c.phone) ? '' : encryptPhi('Lead', 'contacts.phone', c.phone),
      emailEnc: looksMasked(c.email) ? '' : encryptPhi('Lead', 'contacts.email', c.email),
    }));

    const lead = await Lead.create({
      ...d,
      contacts,
      ownerId: d.ownerId || actorId(req),
      territoryId: d.territoryId || null,
      createdBy: actorId(req),
      dedupeKey: `${(d.businessName || '').toLowerCase()}|${(d.city || '').toLowerCase()}|${d.pincode || ''}`,
    });

    await auditLog('crm_lead_created', actorId(req), { leadId: lead._id, ip: req.ip });
    return res.status(201).json({ id: String(lead._id), stage: lead.stage });
  } catch (err) {
    if (err?.code === 11000) return res.status(409).json({ message: 'Possible duplicate lead' });
    logger.error(`CRM create lead error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// authz: role (crm:write)
router.patch('/leads/:id/stage', authorize('crm:write'), requireObjectId, async (req, res) => {
  try {
    const parsed = stageBody.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: 'Invalid stage', issues: parsed.error.issues });
    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ message: 'Lead not found' });
    if (!isPlatformAdmin(req) && String(lead.ownerId || '') !== String(actorId(req))) {
      return res.status(403).json({ message: 'Not your lead' });
    }
    if (parsed.data.stage === 'churned' && !parsed.data.lostReason) {
      return res.status(400).json({ message: 'lostReason is required to churn a lead' });
    }
    const from = lead.stage;
    lead.stage = parsed.data.stage;
    lead.stageEnteredAt = new Date();
    if (parsed.data.lostReason) lead.lostReason = parsed.data.lostReason;
    await lead.save();

    await Activity.create({
      objectType: 'lead',
      objectId: lead._id,
      type: 'stage_change',
      by: actorId(req),
      outcome: `${from}→${lead.stage}`,
    });
    await auditLog('crm_lead_stage', actorId(req), { leadId: lead._id, from, to: lead.stage, ip: req.ip });
    return res.json({ id: String(lead._id), stage: lead.stage });
  } catch (err) {
    logger.error(`CRM stage error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// authz: role (crm:write)
router.post('/leads/:id/convert', authorize('crm:write'), requireObjectId, async (req, res) => {
  try {
    const { applicationId } = req.body || {};
    if (!OBJECT_ID.test(String(applicationId || ''))) {
      return res.status(400).json({ message: 'Valid applicationId required' });
    }
    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ message: 'Lead not found' });
    lead.linkedApplicationId = applicationId;
    lead.stage = 'application_submitted';
    lead.stageEnteredAt = new Date();
    await lead.save();

    await auditLog('crm_lead_converted', actorId(req), { leadId: lead._id, applicationId, ip: req.ip });
    return res.json({ id: String(lead._id), stage: lead.stage });
  } catch (err) {
    logger.error(`CRM convert error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// ─── Accounts (Provider 360 Overlay) ─────────────────────────────────────────
// authz: role (crm:read)
router.get('/accounts', authorize('crm:read'), async (req, res) => {
  try {
    const { city, healthBand, page = 1, limit = 50 } = req.query;
    const filter = { status: 'live' };
    if (city) filter['address.city'] = city;

    const providers = await Provider.find(filter)
      .select('name type tier status address rating reviewsCount createdAt')
      .skip((page - 1) * limit)
      .limit(Math.min(100, +limit || 50))
      .lean();

    const providerIds = providers.map((p) => p._id);
    const overlays = await CrmAccount.find({ providerId: { $in: providerIds } })
      .populate('accountOwnerId', 'name email')
      .lean();

    const overlayMap = new Map();
    for (const o of overlays) overlayMap.set(String(o.providerId), o);

    let accounts = providers.map((p) => {
      const o = overlayMap.get(String(p._id)) || {};
      return {
        id: String(p._id),
        providerId: String(p._id),
        name: p.name,
        type: p.type,
        tier: p.tier,
        city: p.address?.city || '',
        area: p.address?.area || '',
        rating: p.rating || 0,
        reviewsCount: p.reviewsCount || 0,
        healthScore: o.healthScore ?? 75,
        healthBand: o.healthBand || 'healthy',
        riskReasons: o.riskReasons || [],
        plan: o.plan || 'standard',
        accountOwner: o.accountOwnerId || null,
        lastContactAt: o.lastContactAt || null,
      };
    });

    if (healthBand) {
      accounts = accounts.filter((a) => a.healthBand === healthBand);
    }

    return res.json({ accounts, total: accounts.length, page: +page });
  } catch (err) {
    logger.error(`CRM accounts error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// authz: role (crm:read)
router.get('/accounts/:id', authorize('crm:read'), requireObjectId, async (req, res) => {
  try {
    const provider = await Provider.findById(req.params.id).lean();
    if (!provider) return res.status(404).json({ message: 'Provider not found' });

    let overlay = await CrmAccount.findOne({ providerId: provider._id })
      .populate('accountOwnerId', 'name email')
      .lean();

    if (!overlay) {
      overlay = await CrmAccount.create({
        providerId: provider._id,
        accountOwnerId: actorId(req),
        healthScore: 75,
        healthBand: 'healthy',
      });
    }

    const [documents, openDisputes, openTickets, tasks, recentActivities] = await Promise.all([
      ProviderDocument.find({ providerId: provider._id }).select('type status expiryDate verifiedAt').lean(),
      Dispute.countDocuments({ providerId: provider._id, status: { $in: ['open', 'in_review'] } }),
      SupportTicket.countDocuments({ providerId: provider._id, status: { $in: ['open', 'pending'] } }),
      Task.find({ 'related.type': 'account', 'related.id': provider._id }).sort({ dueAt: 1 }).lean(),
      Activity.find({ objectType: 'account', objectId: provider._id }).sort({ at: -1 }).limit(20).lean(),
    ]);

    return res.json({
      provider: {
        id: String(provider._id),
        name: provider.name,
        type: provider.type,
        tier: provider.tier,
        status: provider.status,
        address: provider.address,
        rating: provider.rating,
        reviewsCount: provider.reviewsCount,
      },
      overlay: {
        healthScore: overlay.healthScore,
        healthBand: overlay.healthBand,
        riskReasons: overlay.riskReasons || [],
        plan: overlay.plan || 'standard',
        accountOwner: overlay.accountOwnerId || null,
        lastContactAt: overlay.lastContactAt,
        nextCheckInAt: overlay.nextCheckInAt,
        notes: overlay.notes || [],
      },
      documents: documents.map((d) => ({
        id: String(d._id),
        type: d.type,
        status: d.status,
        expiryDate: d.expiryDate,
      })),
      openDisputes,
      openTickets,
      tasks: tasks.map((t) => ({ ...t, id: String(t._id) })),
      activities: recentActivities.map((a) => ({ ...a, id: String(a._id) })),
    });
  } catch (err) {
    logger.error(`CRM get account 360 error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// authz: role (crm:write)
router.patch('/accounts/:id', authorize('crm:write'), requireObjectId, async (req, res) => {
  try {
    const { accountOwnerId, plan, healthBand, riskReasons, note } = req.body || {};
    let overlay = await CrmAccount.findOne({ providerId: req.params.id });
    if (!overlay) {
      overlay = new CrmAccount({ providerId: req.params.id });
    }

    if (accountOwnerId && OBJECT_ID.test(accountOwnerId)) overlay.accountOwnerId = accountOwnerId;
    if (plan) overlay.plan = String(plan).trim();
    if (healthBand && ['healthy', 'watch', 'at_risk'].includes(healthBand)) overlay.healthBand = healthBand;
    if (Array.isArray(riskReasons)) overlay.riskReasons = riskReasons.map(String);
    if (note && String(note).trim()) {
      overlay.notes.push({
        content: String(note).trim().slice(0, 2000),
        by: actorId(req),
        at: new Date(),
      });
    }

    overlay.lastContactAt = new Date();
    await overlay.save();

    await auditLog('crm_account_updated', actorId(req), { providerId: req.params.id, ip: req.ip });
    return res.json({ ok: true, healthBand: overlay.healthBand });
  } catch (err) {
    logger.error(`CRM update account error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// ─── Partnerships CRM ────────────────────────────────────────────────────────
// authz: role (crm:read)
router.get('/partners', authorize('crm:read'), async (req, res) => {
  try {
    const { stage, city } = req.query;
    const filter = {};
    if (stage) filter.stage = stage;
    if (city) filter.city = city;
    if (!isPlatformAdmin(req)) filter.ownerId = actorId(req);

    const rows = await Partner.find(filter)
      .populate('ownerId', 'name email')
      .sort({ updatedAt: -1 })
      .limit(100)
      .lean();

    return res.json({
      partners: rows.map((p) => ({
        ...p,
        id: String(p._id),
        contacts: showContacts(req, p),
      })),
    });
  } catch (err) {
    logger.error(`CRM partners error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// authz: role (crm:read)
router.get('/partners/:id', authorize('crm:read'), requireObjectId, async (req, res) => {
  try {
    const p = await Partner.findById(req.params.id)
      .populate('ownerId', 'name email')
      .lean();
    if (!p) return res.status(404).json({ message: 'Partner not found' });

    return res.json({
      ...p,
      id: String(p._id),
      contacts: showContacts(req, p),
    });
  } catch (err) {
    logger.error(`CRM get partner error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// authz: role (crm:write)
router.post('/partners', authorize('crm:write'), async (req, res) => {
  try {
    const { orgName, type, city, area, size, offer, ownerId, contacts } = req.body || {};
    if (!orgName || String(orgName).trim().length < 2) return res.status(400).json({ message: 'orgName required' });
    const PARTNER_TYPES = ['rwa', 'corporate', 'ngo', 'association', 'school', 'insurer', 'govt', 'hospital_group', 'media', 'other'];
    if (type && !PARTNER_TYPES.includes(type)) return res.status(400).json({ message: 'Invalid partner type' });

    const encContacts = (Array.isArray(contacts) ? contacts : []).map((c) => ({
      name: c.name || '',
      role: c.role || '',
      phoneEnc: looksMasked(c.phone) ? '' : encryptPhi('Lead', 'contacts.phone', c.phone),
      emailEnc: looksMasked(c.email) ? '' : encryptPhi('Lead', 'contacts.email', c.email),
    }));

    const p = await Partner.create({
      orgName: String(orgName).trim(),
      type: type || 'other',
      city: city || '',
      area: area || '',
      size: Number(size) || 0,
      offer: String(offer || '').slice(0, 2000),
      contacts: encContacts,
      ownerId: ownerId || actorId(req),
    });

    await auditLog('crm_partner_created', actorId(req), { partnerId: p._id, ip: req.ip });
    return res.status(201).json({ id: String(p._id), stage: p.stage });
  } catch (err) {
    logger.error(`CRM create partner error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// authz: role (crm:write)
router.patch('/partners/:id', authorize('crm:write'), requireObjectId, async (req, res) => {
  try {
    const p = await Partner.findById(req.params.id);
    if (!p) return res.status(404).json({ message: 'Partner not found' });
    if (!isPlatformAdmin(req) && String(p.ownerId) !== String(actorId(req))) {
      return res.status(403).json({ message: 'Not your partner' });
    }

    const { stage, mouStatus, mouDocRef, offer, nextStep, nextStepDueAt, outcomes } = req.body || {};
    if (stage && PARTNER_STAGES_LIST.includes(stage)) p.stage = stage;
    if (mouStatus) p.mouStatus = mouStatus;
    if (mouDocRef) p.mouDocRef = mouDocRef;
    if (offer !== undefined) p.offer = String(offer).slice(0, 2000);
    if (nextStep !== undefined) p.nextStep = String(nextStep).slice(0, 300);
    if (nextStepDueAt !== undefined) p.nextStepDueAt = nextStepDueAt ? new Date(nextStepDueAt) : null;
    if (outcomes && typeof outcomes === 'object') {
      p.outcomes = {
        eventsHeld: Number(outcomes.eventsHeld) || p.outcomes.eventsHeld,
        registrations: Number(outcomes.registrations) || p.outcomes.registrations,
        conversions: Number(outcomes.conversions) || p.outcomes.conversions,
      };
    }

    await p.save();
    return res.json({ id: String(p._id), stage: p.stage });
  } catch (err) {
    logger.error(`CRM update partner error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// ─── Field Ops (Territories & Visits) ────────────────────────────────────────
// authz: role (crm:read)
router.get('/territories', authorize('crm:read'), async (req, res) => {
  try {
    const { city } = req.query;
    const filter = { isActive: true };
    if (city) filter.city = city;

    const rows = await Territory.find(filter).populate('ownerIds', 'name email').lean();
    return res.json({ territories: rows.map((t) => ({ ...t, id: String(t._id) })) });
  } catch (err) {
    logger.error(`CRM territories error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// authz: role (crm:write)
router.post('/territories', authorize('crm:write'), async (req, res) => {
  try {
    const { name, city, pincodes, ownerIds, targets } = req.body || {};
    if (!name || !city) return res.status(400).json({ message: 'name and city are required' });

    const t = await Territory.create({
      name: String(name).trim(),
      city: String(city).trim(),
      pincodes: Array.isArray(pincodes) ? pincodes : [],
      ownerIds: Array.isArray(ownerIds) ? ownerIds : [],
      targets: targets || {},
    });

    return res.status(201).json({ id: String(t._id), name: t.name });
  } catch (err) {
    logger.error(`CRM create territory error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// authz: role (crm:read)
router.get('/visits', authorize('crm:read'), async (req, res) => {
  try {
    const { mine } = req.query;
    const filter = {};
    if (mine === '1' || !isPlatformAdmin(req)) filter.userId = actorId(req);

    const rows = await Visit.find(filter)
      .populate('userId', 'name email')
      .populate('leadId', 'businessName city area')
      .sort({ plannedAt: -1, createdAt: -1 })
      .limit(100)
      .lean();

    return res.json({ visits: rows.map((v) => ({ ...v, id: String(v._id) })) });
  } catch (err) {
    logger.error(`CRM visits error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// authz: role (crm:write)
router.post('/visits', authorize('crm:write'), async (req, res) => {
  try {
    const { leadId, providerId, plannedAt, checkIn, outcome, notes } = req.body || {};
    const v = await Visit.create({
      userId: actorId(req),
      leadId: leadId || null,
      providerId: providerId || null,
      plannedAt: plannedAt ? new Date(plannedAt) : new Date(),
      checkIn: checkIn || {},
      outcome: outcome || '',
      notes: String(notes || '').slice(0, 2000),
    });

    return res.status(201).json({ id: String(v._id) });
  } catch (err) {
    logger.error(`CRM create visit error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// authz: role (crm:write)
router.patch('/visits/:id', authorize('crm:write'), requireObjectId, async (req, res) => {
  try {
    const v = await Visit.findById(req.params.id);
    if (!v) return res.status(404).json({ message: 'Visit not found' });
    if (!isPlatformAdmin(req) && String(v.userId) !== String(actorId(req))) {
      return res.status(403).json({ message: 'Not your visit' });
    }

    const { checkIn, checkOut, outcome, notes, photoRefs } = req.body || {};
    if (checkIn) v.checkIn = { ...v.checkIn, ...checkIn, at: new Date() };
    if (checkOut) v.checkOut = { ...v.checkOut, ...checkOut, at: new Date() };
    if (outcome) v.outcome = outcome;
    if (notes !== undefined) v.notes = String(notes).slice(0, 2000);
    if (Array.isArray(photoRefs)) v.photoRefs = photoRefs;

    await v.save();
    return res.json({ id: String(v._id), outcome: v.outcome });
  } catch (err) {
    logger.error(`CRM update visit error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// ─── Team Management (Platform Team — SEPARATE from Hospital Staff) ──────────
// authz: role (crm:read)
router.get('/team', authorize('crm:read'), async (req, res) => {
  try {
    const { city, status, roleTemplate } = req.query;
    const filter = {};
    if (city) filter.city = city;
    if (status) filter.status = status;
    if (roleTemplate) filter.roleTemplate = roleTemplate;

    const rows = await TeamMember.find(filter)
      .populate('userId', 'name email role')
      .populate('managerId', 'name email')
      .populate('territoryId', 'name city')
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      members: rows.map((m) => ({
        id: String(m._id),
        user: m.userId,
        roleTemplate: m.roleTemplate,
        manager: m.managerId,
        city: m.city,
        territory: m.territoryId,
        joinDate: m.joinDate,
        status: m.status,
        trainingRecords: m.trainingRecords || [],
        onboardingChecklist: m.onboardingChecklist || [],
      })),
    });
  } catch (err) {
    logger.error(`CRM team error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// authz: role (crm:write)
router.post('/team', authorize('crm:write'), async (req, res) => {
  try {
    const { userId, roleTemplate, managerId, city, territoryId, joinDate, onboardingChecklist } = req.body || {};
    if (!userId || !OBJECT_ID.test(userId)) return res.status(400).json({ message: 'Valid userId required' });

    const existing = await TeamMember.findOne({ userId });
    if (existing) return res.status(409).json({ message: 'User is already a platform team member' });

    const member = await TeamMember.create({
      userId,
      roleTemplate: roleTemplate || 'other',
      managerId: managerId || null,
      city: city || '',
      territoryId: territoryId || null,
      joinDate: joinDate ? new Date(joinDate) : new Date(),
      onboardingChecklist: Array.isArray(onboardingChecklist) ? onboardingChecklist : [
        { label: 'Platform Access & 2FA Enrolment', done: false },
        { label: 'Privacy & PHI Protection Training', done: false },
        { label: 'Product SOPs & Scripts Review', done: false },
        { label: 'Shadow Visits & Field Induction', done: false },
      ],
    });

    await auditLog('crm_team_member_created', actorId(req), { teamMemberId: member._id, ip: req.ip });
    return res.status(201).json({ id: String(member._id), roleTemplate: member.roleTemplate });
  } catch (err) {
    logger.error(`CRM create team member error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// authz: role (crm:write)
router.patch('/team/:id', authorize('crm:write'), requireObjectId, async (req, res) => {
  try {
    const member = await TeamMember.findById(req.params.id);
    if (!member) return res.status(404).json({ message: 'Team member not found' });

    const { roleTemplate, managerId, city, territoryId, status, onboardingChecklist, trainingRecords } = req.body || {};
    if (roleTemplate) member.roleTemplate = roleTemplate;
    if (managerId !== undefined) member.managerId = managerId || null;
    if (city !== undefined) member.city = city;
    if (territoryId !== undefined) member.territoryId = territoryId || null;
    if (status && ['active', 'on_leave', 'exited'].includes(status)) member.status = status;
    if (Array.isArray(onboardingChecklist)) member.onboardingChecklist = onboardingChecklist;
    if (Array.isArray(trainingRecords)) member.trainingRecords = trainingRecords;

    await member.save();
    return res.json({ id: String(member._id), status: member.status });
  } catch (err) {
    logger.error(`CRM update team member error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// ─── Goals & OKRs ───────────────────────────────────────────────────────────
// authz: role (crm:read)
router.get('/okrs', authorize('crm:read'), async (req, res) => {
  try {
    const { level, city, period } = req.query;
    const filter = {};
    if (level) filter.level = level;
    if (city) filter.city = city;
    if (period) filter.period = period;

    const rows = await Objective.find(filter)
      .populate('ownerId', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ okrs: rows.map((o) => ({ ...o, id: String(o._id) })) });
  } catch (err) {
    logger.error(`CRM okrs error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// authz: role (crm:write)
router.post('/okrs', authorize('crm:write'), async (req, res) => {
  try {
    const { level, title, period, city, keyResults, ownerId } = req.body || {};
    if (!title || !period || !level) return res.status(400).json({ message: 'level, title, and period required' });

    const o = await Objective.create({
      level,
      title: String(title).trim().slice(0, 300),
      period: String(period).trim(),
      city: city || '',
      ownerId: ownerId || actorId(req),
      keyResults: Array.isArray(keyResults) ? keyResults : [],
    });

    return res.status(201).json({ id: String(o._id), title: o.title });
  } catch (err) {
    logger.error(`CRM create okr error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// authz: role (crm:write)
router.patch('/okrs/:id', authorize('crm:write'), requireObjectId, async (req, res) => {
  try {
    const o = await Objective.findById(req.params.id);
    if (!o) return res.status(404).json({ message: 'Objective not found' });

    const { keyResults, status } = req.body || {};
    if (Array.isArray(keyResults)) o.keyResults = keyResults;
    if (status && ['active', 'closed'].includes(status)) o.status = status;

    await o.save();
    return res.json({ id: String(o._id), status: o.status });
  } catch (err) {
    logger.error(`CRM update okr error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// ─── Campaigns & Camps ──────────────────────────────────────────────────────
// authz: role (crm:read)
router.get('/campaigns', authorize('crm:read'), async (req, res) => {
  try {
    const { status, city, type } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (city) filter.city = city;
    if (type) filter.type = type;

    const rows = await Campaign.find(filter)
      .populate('partnerId', 'orgName type')
      .populate('ownerId', 'name email')
      .sort({ date: -1, createdAt: -1 })
      .lean();

    return res.json({ campaigns: rows.map((c) => ({ ...c, id: String(c._id) })) });
  } catch (err) {
    logger.error(`CRM campaigns error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// authz: role (crm:write)
router.post('/campaigns', authorize('crm:write'), async (req, res) => {
  try {
    const { type, title, date, venue, city, partnerId, facilityId, budget, capacity } = req.body || {};
    if (!title) return res.status(400).json({ message: 'title required' });

    const c = await Campaign.create({
      type: type || 'health_camp',
      title: String(title).trim(),
      date: date ? new Date(date) : null,
      venue: venue || '',
      city: city || '',
      partnerId: partnerId || null,
      facilityId: facilityId || null,
      budget: Number(budget) || 0,
      capacity: Number(capacity) || 0,
      ownerId: actorId(req),
    });

    return res.status(201).json({ id: String(c._id), status: c.status });
  } catch (err) {
    logger.error(`CRM create campaign error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// authz: role (crm:write)
router.patch('/campaigns/:id', authorize('crm:write'), requireObjectId, async (req, res) => {
  try {
    const c = await Campaign.findById(req.params.id);
    if (!c) return res.status(404).json({ message: 'Campaign not found' });

    const { status, registrations, attendees, conversions, reportRef } = req.body || {};
    if (status) c.status = status;
    if (registrations !== undefined) c.registrations = Number(registrations) || 0;
    if (attendees !== undefined) c.attendees = Number(attendees) || 0;
    if (conversions !== undefined) c.conversions = Number(conversions) || 0;
    if (reportRef !== undefined) c.reportRef = String(reportRef);

    await c.save();
    return res.json({ id: String(c._id), status: c.status });
  } catch (err) {
    logger.error(`CRM update campaign error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// ─── Tasks (Unified Task Engine) ─────────────────────────────────────────────
// authz: role (crm:read)
router.get('/tasks', authorize('crm:read'), async (req, res) => {
  try {
    const { status, mine } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (mine === '1' || !isPlatformAdmin(req)) filter.ownerId = actorId(req);

    const rows = await Task.find(filter)
      .populate('ownerId', 'name email')
      .sort({ dueAt: 1 })
      .limit(200)
      .lean();

    return res.json({ tasks: rows.map((t) => ({ ...t, id: String(t._id) })) });
  } catch (err) {
    logger.error(`CRM tasks error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// authz: role (crm:write)
router.post('/tasks', authorize('crm:write'), async (req, res) => {
  try {
    const { title, type, dueAt, priority, ownerId, related } = req.body || {};
    if (!title || String(title).trim().length < 3) return res.status(400).json({ message: 'title required' });

    const t = await Task.create({
      title: String(title).trim().slice(0, 300),
      type: type || 'follow_up',
      dueAt: dueAt || null,
      priority: priority || 'medium',
      ownerId: ownerId || actorId(req),
      related: related || { type: 'none' },
      createdBy: actorId(req),
    });

    return res.status(201).json({ id: String(t._id), status: t.status });
  } catch (err) {
    logger.error(`CRM create task error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// authz: role (crm:write)
router.patch('/tasks/:id', authorize('crm:write'), requireObjectId, async (req, res) => {
  try {
    const t = await Task.findById(req.params.id);
    if (!t) return res.status(404).json({ message: 'Task not found' });
    if (!isPlatformAdmin(req) && String(t.ownerId) !== String(actorId(req))) {
      return res.status(403).json({ message: 'Not your task' });
    }
    const { status } = req.body || {};
    if (status && !['open', 'in_progress', 'blocked', 'done'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    if (status) t.status = status;
    await t.save();
    return res.json({ id: String(t._id), status: t.status });
  } catch (err) {
    logger.error(`CRM task update error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// ─── Activities ─────────────────────────────────────────────────────────────
// authz: role (crm:read)
router.get('/activities', authorize('crm:read'), async (req, res) => {
  try {
    const { objectType, objectId } = req.query;
    if (!['lead', 'account', 'partner', 'camp'].includes(String(objectType)) || !OBJECT_ID.test(String(objectId || ''))) {
      return res.status(400).json({ message: 'objectType + objectId required' });
    }
    const rows = await Activity.find({ objectType, objectId })
      .populate('by', 'name email')
      .sort({ at: -1 })
      .limit(100)
      .lean();

    return res.json({ activities: rows.map((a) => ({ ...a, id: String(a._id) })) });
  } catch (err) {
    logger.error(`CRM activities error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// authz: role (crm:write)
router.post('/activities', authorize('crm:write'), async (req, res) => {
  try {
    const { objectType, objectId, type, outcome, summary } = req.body || {};
    if (!['lead', 'account', 'partner', 'camp'].includes(String(objectType)) || !OBJECT_ID.test(String(objectId || ''))) {
      return res.status(400).json({ message: 'objectType + objectId required' });
    }
    if (!['call', 'visit', 'whatsapp', 'email', 'note', 'stage_change', 'task_done'].includes(String(type))) {
      return res.status(400).json({ message: 'Invalid type' });
    }
    const a = await Activity.create({
      objectType,
      objectId,
      type,
      by: actorId(req),
      outcome: String(outcome || '').slice(0, 300),
      summary: String(summary || '').slice(0, 2000),
    });
    return res.status(201).json({ id: String(a._id) });
  } catch (err) {
    logger.error(`CRM activity error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// ─── CRM Settings (File 24 §4.13: pipeline / SLA / lost reasons / scoring) ───
// authz: role (crm:read)
router.get('/settings', authorize('crm:read'), async (req, res) => {
  try {
    const cfg = await CrmPipelineConfig.findOne({ key: 'default' }).lean();
    return res.json({ config: cfg || defaultPipelineConfig() });
  } catch (err) {
    logger.error(`CRM settings error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

const pipelineStageBody = z.object({
  key: z.string().trim().min(1).max(60),
  label: z.string().trim().max(80).optional().default(''),
  slaHours: z.number().min(0).max(8760),
  terminal: z.boolean().optional().default(false),
});

const settingsBody = z.object({
  leadStages: z.array(pipelineStageBody).min(2).max(30).optional(),
  partnerStages: z.array(pipelineStageBody).min(2).max(30).optional(),
  lostReasons: z.array(z.string().trim().max(120)).max(50).optional(),
  leadSources: z.array(z.enum(['field_visit', 'referral', 'association', 'inbound', 'event', 'ads', 'other'])).optional(),
  scoringWeights: z.object({
    volume: z.number().min(0).max(100).optional(),
    categoryPriority: z.number().min(0).max(100).optional(),
    decisionMaker: z.number().min(0).max(100).optional(),
    digitalReadiness: z.number().min(0).max(100).optional(),
    responsiveness: z.number().min(0).max(100).optional(),
  }).optional(),
  followUpSlaHours: z.number().min(0).max(720).optional(),
  docRenewalLeadDays: z.number().min(1).max(180).optional(),
}).strict();

// authz: role (crm:write) — Owner/platform admin approve config changes.
router.put('/settings', authorize('crm:write'), async (req, res) => {
  try {
    const parsed = settingsBody.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: 'Invalid settings', issues: parsed.error.issues });
    const d = parsed.data;

    if (d.leadStages) {
      const keys = d.leadStages.map((s) => s.key);
      const invalid = keys.filter((k) => !LEAD_STAGES_LIST.includes(k));
      if (invalid.length) return res.status(400).json({ message: `Unknown lead stages: ${invalid.join(', ')}` });
      if (new Set(keys).size !== keys.length) return res.status(400).json({ message: 'Duplicate lead stage keys' });
    }
    if (d.partnerStages) {
      const keys = d.partnerStages.map((s) => s.key);
      const invalid = keys.filter((k) => !PARTNER_STAGES_LIST.includes(k));
      if (invalid.length) return res.status(400).json({ message: `Unknown partner stages: ${invalid.join(', ')}` });
      if (new Set(keys).size !== keys.length) return res.status(400).json({ message: 'Duplicate partner stage keys' });
    }

    const base = await CrmPipelineConfig.findOne({ key: 'default' });
    const next = base || new CrmPipelineConfig({ key: 'default' });
    if (d.leadStages) next.leadStages = d.leadStages;
    if (d.partnerStages) next.partnerStages = d.partnerStages;
    if (d.lostReasons) next.lostReasons = d.lostReasons;
    if (d.leadSources) next.leadSources = d.leadSources;
    if (d.scoringWeights) next.scoringWeights = { ...next.scoringWeights, ...d.scoringWeights };
    if (d.followUpSlaHours !== undefined) next.followUpSlaHours = d.followUpSlaHours;
    if (d.docRenewalLeadDays !== undefined) next.docRenewalLeadDays = d.docRenewalLeadDays;
    next.updatedBy = actorId(req);
    await next.save();

    await auditLog('crm_settings_updated', actorId(req), { keys: Object.keys(d), ip: req.ip });
    return res.json({ config: next });
  } catch (err) {
    logger.error(`CRM settings update error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// ─── Automation Rules (File 24 §5) ──────────────────────────────────────────
// authz: role (crm:read)
router.get('/automation/rules', authorize('crm:read'), async (req, res) => {
  try {
    const rows = await CrmAutomationRule.find({}).sort({ createdAt: -1 }).limit(200).lean();
    return res.json({
      rules: rows.map((r) => ({ ...r, id: String(r._id) })),
      triggers: CRM_AUTOMATION_TRIGGERS_LIST,
    });
  } catch (err) {
    logger.error(`CRM automation rules error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

const automationRuleBody = z.object({
  name: z.string().trim().min(3).max(120),
  trigger: z.enum(CRM_AUTOMATION_TRIGGERS_LIST),
  enabled: z.boolean().optional().default(true),
  conditions: z.record(z.string().max(200), boundedShallow).optional().default({}),
  actions: z.array(z.object({
    type: z.enum(['create_task', 'notify']),
    params: z.record(z.string().max(200), boundedShallow).optional().default({}),
  })).min(1).max(5).optional(),
  cooldownMinutes: z.number().min(1).max(10080).optional().default(60),
}).strict();

// authz: role (crm:write)
router.post('/automation/rules', authorize('crm:write'), async (req, res) => {
  try {
    const parsed = automationRuleBody.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: 'Invalid rule', issues: parsed.error.issues });
    const d = parsed.data;

    const rule = await CrmAutomationRule.create({
      name: d.name,
      trigger: d.trigger,
      enabled: d.enabled,
      conditions: d.conditions,
      actions: d.actions && d.actions.length ? d.actions : [{ type: 'create_task', params: {} }],
      cooldownMinutes: d.cooldownMinutes,
      createdBy: actorId(req),
    });

    await auditLog('crm_automation_rule_created', actorId(req), { ruleId: rule._id, trigger: rule.trigger, ip: req.ip });
    return res.status(201).json({ id: String(rule._id), trigger: rule.trigger, enabled: rule.enabled });
  } catch (err) {
    logger.error(`CRM create automation rule error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// authz: role (crm:write)
router.patch('/automation/rules/:id', authorize('crm:write'), requireObjectId, async (req, res) => {
  try {
    const rule = await CrmAutomationRule.findById(req.params.id);
    if (!rule) return res.status(404).json({ message: 'Rule not found' });

    const { name, enabled, conditions, actions, cooldownMinutes } = req.body || {};
    if (name !== undefined) rule.name = String(name).trim().slice(0, 120);
    if (enabled !== undefined) rule.enabled = Boolean(enabled);
    if (conditions && typeof conditions === 'object') rule.conditions = conditions;
    if (Array.isArray(actions) && actions.length) {
      const bad = actions.filter((a) => !['create_task', 'notify'].includes(a?.type));
      if (bad.length) return res.status(400).json({ message: 'Invalid action type' });
      rule.actions = actions;
    }
    if (cooldownMinutes !== undefined) rule.cooldownMinutes = Number(cooldownMinutes) || rule.cooldownMinutes;

    await rule.save();
    await auditLog('crm_automation_rule_updated', actorId(req), { ruleId: rule._id, enabled: rule.enabled, ip: req.ip });
    return res.json({ id: String(rule._id), enabled: rule.enabled });
  } catch (err) {
    logger.error(`CRM update automation rule error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// authz: role (crm:write)
router.delete('/automation/rules/:id', authorize('crm:write'), requireObjectId, async (req, res) => {
  try {
    const rule = await CrmAutomationRule.findByIdAndDelete(req.params.id);
    if (!rule) return res.status(404).json({ message: 'Rule not found' });
    await auditLog('crm_automation_rule_deleted', actorId(req), { ruleId: req.params.id, ip: req.ip });
    return res.json({ deleted: true });
  } catch (err) {
    logger.error(`CRM delete automation rule error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// authz: role (crm:write) — manual sweep (force skips cooldowns).
router.post('/automation/run', authorize('crm:write'), async (req, res) => {
  try {
    const { ruleId, force } = req.body || {};
    if (ruleId && !OBJECT_ID.test(String(ruleId))) return res.status(400).json({ message: 'Invalid ruleId' });
    const summary = await runCrmAutomation({ ruleId: ruleId || null, force: Boolean(force) });
    await auditLog('crm_automation_run', actorId(req), { ruleId: ruleId || 'all', force: Boolean(force), ...summary, ip: req.ip });
    return res.json(summary);
  } catch (err) {
    logger.error(`CRM automation run error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// ─── Reports (File 24 §4.12) — aggregate-only, k-anonymous ──────────────────
const toCsv = (columns, rows) => {
  const esc = (v) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [columns.map(esc).join(','), ...rows.map((r) => r.map(esc).join(','))].join('\n');
};

const pct = (num, den) => (den > 0 ? Math.round((num / den) * 1000) / 10 : 0);

const REPORT_BUILDERS = {
  // Stage counts + step conversion across the supply funnel.
  supply_funnel: async () => {
    const grouped = await Lead.aggregate([{ $group: { _id: '$stage', count: { $sum: 1 } } }]);
    const counts = new Map(grouped.map((g) => [String(g._id), Number(g.count) || 0]));
    const columns = ['stage', 'leads', 'step_conversion_pct'];
    const rows = [];
    let prev = null;
    for (const stage of LEAD_STAGES_LIST) {
      const count = counts.get(stage) || 0;
      rows.push([stage, count, prev === null ? '' : pct(count, prev)]);
      prev = count;
    }
    return { title: 'Supply Funnel', columns, rows };
  },

  // Per-owner workload & output (leads owned, visits, tasks done).
  field_productivity: async () => {
    const [leadGroups, visitGroups, taskGroups] = await Promise.all([
      Lead.aggregate([{ $group: {
        _id: '$ownerId',
        leads: { $sum: 1 },
        activated: { $sum: { $cond: [{ $in: ['$stage', ['activated', 'active']] }, 1, 0] } },
        churned: { $sum: { $cond: [{ $eq: ['$stage', 'churned'] }, 1, 0] } },
      } }]),
      Visit.aggregate([{ $group: { _id: '$userId', visits: { $sum: 1 } } }]),
      Task.aggregate([{ $group: { _id: '$ownerId', total: { $sum: 1 }, done: { $sum: { $cond: [{ $eq: ['$status', 'done'] }, 1, 0] } } } }]),
    ]);
    // Name lookup is cosmetic — a failure must never fail the report itself.
    let users;
    try {
      const ids = [...new Set([
        ...leadGroups.map((g) => g._id),
        ...visitGroups.map((g) => g._id),
        ...taskGroups.map((g) => g._id),
      ].filter(Boolean))];
      users = ids.length ? await User.find({ _id: { $in: ids } }).select('name email').lean() : [];
    } catch {
      users = [];
    }
    const byId = new Map(users.map((u) => [String(u._id), u]));
    const merged = new Map();
    const touch = (id) => {
      const k = String(id || 'unassigned');
      if (!merged.has(k)) merged.set(k, { leads: 0, activated: 0, churned: 0, visits: 0, tasks: 0, tasksDone: 0 });
      return merged.get(k);
    };
    for (const g of leadGroups) { const m = touch(g._id); m.leads = g.leads; m.activated = g.activated; m.churned = g.churned; }
    for (const g of visitGroups) touch(g._id).visits = g.visits;
    for (const g of taskGroups) { const m = touch(g._id); m.tasks = g.total; m.tasksDone = g.done; }

    const columns = ['owner', 'email', 'leads', 'activated', 'churned', 'visits', 'tasks', 'tasks_done'];
    const rows = [...merged.entries()].map(([id, m]) => {
      const u = byId.get(id);
      return [u?.name || (id === 'unassigned' ? 'Unassigned' : id), u?.email || '', m.leads, m.activated, m.churned, m.visits, m.tasks, m.tasksDone];
    }).sort((a, b) => b[2] - a[2]);
    return { title: 'Field Productivity', columns, rows };
  },

  // Lost leads grouped by reason + city.
  churn: async () => {
    const [byReason, byCity, total] = await Promise.all([
      Lead.aggregate([{ $match: { stage: 'churned' } }, { $group: { _id: '$lostReason', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
      Lead.aggregate([{ $match: { stage: 'churned' } }, { $group: { _id: '$city', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
      Lead.countDocuments({}),
    ]);
    const columns = ['dimension', 'value', 'churned', 'pct_of_all_leads'];
    const rows = [
      ...byReason.map((r) => ['reason', r._id || '(unset)', r.count, pct(r.count, total)]),
      ...byCity.map((r) => ['city', r._id || '(unset)', r.count, pct(r.count, total)]),
    ];
    return { title: 'Churn Analysis', columns, rows };
  },

  // Partner stages + campaign outcome totals.
  partner_outcomes: async () => {
    const [stageGroups, campaignTotals] = await Promise.all([
      Partner.aggregate([{ $group: {
        _id: '$stage', partners: { $sum: 1 },
        eventsHeld: { $sum: '$outcomes.eventsHeld' },
        registrations: { $sum: '$outcomes.registrations' },
        conversions: { $sum: '$outcomes.conversions' },
      } }]),
      Campaign.aggregate([{ $group: {
        _id: null, campaigns: { $sum: 1 }, budget: { $sum: '$budget' },
        registrations: { $sum: '$registrations' }, attendees: { $sum: '$attendees' }, conversions: { $sum: '$conversions' },
      } }]),
    ]);
    const columns = ['metric', 'value'];
    const rows = stageGroups.map((g) => [`partners.${g._id}`, g.partners]);
    for (const g of stageGroups) {
      rows.push([`partners.${g._id}.events`, g.eventsHeld]);
      rows.push([`partners.${g._id}.registrations`, g.registrations]);
      rows.push([`partners.${g._id}.conversions`, g.conversions]);
    }
    const c = campaignTotals[0] || {};
    rows.push(['campaigns.total', c.campaigns || 0]);
    rows.push(['campaigns.budget', c.budget || 0]);
    rows.push(['campaigns.registrations', c.registrations || 0]);
    rows.push(['campaigns.attendees', c.attendees || 0]);
    rows.push(['campaigns.conversions', c.conversions || 0]);
    return { title: 'Partnership Outcomes', columns, rows };
  },

  // Monthly cohort: leads created per month → share that activated, still active (retention).
  cohort: async () => {
    const groups = await Lead.aggregate([
      { $group: {
        _id: { month: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, stage: '$stage' },
        count: { $sum: 1 },
      } },
      { $sort: { '_id.month': 1 } },
    ]);
    const byMonth = new Map();
    for (const g of groups) {
      const month = g._id?.month || 'unknown';
      if (!byMonth.has(month)) byMonth.set(month, { total: 0, activated: 0, active: 0, churned: 0 });
      const m = byMonth.get(month);
      m.total += g.count;
      if (g._id.stage === 'activated' || g._id.stage === 'active') m.activated += g.count;
      if (g._id.stage === 'active') m.active += g.count;
      if (g._id.stage === 'churned') m.churned += g.count;
    }
    const columns = ['cohort_month', 'leads', 'activated', 'activation_pct', 'still_active', 'retention_pct', 'churned'];
    const rows = [...byMonth.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([month, m]) => [
      month, m.total, m.activated, pct(m.activated, m.total), m.active, pct(m.active, m.total), m.churned,
    ]);
    return { title: 'Cohort & Retention', columns, rows };
  },
};

// authz: role (crm:read)
router.get('/reports', authorize('crm:read'), async (req, res) => {
  try {
    const [schedules] = await Promise.all([CrmReportSchedule.find({}).sort({ createdAt: -1 }).limit(50).lean()]);
    return res.json({
      reports: Object.entries(REPORT_BUILDERS).map(([key, fn]) => ({ key })),
      schedules: schedules.map((s) => ({ ...s, id: String(s._id) })),
    });
  } catch (err) {
    logger.error(`CRM reports list error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// authz: role (crm:read) — JSON rows for the UI table.
router.get('/reports/:key', authorize('crm:read'), async (req, res) => {
  try {
    const build = REPORT_BUILDERS[req.params.key];
    if (!build) return res.status(404).json({ message: 'Unknown report' });
    const out = await build();
    return res.json({ key: req.params.key, ...out, generatedAt: new Date().toISOString() });
  } catch (err) {
    logger.error(`CRM report error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// authz: role (crm:read) — CSV download for the same aggregates.
router.get('/reports/:key/export', authorize('crm:read'), async (req, res) => {
  try {
    const build = REPORT_BUILDERS[req.params.key];
    if (!build) return res.status(404).json({ message: 'Unknown report' });
    const out = await build();
    const csv = toCsv(out.columns, out.rows);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="crm-${req.params.key}-${new Date().toISOString().slice(0, 10)}.csv"`);
    return res.send(csv);
  } catch (err) {
    logger.error(`CRM report export error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

const scheduleBody = z.object({
  reportKey: z.enum(Object.keys(REPORT_BUILDERS)),
  frequency: z.enum(['daily', 'weekly']).optional().default('daily'),
  recipients: z.array(z.string().trim().email().max(200)).min(1).max(10),
  active: z.boolean().optional().default(true),
}).strict();

// authz: role (crm:write)
router.post('/reports/schedules', authorize('crm:write'), async (req, res) => {
  try {
    const parsed = scheduleBody.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: 'Invalid schedule', issues: parsed.error.issues });
    const s = await CrmReportSchedule.create({ ...parsed.data, createdBy: actorId(req) });
    await auditLog('crm_report_scheduled', actorId(req), { scheduleId: s._id, reportKey: s.reportKey, ip: req.ip });
    return res.status(201).json({ id: String(s._id) });
  } catch (err) {
    logger.error(`CRM schedule create error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// authz: role (crm:write)
router.patch('/reports/schedules/:id', authorize('crm:write'), requireObjectId, async (req, res) => {
  try {
    const s = await CrmReportSchedule.findById(req.params.id);
    if (!s) return res.status(404).json({ message: 'Schedule not found' });
    const { active, frequency, recipients } = req.body || {};
    if (active !== undefined) s.active = Boolean(active);
    if (frequency && ['daily', 'weekly'].includes(frequency)) s.frequency = frequency;
    if (Array.isArray(recipients) && recipients.length) s.recipients = recipients;
    await s.save();
    return res.json({ id: String(s._id), active: s.active });
  } catch (err) {
    logger.error(`CRM schedule update error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// authz: role (crm:write)
router.delete('/reports/schedules/:id', authorize('crm:write'), requireObjectId, async (req, res) => {
  try {
    await CrmReportSchedule.findByIdAndDelete(req.params.id);
    await auditLog('crm_report_schedule_deleted', actorId(req), { scheduleId: req.params.id, ip: req.ip });
    return res.json({ deleted: true });
  } catch (err) {
    logger.error(`CRM schedule delete error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

/**
 * Scheduler hook (workers/scheduler.js): email each due CRM report schedule
 * as CSV. Aggregates only — no PII/PHI in any report builder above.
 */
export async function runCrmReportSchedules(now = new Date()) {
  const due = await CrmReportSchedule.find({ active: true }).limit(50).lean();
  let sent = 0;
  for (const s of due) {
    try {
      const windowMs = s.frequency === 'weekly' ? 7 * 864e5 : 864e5;
      if (s.lastRunAt && now - new Date(s.lastRunAt) < windowMs) continue;
      const build = REPORT_BUILDERS[s.reportKey];
      if (!build) continue;
      const out = await build();
      const csv = toCsv(out.columns, out.rows);
      let ok = false;
      let lastError = '';
      for (const to of s.recipients || []) {
        const result = await sendEmail({
          to,
          subject: `FindMedi CRM report: ${out.title} (${now.toISOString().slice(0, 10)})`,
          text: `${out.title} — ${out.rows.length} aggregate rows attached as CSV. No PII/PHI.`,
          attachments: [{
            filename: `crm-${s.reportKey}-${now.toISOString().slice(0, 10)}.csv`,
            content: Buffer.from(csv, 'utf8').toString('base64'),
            contentType: 'text/csv',
          }],
        });
        if (result?.success) ok = true;
        else lastError = result?.error || 'email failed';
      }
      await CrmReportSchedule.updateOne({ _id: s._id }, { $set: { lastRunAt: now, lastError: ok ? '' : lastError } });
      if (ok) sent += 1;
    } catch (e) {
      logger.warn(`[crmReports] schedule ${s._id}: ${e.message}`);
      await CrmReportSchedule.updateOne({ _id: s._id }, { $set: { lastRunAt: now, lastError: e.message } }).catch(() => {});
    }
  }
  return { sent };
}

// ─── Playbooks & Knowledge (File 24 §4.11) ──────────────────────────────────
// authz: role (crm:read)
router.get('/playbooks', authorize('crm:read'), async (req, res) => {
  try {
    const { category, status, q } = req.query;
    const filter = {};
    if (category && PLAYBOOK_CATEGORIES.includes(category)) filter.category = category;
    if (status && ['draft', 'published'].includes(status)) filter.status = status;
    if (q) filter.title = { $regex: String(q).slice(0, 100), $options: 'i' };

    const rows = await CrmPlaybook.find(filter).sort({ updatedAt: -1 }).limit(200).lean();
    return res.json({ playbooks: rows.map((p) => ({ ...p, id: String(p._id) })) });
  } catch (err) {
    logger.error(`CRM playbooks error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// authz: role (crm:read)
router.get('/playbooks/:id', authorize('crm:read'), requireObjectId, async (req, res) => {
  try {
    const p = await CrmPlaybook.findById(req.params.id).lean();
    if (!p) return res.status(404).json({ message: 'Playbook not found' });
    return res.json({ ...p, id: String(p._id) });
  } catch (err) {
    logger.error(`CRM get playbook error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

const playbookBody = z.object({
  title: z.string().trim().min(3).max(200),
  category: z.enum(PLAYBOOK_CATEGORIES).optional().default('sop'),
  summary: z.string().trim().max(500).optional().default(''),
  body: z.string().trim().min(10).max(30000),
  tags: z.array(z.string().max(40)).max(20).optional().default([]),
  audience: z.array(z.string().max(40)).max(10).optional().default([]),
  status: z.enum(['draft', 'published']).optional().default('draft'),
}).strict();

// authz: role (crm:write)
router.post('/playbooks', authorize('crm:write'), async (req, res) => {
  try {
    const parsed = playbookBody.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: 'Invalid playbook', issues: parsed.error.issues });
    const d = parsed.data;
    const p = await CrmPlaybook.create({
      ...d,
      publishedAt: d.status === 'published' ? new Date() : null,
      updatedBy: actorId(req),
    });
    await auditLog('crm_playbook_created', actorId(req), { playbookId: p._id, category: p.category, ip: req.ip });
    return res.status(201).json({ id: String(p._id), status: p.status });
  } catch (err) {
    logger.error(`CRM create playbook error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// authz: role (crm:write) — content edits bump the version.
router.patch('/playbooks/:id', authorize('crm:write'), requireObjectId, async (req, res) => {
  try {
    const p = await CrmPlaybook.findById(req.params.id);
    if (!p) return res.status(404).json({ message: 'Playbook not found' });

    const { title, category, summary, body, tags, audience, status } = req.body || {};
    const contentChanged = body !== undefined && body !== p.body;
    if (title !== undefined) p.title = String(title).trim().slice(0, 200);
    if (category && PLAYBOOK_CATEGORIES.includes(category)) p.category = category;
    if (summary !== undefined) p.summary = String(summary).slice(0, 500);
    if (body !== undefined) p.body = String(body).slice(0, 30000);
    if (Array.isArray(tags)) p.tags = tags.slice(0, 20);
    if (Array.isArray(audience)) p.audience = audience.slice(0, 10);
    if (status && ['draft', 'published'].includes(status)) {
      if (status === 'published' && p.status !== 'published') p.publishedAt = new Date();
      p.status = status;
    }
    if (contentChanged) p.version = (p.version || 1) + 1;
    p.updatedBy = actorId(req);
    await p.save();

    return res.json({ id: String(p._id), status: p.status, version: p.version });
  } catch (err) {
    logger.error(`CRM update playbook error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// authz: role (crm:write)
router.delete('/playbooks/:id', authorize('crm:write'), requireObjectId, async (req, res) => {
  try {
    await CrmPlaybook.findByIdAndDelete(req.params.id);
    await auditLog('crm_playbook_deleted', actorId(req), { playbookId: req.params.id, ip: req.ip });
    return res.json({ deleted: true });
  } catch (err) {
    logger.error(`CRM delete playbook error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// ─── Projects & Roadmap (File 24 §4.10 / Document 14) ──────────────────────
// authz: role (crm:read)
router.get('/roadmap-spec', authorize('crm:read'), (req, res) => {
  return res.json({
    phases: ROADMAP_PHASES,
    definitionOfDone: DEFINITION_OF_DONE,
    initiallyExcluded: INITIALLY_EXCLUDED_FEATURES,
    topRisks: TOP_RISKS_REGISTER,
  });
});

// ─── Business Model & Unit Economics (Document 16) ─────────────────────────
// authz: role (crm:read)
router.get('/unit-economics-spec', authorize('crm:read'), (req, res) => {
  return res.json({
    canvas: BUSINESS_MODEL_CANVAS,
    revenueStreams: REVENUE_STREAMS,
    categoryBenchmarks: CATEGORY_BENCHMARKS,
    legalCommercialGuardrails: LEGAL_COMMERCIAL_GUARDRAILS,
  });
});

// ─── Analytics Event Taxonomy (Document 17) ────────────────────────────────
// authz: role (crm:read)
router.get('/analytics-spec', authorize('crm:read'), (req, res) => {
  return res.json({
    catalog: ANALYTICS_EVENT_CATALOG,
    funnels: ANALYTICS_FUNNELS,
    sensitiveCategoriesMask: SENSITIVE_CATEGORIES_MASK,
    globalProperties: GLOBAL_ANALYTICS_PROPERTIES,
  });
});

// ─── QA & Test Plan (Document 18) ──────────────────────────────────────────
// authz: role (crm:read)
router.get('/qa-test-plan-spec', authorize('crm:read'), (req, res) => {
  return res.json({
    testPyramid: TEST_PYRAMID,
    testEnvironments: TEST_ENVIRONMENTS,
    criticalE2eJourneys: CRITICAL_E2E_JOURNEYS,
    featureMatrices: FEATURE_TEST_MATRICES,
    nonFunctionalTracks: NON_FUNCTIONAL_TRACKS,
    clinicalSafetyQa: CLINICAL_SAFETY_QA,
    releaseGates: RELEASE_GATES,
    uatPlan: UAT_PLAN,
    defectSeverities: DEFECT_SEVERITIES,
    qaChecklist: QA_RELEASE_CHECKLIST,
    catalogueSpecificFlows: CATALOGUE_SPECIFIC_FLOWS,
  });
});

// ─── Mobile App Strategy (Document 15) ────────────────────────────────────
// authz: role (crm:read)
router.get('/mobile-spec', authorize('crm:read'), (req, res) => {
  return res.json({
    architectureDecision: MOBILE_ARCHITECTURE_DECISION,
    appPortfolio: APP_PORTFOLIO,
    pwaSpecifications: PWA_SPECIFICATIONS,
    nativeCapabilities: NATIVE_CAPABILITY_MATRIX,
    securityControls: MOBILE_SECURITY_CONTROLS,
    performanceTargets: MOBILE_PERFORMANCE_TARGETS,
    rolloutPlan: MOBILE_ROLLOUT_PLAN,
  });
});

// ─── DevOps, Scaling & Cost Plan (Document 19) ───────────────────────────
// authz: role (crm:read)
router.get('/devops-scaling-spec', authorize('crm:read'), (req, res) => {
  return res.json({
    infraStages: INFRA_STAGES,
    envTopology: ENV_TOPOLOGY,
    ciCdPipeline: CI_CD_PIPELINE,
    sloDefinitions: SLO_DEFINITIONS,
    alertingRules: ALERTING_RULES,
    costBuckets: COST_BUCKETS,
    disasterRecoveryTiers: DISASTER_RECOVERY_TIERS,
    sreRunbooks: SRE_RUNBOOKS,
    hardeningGuardrails: HARDENING_GUARDRAILS,
  });
});

// ─── Support & Operations Playbooks (Document 20) ────────────────────────
// authz: role (crm:read)
router.get('/support-operations-spec', authorize('crm:read'), (req, res) => {
  return res.json({
    operatingModel: OPERATING_MODEL,
    supportChannelsSlas: SUPPORT_CHANNELS_SLAS,
    ticketTaxonomy: TICKET_TAXONOMY,
    coreSops: CORE_SOPS,
    escalationMatrix: ESCALATION_MATRIX,
    staffingModel: STAFFING_MODEL,
    communicationTemplates: COMMUNICATION_TEMPLATES,
    opsLaunchChecklist: OPS_LAUNCH_CHECKLIST,
  });
});

// ─── Marketing, Brand & SEO Plan (Document 21) ───────────────────────────
// authz: role (crm:read)
router.get('/marketing-seo-spec', authorize('crm:read'), (req, res) => {
  return res.json({
    brandFoundation: BRAND_FOUNDATION,
    principles: HEALTHCARE_MARKETING_PRINCIPLES,
    channelStrategy: CHANNEL_STRATEGY,
    seoSiteArchitecture: SEO_SITE_ARCHITECTURE,
    keywordClusters: KEYWORD_CLUSTERS,
    healthCalendar: HEALTH_CALENDAR_CAMPAIGNS,
    lifecycleCrm: LIFECYCLE_CRM_JOURNEYS,
    partnershipPlaybook: PARTNERSHIP_PLAYBOOK,
    complianceChecklist: MARKETING_COMPLIANCE_CHECKLIST,
    ninetyDayLaunchPlan: NINETY_DAY_LAUNCH_PLAN,
  });
});

// ─── Pitch / Investor Deck Outline (+ Q&A prep) (Document 22) ───────────
// authz: role (crm:read)
router.get('/pitch-deck-spec', authorize('crm:read'), (req, res) => {
  return res.json({
    pitchDeckSlides: PITCH_DECK_SLIDES,
    threeMinutePitch: THREE_MINUTE_PITCH,
    narrativeScript: NARRATIVE_SCRIPT,
    marketSizing: MARKET_SIZING_FRAMEWORK,
    investorQaMatrix: INVESTOR_QA_MATRIX,
    dueDiligenceDataRoom: DUE_DILIGENCE_DATA_ROOM,
    fundingPathAlternatives: FUNDING_PATH_ALTERNATIVES,
    gtmThreePhaseRoadmap: GTM_THREE_PHASE_ROADMAP,
  });
});

// ─── Super Admin Governance & Privacy Architecture (Document 23) ─────────
// authz: role (crm:read)
router.get('/superadmin-governance-spec', authorize('crm:read'), (req, res) => {
  return res.json({
    scopedAdminRoles: SCOPED_ADMIN_ROLES,
    dataAccessMatrix: DATA_ACCESS_MATRIX,
    breakGlassPolicy: BREAK_GLASS_POLICY,
    maskingConfig: MASKING_CONFIG,
    adminSidebarSpec: ADMIN_SIDEBAR_SPEC,
    privacyGuarantees: PRIVACY_GUARANTEES,
  });
});

// ─── Ops CRM & Team Management Specification (Document 24) ─────────────
// authz: role (crm:read)
router.get('/ops-team-spec', authorize('crm:read'), (req, res) => {
  return res.json({
    modules: CRM_NAV_MODULES,
    hybridArchitecture: HYBRID_ARCHITECTURE_DECISION,
    supplyStages: SUPPLY_PIPELINE_STAGES,
    lostReasons: LOST_REASONS,
    partnershipStages: PARTNERSHIP_STAGES,
    leadScoringWeights: LEAD_SCORING_WEIGHTS,
    providerHealthWeights: PROVIDER_HEALTH_WEIGHTS,
    roleKpis: ROLE_BASED_KPIS,
    automationRules: AUTOMATION_WORKFLOW_RULES,
    permissionsMatrix: CRM_ROLE_PERMISSIONS_MATRIX,
  });
});



// authz: role (crm:read)
router.get('/projects', authorize('crm:read'), async (req, res) => {
  try {
    const { status, kind, phase } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (kind) filter.kind = kind;
    if (phase) filter.phase = phase;

    const rows = await CrmProject.find(filter)
      .populate('ownerId', 'name email')
      .sort({ targetAt: 1, createdAt: -1 })
      .limit(200)
      .lean();

    return res.json({ projects: rows.map((p) => ({ ...p, id: String(p._id) })) });
  } catch (err) {
    logger.error(`CRM projects error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

const projectBody = z.object({
  title: z.string().trim().min(3).max(200),
  kind: z.enum(['project', 'release', 'initiative', 'ops_task']).optional().default('project'),
  phase: z.string().trim().max(60).optional().default(''),
  status: z.enum(['planned', 'in_progress', 'blocked', 'done', 'cancelled']).optional().default('planned'),
  ownerId: z.string().regex(OBJECT_ID).optional().nullable(),
  startAt: z.string().optional().nullable(),
  targetAt: z.string().optional().nullable(),
  progress: z.number().min(0).max(100).optional().default(0),
  externalRef: z.string().trim().max(300).optional().default(''),
  tags: z.array(z.string().max(40)).max(20).optional().default([]),
  notes: z.string().max(4000).optional().default(''),
}).strict();

// authz: role (crm:write)
router.post('/projects', authorize('crm:write'), async (req, res) => {
  try {
    const parsed = projectBody.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: 'Invalid project', issues: parsed.error.issues });
    const d = parsed.data;
    const p = await CrmProject.create({
      ...d,
      ownerId: d.ownerId || actorId(req),
      startAt: d.startAt ? new Date(d.startAt) : null,
      targetAt: d.targetAt ? new Date(d.targetAt) : null,
    });

    await auditLog('crm_project_created', actorId(req), { projectId: p._id, ip: req.ip });
    return res.status(201).json({ id: String(p._id), status: p.status });
  } catch (err) {
    logger.error(`CRM create project error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// authz: role (crm:write)
router.patch('/projects/:id', authorize('crm:write'), requireObjectId, async (req, res) => {
  try {
    const p = await CrmProject.findById(req.params.id);
    if (!p) return res.status(404).json({ message: 'Project not found' });

    const parsed = projectBody.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: 'Invalid project update', issues: parsed.error.issues });
    const d = parsed.data;
    for (const [k, v] of Object.entries(d)) {
      if (v === undefined) continue;
      if (k === 'startAt' || k === 'targetAt') p[k] = v ? new Date(v) : null;
      else p[k] = v;
    }
    await p.save();
    return res.json({ id: String(p._id), status: p.status, progress: p.progress });
  } catch (err) {
    logger.error(`CRM update project error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// authz: role (crm:write) — decision log entry (decision + why).
router.post('/projects/:id/decisions', authorize('crm:write'), requireObjectId, async (req, res) => {
  try {
    const p = await CrmProject.findById(req.params.id);
    if (!p) return res.status(404).json({ message: 'Project not found' });
    const { decision, why } = req.body || {};
    if (!decision || String(decision).trim().length < 3) {
      return res.status(400).json({ message: 'decision required (min 3 chars)' });
    }

    p.decisionLog.push({
      decision: String(decision).trim().slice(0, 1000),
      why: String(why || '').trim().slice(0, 2000),
      at: new Date(),
      by: actorId(req),
    });
    await p.save();

    await auditLog('crm_project_decision_logged', actorId(req), { projectId: p._id, ip: req.ip });
    return res.status(201).json({ id: String(p._id), decisions: p.decisionLog.length });
  } catch (err) {
    logger.error(`CRM project decision error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// authz: role (crm:write)
router.delete('/projects/:id', authorize('crm:write'), requireObjectId, async (req, res) => {
  try {
    const p = await CrmProject.findByIdAndDelete(req.params.id);
    if (!p) return res.status(404).json({ message: 'Project not found' });
    await auditLog('crm_project_deleted', actorId(req), { projectId: req.params.id, ip: req.ip });
    return res.json({ deleted: true });
  } catch (err) {
    logger.error(`CRM delete project error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

export default router;
