import express from 'express';
import ProviderTypeConfig from '../models/ProviderTypeConfig.js';
import { protect, requireRole } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';
import { validate, createProviderTypeConfigSchema, updateProviderTypeConfigSchema } from '../utils/validate.js';

const router = express.Router();

// Every route below reconfigures what new applicants are asked for and who may
// approve them, so the whole router is platform-only (AUTHZ-B-04: a hospital
// admin must not edit platform-wide onboarding policy) - superadmin plus the
// catalog_manager who owns join-wizard configuration (8.md 4).
router.use(protect, requireRole(['superadmin', 'catalog_manager']));

// authz: inherited
router.get('/', async (req, res) => {
  try {
    const { isActive } = req.query;
    const filter = {};
    if (isActive === 'true') filter.isActive = true;
    if (isActive === 'false') filter.isActive = false;
    const configs = await ProviderTypeConfig.find(filter).sort({ group: 1, label: 1 }).lean();
    return res.json({ providerTypes: configs });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// authz: inherited
router.get('/:id', async (req, res) => {
  try {
    const config = await ProviderTypeConfig.findById(req.params.id).lean();
    if (!config) return res.status(404).json({ message: 'Provider type not found' });
    return res.json(config);
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
});

// authz: inherited
router.post('/', validate(createProviderTypeConfigSchema), async (req, res) => {
  try {
    const existing = await ProviderTypeConfig.exists({ typeKey: req.body.typeKey });
    if (existing) return res.status(409).json({ message: 'typeKey already exists' });
    const config = await ProviderTypeConfig.create(req.body);
    await auditLog('create_provider_type_config', req.user._id ?? req.user.id, {
      typeKey: config.typeKey, version: config.version, ip: req.ip, userAgent: req.get('user-agent'),
    });
    return res.status(201).json(config);
  } catch (err) {
    if (err?.code === 11000) return res.status(409).json({ message: 'typeKey already exists' });
    return res.status(400).json({ message: err.message });
  }
});

// authz: inherited
//
// typeKey is immutable (it is the join wizard's stable identifier and the key
// Provider rows already reference); every edit bumps `version` so applications
// submitted under an older config stay reproducible (10.md 2.2).
router.put('/:id', validate(updateProviderTypeConfigSchema), async (req, res) => {
  try {
    const config = await ProviderTypeConfig.findById(req.params.id);
    if (!config) return res.status(404).json({ message: 'Provider type not found' });
    for (const [key, value] of Object.entries(req.body)) config[key] = value;
    config.version = (config.version || 1) + 1;
    await config.save();
    await auditLog('update_provider_type_config', req.user._id ?? req.user.id, {
      typeKey: config.typeKey, version: config.version, ip: req.ip, userAgent: req.get('user-agent'),
    });
    return res.json(config);
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
});

// authz: inherited
router.delete('/:id', async (req, res) => {
  try {
    const config = await ProviderTypeConfig.findByIdAndDelete(req.params.id);
    if (!config) return res.status(404).json({ message: 'Provider type not found' });
    await auditLog('delete_provider_type_config', req.user._id ?? req.user.id, {
      typeKey: config.typeKey, ip: req.ip, userAgent: req.get('user-agent'),
    });
    return res.json({ _id: config._id, deleted: true });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
});

export default router;
