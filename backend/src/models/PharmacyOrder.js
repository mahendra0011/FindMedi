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
 // Server-calculated amount before a payment-time platform coupon is applied.
 payableBeforeDiscount: { type: Number, default: 0 },
 status: { type: String, enum: ['Pending', 'Confirmed', 'Preparing', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled', 'Returned'], default: 'Pending' },
 paymentStatus: { type: String, enum: ['Pending', 'Unpaid', 'Paid', 'Refunded'], default: 'Unpaid' },
 inventoryReservationStatus: { type: String, enum: ['none', 'reserved', 'consumed', 'released'], default: 'none', index: true },
 inventoryReservationExpiresAt: { type: Date, default: null, index: true },
 note: { type: String, default: '' },
 orderDate: { type: Date, default: Date.now },
 hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
 facilityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Facility', index: true },
 createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
 // Prescription fields
 prescriptionUrl: { type: String, default: '' },
 prescriptionStatus: { type: String, enum: ['pending', 'verified', 'rejected', 'not_required'], default: 'not_required' },
 rejectionReason: { type: String, default: '' },
 // 10.md 2.9 rxVerification: `verifiedBy`/`h1Register` are the WHO and the
 // H1 register entry alongside the existing status — flattened beside
 // `prescriptionStatus` rather than nested under it, because every existing
 // route reads the flat field and a restructure would break them for no gain.
 verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
 h1Register: { type: String, maxlength: 120, default: '' },
 // 19.md UAT + 10.md 2.9 substitution[]: a generic swap is a CONSENT event,
 // not a silent item edit — the original line stays, the substitution records
 // what was proposed and whether the patient said yes.
 substitution: [{
   itemIndex: { type: Number, min: 0, default: 0 },
   originalName: { type: String, required: true, maxlength: 300 },
   suggestedName: { type: String, required: true, maxlength: 300 },
   reason: { type: String, maxlength: 300, default: '' },
   consent: { type: String, enum: ['pending', 'accepted', 'declined'], default: 'pending' },
   consentAt: { type: Date, default: null },
   substitutedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
 }],
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
  // File 09 §9.1/F5: consult/order lineage (optional, backfilled by script).
  encounterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Encounter', default: null, index: true },
  prescriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Prescription', default: null, index: true },
  appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', default: null },
}, { timestamps: true });

export default mongoose.model('PharmacyOrder', pharmacyOrderSchema);
