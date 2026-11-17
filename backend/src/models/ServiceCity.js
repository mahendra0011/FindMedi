import mongoose from 'mongoose';

const serviceCitySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    state: {
      type: String,
      default: '',
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    centerLat: {
      type: Number,
      default: 23.1815,
    },
    centerLng: {
      type: Number,
      default: 79.9864,
    },
    // 6.3 gate: launch criteria for a city. `minFillRatePct` measures the
    // share of live providers with at least one confirmed appointment in the
    // last 30 days - we cannot measure slot occupancy without a slot model,
    // so the percentage is named `providerUtilization` in reports.
    launchGate: {
      minProviders: { type: Number, default: 15, min: 0 },
      minFillRatePct: { type: Number, default: 60, min: 0, max: 100 },
      minRepeatPct: { type: Number, default: 20, min: 0, max: 100 },
      maxOpenTickets: { type: Number, default: 10, min: 0 },
      maxPayoutFailPct: { type: Number, default: 1, min: 0, max: 100 },
      lastGateReview: { type: Date, default: null },
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('ServiceCity', serviceCitySchema);
