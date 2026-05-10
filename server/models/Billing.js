import mongoose from 'mongoose';

const billingSchema = new mongoose.Schema({
  invoiceId: { type: String, required: true, unique: true },
  patient: { type: String, required: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  doctor: { type: String, required: true },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },
  appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
  service: { type: String, required: true },
  services: [{
    id: { type: String, default: '' },
    name: { type: String, default: '' },
    price: { type: Number, default: 0 },
    category: { type: String, default: '' },
  }],
  source: { type: String, enum: ['manual', 'appointment', 'lab'], default: 'manual' },
  amount: { type: Number, required: true },
  paid: { type: Number, default: 0 },
  status: { type: String, enum: ['Paid', 'Pending', 'Overdue', 'Partial'], default: 'Pending' },
  date: { type: String, required: true },
  dueDate: { type: String, default: '' },
  paymentMethod: { type: String, default: '' },
  transactionId: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('Billing', billingSchema);
