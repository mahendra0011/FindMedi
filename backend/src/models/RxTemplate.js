import mongoose from 'mongoose';

/**
 * Doc 11 §5 P0: prescription templates + favourites per doctor (dose
 * templates, common regimens). Private to the authoring doctor.
 */
const rxTemplateSchema = new mongoose.Schema({
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  name: { type: String, required: true, maxlength: 120 },
  diagnosis: { type: String, default: '' },
  diagnosisIcd: { type: String, maxlength: 20, default: '' },
  medicines: [{
    medicineName: { type: String },
    dosage: { type: String, default: '' },
    frequency: { type: String, default: '' },
    duration: { type: String, default: '' },
    route: { type: String, default: 'Oral' },
    instructions: { type: String, default: '' },
  }],
  favourite: { type: Boolean, default: false },
}, { timestamps: true });

rxTemplateSchema.index({ doctorId: 1, name: 1 });

export default mongoose.models.RxTemplate || mongoose.model('RxTemplate', rxTemplateSchema);
