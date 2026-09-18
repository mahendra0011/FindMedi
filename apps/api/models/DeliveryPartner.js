import mongoose from 'mongoose';

const deliveryPartnerSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  name: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String },
  photo: { type: String },
  dob: { type: Date },
  gender: { type: String, enum: ['Male', 'Female', 'Other'] },
  address: { type: String },
  city: { type: String },
  pincode: { type: String },

  vehicleType: { type: String, enum: ['bike', 'scooter', 'bicycle', 'foot'], required: true },
  vehicleNumber: { type: String },
  drivingLicenseDoc: { type: String },
  vehicleRcDoc: { type: String },
  insuranceDoc: { type: String },

  aadharDoc: { type: String, required: true },
  panDoc: { type: String, required: true },
  bankDetails: {
    accountNo: String,
    ifsc: String,
    holderName: String,
    upiId: String,
  },

  workZone: [{ type: String }],
  availability: { type: String, enum: ['full-time', 'part-time', 'flexible'], default: 'flexible' },
  emergencyContact: { name: String, phone: String },

  status: { type: String, enum: ['pending', 'approved', 'rejected', 'suspended'], default: 'pending' },
  rejectionReason: { type: String },

  currentLocation: { lat: Number, lng: Number, updatedAt: Date },
  isOnline: { type: Boolean, default: false },
  isAvailable: { type: Boolean, default: false },

  assignedPharmacyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Facility' },
  rating: { type: Number, default: 0 },
  totalDeliveries: { type: Number, default: 0 },
}, { timestamps: true });

export default mongoose.model('DeliveryPartner', deliveryPartnerSchema);
