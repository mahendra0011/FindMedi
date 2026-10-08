import express from 'express';
import Category from '../models/Category.js';
import { protect, requireRole } from '../middleware/auth.js';
import { validate, createCategorySchema, updateCategorySchema, mergeCategorySchema } from '../utils/validate.js';
import { escapeRegex, safeSearchRegex } from '../utils/escapeRegex.js';
import { deriveCategoryCode, CATEGORY_TYPES } from '../lib/taxonomy.js';
import { getCache, setCache, flushCachePattern } from '../config/redis.js';

const router = express.Router();

const PUBLIC_CACHE_PREFIX = 'categories_public';
const PUBLIC_CACHE_TTL = 300;
const PUBLIC_FIELDS = 'code name nameHi aliases type parent path level tier icon displayOrder adClaimsRestricted';
const WRITABLE_FIELDS = ['name', 'nameHi', 'type', 'aliases', 'description', 'parent', 'icon', 'isActive', 'displayOrder', 'tier', 'regulatedBy', 'adClaimsRestricted', 'externalCodes'];

const invalidatePublicCache = () => flushCachePattern(`${PUBLIC_CACHE_PREFIX}:*`);

const loadLineage = async (categoryId) => {
  const chain = [];
  let id = categoryId;
  let depth = 0;
  while (id && depth < 8) {
    depth += 1;
    const doc = await Category.findById(id).select('_id code path level parent type name').lean();
    if (!doc) return null;
    chain.push(doc);
    if (doc.code && doc.path) return chain;
    id = doc.parent;
  }
  return id ? null : (chain.length ? chain : null);
};

const writeLineageStep = (doc, code, path, level) =>
  Category.updateOne({ _id: doc._id }, { $set: { code, path, level } }, { overwriteImmutable: true });

const resolveLineage = async (categoryId) => {
  const chain = await loadLineage(categoryId);
  if (!chain) return null;

  let anchorIndex = chain.findIndex((doc) => doc.code && doc.path);
  let prefix;
  let level;
  if (anchorIndex === -1) {
    anchorIndex = chain.length - 1;
    const top = chain[anchorIndex];
    const code = top.code || deriveCategoryCode(top.type, top.name);
    prefix = code;
    level = 0;
    if (top.code !== code || top.path !== prefix || top.level !== level) {
      await writeLineageStep(top, code, prefix, level);
    }
  } else {
    prefix = chain[anchorIndex].path;
    level = chain[anchorIndex].level ?? 0;
  }

  for (let i = anchorIndex - 1; i >= 0; i -= 1) {
    const doc = chain[i];
    const code = doc.code || deriveCategoryCode(doc.type, doc.name);
    prefix = `${prefix}/${code}`;
    level += 1;
    if (doc.code !== code || doc.path !== prefix || doc.level !== level) {
      await writeLineageStep(doc, code, prefix, level);
    }
  }
  return { path: prefix, level: level + 1 };
};

