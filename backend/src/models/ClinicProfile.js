import mongoose from 'mongoose';
import { generate16DigitId } from '../utils/idGenerator.js';

const clinicProfileSchema = new mongoose.Schema({
  clinicId: { type: String, unique: true, sparse: true, index: true },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true, unique: true, index: true },
  clinic_name: { alias: 'clinicName', type: String, default: '' },
  clinic_address: { alias: 'clinicAddress', type: String, default: '' },
  clinic_category: { alias: 'clinicCategory', type: String, default: '' },
  clinic_timing: { alias: 'clinicTiming', type: Object, default: {} },
  clinic_photos: { alias: 'clinicPhotos', type: [String], default: [] },
  clinic_facilities: { alias: 'clinicFacilities', type: [String], default: [] },
  clinic_treatments: { alias: 'clinicTreatments', type: [String], default: [] },
  clinic_insurance: { alias: 'clinicInsurance', type: [String], default: [] },
  clinic_faqs: { alias: 'clinicFaqs', type: [Object], default: [] },
  clinic_license: { alias: 'clinicLicense', type: String, default: '' },
  established_year: { alias: 'establishedYear', type: Number, default: null },
  social: { type: Object, default: {} },
}, { timestamps: true });

clinicProfileSchema.pre('save', async function (next) {
  if (!this.clinicId) {
    this.clinicId = generate16DigitId();
  }
  next();
});

export default mongoose.model('ClinicProfile', clinicProfileSchema);
