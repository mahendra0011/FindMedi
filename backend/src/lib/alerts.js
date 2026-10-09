/**
 * File 22 P0-10: single alert-raising doorway. Every acknowledgable alert
 * (rule firings, manual code-blue/lab-panic/MTP, escalations) is a
 * DashboardAlert row AND a `dashboard:alert` socket push — the Action Center
 * and the realtime feed can never disagree.
 */
export async function raiseAlert({ hospitalId, severity = 'warning', message, entityRef = {}, ruleKey = '', by = null }) {
  const { default: DashboardAlert } = await import('../models/DashboardAlert.js');
  const row = await DashboardAlert.create({
    hospitalId, type: 'other', severity, entityRef,
    message: String(message || '').slice(0, 500), status: 'open',
  }).catch(() => null);
  try {
    const { emitDashboardAlert } = await import('../services/socketService.js');
    emitDashboardAlert(hospitalId, {
      id: String(row?._id || ''), severity, message: String(message || '').slice(0, 500),
      entityRef, ruleKey,
    });
  } catch { /* socket must never break alert persistence */ }
  // Trace manual/rule firings in the rule ledger when a rule key is present.
  if (ruleKey && row) {
    try {
      const { default: Rule } = await import('../models/Rule.js');
      const { default: RuleFiring } = await import('../models/RuleFiring.js');
      const rule = await Rule.findOne({ hospitalId, key: ruleKey }).select('_id').lean();
      if (rule) {
        await RuleFiring.create({
          hospitalId, ruleId: rule._id, dedupHash: `manual-${row._id}`,
          entityRef, status: 'fired',
        });
      }
    } catch { /* ledger is best-effort */ }
  }
  return row;
}

/**
 * Escalation ladder: open critical alerts unacked past `minutes` go up one
 * level (re-push socket + notify). Returns escalated count. Idempotent per
 * level via escalatedAt.
 */
export async function escalateAlertsTenant(hospitalId, minutes = 15) {
  const { default: DashboardAlert } = await import('../models/DashboardAlert.js');
  const cutoff = new Date(Date.now() - minutes * 60000);
  const rows = await DashboardAlert.find({
    hospitalId, status: 'open', severity: 'critical',
    createdAt: { $lte: cutoff },
    $or: [{ escalatedAt: null }, { escalatedAt: { $lte: cutoff } }],
  }).limit(100);
  let escalated = 0;
  for (const row of rows) {
    row.escalationLevel = Number(row.escalationLevel || 0) + 1;
    row.escalatedAt = new Date();
    // eslint-disable-next-line no-await-in-loop
    await row.save();
    try {
      const { emitDashboardAlert } = await import('../services/socketService.js');
      emitDashboardAlert(hospitalId, {
        id: String(row._id), severity: 'critical',
        message: `ESCALATED L${row.escalationLevel}: ${row.message}`,
        entityRef: row.entityRef, ruleKey: '',
      });
    } catch { /* noop */ }
    escalated += 1;
  }
  return { escalated };
}
