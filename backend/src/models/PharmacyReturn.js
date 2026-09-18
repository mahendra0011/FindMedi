import mongoose from 'mongoose';

const pharmacyReturnSchema = new mongoose.Schema({
  returnId: { type: String, required: true, unique: true },
  orderId: { type: String, required: true },
  orderRef: { type: mongoose.Schema.Types.ObjectId, ref: 'PharmacyOrder' },
  patientName: { type: String, required: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  items: [{
    medicineName: { type: String },
    qty: { type: Number },
    reason: { type: String },
  }],
  total: { type: Number, required: true },
  status: { type: String, enum: ['Pending', 'Approved', 'Rejected', 'Refunded'], default: 'Pending' },
  initiatedAt: { type: Date, default: Date.now },
  completedAt: { type: Date },
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
});

export default mongoose.model('PharmacyReturn', pharmacyReturnSchema);
