import mongoose from 'mongoose';

const tokenSchema = new mongoose.Schema({
  tokenNumber: { type: String, required: true, unique: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  patientName: { type: String, required: true },
  uhid: { type: String, index: true },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },
  doctorName: { type: String },
  department: { type: String, required: true },
  appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
  type: { type: String, enum: ['OPD', 'IPD', 'Emergency', 'Lab', 'Pharmacy', 'Radiology'], default: 'OPD' },
  priority: { type: String, enum: ['Normal', 'Urgent', 'Emergency'], default: 'Normal' },
  status: { type: String, enum: ['Waiting', 'Called', 'In Consultation', 'Completed', 'Skipped', 'Cancelled'], default: 'Waiting' },
  queuePosition: { type: Number },
  estimatedWaitTime: { type: Number }, // minutes
  checkedInAt: { type: Date },
  calledAt: { type: Date },
  consultationStartTime: { type: Date },
  consultationEndTime: { type: Date },
  completedAt: { type: Date },
  roomNumber: { type: String },
  notes: { type: String },
  createdAt: { type: Date, default: Date.now },
});

tokenSchema.pre('save', async function (next) {
  if (!this.tokenNumber) {
    const today = new Date();
    const dateStr = `${today.getFullYear()}${String(today.getMonth()+1).padStart(2,'0')}${String(today.getDate()).padStart(2,'0')}`;
    const count = await mongoose.models.Token?.countDocuments({ tokenNumber: new RegExp(dateStr) }) || 0;
    this.tokenNumber = `TKN-${dateStr}-${String(count+1).padStart(3,'0')}`;
    this.queuePosition = count + 1;
  }
  next();
});

export default mongoose.model('Token', tokenSchema);