// authz: public
router.get('/public', async (req, res) => {
  try {
    const { type, parent, q } = req.query;
    const cacheKey = `${PUBLIC_CACHE_PREFIX}:${type || 'all'}:${parent || '-'}:${q || '-'}`;
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.removeHeader('Pragma');

    const cached = await getCache(cacheKey);
    if (cached) {
      res.setHeader('X-Cache', 'HIT');
      return res.json(cached);
    }

    const filter = { isActive: true };
    if (type) filter.type = type;
    if (parent) filter.parent = parent;
    const term = safeSearchRegex(q);
    if (term) filter.$or = [{ name: term }, { aliases: term }];

    const categories = await Category.find(filter)
      .select(PUBLIC_FIELDS)
      .sort({ type: 1, displayOrder: 1, name: 1 })
      .lean();

    const payload = { categories, types: CATEGORY_TYPES };
    await setCache(cacheKey, payload, PUBLIC_CACHE_TTL);
    res.json(payload);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// 8.md 4: the whole category tree (list, create, edit, delete, merge) is the
// catalog_manager's console - it is configuration of what the marketplace can
// even sell, so it is platform-level and NEVER tenant-scoped. The public read
// above stays anonymous; everything below is superadmin or catalog_manager.
router.get('/', protect, requireRole(['superadmin', 'catalog_manager']), async (req, res) => {
  try {
    const { type, search } = req.query;
    const filter = {};
    if (type) filter.type = type;
    if (search) {
      const term = safeSearchRegex(search);
      if (term) filter.$or = [{ name: term }, { aliases: term }, { code: term }];
    }
    const categories = await Category.find(filter).sort({ type: 1, displayOrder: 1 });
    res.json({ categories });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/', protect, requireRole(['superadmin', 'catalog_manager']), validate(createCategorySchema), async (req, res) => {
  try {
    const body = { ...req.body };
    if (!body.code) body.code = deriveCategoryCode(body.type, body.name);

    if (body.parent) {
      const lineage = await resolveLineage(body.parent);
      if (!lineage) return res.status(400).json({ message: 'Parent category not found' });
      body.path = `${lineage.path}/${body.code}`;
      body.level = lineage.level;
    } else {
      body.path = body.code;
      body.level = 0;
    }

    const category = await Category.create(body);
    await invalidatePublicCache();
    res.status(201).json(category);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/:id', protect, requireRole(['superadmin', 'catalog_manager']), validate(updateCategorySchema), async (req, res) => {
  try {
    const { pickBody } = await import('../utils/pick.js');
    const before = await Category.findById(req.params.id).select('code name type path level').lean();
    if (!before) return res.status(404).json({ message: 'Category not found' });

    const set = pickBody(req.body, WRITABLE_FIELDS);
    const parentChanged = set.parent !== undefined;
    const oldPath = before.path;

    if (parentChanged) {
      if (String(set.parent || '') === String(req.params.id)) {
        return res.status(400).json({ message: 'A category cannot be its own parent' });
      }
      const ownCode = before.code || deriveCategoryCode(before.type, before.name);
      if (set.parent) {
        const lineage = await resolveLineage(set.parent);
        if (!lineage) return res.status(400).json({ message: 'Parent category not found' });
        set.path = `${lineage.path}/${ownCode}`;
        set.level = lineage.level;
      } else {
        set.path = ownCode;
        set.level = 0;
      }
      if (!before.code) set.code = ownCode;
    }

    const category = await Category.findByIdAndUpdate(req.params.id, set,
      { new: true, runValidators: true, overwriteImmutable: true });
    if (!category) return res.status(404).json({ message: 'Category not found' });

    if (parentChanged && oldPath && category.path && category.path !== oldPath) {
      const delta = (category.level ?? 0) - (before.level ?? 0);
      const descendants = await Category.find({ path: new RegExp(`^${escapeRegex(oldPath)}/`) })
        .select('path level').lean();
      if (descendants.length) {
        await Category.bulkWrite(descendants.map((doc) => ({
          updateOne: {
            filter: { _id: doc._id },
            update: { $set: { path: `${category.path}${doc.path.slice(oldPath.length)}`, level: doc.level + delta } },
          },
        })));
      }
    }

    await invalidatePublicCache();
    res.json(category);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.delete('/:id', protect, requireRole(['superadmin', 'catalog_manager']), async (req, res) => {
  try {
    const children = await Category.countDocuments({ parent: req.params.id });
    if (children > 0) {
      return res.status(400).json({ message: 'Cannot delete: move or merge its subcategories first' });
    }
    await Category.findByIdAndDelete(req.params.id);
    await invalidatePublicCache();
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/merge', protect, requireRole(['superadmin', 'catalog_manager']), validate(mergeCategorySchema), async (req, res) => {
  try {
    const { sourceIds, targetId } = req.body;
    await Category.updateMany({ _id: { $in: sourceIds, $ne: targetId } }, { parent: targetId, isActive: false });
    await invalidatePublicCache();
    res.json({ message: 'Merged successfully' });
  } catch (err) { res.status(400).json({ message: err.message }); }
});

export default router;
