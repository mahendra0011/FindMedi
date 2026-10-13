import mongoose from 'mongoose';

/**
 * File 24 §5 CRM automation rules: lead stage SLA idle, doc expiry, overdue
 * tasks, at-risk check-ins, partner next-step overdue. Actions create Tasks
 * (via Task.automationRuleId) and reminder Notifications — never patient data.
 * `runs` is a capped execution log for the UI (last 50 sweeps).
 */
const CRM_AUTOMATION_TRIGGERS = [
  'lead_stage_idle',
  'doc_expiring',
  'task_overdue',
  'at_risk_provider',
  'partner_next_step_due',
];

const crmAutomationRuleSchema = new mongoose.Schema({
  name: { type: String, required: true, maxlength: 120 },
  trigger: { type: String, enum: CRM_AUTOMATION_TRIGGERS, required: true, index: true },
  enabled: { type: Boolean, default: true, index: true },
  // trigger-specific knobs: slaHours, daysToExpiry, overdueGraceHours
  conditions: { type: mongoose.Schema.Types.Mixed, default: {} },
  actions: [{
    type: { type: String, enum: ['create_task', 'notify'], default: 'create_task' },
    params: { type: mongoose.Schema.Types.Mixed, default: {} },
  }],
  cooldownMinutes: { type: Number, default: 60, min: 1, max: 10080 },
  lastRunAt: { type: Date, default: null },
  runs: [{
    at: { type: Date, default: Date.now },
    matched: { type: Number, default: 0 },
    created: { type: Number, default: 0 },
    error: { type: String, default: '' },
  }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

crmAutomationRuleSchema.index({ trigger: 1, enabled: 1 });

export const CRM_AUTOMATION_TRIGGERS_LIST = CRM_AUTOMATION_TRIGGERS;

export default mongoose.models.CrmAutomationRule
  || mongoose.model('CrmAutomationRule', crmAutomationRuleSchema);
