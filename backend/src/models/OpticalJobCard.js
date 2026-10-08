import mongoose from 'mongoose';

// 7.md §3.2 optical store job cards: the lab-fitting workflow for an optical
// order (frames + lenses ground/fitted in-lab). booked → in_lab → ready →
// delivered, forward only with server-stamped times — a redelivery after a
// repair is a new card, not a reopened one. Frames/lenses stay free-text
// descriptors (the sellable catalogue is Product); the card tracks WORK.
export const OPTICAL_JOB_STATUSES = ['booked', 'in_lab', 'ready', 'delivered', 'cancelled'];

const opticalJobCardSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Provider', required: true, index: true },
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  frames: { type: String, trim: true, maxlength: 200, default: '' },
  lensOd: {
    sph: { type: Number, min: -20, max: 20 },
    cyl: { type: Number, min: -10, max: 10 },
    axis: { type: Number, min: 0, max: 180 },
  },
  lensOs: {
    sph: { type: Number, min: -20, max: 20 },
    cyl: { type: Number, min: -10, max: 10 },
    axis: { type: Number, min: 0, max: 180 },
  },
  lensMaterial: { type: String, trim: true, maxlength: 80, default: '' },
  coating: { type: String, trim: true, maxlength: 80, default: '' },
  priceAmount: { type: Number, min: 0, default: 0 },
  status: { type: String, enum: OPTICAL_JOB_STATUSES, default: 'booked', index: true },
  bookedAt: { type: Date, default: Date.now },
  inLabAt: { type: Date, default: null },
  readyAt: { type: Date, default: null },
  deliveredAt: { type: Date, default: null },
}, { timestamps: false });

opticalJobCardSchema.index({ patientId: 1, createdAt: -1 });

export default mongoose.model('OpticalJobCard', opticalJobCardSchema);
