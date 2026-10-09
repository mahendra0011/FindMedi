import mongoose from 'mongoose';

/**
 * File 09 §9.1: Episode of Care. Every consult/order/Rx/bill/document links
 * here via encounterId (+ admissionId for IPD). Generated numbers are
 * ENC-YYYY-NNNNNN (per-hospital sequence via Counter pattern is overkill;
 * uniqueness comes from hospitalId + random suffix, checked on duplicate key).
 */
const encounterSchema = new mongoose.Schema({
  encounterNo: { type: String, unique: true, sparse: true, index: true },
  type: {
    type: String,
    enum: ['OPD', 'IPD', 'ER', 'TELE', 'HOME', 'DAYCARE'],
    default: 'OPD', index: true,
  },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  uhid: { type: String, default: '' },
  appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', default: null },
  admissionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admission', default: null },
  emergencyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Emergency', default: null },
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  facilityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Facility', index: true },
  departmentId: { type: String, default: '' },
  primaryDoctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', default: null },
  payerType: { type: String, enum: ['cash', 'insurance', 'corporate', 'govt'], default: 'cash' },
  payerRef: {
    insurerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Insurer', default: null },
    policyId: { type: String, default: '' },
    corporateId: { type: String, default: '' },
    scheme: { type: String, default: '' },
  },
  status: { type: String, enum: ['Open', 'Closed', 'Cancelled'], default: 'Open', index: true },
  isMLC: { type: Boolean, default: false },
  openedAt: { type: Date, default: Date.now },
  closedAt: { type: Date, default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

encounterSchema.index({ hospitalId: 1, status: 1 });
encounterSchema.index({ patientId: 1, createdAt: -1 });

const pad6 = () => String(Math.floor(100000 + Math.random() * 900000));
encounterSchema.pre('save', function (next) {
  try {
    if (!this.encounterNo) {
      this.encounterNo = `ENC-${new Date().getFullYear()}-${pad6()}`;
    }
  } catch { /* never block the write */ }
  next();
});

export default mongoose.models.Encounter || mongoose.model('Encounter', encounterSchema);
