import mongoose from 'mongoose';

/**
 * File 15 §15.4: ADT + internal transport log (append-only states).
 * Bed shows `Away: <place>` while a trip is open — the bed is NOT released.
 */
const movementSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  encounterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Encounter', default: null, index: true },
  admissionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admission', default: null, index: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  from: { type: String, default: '' },
  to: { type: String, required: true, maxlength: 200 },
  reason: { type: String, maxlength: 500, default: '' },
  transportMode: { type: String, enum: ['walk', 'wheelchair', 'stretcher', 'bed', 'ambulance'], default: 'wheelchair' },
  escort: { type: String, enum: ['porter', 'nurse', 'doctor', 'none'], default: 'porter' },
  handover: {
    ivLines: { type: Boolean, default: false },
    oxygen: { type: Boolean, default: false },
    monitor: { type: Boolean, default: false },
    consent: { type: Boolean, default: false },
    idBand: { type: Boolean, default: false },
  },
  status: {
    type: String,
    enum: ['Requested', 'Assigned', 'PickedUp', 'Delivered', 'Returned', 'Cancelled'],
    default: 'Requested', index: true,
  },
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  timestamps: {
    requestedAt: { type: Date, default: Date.now },
    assignedAt: { type: Date, default: null },
    pickedAt: { type: Date, default: null },
    deliveredAt: { type: Date, default: null },
  },
}, { timestamps: true });

movementSchema.index({ hospitalId: 1, status: 1 });

export default mongoose.models.PatientMovement || mongoose.model('PatientMovement', movementSchema);
