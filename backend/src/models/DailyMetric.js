import mongoose from 'mongoose';

/** File 17 §17.3: daily metric facts (incremental, one row/hospital/day). */
const dailyMetricSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  day: { type: String, required: true }, // YYYY-MM-DD
  metrics: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

dailyMetricSchema.index({ hospitalId: 1, day: 1 }, { unique: true });

export default mongoose.models.DailyMetric || mongoose.model('DailyMetric', dailyMetricSchema);
