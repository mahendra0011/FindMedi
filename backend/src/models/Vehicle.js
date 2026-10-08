import mongoose from 'mongoose';

const vehicleSchema = new mongoose.Schema({
  riderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  type: {
    type: String,
    // subcatogary.md C23 + A1: the join-wizard `vehicle_type` options in
    // lib/providerTypeCatalog.js (wheelchair_stretcher_van, ambulance_bls/als/
    // nicu) must be storable on the vehicle row too, otherwise an approved
    // application cannot be turned into a Vehicle. `bus`/`mini_truck` are the
    // rest of the §23 list. Additive only.
    enum: [
      'bike', 'auto', 'e_rickshaw', 'car', 'van',
      'wheelchair_stretcher_van', 'ambulance_bls', 'ambulance_als',
      'ambulance_nicu', 'bus', 'mini_truck',
    ],
    required: true,
    index: true,
  },
  brand: { type: String, required: true },
  model: { type: String, required: true },
  rcNumber: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
  rcDocUrl: { type: String, default: '' },
  insuranceNumber: { type: String, required: true },
  insuranceDocUrl: { type: String, default: '' },
  insuranceExpiry: { type: Date, required: true },
  color: { type: String, default: '' },
  photos: [{ type: String }],
  capacity: { type: Number, default: 4 },
  fuelType: {
    type: String,
    enum: ['Petrol', 'Diesel', 'CNG', 'Electric', 'Hybrid', 'Other'],
    default: 'Petrol',
  },
  extraFields: {
    type: mongoose.Schema.Types.Mixed,
    default: () => ({}),
  },
  isDocumentVerified: { type: Boolean, default: false, index: true },
  verifiedAt: { type: Date },
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

vehicleSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.model('Vehicle', vehicleSchema);
