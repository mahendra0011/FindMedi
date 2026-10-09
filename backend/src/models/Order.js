import mongoose from 'mongoose';

/**
 * File 09 §9.3: CPOE order (lab/radiology/medication/diet/nursing/procedure/
 * consult). Lifecycle: Ordered → Ack → InProgress → Resulted → Reviewed
 * (+ Cancelled). Linked docs carry the fulfillment refs; reviewing is
 * separate from verifying (SoD intact).
 */
const ORDER_FLOW = {
  Ordered: ['Ack', 'Cancelled'],
  Ack: ['InProgress', 'Cancelled'],
  InProgress: ['Resulted', 'Cancelled'],
  Resulted: ['Reviewed', 'Cancelled'],
  Reviewed: [],
  Cancelled: [],
};

const orderSchema = new mongoose.Schema({
  encounterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Encounter', index: true },
  admissionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admission', default: null, index: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  orderedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  kind: {
    type: String,
    enum: ['lab', 'radiology', 'medication', 'diet', 'nursing', 'procedure', 'consult'],
    required: true, index: true,
  },
  items: [{ description: { type: String }, qty: { type: Number, default: 1 } }],
  priority: { type: String, enum: ['Routine', 'Urgent', 'STAT'], default: 'Routine' },
  status: { type: String, enum: Object.keys(ORDER_FLOW), default: 'Ordered', index: true },
  prescriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Prescription', default: null },
  linkedDocs: {
    labOrderId: { type: mongoose.Schema.Types.ObjectId, ref: 'LabOrder', default: null },
    pharmacyOrderId: { type: mongoose.Schema.Types.ObjectId, ref: 'PharmacyOrder', default: null },
    radiologyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Radiology', default: null },
  },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  reviewedAt: { type: Date, default: null },
}, { timestamps: true });

orderSchema.index({ hospitalId: 1, status: 1 });

export const ORDER_TRANSITIONS = ORDER_FLOW;
export default mongoose.models.Order || mongoose.model('Order', orderSchema);
