import mongoose from 'mongoose';

const patientSchema = new mongoose.Schema({
  name: { type: String, required: true },
  age: { type: Number, required: true },
  gender: { type: String, enum: ['Male', 'Female', 'Other'], required: true },
  disease: { type: String, default: '' },
  doctor: { type: String, default: '' },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  uhid: { type: String, unique: true, sparse: true, index: true },
  phone: { type: String, default: '' },
  email: { type: String, default: '' },
  address: { type: String, default: '' },
bloodGroup: { type: String, default: '' },

  birthRecord: {
    placeOfBirth: { type: String },
    attendingDoctor: { type: String },
    certificateGenerated: { type: Boolean, default: false },
    certificateUrl: { type: String },
  },

  deathRecord: {
    dateOfDeath: { type: Date },
    causeOfDeath: { type: String },
    attendingDoctor: { type: String },
    certificateGenerated: { type: Boolean, default: false },
    certificateUrl: { type: String },
  },

  infectiousDisease: [{
    disease: { type: String, required: true },
    diagnosisDate: { type: Date, default: Date.now },
    notified: { type: Boolean, default: false },
    notificationDate: { type: Date },
  }],

  parentName: { type: String },
  birthPlace: { type: String },
  dateOfBirth: { type: Date },
  deathDate: { type: Date },

  admitted: { type: Date, default: Date.now },
  status: { type: String, enum: ['Active', 'Discharged', 'Critical'], default: 'Active' },
  createdAt: { type: Date, default: Date.now },
});

patientSchema.pre('save', async function (next) {
  if (!this.uhid) {
    const count = await mongoose.models.Patient?.countDocuments({}) || 0;
    this.uhid = `UHID${String(count + 1).padStart(7, '0')}`;
  }
  next();
});

export default mongoose.model('Patient', patientSchema);
// 17
