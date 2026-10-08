import mongoose from 'mongoose';

// 7.md:39 doctor "second-opinion inbox": a patient (self or managed family
// profile) shares specific records + a question with a chosen doctor; the
// doctor answers or declines from their inbox. The share is consent-by-action
// and it is RECORDED, not implied:
//   - `consentId` points at the ConsentRecord (GRANTED, 30-day ceiling per
//     records.js DLB-19) this request minted, so the grant shows up in the
//     patient's privacy-centre consents ledger and dies (REVOKED) the moment
//     the request reaches a terminal state (answered/declined/cancelled);
//   - the doctor reads the referenced records through the EXISTING record
//     routes (F2 consent/staff rules), never through a side channel here —
//     the inbox carries references + the question, not record bodies.
// The status list below is the storage truth; the shared copy used for
// request validation lives in validate.js (SECOND_OPINION_STATUSES, pinned by
// validateVocab.spec.js) because specs mock this model with a default-only
// factory and a named model export fails every such mock at link time.

const secondOpinionRequestSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  familyMemberId: { type: mongoose.Schema.Types.ObjectId, ref: 'FamilyMember', default: null, index: true },
  // Snapshot of the requester's name at create time: the inbox shows it
  // without a User join (one fewer query, and stable even if the account is
  // renamed mid-conversation). req.user.name is populated by protect.
  patientName: { type: String, default: '', trim: true, maxlength: 120 },
  // The Doctor PROFILE consulted...
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true, index: true },
  // ...and its login, resolved at create. A profile without one has no inbox.
  doctorUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  recordIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Record' }],
  question: { type: String, required: true, trim: true, maxlength: 1000 },
  status: { type: String, enum: ['REQUESTED', 'ANSWERED', 'DECLINED', 'CANCELLED'], default: 'REQUESTED', index: true },
  answer: {
    text: { type: String, default: '', maxlength: 2000 },
    answeredAt: { type: Date, default: null },
  },
  consentId: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: false });

secondOpinionRequestSchema.index({ patientId: 1, familyMemberId: 1, doctorId: 1, status: 1 });
secondOpinionRequestSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.model('SecondOpinionRequest', secondOpinionRequestSchema);
