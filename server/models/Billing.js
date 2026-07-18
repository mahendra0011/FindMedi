import mongoose from 'mongoose';

const billingSchema = new mongoose.Schema({
  invoiceId: { type: String, required: true, unique: true },
  patient: { type: String, required: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  doctor: { type: String },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },
  appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
  admissionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admission' },
  service: { type: String, required: true },
  services: [{
    id: { type: String, default: '' },
    name: { type: String, required: true },
    description: { type: String },
    price: { type: Number, required: true },
    quantity: { type: Number, default: 1 },
    category: { type: String, default: 'General' },
    discount: { type: Number, default: 0 },
  }],
  source: { type: String, enum: ['manual', 'appointment', 'lab', 'pharmacy', 'ipd', 'ot', 'radiology', 'physio', 'diet'], default: 'manual' },
  amount: { type: Number, required: true },
  subTotal: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  tax: { type: Number, default: 0 },
  taxRate: { type: Number, default: 0 },
  taxableAmount: { type: Number, default: 0 },
  paid: { type: Number, default: 0 },
  balance: { type: Number, default: 0 },
  status: { type: String, enum: ['Paid', 'Pending', 'Overdue', 'Partial', 'Cancelled', 'Refunded'], default: 'Pending' },
  date: { type: String, required: true },
  dueDate: { type: String },
  paymentMethod: { type: String, enum: ['Cash', 'Card', 'UPI', 'Cheque', 'Insurance', 'Online', 'Other'] },
  transactionId: { type: String },
  insuranceClaimId: { type: String },
  insuranceApprovedAmount: { type: Number, default: 0 },
  insuranceStatus: { type: String, enum: ['Not Submitted', 'Submitted', 'Approved', 'Rejected', 'Partial'], default: 'Not Submitted' },
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  facilityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Facility', index: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

billingSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  if (this.balance === undefined) {
    this.balance = this.amount - this.paid;
  }
  next();
});

export default mongoose.model('Billing', billingSchema);// 16
