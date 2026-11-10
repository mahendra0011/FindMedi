import express from 'express';
import Category from '../models/Category.js';
import Doctor from '../models/Doctor.js';
import { protect, requireRole } from '../middleware/auth.js';
import { validate, createCategorySchema, updateCategorySchema, mergeCategorySchema } from '../utils/validate.js';
import { escapeRegex, safeSearchRegex } from '../utils/escapeRegex.js';
import {
  deriveCategoryCode,
  CATEGORY_TYPES,
  SPECIALTIES,
  buildSpecialtyTree,
  buildSpecialtyGroups,
  resolveSpecialtyCode,
  SPEC_CODE_ALIASES,
} from '../lib/taxonomy.js';
import { getCache, setCache, flushCachePattern } from '../config/redis.js';
import { CATEGORY_TREE } from '../data/categoryTree.mjs';
import { CANONICAL_SPECIALTIES } from '../lib/canonicalSpecialties.js';

const router = express.Router();

const PUBLIC_CACHE_PREFIX = 'categories_public';
const PUBLIC_CACHE_TTL = 300;
const PUBLIC_FIELDS = 'code name nameHi aliases type parent path level tier icon displayOrder adClaimsRestricted kind isSensitive soon alsoUnder meta';
const WRITABLE_FIELDS = ['name', 'nameHi', 'type', 'aliases', 'description', 'parent', 'icon', 'isActive', 'displayOrder', 'tier', 'regulatedBy', 'adClaimsRestricted', 'externalCodes', 'kind', 'isSensitive', 'soon', 'alsoUnder', 'meta'];

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

    let categories = await Category.find(filter)
      .select(PUBLIC_FIELDS)
      .sort({ type: 1, displayOrder: 1, name: 1 })
      .lean();

    if ((!categories || categories.length === 0) && !process.env.JEST_WORKER_ID) {
      categories = CATEGORY_TREE.filter((item) => {
        if (type && item.type !== type) return false;
        if (parent && item.parent !== parent) return false;
        if (term) {
          const matchName = term.test(item.name);
          const matchAlias = (item.aliases || []).some((a) => term.test(a));
          if (!matchName && !matchAlias) return false;
        }
        return true;
      });
    }

    const payload = { categories, types: CATEGORY_TYPES };
    await setCache(cacheKey, payload, PUBLIC_CACHE_TTL);
    res.json(payload);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// authz: public - full Category Hierarchy Tree
router.get('/tree', (req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.json({
    total: CATEGORY_TREE.length,
    tree: CATEGORY_TREE,
  });
});

// authz: public - Canonical Specialties List (43 top-level + subs)
// tree=1 → 13 browse-all groups; each tile carries its sub-specialty children
// (own-code subs + alsoUnder cross-lists), meta chips and verified flags.
const toPublicSpecialty = (s) => s; // canonical service shape (code + meta + helpers above)

router.get('/specialties', (req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=300');
  if (req.query.tree === '1') {
    const groups = buildSpecialtyGroups().map((group) => ({
      id: group.id,
      name: group.name,
      color: group.color,
      tiles: group.tiles.map((tile) => ({ ...tile })),
    }));
    return res.json({ total: SPECIALTIES.length, groups, groupsFound: groups.length });
  }
  res.json({
    total: SPECIALTIES.length,
    specialties: CANONICAL_SPECIALTIES.map(toPublicSpecialty),
  });
});

