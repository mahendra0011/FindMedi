import mongoose from 'mongoose';
import { RX_SCHEDULES } from './Medicine.js';

/**
 * FLOW-C commerce catalogue (10.md 2.7): a sellable good — supplement, health
 * food, skincare, device, optical, consumable, or a medicine that is NOT one
 * of the Rx-catalog rows Medicine already models. Two rules shape it:
 *
 *   - VARIANTS ARE ROWS, not columns: sku/pack/price/stock/batch/expiry vary
 *     per pack size, and a stock counter lives on the variant so two packs of
 *     the same product never share an inventory number.
 *   - REGULATORY NUMBERS SIT ON THE ROW (fssaiNo/cdscoNo) because they
 *     certify the product, not the vendor; `rxSchedule` reuses Medicine's
 *     vocabulary so "is this Rx?" means the same thing across both catalogues.
 *
 * Catalogue record: `name`/`brand` are product vocabulary, suppressed from
 * PII classification like Service's name (scripts/lib/dataDictionary.mjs).
 */
const productVariantSchema = new mongoose.Schema({
  sku: { type: String, required: true, trim: true, maxlength: 80 },
  pack: { type: String, required: true, trim: true, maxlength: 120 },
  mrp: { type: Number, min: 0, default: 0 },
  price: { type: Number, required: true, min: 0 },
  stock: { type: Number, min: 0, default: 0 },
  batch: { type: String, maxlength: 80, default: '' },
  expiry: { type: Date, default: null },
}, { _id: true });

const productSchema = new mongoose.Schema({
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Provider', required: true, index: true },
  kind: {
    type: String,
    enum: ['medicine', 'supplement', 'food', 'skincare', 'device', 'optical', 'consumable'],
    required: true,
    index: true,
  },
  categoryCodes: [{ type: String, maxlength: 64 }],
  brand: { type: String, trim: true, maxlength: 200, default: '' },
  name: { type: String, required: true, trim: true, maxlength: 300 },

  variants: [productVariantSchema],

  composition: { type: String, maxlength: 4000, default: '' },
  rxSchedule: { type: String, enum: RX_SCHEDULES },

  fssaiNo: { type: String, maxlength: 40, default: '' },
  cdscoNo: { type: String, maxlength: 40, default: '' },
  hsn: { type: String, maxlength: 20, default: '' },
  gstRate: { type: Number, min: 0, max: 28, default: 0 },

  claims: [{ type: String, maxlength: 300 }],
  images: [{ type: String, maxlength: 500 }],
  storage: { type: String, enum: ['ambient', 'cold_chain'], default: 'ambient' },
  warrantyMonths: { type: Number, min: 0, default: 0 },

  // FLOW-G shares the catalogue: an equipment row is rentable at a day rate
  // plus a deposit, computed by lib/flowStates.js computeRentalTotals().
  rentable: {
    perDay: { type: Number, min: 0, default: 0 },
    deposit: { type: Number, min: 0, default: 0 },
    available: { type: Boolean, default: false },
  },

  status: { type: String, enum: ['draft', 'active', 'archived'], default: 'draft', index: true },
}, { timestamps: true });

productSchema.index({ vendorId: 1, status: 1 });
productSchema.index({ kind: 1, status: 1 });
// One SKU may not be listed twice by the same vendor — stock counts key on it.
productSchema.index({ vendorId: 1, 'variants.sku': 1 }, { unique: true, sparse: true });

export default mongoose.models.Product || mongoose.model('Product', productSchema);
