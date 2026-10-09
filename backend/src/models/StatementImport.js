import mongoose from 'mongoose';

/** File 16 §16.3: statement import batch (parsed → matched → closed). */
const statementImportSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  bankAccountId: { type: mongoose.Schema.Types.ObjectId, ref: 'BankAccount', required: true },
  fileName: { type: String, default: '' },
  periodFrom: { type: Date, default: null },
  periodTo: { type: Date, default: null },
  rowCount: { type: Number, default: 0 },
  status: { type: String, enum: ['parsed', 'matched', 'closed'], default: 'parsed' },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

export default mongoose.models.StatementImport || mongoose.model('StatementImport', statementImportSchema);
