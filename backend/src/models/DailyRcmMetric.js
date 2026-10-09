import mongoose from 'mongoose';

/** File 16 §16.1: daily RCM metrics (one row per hospital/day). */
const dailyRcmMetricSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  day: { type: String, required: true, index: true }, // YYYY-MM-DD
  firstPassRate: { type: Number, default: null },
  denialRate: { type: Number, default: null },
  avgDaysToPayment: { type: Number, default: null },
  arDays: { type: Number, default: null },
  collected: { type: Number, default: 0 },
  billed: { type: Number, default: 0 },
}, { timestamps: true });

dailyRcmMetricSchema.index({ hospitalId: 1, day: 1 }, { unique: true });

export default mongoose.models.DailyRcmMetric || mongoose.model('DailyRcmMetric', dailyRcmMetricSchema);
