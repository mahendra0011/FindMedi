import mongoose from 'mongoose';

const partogramPointSchema = new mongoose.Schema({
  time: { type: Date, required: true },
  cervixCm: Number,
  descent: Number,
  contractionsPer10Min: Number,
  fetalHeartRate: Number,
  maternalPulse: Number,
  maternalBpSystolic: Number,
  maternalBpDiastolic: Number,
  tempC: Number,
  urineProtein: String,
  urineAcetone: String,
  oxytocinDrops: Number,
  fluidsGiven: String,
}, { _id: false });

const partogramSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Facility', required: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  admissionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admission' },
  labourOnset: Date,
  membraneRupture: Date,
  deliveryTime: Date,
  deliveryMode: { type: String, enum: ['vaginal', 'instrumental', 'caesarean', 'unknown'] },
  babyWeightKg: Number,
  babyApgar1: Number,
  babyApgar5: Number,
  babySex: { type: String, enum: ['male', 'female', 'unknown'] },
  points: [partogramPointSchema],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

export default mongoose.model('Partogram', partogramSchema);
