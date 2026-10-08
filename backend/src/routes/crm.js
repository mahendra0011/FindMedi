import express from 'express';
import { z } from 'zod';
import Lead, { LEAD_STAGES_LIST } from '../models/Lead.js';
import Partner from '../models/Partner.js';
import Activity from '../models/Activity.js';
import Task from '../models/Task.js';
import ProviderApplication from '../models/ProviderApplication.js';
import Provider from '../models/Provider.js';
import ProviderDocument from '../models/ProviderDocument.js';
import Dispute from '../models/Dispute.js';
import SupportTicket from '../models/SupportTicket.js';
import { protect, authorize } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';
import { encryptPhi, decryptPhi, looksMasked } from '../utils/phiFields.js';
import logger from '../config/logger.js';

// File 24: supply/partnership CRM + command center. Territory/ownership
// visibility: platform_admin sees all; others see own + unassigned.
// Contact PII is encrypted at rest; revealed only to owner/platform_admin,
// masked otherwise. NO patient/PHI fields anywhere in this router.

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
const showContacts = (req, lead) => {
  const mine = String(lead.ownerId || '') === String(actorId(req));
  const list = lead.contacts || [];
  return (mine || isPlatformAdmin(req)) ? list.map(revealContact) : list.map(maskContact);
};

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
  tags: z.array(z.string().max(40)).max(20).optional().default([]),
}).strict();

const stageBody = z.object({ stage: z.enum(LEAD_STAGES_LIST), lostReason: z.string().max(300).optional().default('') }).strict();

