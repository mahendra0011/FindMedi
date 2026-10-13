import mongoose from 'mongoose';

/**
 * File 24 §4.11 Playbooks & Knowledge: SOPs, objection-handling scripts,
 * objection templates, training notes, policies and FAQs for the platform
 * team. Operational knowledge only — no PHI, no patient examples.
 */
const crmPlaybookSchema = new mongoose.Schema({
  title: { type: String, required: true, maxlength: 200, index: true },
  category: {
    type: String,
    enum: ['sop', 'script', 'template', 'training', 'policy', 'faq'],
    default: 'sop',
    index: true,
  },
  summary: { type: String, default: '', maxlength: 500 },
  body: { type: String, required: true, maxlength: 30000 },
  tags: [{ type: String, maxlength: 40 }],
  audience: [{ type: String, maxlength: 40 }],
  status: { type: String, enum: ['draft', 'published'], default: 'draft', index: true },
  version: { type: Number, default: 1, min: 1 },
  publishedAt: { type: Date, default: null },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

crmPlaybookSchema.index({ status: 1, category: 1 });

export const PLAYBOOK_CATEGORIES = ['sop', 'script', 'template', 'training', 'policy', 'faq'];

export default mongoose.models.CrmPlaybook || mongoose.model('CrmPlaybook', crmPlaybookSchema);
