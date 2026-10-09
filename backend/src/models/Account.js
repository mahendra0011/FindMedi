import mongoose from 'mongoose';

/** File 22 P1-16: chart of accounts (grouped, GST-aware). */
const accountSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  code: { type: String, required: true, maxlength: 20 },
  name: { type: String, required: true, maxlength: 200 },
  group: {
    type: String, required: true,
    enum: ['Asset', 'Liability', 'Income', 'Expense', 'Equity'],
  },
  gstApplicable: { type: Boolean, default: false },
  bankAccountId: { type: mongoose.Schema.Types.ObjectId, ref: 'BankAccount', default: null },
  active: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

accountSchema.index({ hospitalId: 1, code: 1 }, { unique: true });

export const COA_SEED = [
  ['1000', 'Cash in hand', 'Asset', false],
  ['1010', 'Bank – Current', 'Asset', false],
  ['1100', 'Patient receivables', 'Asset', false],
  ['1200', 'TPA receivables', 'Asset', false],
  ['1300', 'Pharmacy stock', 'Asset', false],
  ['2000', 'Vendor payables', 'Liability', false],
  ['2100', 'TDS payable', 'Liability', false],
  ['2200', 'GST payable', 'Liability', true],
  ['3000', 'OPD revenue', 'Income', true],
  ['3100', 'IPD revenue', 'Income', true],
  ['3200', 'Pharmacy revenue', 'Income', true],
  ['3300', 'Lab revenue', 'Income', true],
  ['4000', 'Salary expense', 'Expense', false],
  ['4100', 'Vendor purchases', 'Expense', true],
  ['4200', 'Professional fees (doctors)', 'Expense', false],
];

export default mongoose.models.Account || mongoose.model('Account', accountSchema);
