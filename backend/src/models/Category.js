import mongoose from 'mongoose';
import { CATEGORY_TYPES, CATEGORY_TIERS, CATEGORY_CODE_RE } from '../lib/taxonomy.js';

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  nameHi: { type: String, default: '' },
  code: {
    type: String,
    trim: true,
    immutable: true,
    validate: { validator: (value) => CATEGORY_CODE_RE.test(value), message: 'code must look like SPEC.CARDIO' },
  },
  type: { type: String, enum: CATEGORY_TYPES, required: true },
  aliases: { type: [String], default: [] },
  description: { type: String, default: '' },
  parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
  path: { type: String, default: '' },
  level: { type: Number, default: 0, min: 0 },
  tier: { type: String, enum: CATEGORY_TIERS, default: undefined },
  regulatedBy: { type: [String], default: [] },
  adClaimsRestricted: { type: Boolean, default: false },
  externalCodes: {
    snomed: { type: String, default: '' },
    atc: { type: String, default: '' },
    loinc: { type: String, default: '' },
    icd10: { type: String, default: '' },
    hsn: { type: String, default: '' },
  },
  icon: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
  displayOrder: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

categorySchema.index({ type: 1, code: 1 }, { unique: true, partialFilterExpression: { code: { $type: 'string' } } });
categorySchema.index({ type: 1, parent: 1, name: 1 });
categorySchema.index({ name: 'text', aliases: 'text' }, { name: 'category_text_search', weights: { name: 10, aliases: 5 } });

export default mongoose.model('Category', categorySchema);
