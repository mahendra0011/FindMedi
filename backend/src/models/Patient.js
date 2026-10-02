import mongoose from 'mongoose';

const patientSchema = new mongoose.Schema({
  name: { type: String, required: true },
  age: { type: Number, required: true },
  gender: { type: String, enum: ['Male', 'Female', 'Other'], required: true },
  disease: { type: String, default: '' },
  doctor: { type: String, default: '' },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  uhid: { type: String, unique: true, sparse: true, index: true },
  phone: { type: String, default: '' },
  email: { type: String, default: '' },
  address: { type: String, default: '' },
  bloodGroup: { type: String, default: '' },
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },

  birthRecord: {
    placeOfBirth: { type: String },
    attendingDoctor: { type: String },
    certificateGenerated: { type: Boolean, default: false },
    certificateUrl: { type: String },
  },

  deathRecord: {
    dateOfDeath: { type: Date },
    causeOfDeath: { type: String },
    attendingDoctor: { type: String },
    certificateGenerated: { type: Boolean, default: false },
    certificateUrl: { type: String },
  },

  infectiousDisease: [{
    disease: { type: String, required: true },
    diagnosisDate: { type: Date, default: Date.now },
    notified: { type: Boolean, default: false },
    notificationDate: { type: Date },
  }],

  parentName: { type: String },
  birthPlace: { type: String },
  dateOfBirth: { type: Date },
  deathDate: { type: Date },

  admitted: { type: Date, default: Date.now },
  status: { type: String, enum: ['Active', 'Discharged', 'Critical'], default: 'Active' },
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

import { generateUHID } from '../utils/idGenerator.js';

patientSchema.pre('save', async function (next) {
  if (!this.uhid) {
    this.uhid = generateUHID();
  }
  next();
});

patientSchema.index({ hospitalId: 1, status: 1 });
patientSchema.index({ phone: 1 });
patientSchema.index({ createdAt: -1 });

// APPT-B-03: uniqueness for the walk-in de-dup path.
//
// The lookup was `Patient.findOne({ phone })` with no uniqueness behind it, so two
// concurrent walk-ins both missed and both created a record for the same person.
// The partial filter keeps uniqueness INSIDE a hospital: the same phone may
// legitimately exist at two different facilities (a patient treated at both),
// which is exactly why the lookup is now tenant-scoped.
patientSchema.index(
  { hospitalId: 1, phone: 1 },
  { unique: true, partialFilterExpression: { phone: { $type: 'string', $ne: '' } } }
);
patientSchema.index(
  { hospitalId: 1, email: 1 },
  { unique: true, partialFilterExpression: { email: { $type: 'string', $ne: '' } } }
);

export default mongoose.model('Patient', patientSchema);

