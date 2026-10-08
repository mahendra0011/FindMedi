import express from 'express';
import Service from '../models/Service.js';
import Provider from '../models/Provider.js';
import { protect } from '../middleware/auth.js';
import { authorizeObject } from '../middleware/authorize.js';
import { auditLog } from '../middleware/audit.js';
import { validate, createServiceSchema, updateServiceSchema } from '../utils/validate.js';
import { safeSearchRegex } from '../utils/escapeRegex.js';

// The provider's own workspace (10.md 4.2 `CRUD /api/provider/services`).
// Nothing here reads by guesswork: a list is scoped to the caller's providers,
// and a write proves ownership of the PARENT provider (or of the service's
// parent, via ownerLoader) before it touches a row.
const router = express.Router();
router.use(protect);

const OBJECT_ID = /^[0-9a-f]{24}$/i;
const requireObjectId = (req, res, next) => (
  OBJECT_ID.test(String(req.params.id))
    ? next()
    : res.status(404).json({ message: 'Not found' })
);

const toPositiveInt = (value, fallback, max) => {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
};

// authz: self
//
// `providerId` narrows the list but can never widen it: a caller asking for a
// provider they do not own gets 404, not an empty 200 that would confirm the
// id. Superadmin is the ops exception and sees everything.
router.get('/', async (req, res) => {
  try {
    const { providerId, active, q, page, limit } = req.query;
    const filter = {};
    if (req.user.role === 'superadmin') {
      if (providerId) filter.providerId = String(providerId);
    } else {
      const owned = await Provider.find({ ownerUserId: req.user._id ?? req.user.id })
        .select('_id')
        .lean();
      const ids = owned.map((p) => String(p._id));
      if (providerId) {
        if (!ids.includes(String(providerId))) {
          return res.status(404).json({ message: 'Not found' });
        }
        filter.providerId = providerId;
      } else {
        filter.providerId = { $in: ids };
      }
    }
    if (active === 'true') filter.isActive = true;
    if (active === 'false') filter.isActive = false;
    const search = safeSearchRegex(q);
    if (search) filter.$or = [{ name: search }, { description: search }];

    const pageSize = toPositiveInt(limit, 20, 100);
    const pageNum = toPositiveInt(page, 1, 10000);
    const [services, total] = await Promise.all([
      Service.find(filter)
        .select('-updatedAt -__v')
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * pageSize)
        .limit(pageSize)
        .lean(),
      Service.countDocuments(filter),
    ]);
    return res.json({ services, total, page: pageNum, pages: Math.ceil(total / pageSize) || 1, limit: pageSize });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// authz: object
//
// Ownership is proven against the PARENT provider, so a caller cannot attach a
// service to somebody else's listing by naming their providerId. Validation
// runs first so a malformed providerId is a 400 rather than a mongoose cast
// error inside the guard.
router.post('/', validate(createServiceSchema), authorizeObject({
  model: Provider,
  idFrom: (req) => req.body.providerId,
  ownerField: 'ownerUserId',
  actorRoles: [],
  write: true,
}), async (req, res) => {
  try {
    const service = await Service.create(req.body);
    await auditLog('create_service', req.user._id ?? req.user.id, {
      serviceId: service._id, providerId: service.providerId, ip: req.ip, userAgent: req.get('user-agent'),
    });
    return res.status(201).json(service);
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
});

// authz: object
//
// A service row does not carry the owner, so the guard resolves it through the
// parent provider (ownerLoader) - the deny-by-default path AUTHZ-B-01 asks for
// instead of a hand-rolled `provider.ownerUserId === req.user._id` in the
// handler.
router.patch('/:id', requireObjectId, validate(updateServiceSchema), authorizeObject({
  model: Service,
  idFrom: (req) => req.params.id,
  ownerLoader: async (doc) => {
    const provider = await Provider.findById(doc.providerId);
    return provider?.ownerUserId ?? null;
  },
  actorRoles: [],
  write: true,
}), async (req, res) => {
  try {
    const service = req.scoped;
    for (const [key, value] of Object.entries(req.body)) service[key] = value;
    await service.save();
    await auditLog('update_service', req.user._id ?? req.user.id, {
      serviceId: service._id, ip: req.ip, userAgent: req.get('user-agent'),
    });
    return res.json(service);
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
});

// authz: object
router.delete('/:id', requireObjectId, authorizeObject({
  model: Service,
  idFrom: (req) => req.params.id,
  ownerLoader: async (doc) => {
    const provider = await Provider.findById(doc.providerId);
    return provider?.ownerUserId ?? null;
  },
  actorRoles: [],
  write: true,
}), async (req, res) => {
  try {
    await Service.findByIdAndDelete(req.params.id);
    await auditLog('delete_service', req.user._id ?? req.user.id, {
      serviceId: req.params.id, ip: req.ip, userAgent: req.get('user-agent'),
    });
    return res.json({ _id: req.params.id, deleted: true });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
});

export default router;
