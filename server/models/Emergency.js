import mongoose from 'mongoose';

const emergencySchema = new mongoose.Schema({
  patientName: { type: String, default: 'Unknown' },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  age: { type: Number },
  gender: { type: String, enum: ['Male', 'Female', 'Other'] },
  phone: { type: String },
  condition: { type: String, required: true },
  severity: { type: String, enum: ['Critical', 'Serious', 'Stable'], default: 'Serious' },
  status: { 
    type: String, 
    enum: ['Pending', 'Assigned', 'Under Treatment', 'Stable', 'Transferred', 'Discharged', 'Rejected'], 
    default: 'Pending' 
  },
  assignedDoctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  assignedDoctorName: { type: String },
  notes: [{
    text: { type: String },
    timestamp: { type: Date, default: Date.now },
    doctorName: { type: String }
  }],
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  createdAt: { type: Date, default: Date.now },
  responseTime: { type: Number }, // in minutes
});

export default mongoose.model('Emergency', emergencySchema);
