import mongoose from 'mongoose';

/**
 * Checklist §2: gate pass — NOT a visitor pass (VisitorPass.js covers people;
 * this covers goods/materials leaving the premises: samples, equipment,
 * discharge of dead bodies, store dispatch). Approval is a two-step gate:
 * requested by staff, approved by security/admin, then used (scanned out).
 */
export const GATE_PASS_TYPES = ['sample_transport', 'equipment_out', 'store_dispatch', 'body_transport', 'other'];
export const GATE_PASS_STATUS = ['requested', 'approved', 'rejected', 'used', 'expired'];

const gatePassSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Facility', index: true },
  passNo: { type: String, required: true, unique: true },
  type: { type: String, enum: GATE_PASS_TYPES, required: true },
  description: { type: String, trim: true, maxlength: 1000, required: true },
  itemCount: { type: Number, min: 1, default: 1 },
  vehicleNo: { type: String, trim: true, maxlength: 20, default: '' },
  carrierName: { type: String, trim: true, maxlength: 200, default: '' },
  carrierPhone: { type: String, trim: true, maxlength: 15, default: '' },
  destination: { type: String, trim: true, maxlength: 300, default: '' },
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  approvedAt: { type: Date },
  rejectedReason: { type: String, trim: true, maxlength: 500, default: '' },
  status: { type: String, enum: GATE_PASS_STATUS, default: 'requested', index: true },
  usedAt: { type: Date },
  validUntil: { type: Date },
}, { timestamps: true });

gatePassSchema.index({ hospitalId: 1, createdAt: -1 });

/**
 * Checklist §2: security rounds — a guard walks a checkpoint list on a
 * schedule; each round records per-checkpoint ok/not-ok + any incident
 * notes. Rounds are append-only evidence (a missed checkpoint is itself
 * the finding), so there is no update route — only create and read.
 */
const securityRoundSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Facility', index: true },
  roundNo: { type: String, required: true, unique: true },
  guardId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  startedAt: { type: Date, default: Date.now },
  endedAt: { type: Date },
  checkpoints: [{
    name: { type: String, required: true, maxlength: 200 },
    ok: { type: Boolean, default: false },
    note: { type: String, trim: true, maxlength: 500, default: '' },
    at: Date,
  }],
  incident: { type: String, trim: true, maxlength: 2000, default: '' },
  incidentEscalatedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  status: { type: String, enum: ['open', 'closed'], default: 'open', index: true },
}, { timestamps: true });

securityRoundSchema.index({ hospitalId: 1, startedAt: -1 });

export const GatePass = mongoose.models.GatePass || mongoose.model('GatePass', gatePassSchema);
export const SecurityRound = mongoose.models.SecurityRound || mongoose.model('SecurityRound', securityRoundSchema);
