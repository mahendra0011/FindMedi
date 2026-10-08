import mongoose from 'mongoose';

const familyMemberSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true },
  relation: { type: String, enum: ['Spouse', 'Child', 'Parent', 'Sibling', 'Grandparent', 'Other'], required: true },
  gender: { type: String, enum: ['Male', 'Female', 'Other'], default: 'Other' },
  dateOfBirth: { type: Date },
  phone: { type: String },
  bloodGroup: { type: String },
  allergies: { type: String },
  medicalNotes: { type: String },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },

  // 10.md 2.16 PatientProfile extras. `dependentOf` is the managing account
  // for a member who cannot hold one (minors, elders) — the row is booked BY
  // that account but belongs TO the member.
  dependentOf: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  // Guardian consent for minors (5.md 2.1 step 2): recorded per member, not
  // per booking, so every booking can read one row instead of re-consenting.
  guardianConsent: {
    granted: { type: Boolean, default: false },
    grantedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    grantedAt: { type: Date, default: null },
    note: { type: String, maxlength: 500, default: '' },
  },

  // The SOS-shareable card (6.md 2.5). It REPEATS the member's top-level
  // bloodGroup/allergies on purpose: the card is a self-contained artifact
  // handed to a responder under consent — it must not depend on a join, and
  // the share is a deliberate act recorded here rather than an implicit read
  // of the clinical fields above.
  emergencyCard: {
    allergies: { type: String, maxlength: 2000, default: '' },
    conditions: { type: String, maxlength: 2000, default: '' },
    bloodGroup: { type: String, maxlength: 20, default: '' },
    contacts: [{ name: { type: String, maxlength: 120 }, relation: { type: String, maxlength: 60 }, phone: { type: String, maxlength: 30 } }],
    sharedInSos: { type: Boolean, default: false },
    sharedAt: { type: Date, default: null },
  },

  // 6.md 2.15 privacy centre: hide a member's categories from recents and
  // suggestions, and stop lock-screen previews naming the condition.
  privacyPrefs: {
    hiddenCategories: [{ type: String, maxlength: 64 }],
    discreetNotifications: { type: Boolean, default: false },
  },

  // 10.md 2.16: device links are references only — the wearable's data lands
  // through the vitals/record import, never stored on this row.
  wearableLinks: [{
    provider: { type: String, maxlength: 80, required: true },
    externalId: { type: String, maxlength: 200, default: '' },
    kind: { type: String, enum: ['watch', 'band', 'scale', 'bp_monitor', 'glucometer', 'other'], default: 'other' },
    linkedAt: { type: Date, default: Date.now },
    lastSyncAt: { type: Date, default: null },
  }],
}, { timestamps: true });

familyMemberSchema.index({ patientId: 1, isActive: 1 });

export default mongoose.model('FamilyMember', familyMemberSchema);
