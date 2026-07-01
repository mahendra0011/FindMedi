import mongoose from 'mongoose';

const admissionSchema = new mongoose.Schema({
  admissionId: { type: String, required: true, unique: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  patientName: { type: String, required: true },
  bedId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bed' },
  bedNumber: { type: String },
  ward: { type: String },
  admittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  admittingDoctor: { type: String, required: true },
  primaryDiagnosis: { type: String },
  source: { type: String, enum: ['OPD', 'Emergency', 'Direct', 'Referral'], default: 'OPD' },
  status: { type: String, enum: ['Admitted', 'Transferred', 'Discharged', 'DOD'], default: 'Admitted' },
  attendantName: { type: String },
  attendantPhone: { type: String },
  estimatedStay: { type: Number }, // days
  admissionNotes: { type: String },

  // Vitals Charting - per shift
  vitals: [{
    date: { type: Date, default: Date.now },
    shift: { type: String, enum: ['Morning', 'Evening', 'Night'] },
    bp: { type: String }, // "120/80"
    pulse: { type: Number },
    temperature: { type: Number }, // Celsius
    spo2: { type: Number }, // percentage
    bloodSugar: { type: Number }, // mg/dL
    weight: { type: Number }, // kg
    recordedBy: { type: String },
  }],

  // MAR - Medicine Administration Record
  mar: [{
    date: { type: Date, default: Date.now },
    medicineName: { type: String, required: true },
    dose: { type: String },
    route: { type: String, enum: ['Oral', 'IV', 'IM', 'SC', 'Topical', 'Inhalation'] },
    frequency: { type: String },
    administeredAt: { type: Date },
    administeredBy: { type: String },
    status: { type: String, enum: ['Given', 'Refused', 'Missed', 'Held'], default: 'Given' },
    reasonIfMissed: { type: String },
  }],

  // Input/Output Chart
  ioChart: [{
    date: { type: Date, default: Date.now },
    inputType: { type: String, enum: ['Oral', 'IV Fluid', 'Blood', 'Ryles'] },
    inputAmount: { type: Number }, // ml
    outputType: { type: String, enum: ['Urine', 'Stool', 'Vomit', 'Drain', 'Other'] },
    outputAmount: { type: Number }, // ml
    recordedBy: { type: String },
  }],

  // Nurse Progress Notes (SOAP)
  nursingNotes: [{
    date: { type: Date, default: Date.now },
    shift: { type: String, enum: ['Morning', 'Evening', 'Night'] },
    subjective: { type: String }, // Patient complaints
    objective: { type: String }, // Vitals, observations
    assessment: { type: String }, // Nurse assessment
    plan: { type: String }, // Nursing interventions
    nurseName: { type: String },
  }],

  // Doctor Progress Notes (SOAP)
  doctorNotes: [{
    date: { type: Date, default: Date.now },
    subjective: { type: String },
    objective: { type: String },
    assessment: { type: String },
    plan: { type: String }, // New orders, treatments
    doctorName: { type: String },
  }],

  // Wound Dressing
  woundCare: [{
    date: { type: Date, default: Date.now },
    woundType: { type: String },
    location: { type: String },
    dressingType: { type: String },
    findings: { type: String },
    performedBy: { type: String },
  }],

  // Discharge Checklist
  dischargeChecklist: {
    medicinesPackaged: { type: Boolean, default: false },
    documentsReady: { type: Boolean, default: false },
    patientEducated: { type: Boolean, default: false },
    followUpGiven: { type: Boolean, default: false },
    billSettled: { type: Boolean, default: false },
  },

  // Structured Discharge Summary
  dischargeSummary: { type: String },
  dischargeMedicines: [{ 
    name: String, 
    dose: String, 
    duration: String,
    instructions: String,
  }],
  medicinesToContinue: [{
    name: String,
    dose: String,
    frequency: String,
    duration: String,
    instructions: String,
  }],
  followUpDate: { type: Date },
  followUpInstructions: { type: String },
  dietInstructions: [{
    meal: { type: String, enum: ['Morning', 'Noon', 'Evening', 'Night', 'Other'] },
    instructions: String,
  }],
  dischargeNotes: { type: String },
  dischargeCondition: { type: String, enum: ['Stable', 'Improved', 'Critical', 'DOD'] },
  dischargedAt: { type: Date },
  dischargedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  handoverNotes: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

admissionSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.model('Admission', admissionSchema);