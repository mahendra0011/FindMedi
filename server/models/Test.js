import mongoose from 'mongoose';

const testSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, required: true },
  department: { type: String, default: 'Pathology' },
  price: { type: Number, required: true },
  mrp: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  reportTime: { type: String, default: '24 hrs' },
  prescriptionReq: { type: Boolean, default: false },
  homeCollection: { type: Boolean, default: false },
  homeCollectionFee: { type: Number, default: 0 },
  popular: { type: Boolean, default: false },
  nablAccredited: { type: Boolean, default: false },
  aerbCertified: { type: Boolean, default: false },
  reportsOnline: { type: Boolean, default: true },
  quickTest: { type: Boolean, default: false },
  walkinAvailable: { type: Boolean, default: true },
  description: { type: String, default: '' },
  preparation: { type: String, default: '' },
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },

  providerType: { type: String, enum: ['hospital', 'clinic', 'lab_technician', 'phlebotomist', 'radiographer', 'sonographer'], default: 'lab_technician' },
  providerName: { type: String, default: '' },
  providerId: { type: String, default: '' },
  providerLogo: { type: String, default: '' },
  distance: { type: String, default: '' },
  rating: { type: Number, default: 4.5 },
  reviewsCount: { type: Number, default: 0 },

  clinicType: { type: String, default: '' },
  linkedDoctor: { type: String, default: '' },
  doctor: { type: String, default: '' },
  admissionReq: { type: Boolean, default: false },
  mode: { type: String, default: '' },
  certifiedPhlebotomist: { type: Boolean, default: false },
  sampleType: { type: String, default: '' },
  equipmentType: { type: String, default: '' },
  scanType: { type: String, default: '' },

  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('Test', testSchema);
