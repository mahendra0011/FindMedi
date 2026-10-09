import mongoose from 'mongoose';

/** File 22 P0-6: roster shift-swap request (decided by a different person). */
const shiftSwapSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  fromStaffId: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', required: true },
  toStaffId: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', required: true },
  shiftDate: { type: String, required: true }, // YYYY-MM-DD
  shift: { type: String, enum: ['Morning', 'Evening', 'Night', 'Rotating'], default: 'Morning' },
  reason: { type: String, default: '', maxlength: 500 },
  status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending', index: true },
  decidedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

shiftSwapSchema.index({ hospitalId: 1, status: 1 });

export default mongoose.models.ShiftSwap || mongoose.model('ShiftSwap', shiftSwapSchema);
