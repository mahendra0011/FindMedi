import mongoose from 'mongoose';

// LAB_SERVICES removed — use Test catalog / LabOrder model instead

const appointmentSchema = new mongoose.Schema({
  tokenNumber: { type: String, unique: true, sparse: true, index: true },
  uhid: { type: String, index: true },
  patient: { type: String, required: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  doctor: { type: String, required: true },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },
  department: { type: String, required: true },
  date: { type: String, required: true },
  time: { type: String, required: true },
  status: { type: String, enum: ['Pending', 'Confirmed', 'Cancelled', 'Completed', 'In Queue', 'Serving', 'Missed'], default: 'Pending' },
  priority: { type: String, enum: ['Normal', 'Urgent', 'Emergency'], default: 'Normal' },
  type: { type: String, enum: ['Consultation', 'Follow-up', 'Check-up', 'Emergency'], default: 'Consultation' },
  notes: { type: String, default: '' },
  symptoms: { type: String, default: '' },
  preConsultationDetails: {
    chiefComplaint: { type: String, default: '' },
    chiefComplaintOther: { type: String, default: '' },
    symptomsDuration: { type: String, default: '' },
    pastMedicalHistory: {
      hasHistory: { type: Boolean, default: false },
      details: { type: String, default: '' }
    },
    currentTreatment: {
      hasPastTreatment: { type: Boolean, default: false },
      doctorName: { type: String, default: '' },
      cityState: { type: String, default: '' },
      when: { type: String, default: '' },
      prescriptionFile: { type: String, default: '' },
      takingMedicines: { type: Boolean, default: false }
    },
    testReports: {
      hasReports: { type: Boolean, default: false },
      reportFile: { type: String, default: '' }
    },
    currentMedications: {
      hasMedications: { type: Boolean, default: false },
      details: { type: String, default: '' }
    },
    allergies: {
      hasAllergies: { type: Boolean, default: false },
      details: { type: String, default: '' }
    },
    familyHistory: {
      hasHistory: { type: Boolean, default: false },
      details: { type: String, default: '' }
    },
    filledAt: { type: Date }
  },
  services: [{ type: String }],
  fees: { type: Number, default: 0 },
  queuePosition: { type: Number, default: 0 },
  estimatedWaitTime: { type: Number, default: 0 }, // minutes
  checkedInAt: { type: Date },
  consultationStartTime: { type: Date },
  consultationEndTime: { type: Date },
  followUpDate: { type: Date },
  reminderSent: { type: Boolean, default: false },
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  createdAt: { type: Date, default: Date.now },
});

appointmentSchema.index({ doctorId: 1, patientId: 1, date: 1, time: 1 }, { unique: true, partialFilterExpression: { status: { $in: ['Pending', 'Confirmed', 'In Queue', 'Serving'] }, doctorId: { $type: 'objectId' } } });

// createdAt/updatedAt auto-maintained (updatedAt fallback for completion time)
appointmentSchema.set('timestamps', true);

export default mongoose.model('Appointment', appointmentSchema);
