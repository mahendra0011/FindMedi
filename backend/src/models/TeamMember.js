import mongoose from 'mongoose';

/**
 * Platform-team roster (file 24 §4.8/§8): SEPARATE from hospital `Staff`
 * (which holds salary/address/emergency-contact HR data). HR-sensitive
 * fields (salary etc.) live in the HR tool, never here.
 */
const teamMemberSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  roleTemplate: {
    type: String,
    enum: ['field_exec', 'team_lead', 'city_manager', 'kyc_reviewer', 'support', 'finance', 'provider_success', 'other'],
    default: 'other', index: true,
  },
  managerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  city: { type: String, default: '' },
  territoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Territory', default: null },
  joinDate: { type: Date, default: null },
  status: { type: String, enum: ['active', 'on_leave', 'exited'], default: 'active', index: true },
  trainingRecords: [{
    module: { type: String },
    completedAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null },
  }],
  onboardingChecklist: [{ label: { type: String }, done: { type: Boolean, default: false } }],
  goals: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Objective' }],
}, { timestamps: true });

teamMemberSchema.index({ roleTemplate: 1, status: 1 });

export default mongoose.models.TeamMember || mongoose.model('TeamMember', teamMemberSchema);
