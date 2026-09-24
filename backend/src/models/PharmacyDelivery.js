import mongoose from 'mongoose';

/**
 * Delivery task — pehle sirf pharmacy parcels ke liye tha, ab ek hi delivery
 * boy fleet medicines, lab reports (aur future me lab sample pickup) dono
 * deliver karti hai. `serviceType` decide karta hai ki task kis service ka hai
 * aur kaunsa reference (`orderRef` vs `labBookingId`/`labOrderId`) use hoga.
 */
const pharmacyDeliverySchema = new mongoose.Schema({
  serviceType: {
    type: String,
    enum: ['pharmacy', 'lab_report', 'lab_sample'],
    default: 'pharmacy',
    index: true,
  },

  // Human readable task id — pharmacy: PharmacyOrder.orderId, lab: bookingId / orderId
  orderId: { type: String, required: true },
  // Pharmacy parcels ke liye mandatory, lab tasks ke liye optional.
  orderRef: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PharmacyOrder',
    required: function () { return (this.serviceType || 'pharmacy') === 'pharmacy'; },
  },
  labBookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'LabBooking', index: true },
  labOrderId: { type: mongoose.Schema.Types.ObjectId, ref: 'LabOrder', index: true },

  deliveryPartnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'DeliveryPartner' },
  status: {
    type: String,
    enum: ['Pending Assignment', 'Assigned', 'Picked Up', 'Out for Delivery', 'Delivered', 'Failed', 'Cancelled'],
    default: 'Pending Assignment',
  },

  // Pickup ka display naam (pharmacy store ya diagnostic lab) — UI label ke liye.
  pickupName: { type: String },
  pickupAddress: { type: String, required: true },
  pickupLocation: { lat: Number, lng: Number },
  dropAddress: { type: String, required: true },
  dropLocation: { lat: Number, lng: Number },

  // Patient/customer details — lab tasks me orderRef na hone par bhi UI ko chahiye.
  patientName: { type: String },
  patientPhone: { type: String },

  // Rider payout for this specific task (lab tasks me LabBooking.reportDeliveryFee se aata hai).
  deliveryFee: { type: Number, default: 0 },
  notes: { type: String },

  estimatedTime: { type: String },
  deliveryOtp: { type: String },
  otpVerified: { type: Boolean, default: false },
  deliveryProofPhoto: { type: String },

  trackingHistory: [{ lat: Number, lng: Number, timestamp: { type: Date, default: Date.now } }],

  assignedAt: { type: Date },
  pickedUpAt: { type: Date },
  deliveredAt: { type: Date },

  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  facilityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Facility', index: true },
}, { timestamps: true });

export default mongoose.model('PharmacyDelivery', pharmacyDeliverySchema);
