import mongoose from 'mongoose';

const growthPointSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  weightKg: Number,
  heightCm: Number,
  headCircCm: Number,
  bmi: Number,
  percentileWt: Number,
  percentileHt: Number,
  percentileBmi: Number,
}, { _id: false });

const growthChartSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Facility', required: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  sex: { type: String, enum: ['male', 'female'], required: true },
  birthDate: { type: Date, required: true },
  points: [growthPointSchema],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

export default mongoose.model('GrowthChart', growthChartSchema);
