import mongoose from 'mongoose';

const newbornScreeningSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Facility', required: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  birthDate: { type: Date, required: true },
  screeningDate: Date,
  tests: [{
    name: String,
    result: String,
    normal: Boolean,
    flagged: Boolean,
    notes: String,
  }],
  status: { type: String, enum: ['pending', 'done', 'flagged', 'referred'], default: 'pending' },
  referredTo: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

newbornScreeningSchema.index({ patientId: 1, status: 1 });

export default mongoose.model('NewbornScreening', newbornScreeningSchema);
