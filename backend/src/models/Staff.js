import mongoose from 'mongoose';

const staffSchema = new mongoose.Schema({
  employeeId: { type: String, required: true, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name: { type: String, required: true },
  // subcatogary.md C24 — the original 16 plus the operational roles §24 adds.
  // Additive only: stored documents keep validating.
  role: {
    type: String,
    enum: [
      'hospital_admin', 'Doctor', 'Nurse', 'Pharmacist', 'Lab Technician',
      'Radiologist', 'Dietitian', 'Physiotherapist', 'Counselor', 'Technician',
      'Helper', 'Security', 'Accountant', 'Receptionist', 'Driver',
      'Ambulance Driver',
      // §24 additions
      'Anaesthetist', 'Surgeon', 'Resident/Intern', 'OT Technician',
      'Ward Boy/Ayah', 'Paramedic/EMT', 'Phlebotomist',
      'Radiographer/Sonographer', 'Cook/Kitchen Staff', 'Housekeeping',
      'Biomedical Engineer', 'Storekeeper', 'Billing/TPA/Insurance Executive',
      'Medical Records Officer', 'Social Worker', 'HR', 'IT Support',
      'Quality/Infection Control Officer', 'Fire Safety Officer',
    ],
    required: true,
  },
  assignedAmbulanceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ambulance', default: null },
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
  // Wave 4a: HR document verification + exit interview
  verifiedDocs: [{
    docType: { type: String, enum: ['Aadhar', 'PAN', 'MedicalCouncilReg', 'Degree', 'BackgroundCheck', 'Other'], default: 'Other' },
    docNumber: { type: String, default: '' },
    docUrl: { type: String, default: '' },
    status: { type: String, enum: ['Pending', 'Verified', 'Rejected'], default: 'Pending' },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    verifiedAt: { type: Date, default: null },
    remarks: { type: String, default: '' },
  }],
  exitInterview: {
    conductedAt: { type: Date, default: null },
    conductedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reasonForLeaving: { type: String, default: '' },
    feedback: { type: String, default: '' },
    handoverCompleted: { type: Boolean, default: false },
    eligibleForRehire: { type: Boolean, default: true },
    noDuesCleared: { type: Boolean, default: false },
  },
  status: { type: String, enum: ['Active', 'Inactive', 'On Leave', 'Resigned'], default: 'Active' },
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

export default mongoose.model('Staff', staffSchema);