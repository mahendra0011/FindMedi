import mongoose from 'mongoose';

const pharmacyDeliverySchema = new mongoose.Schema({
  orderId: { type: String, required: true },
  orderRef: { type: mongoose.Schema.Types.ObjectId, ref: 'PharmacyOrder', required: true },

  deliveryPartnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'DeliveryPartner' },
  status: {
    type: String,
    enum: ['Pending Assignment', 'Assigned', 'Picked Up', 'Out for Delivery', 'Delivered', 'Failed', 'Cancelled'],
    default: 'Pending Assignment',
  },

  pickupAddress: { type: String, required: true },
  pickupLocation: { lat: Number, lng: Number },
  dropAddress: { type: String, required: true },
  dropLocation: { lat: Number, lng: Number },

  estimatedTime: { type: String },
  deliveryOtp: { type: String },
  deliveryProofPhoto: { type: String },

  trackingHistory: [{ lat: Number, lng: Number, timestamp: { type: Date, default: Date.now } }],

  assignedAt: { type: Date },
  pickedUpAt: { type: Date },
  deliveredAt: { type: Date },

  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  facilityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Facility', index: true },
}, { timestamps: true });

export default mongoose.model('PharmacyDelivery', pharmacyDeliverySchema);