// ─── Command center (aggregates only, k-anonymous) ───────────────────────────
// authz: role (crm:read)
router.get('/command-center', authorize('crm:read'), async (req, res) => {
  try {
    const { city } = req.query;
    const leadMatch = city ? { city } : {};
    const [stages, activeProviders, pendingApps, openDisputes, openTickets, expiringDocs] = await Promise.all([
      Lead.aggregate([{ $match: leadMatch }, { $group: { _id: '$stage', count: { $sum: 1 } } }]),
      Provider.countDocuments({ status: 'live', ...(city ? { 'address.city': city } : {}) }),
      ProviderApplication.countDocuments({ status: { $in: ['submitted', 'resubmitted', 'under_review'] } }),
      Dispute.countDocuments({ status: { $in: ['open', 'in_review'] } }),
      SupportTicket.countDocuments({ status: { $in: ['open', 'pending'] } }),
      ProviderDocument.countDocuments({ status: 'verified', expiryDate: { $lt: new Date(Date.now() + 30 * 864e5) } }),
    ]);
    const funnel = {}; // counts only, no identities
    for (const s of stages) funnel[s._id] = s.count;
    return res.json({
      funnel, activeProviders, pendingApps, openDisputes, openTickets, expiringDocs30d: expiringDocs,
    });
  } catch (err) {
    logger.error(`CRM command-center error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// ─── Leads ───────────────────────────────────────────────────────────────────
// authz: role (crm:read / crm:write)
router.get('/leads', authorize('crm:read'), async (req, res) => {
  try {
    const { stage, city, owner, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (stage) filter.stage = stage;
    if (city) filter.city = city;
    if (!isPlatformAdmin(req)) {
      filter.$or = [{ ownerId: actorId(req) }, { ownerId: null }];
    } else if (owner) filter.ownerId = owner;
    const [rows, total] = await Promise.all([
      Lead.find(filter).sort({ updatedAt: -1 }).skip((page - 1) * limit).limit(Math.min(100, +limit || 50)).lean(),
      Lead.countDocuments(filter),
    ]);
    return res.json({
      leads: rows.map((l) => ({ ...l, id: String(l._id), contacts: showContacts(req, l) })),
      total, page: +page,
    });
  } catch (err) {
    logger.error(`CRM leads error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.post('/leads', authorize('crm:write'), async (req, res) => {
  try {
    const parsed = leadBody.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: 'Invalid lead', issues: parsed.error.issues });
    const d = parsed.data;
    const contacts = (d.contacts || []).map((c) => ({
      name: c.name, role: c.role,
      phoneEnc: looksMasked(c.phone) ? '' : encryptPhi('Lead', 'contacts.phone', c.phone),
      emailEnc: looksMasked(c.email) ? '' : encryptPhi('Lead', 'contacts.email', c.email),
    }));
    const lead = await Lead.create({
      ...d, contacts, ownerId: d.ownerId || actorId(req),
      territoryId: d.territoryId || null, createdBy: actorId(req),
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
      objectType: 'lead', objectId: lead._id, type: 'stage_change',
      by: actorId(req), outcome: `${from}→${lead.stage}`,
    });
    await auditLog('crm_lead_stage', actorId(req), { leadId: lead._id, from, to: lead.stage, ip: req.ip });
    return res.json({ id: String(lead._id), stage: lead.stage });
  } catch (err) {
    logger.error(`CRM stage error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.post('/leads/:id/convert', authorize('crm:write'), requireObjectId, async (req, res) => {
  try {
    const { applicationId } = req.body || {};
    if (!OBJECT_ID.test(String(applicationId || ''))) return res.status(400).json({ message: 'Valid applicationId required' });
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

// ─── Partners (basic pipeline) ──────────────────────────────────────────────
router.get('/partners', authorize('crm:read'), async (req, res) => {
  try {
    const { stage, city } = req.query;
    const filter = {};
    if (stage) filter.stage = stage;
    if (city) filter.city = city;
    if (!isPlatformAdmin(req)) filter.ownerId = actorId(req);
    const rows = await Partner.find(filter).sort({ updatedAt: -1 }).limit(100).lean();
    return res.json({ partners: rows.map((p) => ({ ...p, id: String(p._id) })) });
  } catch (err) {
    logger.error(`CRM partners error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.post('/partners', authorize('crm:write'), async (req, res) => {
  try {
    const { orgName, type, city, ownerId } = req.body || {};
    if (!orgName || String(orgName).trim().length < 2) return res.status(400).json({ message: 'orgName required' });
    const PARTNER_TYPES = ['rwa', 'corporate', 'ngo', 'association', 'school', 'insurer', 'govt', 'hospital_group', 'media', 'other'];
    if (type && !PARTNER_TYPES.includes(type)) return res.status(400).json({ message: 'Invalid type' });
    const p = await Partner.create({
      orgName: String(orgName).trim(), type: type || 'other', city: city || '',
      ownerId: ownerId || actorId(req),
    });
    await auditLog('crm_partner_created', actorId(req), { partnerId: p._id, ip: req.ip });
    return res.status(201).json({ id: String(p._id), stage: p.stage });
  } catch (err) {
    logger.error(`CRM create partner error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// ─── Tasks (own + team) ─────────────────────────────────────────────────────
router.get('/tasks', authorize('crm:read'), async (req, res) => {
  try {
    const { status, mine } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (mine === '1' || !isPlatformAdmin(req)) filter.ownerId = actorId(req);
    const rows = await Task.find(filter).sort({ dueAt: 1 }).limit(200).lean();
    return res.json({ tasks: rows.map((t) => ({ ...t, id: String(t._id) })) });
  } catch (err) {
    logger.error(`CRM tasks error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.post('/tasks', authorize('crm:write'), async (req, res) => {
  try {
    const { title, type, dueAt, priority, ownerId, related } = req.body || {};
    if (!title || String(title).trim().length < 3) return res.status(400).json({ message: 'title required' });
    const t = await Task.create({
      title: String(title).trim().slice(0, 300), type: type || 'follow_up',
      dueAt: dueAt || null, priority: priority || 'medium',
      ownerId: ownerId || actorId(req), related: related || { type: 'none' },
      createdBy: actorId(req),
    });
    return res.status(201).json({ id: String(t._id), status: t.status });
  } catch (err) {
    logger.error(`CRM create task error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

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
router.get('/activities', authorize('crm:read'), async (req, res) => {
  try {
    const { objectType, objectId } = req.query;
    if (!['lead', 'account', 'partner', 'camp'].includes(String(objectType)) || !OBJECT_ID.test(String(objectId || ''))) {
      return res.status(400).json({ message: 'objectType + objectId required' });
    }
    const rows = await Activity.find({ objectType, objectId }).sort({ at: -1 }).limit(100).lean();
    return res.json({ activities: rows });
  } catch (err) {
    logger.error(`CRM activities error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

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
      objectType, objectId, type, by: actorId(req),
      outcome: String(outcome || '').slice(0, 300), summary: String(summary || '').slice(0, 2000),
    });
    return res.status(201).json({ id: String(a._id) });
  } catch (err) {
    logger.error(`CRM activity error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

export default router;
