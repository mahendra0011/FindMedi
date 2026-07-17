import mongoose from 'mongoose';

const pharmacyDeliverySchema = new mongoose.Schema({
  orderId: { type: String, required: true },
  orderRef: { type: mongoose.Schema.Types.ObjectId, ref: 'PharmacyOrder' },
  deliveryPerson: { type: String, required: true },
  phone: { type: String },
  status: { type: String, enum: ['Pending Pickup', 'In Transit', 'Delivered', 'Failed'], default: 'Pending Pickup' },
  estimatedTime: { type: String },
  tracking: [{ location: String, time: { type: Date, default: Date.now } }],
  assignedAt: { type: Date, default: Date.now },
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
});

export default mongoose.model('PharmacyDelivery', pharmacyDeliverySchema);
