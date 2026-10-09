import mongoose from 'mongoose';

/** File 18 §18.1: agent presence session (wallboard source). */
const agentSessionSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  agent: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  status: { type: String, enum: ['available', 'on-call', 'wrap-up', 'break', 'offline'], default: 'offline' },
  loginAt: { type: Date, default: Date.now },
  logoutAt: { type: Date, default: null },
}, { timestamps: true });

export default mongoose.models.AgentSession || mongoose.model('AgentSession', agentSessionSchema);
