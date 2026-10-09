import mongoose from 'mongoose';

/**
 * File 09 §9.2: room-type tariff master (per-day bed/nursing/RMO/visit
 * charges) by payer class, versioned by effective window. Drives the daily
 * bed-charge accrual job.
 */
const roomTariffSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true, index: true },
  roomType: {
    type: String,
    enum: ['General', 'SemiPrivate', 'Private', 'Deluxe', 'ICU', 'NICU', 'HDU', 'Isolation', 'Emergency'],
    required: true,
  },
  payerClass: { type: String, enum: ['cash', 'insurance', 'corporate', 'govt'], default: 'cash' },
  bedPerDay: { type: Number, default: 0, min: 0 },
  nursingPerDay: { type: Number, default: 0, min: 0 },
  rmoPerDay: { type: Number, default: 0, min: 0 },
  doctorVisitPerDay: { type: Number, default: 0, min: 0 },
  effectiveFrom: { type: Date, default: Date.now },
  effectiveTo: { type: Date, default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

roomTariffSchema.index({ hospitalId: 1, roomType: 1, payerClass: 1 });

export default mongoose.models.RoomTariff || mongoose.model('RoomTariff', roomTariffSchema);
