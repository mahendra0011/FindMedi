import mongoose from 'mongoose';

/**
 * Checklist §2: NPS / patient-feedback survey. `patientId` is optional so a
 * kiosk can collect anonymous feedback, but a logged-in submitter keeps their
 * id for follow-up. NPS is the classic 0-10 scale; promoter/passive/detractor
 * bands are derived at query time (never stored — banding rules change).
 */
const feedbackSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Facility', index: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  context: {
    type: String,
    enum: ['visit', 'pharmacy', 'lab', 'admission', 'teleconsult', 'other'],
    default: 'visit',
  },
  department: { type: String, trim: true, maxlength: 120, default: '' },
  // NPS 0-10; at least one of npsScore / rating must be present (route-enforced).
  npsScore: { type: Number, min: 0, max: 10 },
  rating: { type: Number, min: 1, max: 5 },
  comment: { type: String, trim: true, maxlength: 2000, default: '' },
  refModel: {
    type: String,
    enum: ['', 'Appointment', 'Admission', 'PharmacyOrder', 'LabOrder', 'Teleconsult', 'Other'],
    default: '',
    index: true,
  },
  refId: {
    type: String,
    trim: true,
    default: '',
    index: true,
  },
  status: { type: String, enum: ['new', 'in_review', 'resolved'], default: 'new', index: true },
  response: {
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    at: Date,
    note: { type: String, maxlength: 1000, default: '' },
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

feedbackSchema.index({ hospitalId: 1, createdAt: -1 });
// `$type: 'objectId'` rather than `$ne: null`: MongoDB rejects `$ne` inside a
// partial-index filter ("Expression not supported in partial index"). The
// predicate is identical here — a null or absent patientId is BSON null/missing
// and never matches `$type: 'objectId'`, so uniqueness still only applies to
// rows that name a real patient.
feedbackSchema.index(
  { patientId: 1, context: 1, refId: 1 },
  { unique: true, partialFilterExpression: { refId: { $type: 'string', $gt: '' }, patientId: { $type: 'objectId' } } }
);

export default mongoose.models.Feedback || mongoose.model('Feedback', feedbackSchema);