// Distinct provider and facility counts for every browse tile in one request.
// Cross-listed codes contribute to every parent while each provider is counted
// only once per parent.
router.get('/specialties/counts', async (req, res) => {
  try {
    const filters = [];
    if (req.query.approvedOnly !== 'false') filters.push({ approved: true });
    if (req.query.city) {
      const cityRegex = new RegExp(`^${escapeRegex(String(req.query.city))}`, 'i');
      filters.push({ $or: [{ city: cityRegex }, { location: cityRegex }] });
    }
    if (req.query.facilityId) filters.push({ $or: [{ facilityId: req.query.facilityId }, { hospitalId: req.query.facilityId }] });
    const filter = filters.length > 1 ? { $and: filters } : (filters[0] || {});

    const doctors = await Doctor.find(filter)
      .select('_id specialtyCode specialization subSpecialtyCodes facilityId hospitalId')
      .lean();
    const rootCodes = SPECIALTIES.filter((s) => /^SPEC\.[A-Z0-9]+$/.test(s.code)).map((s) => s.code);
    const counts = Object.fromEntries(rootCodes.map((code) => [code, { doctors: 0, facilities: 0 }]));
    const doctorSets = new Map(rootCodes.map((code) => [code, new Set()]));
    const facilitySets = new Map(rootCodes.map((code) => [code, new Set()]));

    for (const doctor of doctors) {
      const specialtyCodes = new Set([
        resolveSpecialtyCode(doctor.specialtyCode),
        resolveSpecialtyCode(doctor.specialization),
        ...[...(doctor.subSpecialtyCodes || [])].map(resolveSpecialtyCode),
      ].filter(Boolean));
      const matchingRoots = new Set();
      for (const code of specialtyCodes) {
        const entry = SPECIALTIES.find((item) => item.code === code);
        if (!entry) continue;
        const root = /^SPEC\.[A-Z0-9]+$/.test(code) ? code : code.split('.').slice(0, 2).join('.');
        if (doctorSets.has(root)) matchingRoots.add(root);
        for (const parent of entry.alsoUnder || []) if (doctorSets.has(parent)) matchingRoots.add(parent);
      }
      const id = String(doctor._id);
      const facilityIds = [doctor.hospitalId, doctor.facilityId].filter(Boolean).map(String);
      for (const root of matchingRoots) {
        doctorSets.get(root).add(id);
        for (const facilityId of facilityIds) facilitySets.get(root).add(facilityId);
      }
    }
    for (const code of rootCodes) {
      counts[code] = { doctors: doctorSets.get(code).size, facilities: facilitySets.get(code).size };
    }

    res.setHeader('Cache-Control', 'public, max-age=60');
    res.json({ counts });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// authz: public - one specialty with subs + condition/procedure chips
router.get('/specialties/:code', (req, res) => {
  const resolved = resolveSpecialtyCode(req.params.code || '');
  const hit = resolved ? SPECIALTIES.find((s) => s.code === resolved) : null;
  if (!hit) return res.status(404).json({ message: 'Specialty not found' });
  res.setHeader('Cache-Control', 'public, max-age=300');

  const isTop = /^SPEC\.[A-Z0-9]+$/.test(hit.code);
  let subs = [];
  if (isTop) {
    // Own-code subs + cross-listed subs (alsoUnder points at us): one record,
    // rendered under both parents upstream (§4 duplicate-records rule).
    const prefix = `${hit.code}.`;
    subs = SPECIALTIES.filter(
      (s) => s.code.startsWith(prefix) || (s.alsoUnder || []).includes(hit.code),
    );
  }

  const topCode = isTop ? hit.code : hit.code.split('.').slice(0, 2).join('.');

  res.json({
    code: hit.code,
    name: hit.name,
    nameHi: hit.meta?.nameHi || '',
    aliases: hit.aliases,
    sensitive: !!hit.sensitive || !!hit.meta?.sensitive,
    adClaimsRestricted: !!hit.adClaimsRestricted || !!hit.meta?.adClaimsRestricted,
    claimsRestricted: !!hit.claimsRestricted,
    meta: hit.meta,
    alsoUnder: hit.alsoUnder || [],
    subs: subs.map((s) => ({
      code: s.code,
      name: s.name,
      aliases: s.aliases,
      sensitive: !!s.sensitive || !!s.meta?.sensitive,
      claimsRestricted: !!s.claimsRestricted,
      alsoUnder: s.alsoUnder || [],
      meta: s.meta,
    })),
    conditions: hit.meta?.conditions || [],
    procedures: hit.meta?.procedures || [],
    symptoms: hit.meta?.symptoms || [],
    parent: isTop ? null : topCode,
    topCode,
  });
});

// authz: public - distinct doctor/hospital counts for a specialty tile in context
// Parent count = parent + all subs (own + cross-listed) UNION'd in one $in query
// so a doctor tagged with two subs is never double-counted.
router.get('/specialties/:code/counts', async (req, res) => {
  try {
    const { city, facilityId, approvedOnly = 'true' } = req.query;
    const resolved = resolveSpecialtyCode(req.params.code || '');
    const hit = resolved ? SPECIALTIES.find((s) => s.code === resolved) : null;
    if (!hit) return res.status(404).json({ message: 'Specialty not found' });

    const isTop = /^SPEC\.[A-Z0-9]+$/.test(hit.code);
    const topCode = isTop ? hit.code : hit.code.split('.').slice(0, 2).join('.');
    const codes = new Set();
    if (isTop) {
      const prefix = `${hit.code}.`;
      for (const s of SPECIALTIES) {
        if (s.code.startsWith(prefix) || (s.alsoUnder || []).includes(hit.code)) codes.add(s.code);
      }
    } else {
      codes.add(hit.code);
    }
    if (isTop) codes.add(topCode);
    const canonicalCodes = new Set(codes);
    const storedCodes = [...new Set([
      ...canonicalCodes,
      ...Object.entries(SPEC_CODE_ALIASES)
        .filter(([, canonical]) => canonicalCodes.has(canonical))
        .map(([legacy]) => legacy),
    ])];
    const codeFilter = {
      $or: [
        { specialtyCode: { $in: storedCodes } },
        { subSpecialtyCodes: { $in: storedCodes } },
      ],
    };
    const filters = [codeFilter];
    if (city) {
      const cityRegex = new RegExp(`^${escapeRegex(String(city))}`, 'i');
      filters.push({ $or: [{ city: cityRegex }, { location: cityRegex }] });
    }
    if (facilityId) filters.push({ $or: [{ facilityId }, { hospitalId: facilityId }] });
    if (approvedOnly === 'true') filters.push({ approved: true });
    const query = filters.length === 1 ? filters[0] : { $and: filters };

    const [doctors, hospitalIds, clinicIds] = await Promise.all([
      Doctor.countDocuments(query),
      Doctor.distinct('hospitalId', query),
      Doctor.distinct('facilityId', query),
    ]);
    const facilityCount = new Set([...hospitalIds, ...clinicIds].filter(Boolean).map(String)).size;
    res.setHeader('Cache-Control', 'public, max-age=60');
    res.json({
      code: topCode,
      requestedCode: hit.code,
      doctors,
      hospitals: facilityCount,
      facilities: facilityCount,
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// authz: role / catalog_manager - Idempotently seed/sync full CATEGORY_TREE into MongoDB
router.post('/seed', protect, requireRole(['superadmin', 'catalog_manager']), async (req, res) => {
  try {
    const itemByCode = new Map(CATEGORY_TREE.map((item) => [item.code, item]));
    const depthByCode = new Map();
    const getDepth = (item, visiting = new Set()) => {
      if (depthByCode.has(item.code)) return depthByCode.get(item.code);
      if (!item.parent) {
        depthByCode.set(item.code, 0);
        return 0;
      }
      if (visiting.has(item.code)) throw new Error(`Category parent cycle at ${item.code}`);
      const parent = itemByCode.get(item.parent);
      if (!parent) throw new Error(`Missing category parent ${item.parent} for ${item.code}`);
      visiting.add(item.code);
      const depth = getDepth(parent, visiting) + 1;
      visiting.delete(item.code);
      depthByCode.set(item.code, depth);
      return depth;
    };
    const orderedItems = [...CATEGORY_TREE].sort((a, b) => getDepth(a) - getDepth(b));
    const seededByCode = new Map();
    let roots = 0;
    let leaves = 0;

    for (const item of orderedItems) {
      const parentInfo = item.parent ? seededByCode.get(item.parent) : null;
      if (item.parent && !parentInfo) {
        throw new Error(`Category parent was not seeded before child ${item.code}`);
      }
      const level = depthByCode.get(item.code);
      const doc = await Category.findOneAndUpdate(
        { code: item.code },
        {
          $set: {
            name: item.name,
            nameHi: item.nameHi || '',
            type: item.type,
            aliases: item.aliases || [],
            alsoUnder: item.alsoUnder || [],
            meta: item.meta || {},
            icon: item.icon || '',
            parent: parentInfo?._id || null,
            tier: item.tier || 'T1',
            regulatedBy: item.regulatedBy || [],
            kind: item.kind || '',
            isSensitive: !!item.isSensitive,
            adClaimsRestricted: !!item.adClaimsRestricted,
            path: parentInfo ? `${parentInfo.path}/${item.code}` : item.code,
            level,
            isActive: true,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      seededByCode.set(item.code, { _id: doc._id, path: doc.path });
      if (level === 0) roots++;
      else leaves++;
    }

    await invalidatePublicCache();
    res.json({
      message: 'Category catalogue tree synchronized successfully',
      totalSeeded: CATEGORY_TREE.length,
      roots,
      leaves,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
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
