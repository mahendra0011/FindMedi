import mongoose from 'mongoose';

// 7.md §3.1 treatment plan builder: stages with per-stage cost, estimate
// derived at read (never stored — a stored total drifts the moment a stage
// is edited). Status moves draft → active → completed, with cancelled from
// anywhere; the transition table lives in the route, this enum is storage.
export const DENTAL_PLAN_STATUSES = ['draft', 'active', 'completed', 'cancelled'];
export const DENTAL_STAGE_STATUSES = ['planned', 'in_progress', 'done'];

const dentalTreatmentPlanSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Provider', required: true, index: true },
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, trim: true, maxlength: 160, default: '' },
  stages: [{
    name: { type: String, required: true, trim: true, maxlength: 120 },
    teeth: [{ type: String }],
    // Service.price-style major-unit amount (not paise): matches the catalog
    // the estimate is quoted from.
    costAmount: { type: Number, min: 0, default: 0 },
    status: { type: String, enum: DENTAL_STAGE_STATUSES, default: 'planned' },
    _id: false,
  }],
  status: { type: String, enum: DENTAL_PLAN_STATUSES, default: 'draft', index: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: false });

dentalTreatmentPlanSchema.index({ patientId: 1, createdAt: -1 });
dentalTreatmentPlanSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.model('DentalTreatmentPlan', dentalTreatmentPlanSchema);
