import mongoose from 'mongoose';

/** File 22 P1-14: invoice series per hospital+prefix (FY-aware counter). */
const invoiceSeriesSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  prefix: { type: String, required: true, maxlength: 12 },
  fy: { type: String, required: true }, // "26-27"
  next: { type: Number, default: 1 },
}, { timestamps: true });

invoiceSeriesSchema.index({ hospitalId: 1, prefix: 1, fy: 1 }, { unique: true });

export default mongoose.models.InvoiceSeries || mongoose.model('InvoiceSeries', invoiceSeriesSchema);
