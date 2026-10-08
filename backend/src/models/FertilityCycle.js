import mongoose from 'mongoose';

// 7.md §3.17 IVF/maternity: cycle tracker with ART consent and audited
// outcome reporting. Consults ride appointments, procedures ride the surgery/
// OT surfaces, embryology labs ride LabBooking/LabOrder, packages ride Plan —
// this model is the CYCLE itself: which attempt, under which consent, ending
// in which recorded outcome. The outcome is the most sensitive write in the
// fertility surface (it discloses a pregnancy result), so it moves only
// through PATCH /:id/outcome, which exists precisely to audit it. A revised
// outcome after a recorded one is a new medical event, not an edit —
// recordedAt is set once by the transition.
export const FERTILITY_CYCLE_TYPES = ['ivf', 'icsi', 'iui', 'frozen_embryo', 'other'];
export const FERTILITY_CYCLE_STATUSES = ['active', 'completed', 'cancelled'];
export const FERTILITY_OUTCOMES = ['positive', 'negative', 'biochemical', 'ectopic', 'ongoing'];

const fertilityCycleSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Provider', required: true, index: true },
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  cycleNo: { type: Number, min: 1, max: 50, required: true },
  cycleType: { type: String, enum: FERTILITY_CYCLE_TYPES, required: true, index: true },
  status: { type: String, enum: FERTILITY_CYCLE_STATUSES, default: 'active', index: true },
  procedures: [{
    name: { type: String, required: true, trim: true, maxlength: 120 },
    date: { type: String },
    status: { type: String, enum: ['planned', 'done', 'skipped'], default: 'planned' },
    _id: false,
  }],
  // ART consent travels WITH the cycle (per-cycle, not per-account): the
  // legal basis for THIS attempt's procedures and documents.
  artConsent: {
    granted: { type: Boolean, default: false },
    grantedAt: { type: Date, default: null },
  },
  artDocuments: [{ type: String, maxlength: 500 }],
  outcome: {
    result: { type: String, enum: FERTILITY_OUTCOMES, default: null },
    recordedAt: { type: Date, default: null },
  },
  notes: { type: String, trim: true, maxlength: 1000, default: '' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: false });

fertilityCycleSchema.index({ patientId: 1, createdAt: -1 });
fertilityCycleSchema.index({ patientId: 1, cycleNo: 1 });
fertilityCycleSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.model('FertilityCycle', fertilityCycleSchema);
