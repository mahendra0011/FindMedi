import mongoose from 'mongoose';

const vehicleSchema = new mongoose.Schema({
  riderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  type: {
    type: String,
    enum: ['bike', 'auto', 'e_rickshaw', 'car', 'van', 'ambulance'],
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
});

vehicleSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.model('Vehicle', vehicleSchema);
