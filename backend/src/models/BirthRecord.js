import mongoose from 'mongoose';

/**
 * File 09 §9.9: birth record (delivery note linkage + CRS certificate data).
 */
const birthRecordSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  motherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  babyId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  admissionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admission', default: null },
  weightKg: { type: Number, default: 0 },
  sex: { type: String, enum: ['', 'Male', 'Female', 'Other'], default: '' },
  timeOfBirth: { type: Date, required: true },
  deliveryType: { type: String, enum: ['', 'Normal', 'C-Section', 'Assisted'], default: '' },
  certificateNo: { type: String, default: '' },
}, { timestamps: true });

export default mongoose.models.BirthRecord || mongoose.model('BirthRecord', birthRecordSchema);
