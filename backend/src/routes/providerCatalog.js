import express from 'express';
import Plan from '../models/Plan.js';
import Product from '../models/Product.js';
import Provider from '../models/Provider.js';
import { protect } from '../middleware/auth.js';
import { authorizeObject } from '../middleware/authorize.js';
import { auditLog } from '../middleware/audit.js';
import {
  validate, createPlanSchema, updatePlanSchema, createProductSchema, updateProductSchema,
} from '../utils/validate.js';
import { safeSearchRegex } from '../utils/escapeRegex.js';

// The provider's CATALOGUE half (10.md 4.2: CRUD /api/provider/plans and
// /api/provider/products; models from 10.md 2.7 and 2.11). It mirrors
// providerServices.js deliberately — same owner-scoped list, same
// authorizeObject write guard — so the three catalogue surfaces cannot drift
// into three different meanings of "the caller's own provider".
//
// DELETE ARCHIVES IN PLACE for both resources. A plan is referenced by
// memberships and a product by orders; hard-deleting the catalogue row would
// orphan the financial history that cites it, and an archived row still answers
// "what did they agree to?" months later. (providerServices hard-deletes
// because nothing references a service row yet.)
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

// Shared owner-scope: superadmin sees everything, everyone else is narrowed to
// the providers they own. A `providerId` outside that set is a 404 — an empty
// 200 would confirm the id exists, which is the oracle AUTHZ-M-01 forbids.
const buildOwnerScope = async (req, res, queryProviderId) => {
  if (req.user.role === 'superadmin') {
    return queryProviderId ? { filter: { providerId: queryProviderId }, scoped: false } : { filter: {}, scoped: false };
  }
  const owned = await Provider.find({ ownerUserId: req.user._id ?? req.user.id })
    .select('_id')
    .lean();
  const ids = owned.map((p) => String(p._id));
  if (queryProviderId) {
    if (!ids.includes(String(queryProviderId))) {
      res.status(404).json({ message: 'Not found' });
      return null;
    }
    return { filter: { providerId: queryProviderId }, scoped: true };
  }
  return { filter: { providerId: { $in: ids } }, scoped: true };
};

const listHandler = (Model, key, searchFields) => async (req, res) => {
  try {
    const { status, q, page, limit } = req.query;
    // `providerId` for plans, `vendorId` for products — the row's own field
    // name, so a caller reading the schema picks the right one; either works
    // because both address the same parent provider.
    const parentProviderId = req.query.providerId ?? req.query.vendorId;
    const scope = await buildOwnerScope(req, res, parentProviderId);
    if (!scope) return undefined;
    const filter = scope.filter;
    if (status) filter.status = status;
    const search = safeSearchRegex(q);
    if (search) filter.$or = searchFields.map((field) => ({ [field]: search }));

    const pageSize = toPositiveInt(limit, 20, 100);
    const pageNum = toPositiveInt(page, 1, 10000);
    const [rows, total] = await Promise.all([
      Model.find(filter)
        .select('-updatedAt -__v')
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * pageSize)
        .limit(pageSize)
        .lean(),
      Model.countDocuments(filter),
    ]);
    return res.json({ [key]: rows, total, page: pageNum, pages: Math.ceil(total / pageSize) || 1, limit: pageSize });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// authz: self
router.get('/plans', listHandler(Plan, 'plans', ['name']));

// authz: object
//
// The plan attaches to a provider the caller must OWN — the guard runs on the
// PARENT row (ownerUserId) before any Plan.create, same seam as
// providerServices POST.
router.post('/plans', validate(createPlanSchema), authorizeObject({
  model: Provider,
  idFrom: (req) => req.body.providerId,
  ownerField: 'ownerUserId',
  actorRoles: [],
  write: true,
}), async (req, res) => {
  try {
    const plan = await Plan.create(req.body);
    await auditLog('create_plan', req.user._id ?? req.user.id, {
      planId: plan._id, providerId: plan.providerId, ip: req.ip, userAgent: req.get('user-agent'),
    });
    return res.status(201).json(plan);
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
});

// authz: object
router.patch('/plans/:id', requireObjectId, validate(updatePlanSchema), authorizeObject({
  model: Plan,
  idFrom: (req) => req.params.id,
  ownerLoader: async (doc) => {
    const provider = await Provider.findById(doc.providerId);
    return provider?.ownerUserId ?? null;
  },
  actorRoles: [],
  write: true,
}), async (req, res) => {
  try {
    const plan = req.scoped;
    for (const [key, value] of Object.entries(req.body)) plan[key] = value;
    await plan.save();
    await auditLog('update_plan', req.user._id ?? req.user.id, {
      planId: plan._id, ip: req.ip, userAgent: req.get('user-agent'),
    });
    return res.json(plan);
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
});

// authz: object
router.delete('/plans/:id', requireObjectId, authorizeObject({
  model: Plan,
  idFrom: (req) => req.params.id,
  ownerLoader: async (doc) => {
    const provider = await Provider.findById(doc.providerId);
    return provider?.ownerUserId ?? null;
  },
  actorRoles: [],
  write: true,
}), async (req, res) => {
  try {
    const plan = req.scoped;
    plan.status = 'archived';
    await plan.save();
    await auditLog('archive_plan', req.user._id ?? req.user.id, {
      planId: plan._id, ip: req.ip, userAgent: req.get('user-agent'),
    });
    return res.json({ _id: plan._id, status: 'archived' });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
});

// authz: self
router.get('/products', listHandler(Product, 'products', ['name', 'brand']));

// authz: object
router.post('/products', validate(createProductSchema), authorizeObject({
  model: Provider,
  idFrom: (req) => req.body.vendorId,
  ownerField: 'ownerUserId',
  actorRoles: [],
  write: true,
}), async (req, res) => {
  try {
    const product = await Product.create(req.body);
    await auditLog('create_product', req.user._id ?? req.user.id, {
      productId: product._id, vendorId: product.vendorId, ip: req.ip, userAgent: req.get('user-agent'),
    });
    return res.status(201).json(product);
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
});

// authz: object
router.patch('/products/:id', requireObjectId, validate(updateProductSchema), authorizeObject({
  model: Product,
  idFrom: (req) => req.params.id,
  ownerLoader: async (doc) => {
    const provider = await Provider.findById(doc.vendorId);
    return provider?.ownerUserId ?? null;
  },
  actorRoles: [],
  write: true,
}), async (req, res) => {
  try {
    const product = req.scoped;
    for (const [key, value] of Object.entries(req.body)) product[key] = value;
    await product.save();
    await auditLog('update_product', req.user._id ?? req.user.id, {
      productId: product._id, ip: req.ip, userAgent: req.get('user-agent'),
    });
    return res.json(product);
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
});

// authz: object
router.delete('/products/:id', requireObjectId, authorizeObject({
  model: Product,
  idFrom: (req) => req.params.id,
  ownerLoader: async (doc) => {
    const provider = await Provider.findById(doc.vendorId);
    return provider?.ownerUserId ?? null;
  },
  actorRoles: [],
  write: true,
}), async (req, res) => {
  try {
    const product = req.scoped;
    product.status = 'archived';
    await product.save();
    await auditLog('archive_product', req.user._id ?? req.user.id, {
      productId: product._id, ip: req.ip, userAgent: req.get('user-agent'),
    });
    return res.json({ _id: product._id, status: 'archived' });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
});

export default router;
