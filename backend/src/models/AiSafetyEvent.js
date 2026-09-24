import mongoose from 'mongoose';

// SA-M4: red-flag + usage events logged by the AI chat route (never fake —
// rows only exist when the route actually observes them).
const aiSafetyEventSchema = new mongoose.Schema({
  kind: { type: String, enum: ['red_flag', 'request'], default: 'request', index: true },
  trigger: { type: String, default: '' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  model: { type: String, default: '' },
  latencyMs: { type: Number, default: 0 },
  promptChars: { type: Number, default: 0 },
  replyChars: { type: Number, default: 0 },
  // Token counts are estimated as chars/4 and labelled as such in the UI.
  promptTokensEst: { type: Number, default: 0 },
  replyTokensEst: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now, index: true },
});

export default mongoose.model('AiSafetyEvent', aiSafetyEventSchema);
