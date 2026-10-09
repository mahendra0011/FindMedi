import express from 'express';
import NotifyTemplate from '../models/NotifyTemplate.js';
import { protect, authorize } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';
import { extractVariables, lintTemplate, renderTemplate } from '../lib/notifyTemplates.js';
import logger from '../config/logger.js';

// File 22 P2-35: template registry (CRUD + lint + preview). Sending stays in
// notificationService; this router owns the CONTENT contract.

const router = express.Router();
router.use(protect);

const actorId = (req) => req.user._id ?? req.user.id;
const tenant = (req) => ({ hospitalId: req.user.hospitalId });

router.get('/templates', authorize('staff:manage'), async (req, res) => {
  try {
    const filter = tenant(req);
    if (req.query.channel) filter.channel = req.query.channel;
    const rows = await NotifyTemplate.find(filter).sort({ key: 1 }).limit(300).lean();
    return res.json({ templates: rows });
  } catch (err) {
    logger.error(`Notify templates error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.post('/templates', authorize('staff:manage'), async (req, res) => {
  try {
    const { key, name, channel, body, subject, dltTemplateId, dltEntityId } = req.body || {};
    if (!key || !name || !channel || !body) {
      return res.status(400).json({ message: 'key + name + channel + body required' });
    }
    const variables = Array.isArray(req.body.variables) && req.body.variables.length
      ? req.body.variables.map((v) => String(v).slice(0, 60))
      : extractVariables(body);
    const lint = lintTemplate({ body, variables, channel, dltTemplateId });
    if (lint.errors.length) {
      return res.status(422).json({ message: 'Template lint failed', code: 'TEMPLATE_LINT', lint });
    }
    const row = await NotifyTemplate.findOneAndUpdate(
      { ...tenant(req), key, channel },
      {
        $set: {
          name, body, subject: subject || '', variables,
          dltTemplateId: dltTemplateId || '', dltEntityId: dltEntityId || '',
          active: true, createdBy: actorId(req),
        },
      },
      { upsert: true, new: true },
    );
    await auditLog('notify_template_saved', actorId(req), { templateId: row._id, key, ip: req.ip });
    return res.status(201).json({ id: String(row._id), lint });
  } catch (err) {
    if (err?.code === 11000) return res.status(409).json({ message: 'Template key+channel exists' });
    logger.error(`Notify template save error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.patch('/templates/:id', authorize('staff:manage'), async (req, res) => {
  try {
    const allowed = ['name', 'body', 'subject', 'dltTemplateId', 'dltEntityId', 'active'];
    const set = Object.fromEntries(Object.entries(req.body || {}).filter(([k]) => allowed.includes(k)));
    if (set.body !== undefined) {
      const variables = extractVariables(set.body);
      const channels = req.body.channel ? [req.body.channel] : ['sms'];
      const lint = lintTemplate({ body: set.body, variables, channel: channels[0], dltTemplateId: set.dltTemplateId });
      if (lint.errors.length) {
        return res.status(422).json({ message: 'Template lint failed', code: 'TEMPLATE_LINT', lint });
      }
      set.variables = variables;
    }
    const row = await NotifyTemplate.findOneAndUpdate(
      { _id: req.params.id, ...tenant(req) }, { $set: set }, { new: true },
    );
    if (!row) return res.status(404).json({ message: 'Not found' });
    return res.json({ id: String(row._id) });
  } catch (err) {
    logger.error(`Notify template patch error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// Preview: lint + render with sample values (nothing is sent).
router.post('/templates/:id/preview', authorize('staff:manage'), async (req, res) => {
  try {
    const row = await NotifyTemplate.findOne({ _id: req.params.id, ...tenant(req) }).lean();
    if (!row) return res.status(404).json({ message: 'Not found' });
    const lint = lintTemplate({ body: row.body, variables: row.variables, channel: row.channel, dltTemplateId: row.dltTemplateId });
    let rendered = null;
    let renderError = null;
    try {
      rendered = renderTemplate(row.body, req.body?.values || {}, row.variables);
    } catch (e) {
      renderError = e.code === 'TEMPLATE_VARS_MISSING' ? { code: e.code, missing: e.missing } : { code: 'RENDER_FAILED' };
    }
    return res.json({ lint, rendered, renderError, channel: row.channel });
  } catch (err) {
    logger.error(`Notify preview error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

export { renderTemplate };
export default router;
