import mongoose from 'mongoose';

/**
 * Checklist §2: NICU phototherapy + bilirubin chart. Bilirubin is trended
 * (not a single value) because the decision is always about the SLOPE vs
 * the hour-of-life threshold curve; phototherapy sessions are separate rows
 * because start/stop is a treatment event with its own indication and
 * duration, distinct from any one measurement.
 */
const bilirubinReadingSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Facility', index: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  ageHours: { type: Number, min: 0, max: 720, required: true },
  totalMgDl: { type: Number, min: 0, max: 40, required: true },
  directMgDl: { type: Number, min: 0, max: 30 },
  method: { type: String, enum: ['serum', 'transcutaneous'], default: 'serum' },
  phototherapyOn: { type: Boolean, default: false },
  notes: { type: String, trim: true, maxlength: 500, default: '' },
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

bilirubinReadingSchema.index({ patientId: 1, ageHours: 1 });

const phototherapySessionSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Facility', index: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  startedAt: { type: Date, default: Date.now },
  endedAt: { type: Date },
  indication: { type: String, trim: true, maxlength: 500, default: '' },
  device: { type: String, trim: true, maxlength: 200, default: '' },
  eyeProtection: { type: Boolean, default: true },
  // Exchange-transfusion threshold crossed at any point during the session.
  escalated: { type: Boolean, default: false },
  complications: { type: String, trim: true, maxlength: 500, default: '' },
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

phototherapySessionSchema.index({ patientId: 1, startedAt: -1 });

export const BilirubinReading = mongoose.models.BilirubinReading || mongoose.model('BilirubinReading', bilirubinReadingSchema);
export const PhototherapySession = mongoose.models.PhototherapySession || mongoose.model('PhototherapySession', phototherapySessionSchema);
