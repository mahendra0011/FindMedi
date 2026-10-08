import mongoose from 'mongoose';

// 7.md §3.41 quality/NABH checklists: periodic compliance assessments against
// a named standard. Rows are immutable snapshots (like the dental charts) —
// a re-audit writes a new assessment, so the history endpoint IS the
// compliance timeline an inspector asks for. Scores derive at read and are
// never stored: compliant=1, partial=0.5, non_compliant=0, na=excluded from
// the denominator. Provider-owned; no patient linkage, no PHI.
export const QUALITY_CHECKLIST_TYPES = ['nabh', 'kayakalp', 'fire_safety', 'bmw', 'infection_control', 'other'];
export const QUALITY_ITEM_STATUSES = ['compliant', 'partial', 'non_compliant', 'na'];

const qualityChecklistSchema = new mongoose.Schema({
  providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Provider', required: true, index: true },
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  checklistType: { type: String, enum: QUALITY_CHECKLIST_TYPES, required: true, index: true },
  title: { type: String, trim: true, maxlength: 200, default: '' },
  items: [{
    code: { type: String, required: true, trim: true, maxlength: 40 },
    label: { type: String, required: true, trim: true, maxlength: 200 },
    status: { type: String, enum: QUALITY_ITEM_STATUSES, required: true },
    evidence: { type: String, trim: true, maxlength: 500, default: '' },
    remarks: { type: String, trim: true, maxlength: 500, default: '' },
    _id: false,
  }],
  conductedAt: { type: Date, default: Date.now },
}, { timestamps: false });

qualityChecklistSchema.index({ providerId: 1, conductedAt: -1 });

export default mongoose.model('QualityChecklist', qualityChecklistSchema);
