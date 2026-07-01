import mongoose from 'mongoose';

const staffSchema = new mongoose.Schema({
  employeeId: { type: String, required: true, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name: { type: String, required: true },
  role: { type: String, enum: ['Admin', 'Doctor', 'Nurse', 'Pharmacist', 'Lab Technician', 'Radiologist', 'Dietitian', 'Physiotherapist', 'Counselor', 'Technician', 'Helper', 'Security', 'Accountant', 'Receptionist'], required: true },
  department: { type: String },
  designation: { type: String },
  joinDate: { type: Date, required: true },
  employmentType: { type: String, enum: ['Full-time', 'Part-time', 'Contract', 'Intern'], default: 'Full-time' },
  shift: { type: String, enum: ['Morning', 'Evening', 'Night', 'Rotating'], default: 'Morning' },
  salary: { type: Number },
  contactNumber: { type: String },
  emergencyContact: { type: String },
  address: { type: String },
  qualifications: [{ degree: String, year: Number, institute: String }],
  certifications: [{ name: String, issuedBy: String, expiryDate: Date }],
  leaveBalance: { casual: { type: Number, default: 12 }, sick: { type: Number, default: 10 }, annual: { type: Number, default: 15 } },
  attendance: [{ date: Date, status: { type: String, enum: ['Present', 'Absent', 'Leave', 'Half Day'] } }],
  overtime: [{
    date: { type: Date, default: Date.now },
    hours: { type: Number, default: 0 },
    reason: { type: String },
    approvedBy: { type: String },
    approvedAt: { type: Date },
  }],
  status: { type: String, enum: ['Active', 'Inactive', 'On Leave', 'Resigned'], default: 'Active' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('Staff', staffSchema);