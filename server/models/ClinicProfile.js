import mongoose from 'mongoose';
import { generate16DigitId } from '../utils/idGenerator.js';

const clinicProfileSchema = new mongoose.Schema({
  clinicId: { type: String, unique: true, sparse: true, index: true },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true, unique: true, index: true },
  clinic_name: { type: String, default: '' },
  clinic_address: { type: String, default: '' },
  clinic_category: { type: String, default: '' },
  clinic_timing: { type: Object, default: {} },
  clinic_photos: { type: [String], default: [] },
  clinic_facilities: { type: [String], default: [] },
  clinic_treatments: { type: [String], default: [] },
  clinic_insurance: { type: [String], default: [] },
  clinic_faqs: { type: [Object], default: [] },
  clinic_license: { type: String, default: '' },
  established_year: { type: Number, default: null },
  social: { type: Object, default: {} },
});

clinicProfileSchema.pre('save', async function (next) {
  if (!this.clinicId) {
    this.clinicId = generate16DigitId();
  }
  next();
});

export default mongoose.model('ClinicProfile', clinicProfileSchema);
