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
  // MIND-M-04: `retainUntil` is stamped at write time from the governing
    // consent's retention window. Without it on the session, "destroy the notes
    // after N days" has nothing to evaluate and every record is kept forever.
    // `purgedAt` marks a swept session so a second sweep is a no-op.
    sessions: [{
      date: Date,
      type: String,
      notes: String,
      conductedBy: String,
      retainUntil: Date,
      purgedAt: Date,
      consentId: String,
    }],
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
    // MIND-M-04: what this consent actually authorises, and for how long the
    // resulting notes may be kept. `consentType` alone cannot answer either -
    // "Treatment Consent" does not say whether the record may be used for
    // research or an insurance claim, which DPDP s.6 requires it to.
    purposes: { type: [String], default: undefined },
    retentionDays: { type: Number, default: undefined, min: 1, max: 3650 },
    grantedAt: { type: Date, default: Date.now },
    // Chain of renewals; null on an original consent.
    renewedFrom: { type: String, default: null },
    status: { type: String, enum: ['Active', 'Expired', 'Revoked'], default: 'Active' },
  }],
  // MIND-M-01: validated screening administrations. `responses` keeps the raw
    // per-item answers so a score is always re-derivable - a stored total that
    // cannot be checked against its own inputs is not evidence.
    screenings: [{
      instrument: { type: String, enum: ['PHQ-9', 'GAD-7'], required: true },
      responses: { type: mongoose.Schema.Types.Mixed, required: true },
      total: { type: Number, required: true },
      maxScore: { type: Number, required: true },
      severity: { type: String, required: true },
      // Stored separately from severity so a risk signal can never be lost by
      // being folded into a total.
      suicidalityFlagged: { type: Boolean, default: false },
      referralSuggested: { type: Boolean, default: false },
      completedAt: { type: Date, default: Date.now },
      completedBy: { type: String },
    }],
    confidentiality: { type: Boolean, default: true },
  consentToShare: { type: Boolean, default: false },
  status: { type: String, enum: ['Active', 'Completed', 'Discontinued', 'Referred'], default: 'Active' },
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  // ─── MIND-B-01: special-category data under DPDP §4 ─────────────────────────
  // Mental-health records are the highest-sensitivity PHI class in the system:
  // a disclosure here is not a data breach so much as an existential harm to the
  // person. Three things were missing:
  //   1. a recorded processing PURPOSE (why is this data being held at all?),
  //   2. proof of the PATIENT's explicit consent at the moment of creation,
  //   3. a data-classification marker that reads back on the document itself.
  // The classification is a server-set constant, never client-supplied: a client
  // must not be able to downgrade its own mental-health record to "general".
  dataClassification: {
    type: String,
    enum: ['PSYCHIATRIC_SPECIAL_CATEGORY'],
    default: 'PSYCHIATRIC_SPECIAL_CATEGORY',
    immutable: false,
  },
  purposeOfProcessing: {
    type: String,
    enum: [
      'Assessment', 'Direct Care', 'Crisis Intervention',
      'Court Ordered', 'Insurance Claim', 'Family Support',
    ],
    default: 'Assessment',
  },
  consentBasis: {
    // Who lawfully authorised the processing. `Emergency` is the one basis that
    // does not require prior consent — and it is also the only one that obliges
    // the clinic to escalate (see crisisEvents below).
    grantedBy: { type: String, enum: ['Patient', 'Guardian', 'Court Order', 'Emergency'], default: 'Patient' },
    consentRecordedAt: { type: Date, default: Date.now },
    consentReference: { type: String, default: '' },
    scope: {
      type: String,
      enum: ['Care Team Only', 'Care Team + Family', 'Care Team + Insurer'],
      default: 'Care Team Only',
    },
    // Explicit DPDP "purpose limitation" record: what this data may NOT be used
    // for. Storing the denial is what makes the restriction auditable.
    explicitlyRefused: {
      marketing: { type: Boolean, default: false },
      research: { type: Boolean, default: false },
      thirdPartyDisclosure: { type: Boolean, default: false },
    },
  },

  // ─── MIND-B-02: crisis escalation is a SAFETY control, not a field ─────────
  // A `riskAssessment: 'Immediate'` value with no acknowledgement field and no
  // audit trail means a suicidal patient can be flagged and then sit unread. The
  // SLA is a real deadline the UI can count down, and `acknowledgedAt` is what
  // makes "nobody saw this" provable afterwards.
  crisisEvents: [{
    flaggedAt: { type: Date, default: Date.now },
    severity: { type: String, enum: ['Medium', 'High', 'Immediate'], required: true },
    risk: { type: String, default: '' },
    // SLA measured from flaggedAt: Immediate = 15 min, High = 4h, Medium = 24h.
    responseDueAt: { type: Date, required: true },
    acknowledgedAt: { type: Date, default: null },
    acknowledgedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    escalatedAt: { type: Date, default: null },
    escalatedTo: { type: String, default: '' },
    actionTaken: { type: String, default: '' },
    resolvedAt: { type: Date, default: null },
    notes: { type: String, default: '' },
  }],
  // Denormalised for the unacknowledged-crisis queue, which is the query that
  // has to stay fast when someone is panicking at 3am.
  openCrisisCount: { type: Number, default: 0 },
  lastCrisisAt: { type: Date, default: null },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

// MIND-B-02: the on-call queue query — unacknowledged crises, soonest deadline
// first. This is the index that makes the safety-critical page fast.
mhSchema.index({ 'crisisEvents.acknowledgedAt': 1, 'crisisEvents.responseDueAt': 1 });
// MIND-B-01: reads are always scoped by owning patient, so this index is the
// enforcement path, not just a performance nicety.
mhSchema.index({ patientId: 1, createdAt: -1 });

mhSchema.pre('save', function (next) { this.updatedAt = new Date(); next(); });
export default mongoose.model('MentalHealth', mhSchema);