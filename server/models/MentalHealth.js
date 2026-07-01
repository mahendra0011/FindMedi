import mongoose from 'mongoose';

const mhSchema = new mongoose.Schema({
  referralId: { type: String, required: true, unique: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  patientName: { type: String, required: true },
  referralSource: { type: String, enum: ['Doctor', 'Self', 'Family', 'Emergency'], default: 'Doctor' },
  referrerName: { type: String },
  assessment: {
    mentalStatus: { type: String },
    personalHistory: { type: String },
    familyHistory: { type: String },
    socialHistory: { type: String },
    riskAssessment: { type: String, enum: ['Low', 'Medium', 'High', 'Immediate'] },
    diagnosis: { type: String },
    diagnosisCode: { type: String },
  },
  treatmentPlan: { type: String },
  treatmentType: { type: String, enum: ['Medication', 'Therapy', 'Counseling', 'Combined'] },
  sessions: [{ date: Date, type: String, notes: String, conductedBy: String }],
  medications: [{ name: String, dosage: String, frequency: String, prescribedBy: String, prescribedAt: Date }],
  familyInvolvement: [{
    familyMemberName: String,
    relationship: String,
    involvementType: { type: String, enum: ['Support', 'Caregiver', 'Decision Maker'] },
    notes: String,
    contactNumber: String,
    addedBy: String,
    addedAt: { type: Date, default: Date.now },
  }],
  consents: [{
    consentType: { type: String, enum: ['Treatment Consent', 'Medication Consent', 'Data Sharing', 'Discharge Consent'] },
    documentUrl: String,
    signedBy: String,
    signedAt: { type: Date, default: Date.now },
    expiryDate: { type: Date },
    notes: String,
    status: { type: String, enum: ['Active', 'Expired', 'Revoked'], default: 'Active' },
  }],
  confidentiality: { type: Boolean, default: true },
  consentToShare: { type: Boolean, default: false },
  status: { type: String, enum: ['Active', 'Completed', 'Discontinued', 'Referred'], default: 'Active' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

mhSchema.pre('save', function (next) { this.updatedAt = new Date(); next(); });
export default mongoose.model('MentalHealth', mhSchema);