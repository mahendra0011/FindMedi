import mongoose from 'mongoose';

/**
 * File 22 P0-6: monthly payslip. Net is DERIVED (gross − PF − ESI − PT −
 * TDS − advances), never accepted from the client.
 */
const payslipSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', required: true, index: true },
  month: { type: String, required: true }, // YYYY-MM
  earnings: {
    basic: { type: Number, default: 0 }, hra: { type: Number, default: 0 },
    allowances: { type: Number, default: 0 }, overtime: { type: Number, default: 0 },
  },
  deductions: {
    pf: { type: Number, default: 0 }, esi: { type: Number, default: 0 },
    pt: { type: Number, default: 0 }, tds: { type: Number, default: 0 },
    advances: { type: Number, default: 0 },
  },
  gross: { type: Number, default: 0 },
  totalDeductions: { type: Number, default: 0 },
  net: { type: Number, default: 0 },
  status: { type: String, enum: ['Draft', 'Released', 'Paid'], default: 'Draft', index: true },
  releasedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

payslipSchema.index({ hospitalId: 1, staffId: 1, month: 1 }, { unique: true });

payslipSchema.pre('save', function (next) {
  const e = this.earnings || {};
  const d = this.deductions || {};
  this.gross = (Number(e.basic) || 0) + (Number(e.hra) || 0) + (Number(e.allowances) || 0) + (Number(e.overtime) || 0);
  this.totalDeductions = (Number(d.pf) || 0) + (Number(d.esi) || 0) + (Number(d.pt) || 0) + (Number(d.tds) || 0) + (Number(d.advances) || 0);
  this.net = this.gross - this.totalDeductions;
  next();
});

export default mongoose.models.Payslip || mongoose.model('Payslip', payslipSchema);
