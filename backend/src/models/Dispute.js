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
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

disputeSchema.pre('save', function (next) { this.updatedAt = new Date(); next(); });
export default mongoose.model('Dispute', disputeSchema);