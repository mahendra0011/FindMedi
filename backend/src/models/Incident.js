import mongoose from 'mongoose';

/**
 * File 09 §9.9: incident / adverse-event / near-miss reporting with RCA +
 * CAPA closure (NABH PSQ). Severity drives SLA + escalation at the route layer.
 */
const incidentSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  type: {
    type: String,
    enum: ['Fall', 'MedicationError', 'NeedleStick', 'HAI', 'Sentinel', 'NearMiss', 'Equipment', 'Security', 'Other'],
    required: true, index: true,
  },
  severity: { type: String, enum: ['Low', 'Medium', 'High', 'Critical'], default: 'Medium', index: true },
  location: { type: String, default: '' },
  reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  involvedPatientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  description: { type: String, maxlength: 4000, default: '' },
  immediateAction: { type: String, maxlength: 2000, default: '' },
  rca: { type: String, maxlength: 4000, default: '' },
  capa: [{ action: { type: String }, owner: { type: String }, dueAt: { type: Date }, doneAt: { type: Date, default: null } }],
  status: { type: String, enum: ['Open', 'Investigating', 'CAPA', 'Closed'], default: 'Open', index: true },
  closedAt: { type: Date, default: null },
}, { timestamps: true });

incidentSchema.index({ hospitalId: 1, status: 1 });

export default mongoose.models.Incident || mongoose.model('Incident', incidentSchema);
