import express from 'express';
import Product from '../models/Product.js';
import Provider from '../models/Provider.js';
import { safeSearchRegex } from '../utils/escapeRegex.js';

const router = express.Router();

// 10.md 4.1 `GET /api/products?category=&q=` — the anonymous storefront half of
// the FLOW-C catalogue (the vendor's own CRUD lives behind /api/provider/products).
//
// DTO allowlist. What is deliberately ABSENT and why:
//   - variants.batch / variants.expiry  — stockroom data; expiry on a public
//     card is an inventory tell, and batch belongs to the pharmacy workflow;
//   - fssaiNo / cdscoNo / hsn / gstRate — regulatory + commercial internals;
//   - vendorId on the card itself      — read for the seller join below, then
//     replaced by the public slug/name pair in toProductCard (not emitted).
// `variants.stock` is read to compute an in-stock BOOLEAN and then dropped:
// exact counts let a competitor watch inventory move in real time.
const PRODUCT_FIELDS = [
  'vendorId kind categoryCodes brand name images rxSchedule storage claims warrantyMonths',
  'rentable variants.sku variants.pack variants.price variants.mrp variants.stock',
].join(' ');

const toPositiveInt = (value, fallback, max) => {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
};

export const toProductCard = (row) => ({
  _id: row._id,
  kind: row.kind,
  categoryCodes: row.categoryCodes ?? [],
  brand: row.brand ?? '',
  name: row.name,
  images: row.images ?? [],
  rxSchedule: row.rxSchedule ?? null,
  storage: row.storage ?? 'ambient',
  claims: row.claims ?? [],
  warrantyMonths: row.warrantyMonths ?? 0,
  rentable: row.rentable
    ? { perDay: row.rentable.perDay ?? 0, deposit: row.rentable.deposit ?? 0, available: row.rentable.available === true }
    : undefined,
  vendor: row.vendor, // { slug, name } — attached by the route, public by construction
  variants: (row.variants ?? []).map((v) => ({
    sku: v.sku,
    pack: v.pack,
    price: v.price,
    mrp: v.mrp ?? v.price,
    inStock: (v.stock ?? 0) > 0,
  })),
});

// authz: public
router.get('/', async (req, res) => {
  try {
    const { category, q } = req.query;

    // A product is only purchasable while its VENDOR is live: a suspended
    // vendor's rows disappear from the storefront with the vendor, so the
    // status filter is built server-side and no caller can widen it.
    const liveVendors = await Provider.find({ status: 'live' }).select('_id').lean();
    const filter = {
      status: 'active',
      vendorId: { $in: liveVendors.map((v) => v._id) },
    };
    if (category) filter.categoryCodes = String(category).slice(0, 64);
    const search = safeSearchRegex(q);
    if (search) filter.$or = [{ name: search }, { brand: search }];

    const limit = toPositiveInt(req.query.limit, 20, 100);
    const page = toPositiveInt(req.query.page, 1, 10000);

    const [products, total] = await Promise.all([
      Product.find(filter)
        .select(PRODUCT_FIELDS)
        .sort({ name: 1, _id: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Product.countDocuments(filter),
    ]);

    // One light join for the page's sellers — slug + name only, same live
    // filter, never the owner contact fields.
    const vendorIds = [...new Set(products.map((p) => String(p.vendorId)))];
    const vendors = vendorIds.length
      ? await Provider.find({ _id: { $in: vendorIds }, status: 'live' }).select('slug name').lean()
      : [];
    const vendorById = Object.fromEntries(vendors.map((v) => [String(v._id), { slug: v.slug, name: v.name }]));

    res.set('Cache-Control', 'public, max-age=60');
    res.removeHeader('Pragma');
    res.json({
      products: products.map((p) => toProductCard({ ...p, vendor: vendorById[String(p.vendorId)] })),
      total,
      page,
      pages: Math.ceil(total / limit) || 1,
      limit,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
