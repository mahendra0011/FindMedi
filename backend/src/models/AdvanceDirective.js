import mongoose from 'mongoose';

/**
 * AdvanceDirective Model (MH-MISSING-01)
 * Statutory Advance Directive under India Mental Healthcare Act (MHCA) 2017 Section 5.
 * Specifies treatment preferences, nominated representatives, and exclusions in advance.
 */
const advanceDirectiveSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  nominatedRepresentative: {
    name: { type: String, required: true },
    relationship: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, default: '' },
    address: { type: String, default: '' },
  },
  treatmentPreferences: {
    preferredFacilities: [{ type: String }],
    acceptableMedications: [{ type: String }],
    prohibitedTreatments: [{ type: String }],
    preferredTherapies: [{ type: String }],
    additionalInstructions: { type: String, default: '' },
  },
  registrationDetails: {
    boardRegistrationNumber: { type: String, default: '' },
    registeredWithMentalHealthBoard: { type: Boolean, default: false },
    registrationDate: { type: Date, default: null },
  },
  status: {
    type: String,
    enum: ['active', 'revoked', 'amended'],
    default: 'active',
    index: true,
  },
  revokedAt: { type: Date, default: null },
  revocationReason: { type: String, default: '' },
  validFrom: { type: Date, default: Date.now },
  validUntil: { type: Date, default: null },
}, { timestamps: true });

advanceDirectiveSchema.index({ patientId: 1, status: 1 });

export default mongoose.models.AdvanceDirective || mongoose.model('AdvanceDirective', advanceDirectiveSchema);
