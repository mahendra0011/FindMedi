import mongoose from 'mongoose';

const pharmacyOrderSchema = new mongoose.Schema({
 orderId: { type: String, required: true, unique: true },
 patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
 patientName: { type: String, required: true },
 phone: { type: String },
 deliveryAddress: { type: String },
 items: [{
  medicineId: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine' },
  medicineName: { type: String, required: true },
  qty: { type: Number, required: true },
  price: { type: Number, required: true },
 }],
 total: { type: Number, required: true },
 status: { type: String, enum: ['Pending', 'Confirmed', 'Preparing', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled', 'Returned'], default: 'Pending' },
 paymentStatus: { type: String, enum: ['Unpaid', 'Paid', 'Refunded'], default: 'Unpaid' },
 note: { type: String, default: '' },
 orderDate: { type: Date, default: Date.now },
 hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
 facilityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Facility', index: true },
 createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
 // Prescription fields
 prescriptionUrl: { type: String, default: '' },
 prescriptionStatus: { type: String, enum: ['pending', 'verified', 'rejected', 'not_required'], default: 'not_required' },
 rejectionReason: { type: String, default: '' },
 // Delivery fields
 deliveryFee: { type: Number, default: 0 },
 deliveryMode: { type: String, enum: ['delivery', 'pickup'], default: 'delivery' },
 deliverySlot: { type: String, default: '' },
 // Payment fields
 paymentMethod: { type: String, enum: ['COD', 'UPI', 'Card', 'NetBanking'], default: 'COD' },
 discount: { type: Number, default: 0 },
 couponCode: { type: String, default: '' },
 platformFee: { type: Number, default: 0 },
 gst: { type: Number, default: 0 },
 // Refund fields
 refunded: { type: Boolean, default: false },
 refundAmount: { type: Number, default: 0 },
 refundReason: { type: String, default: '' },
 refundDate: { type: Date },
});

export default mongoose.model('PharmacyOrder', pharmacyOrderSchema);
