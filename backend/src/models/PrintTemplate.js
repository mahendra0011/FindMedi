import mongoose from 'mongoose';

/**
 * File 14 §14.2: print template (Handlebars HTML + CSS). Versioned +
 * approved; issued PDFs pin templateVersion + SHA-256 (+ seal).
 */
const printTemplateSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Facility', default: null },
  docType: { type: String, required: true, maxlength: 80, index: true },
  name: { type: String, required: true, maxlength: 200 },
  version: { type: Number, default: 1 },
  status: { type: String, enum: ['Draft', 'Approved', 'Deprecated'], default: 'Draft', index: true },
  pageSetup: {
    size: { type: String, enum: ['A4', 'A5', 'thermal58', 'thermal80', 'label'], default: 'A4' },
    orientation: { type: String, enum: ['portrait', 'landscape'], default: 'portrait' },
    margins: { type: String, default: '12mm' },
  },
  html: { type: String, default: '' },
  css: { type: String, default: '' },
  languages: [{ type: String, maxlength: 10 }],
  isDefault: { type: Boolean, default: false },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

printTemplateSchema.index({ hospitalId: 1, docType: 1, version: -1 });

export default mongoose.models.PrintTemplate || mongoose.model('PrintTemplate', printTemplateSchema);
