import mongoose from 'mongoose';

const bedSchema = new mongoose.Schema({
  // File 13 §13.6: bedNumber unique PER hospital (compound), never global.
  bedNumber: { type: String, required: true },
  ward: { type: String, enum: ['General', 'Semi-Private', 'Private', 'ICU', 'NICU', 'PICU', 'Emergency'], required: true },
  // subcatogary.md C24 — the 10 bed types §24 lists. `PICU` is not one of
  // them but stays: dropping it would fail every stored PICU bed.
  bedType: {
    type: String,
    enum: [
      'General', 'Semi-Private', 'Private', 'Deluxe/Suite', 'ICU', 'NICU',
      'PICU', 'HDU', 'Isolation', 'Day-Care', 'Dialysis Chair',
    ],
    required: true,
  },
  status: { type: String, enum: ['Available', 'Occupied', 'Under Cleaning', 'Maintenance'], default: 'Available' },
  srcStatus: {
    // File 13 §13.6: hard state machine — every mutation writes srcStatus so
    // audits can prove which transition armed the bed.
    type: String,
    enum: ['admit', 'discharge', 'transfer', 'cleaning', 'maintenance', 'available', 'manual'],
    default: 'manual',
  },
  oxygenPoint: { type: Boolean, default: false },
  locationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Location', default: null, index: true },
  wardTypeId: { type: mongoose.Schema.Types.ObjectId, ref: 'WardType', default: null },
  currentPatientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  currentPatientName: { type: String },
  admissionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admission' },
  occupiedSince: { type: Date },
  dailyRate: { type: Number, required: true },
  floor: { type: String },
  isAC: { type: Boolean, default: false },
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

bedSchema.index({ hospitalId: 1, bedNumber: 1 }, { unique: true });

export default mongoose.models.Bed || mongoose.model('Bed', bedSchema);