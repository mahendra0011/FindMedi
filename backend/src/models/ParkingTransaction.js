import mongoose from 'mongoose';

// Module #93: Hospital Automated Parking Management & RFID Billing
export const VEHICLE_TYPES = ['TWO_WHEELER', 'FOUR_WHEELER', 'AMBULANCE', 'STAFF_DOCTOR', 'COMMERCIAL_SUPPLY'];

const parkingTransactionSchema = new mongoose.Schema(
  {
    hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
    ticketNumber: { type: String, required: true, unique: true, index: true },
    vehicleNumber: { type: String, required: true, trim: true, index: true },
    vehicleType: {
      type: String,
      enum: VEHICLE_TYPES,
      default: 'FOUR_WHEELER',
      index: true,
    },
    entryGate: { type: String, default: 'GATE-1-MAIN' },
    entryTime: { type: Date, default: Date.now },
    exitGate: { type: String, default: '' },
    exitTime: { type: Date },
    durationMinutes: { type: Number, default: 0 },
    slotCode: { type: String, default: 'P-GEN-01' },
    isAmbulanceExempt: { type: Boolean, default: false },
    calculatedFee: { type: Number, default: 0 },
    paymentMode: {
      type: String,
      enum: ['CASH', 'UPI_QR', 'FASTAG_RFID', 'EXEMPT'],
      default: 'UPI_QR',
    },
    paymentStatus: {
      type: String,
      enum: ['ACTIVE_PARKED', 'PAID_EXITED', 'EXEMPT_EXITED'],
      default: 'ACTIVE_PARKED',
      index: true,
    },
    driverPhone: { type: String, default: '' },
  },
  { timestamps: true }
);

parkingTransactionSchema.index({ hospitalId: 1, paymentStatus: 1, entryTime: -1 });

export default mongoose.models.ParkingTransaction || mongoose.model('ParkingTransaction', parkingTransactionSchema);
