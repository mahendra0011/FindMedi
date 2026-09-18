import mongoose from 'mongoose';

const familyMemberSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true },
  relation: { type: String, enum: ['Spouse', 'Child', 'Parent', 'Sibling', 'Grandparent', 'Other'], required: true },
  gender: { type: String, enum: ['Male', 'Female', 'Other'], default: 'Other' },
  dateOfBirth: { type: Date },
  phone: { type: String },
  bloodGroup: { type: String },
  allergies: { type: String },
  medicalNotes: { type: String },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('FamilyMember', familyMemberSchema);
