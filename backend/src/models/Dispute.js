import mongoose from 'mongoose';

const disputeSchema = new mongoose.Schema({
  disputeId: { type: String, required: true, unique: true },
  raisedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  raisedByName: { type: String },
  againstType: { type: String, enum: ['hospital', 'doctor', 'pharmacy', 'lab', 'clinic', 'patient'], required: true },
  againstId: { type: mongoose.Schema.Types.ObjectId },
  againstName: { type: String },
  reason: { type: String, required: true },
  description: { type: String, default: '' },
  status: { type: String, enum: ['Open', 'In Review', 'Resolved', 'Dismissed'], default: 'Open' },
  priority: { type: String, enum: ['Low', 'Medium', 'High', 'Critical'], default: 'Medium' },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  resolution: { type: String, default: '' },
  resolvedAt: { type: Date },
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  // 13.md:343's lifecycle — Report → Ticket → Evidence → Decision → Appeal.
  // Each stage is a field on the row so a dispute can be reopened or appealed
  // without a second collection holding half the story.
  evidence: [{
    url: { type: String, maxlength: 500, required: true },
    kind: { type: String, enum: ['screenshot', 'invoice', 'chat', 'medical_doc', 'photo', 'other'], default: 'other' },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    uploadedAt: { type: Date, default: Date.now },
    note: { type: String, maxlength: 500, default: '' },
  }],
  // The provider's side of the ticket (8.md 75: the provider gets to respond).
  providerResponse: { type: String, default: '' },
  providerRespondedAt: { type: Date, default: null },

  decision: {
    type: { type: String, enum: ['', 'upheld', 'partially_upheld', 'rejected', 'withdrawn'], default: '' },
    rationale: { type: String, default: '' },
    decidedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    decidedAt: { type: Date, default: null },
  },

  appeal: {
    appealedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    appealedAt: { type: Date, default: null },
    reason: { type: String, maxlength: 2000, default: '' },
    status: { type: String, enum: ['none', 'pending', 'decided'], default: 'none' },
    outcome: { type: String, enum: ['', 'overturned', 'upheld'], default: '' },
    decidedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    decidedAt: { type: Date, default: null },
  },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

disputeSchema.index({ 'appeal.status': 1, createdAt: -1 });

disputeSchema.index({ status: 1, createdAt: -1 });
disputeSchema.index({ raisedBy: 1, createdAt: -1 });
disputeSchema.pre('save', function (next) { this.updatedAt = new Date(); next(); });
export default mongoose.model('Dispute', disputeSchema);