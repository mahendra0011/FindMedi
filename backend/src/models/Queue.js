import mongoose from 'mongoose';

/**
 * File 15 §15.1: unified queue = (hospital, type, resource). Types: OPD,
 * LAB, RAD, PHARM, BILL, ER. Priority classes + aging + SLA live here;
 * tickets carry the journey links (encounter → next queue).
 */
const queueSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true, index: true },
  type: { type: String, enum: ['OPD', 'LAB', 'RAD', 'PHARM', 'BILL', 'ER'], required: true, index: true },
  resourceId: { type: String, default: '', index: true },
  name: { type: String, required: true, maxlength: 200 },
  prefix: { type: String, default: 'A', maxlength: 4 },
  counters: [{
    id: { type: String },
    name: { type: String, default: '' },
    staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    open: { type: Boolean, default: true },
  }],
  priorityRules: { type: mongoose.Schema.Types.Mixed, default: {} },
  slaMinutes: { type: Number, default: 30 },
  avgServiceSec: { type: Number, default: 600 },
  active: { type: Boolean, default: true, index: true },
  seq: { type: Number, default: 0 },
}, { timestamps: true });

queueSchema.index({ hospitalId: 1, type: 1, resourceId: 1 });

export const PRIORITY_WEIGHT = { Emergency: 0, Critical: 1, Senior: 2, Appointment: 3, Walkin: 4 };

export default mongoose.models.Queue || mongoose.model('Queue', queueSchema);
