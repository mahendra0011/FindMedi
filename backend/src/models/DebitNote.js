import mongoose from 'mongoose';

const debitNoteSchema = new mongoose.Schema({
  noteId: { type: String, required: true, unique: true },
  billId: { type: mongoose.Schema.Types.ObjectId, ref: 'Billing', required: true, index: true },
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  patient: { type: String, default: '' },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  amount: { type: Number, required: true, min: 0 },
  reason: { type: String, required: true },
  status: { type: String, enum: ['Issued', 'Adjusted', 'Cancelled'], default: 'Issued' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

export default mongoose.model('DebitNote', debitNoteSchema);
