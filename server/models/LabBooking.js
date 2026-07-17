import mongoose from 'mongoose';

const labBookingSchema = new mongoose.Schema({
  bookingId: { type: String, required: true, unique: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  patientName: { type: String, required: true },
  patientPhone: { type: String },
  patientEmail: { type: String },
  tests: [{ type: String }],
  testIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Test' }],
  totalAmount: { type: Number, required: true },
  discountedAmount: { type: Number },
  paymentStatus: { type: String, enum: ['Pending', 'Partially Paid', 'Paid', 'Refunded'], default: 'Pending' },
  status: { type: String, enum: ['Pending', 'Confirmed', 'Sample Collected', 'Processing', 'Completed', 'Cancelled', 'Rescheduled'], default: 'Pending' },
  bookingDate: { type: Date, required: true },
  timeSlot: { type: String },
  visitType: { type: String, enum: ['Walk-in', 'Home Collection', 'Appointment'], default: 'Walk-in' },
  homeCollectionAddress: { type: String },
  homeCollectionFee: { type: Number, default: 0 },
  prescriptionUrl: { type: String },
  prescriptionVerified: { type: Boolean, default: false },
  isWalkin: { type: Boolean, default: false },
  notes: { type: String },
  reportUrl: { type: String },
  reportReadyAt: { type: Date },
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

labBookingSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.model('LabBooking', labBookingSchema);
