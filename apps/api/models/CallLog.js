import mongoose from 'mongoose';

const callLogSchema = new mongoose.Schema({
  caller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  callType: {
    type: String,
    enum: ['audio', 'video'],
    default: 'audio',
    required: true,
  },
  status: {
    type: String,
    enum: ['completed', 'missed', 'rejected', 'busy', 'cancelled', 'failed'],
    default: 'completed',
    index: true,
  },
  startedAt: {
    type: Date,
    default: Date.now,
  },
  answeredAt: {
    type: Date,
    default: null,
  },
  endedAt: {
    type: Date,
    default: null,
  },
  duration: {
    type: Number, // duration in seconds
    default: 0,
  },
  recordingUrl: {
    type: String,
    default: null,
  },
  recordingDuration: {
    type: Number,
    default: 0,
  },
  appointmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment',
    default: null,
  },
  deletedFor: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  notes: {
    type: String,
    default: '',
  },
}, { timestamps: true });

callLogSchema.index({ caller: 1, createdAt: -1 });
callLogSchema.index({ receiver: 1, createdAt: -1 });

export default mongoose.model('CallLog', callLogSchema);
