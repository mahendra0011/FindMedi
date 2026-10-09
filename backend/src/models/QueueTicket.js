import mongoose from 'mongoose';

/**
 * File 15 §15.1: ticket with priority class, recall counting (2 recalls →
 * NoShow, one re-queue), journey links, and per-state timestamps for ETA
 * math (rolling median service times per queue).
 */
const ticketSchema = new mongoose.Schema({
  queueId: { type: mongoose.Schema.Types.ObjectId, ref: 'Queue', required: true, index: true },
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  number: { type: Number, required: true },
  display: { type: String, required: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  encounterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Encounter', default: null },
  priority: {
    type: String,
    enum: ['Emergency', 'Critical', 'Senior', 'Appointment', 'Walkin'],
    default: 'Walkin', index: true,
  },
  boosted: { type: Boolean, default: false },
  status: {
    type: String,
    enum: ['Waiting', 'Called', 'InService', 'Done', 'NoShow', 'Skipped', 'Transferred', 'Cancelled'],
    default: 'Waiting', index: true,
  },
  arrivedAt: { type: Date, default: Date.now },
  calledAt: { type: Date, default: null },
  startedAt: { type: Date, default: null },
  completedAt: { type: Date, default: null },
  recallCount: { type: Number, default: 0 },
  counterId: { type: String, default: '' },
  createdVia: { type: String, enum: ['kiosk', 'reception', 'app', 'walkin'], default: 'reception' },
  nextQueueId: { type: mongoose.Schema.Types.ObjectId, ref: 'Queue', default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

ticketSchema.index({ queueId: 1, status: 1, priority: 1, arrivedAt: 1 });

export default mongoose.models.QueueTicket || mongoose.model('QueueTicket', ticketSchema);
