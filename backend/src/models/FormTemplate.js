import mongoose from 'mongoose';

/**
 * File 14 §14.1: versioned form template (JSON schema). Field types:
 * text, textarea, number, date, time, select, multiselect, radio,
 * checkbox, yesno, scale, vitals, table, file, signature, patient_picker,
 * staff_picker, calculated, score, section, info.
 * Conditional logic (showIf/requiredIf) uses JSON-logic — never eval.
 */
const fieldSchema = new mongoose.Schema({
  id: { type: String, required: true },
  type: { type: String, required: true },
  label: { type: String, default: '' },
  labelHi: { type: String, default: '' },
  required: { type: Boolean, default: false },
  unit: { type: String, default: '' },
  options: [{ type: String }],
  min: { type: Number, default: null },
  max: { type: Number, default: null },
  showIf: { type: mongoose.Schema.Types.Mixed, default: null },
  requiredIf: { type: mongoose.Schema.Types.Mixed, default: null },
  formula: { type: String, default: '' },
  bind: { type: String, default: '' },
  permission: { type: String, default: '' },
}, { _id: false });

const formTemplateSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  key: { type: String, required: true, maxlength: 120, index: true },
  title: { type: String, required: true, maxlength: 200 },
  category: { type: String, default: '' },
  version: { type: Number, default: 1 },
  status: { type: String, enum: ['Draft', 'Review', 'Published', 'Deprecated'], default: 'Draft', index: true },
  definition: {
    sections: [{
      id: { type: String },
      title: { type: String, default: '' },
      fields: { type: [fieldSchema], default: [] },
    }],
  },
  scoring: [{
    id: { type: String },
    formula: { type: String, default: '' },
    bands: [{ from: { type: Number }, to: { type: Number }, label: { type: String }, color: { type: String, default: '' } }],
  }],
  printTemplateId: { type: mongoose.Schema.Types.ObjectId, ref: 'PrintTemplate', default: null },
  contexts: [{ type: String, maxlength: 80 }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

formTemplateSchema.index({ hospitalId: 1, key: 1, version: -1 });

export default mongoose.models.FormTemplate || mongoose.model('FormTemplate', formTemplateSchema);
