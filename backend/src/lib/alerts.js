/**
 * File 22 P0-10: single alert-raising doorway. Every acknowledgable alert
 * (rule firings, manual code-blue/lab-panic/MTP, escalations) is a
 * DashboardAlert row AND a `dashboard:alert` socket push — the Action Center
 * and the realtime feed can never disagree.
 */
export async function raiseAlert({ hospitalId, severity = 'warning', message, entityRef = {}, ruleKey = '', by = null, code = '' }) {
  const { default: DashboardAlert } = await import('../models/DashboardAlert.js');
  const row = await DashboardAlert.create({
    hospitalId, type: 'other', severity, entityRef,
    message: String(message || '').slice(0, 500), status: 'open',
    code: String(code || ''),
  }).catch(() => null);
  try {
    const { emitDashboardAlert } = await import('../services/socketService.js');
    emitDashboardAlert(hospitalId, {
      id: String(row?._id || ''), severity, message: String(message || '').slice(0, 500),
      entityRef, ruleKey, code: String(code || ''),
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

export const ALERT_ESCALATION = {
  afterMinutes: 15,
  backoffMinutes: 30,
  maxLevels: 3,
  notifyRoles: ['hospital_admin', 'superadmin'],
};

async function notifyAlertEscalation(hospitalId, row, level) {
  try {
    const { default: User } = await import('../models/User.js');
    const { createNotification } = await import('../services/notificationService.js');
    const recipients = await User.find(
      { hospitalId, role: { $in: ALERT_ESCALATION.notifyRoles } },
      { _id: 1 },
    ).lean();
    let notified = 0;
    for (const recipient of recipients) {
      const { notification } = await createNotification({
        title: `Critical alert escalated to level ${level}`,
        message: `${String(row.message || '').slice(0, 400)} — unacknowledged after ${ALERT_ESCALATION.afterMinutes} min`,
        type: 'emergency',
        userId: String(recipient._id),
        priority: 'critical',
        dedupKey: `alert-escalation:${String(row._id)}:${level}`,
      }).catch(() => ({ notification: null }));
      if (notification) notified += 1;
    }
    return notified;
  } catch {
    return 0;
  }
}

export async function escalateAlertsTenant(hospitalId, minutes = ALERT_ESCALATION.afterMinutes) {
  const { default: DashboardAlert } = await import('../models/DashboardAlert.js');
  const now = Date.now();
  const firstDue = new Date(now - minutes * 60000);
  const backoffDue = new Date(now - ALERT_ESCALATION.backoffMinutes * 60000);
  const rows = await DashboardAlert.find({
    hospitalId,
    status: 'open',
    severity: 'critical',
    escalationLevel: { $lt: ALERT_ESCALATION.maxLevels },
    $or: [
      { escalatedAt: null, createdAt: { $lte: firstDue } },
      { escalatedAt: { $lte: backoffDue } },
    ],
  }).limit(100);
  let escalated = 0;
  let notified = 0;
  for (const row of rows) {
    const level = Number(row.escalationLevel || 0);
    if (level >= ALERT_ESCALATION.maxLevels) continue;
    if (row.escalatedAt) {
      if (now - new Date(row.escalatedAt).getTime() < ALERT_ESCALATION.backoffMinutes * 60000) continue;
    } else if (row.createdAt && new Date(row.createdAt).getTime() > firstDue.getTime()) continue;
    row.escalationLevel = level + 1;
    row.escalatedAt = new Date();
    await row.save();
    escalated += 1;
    try {
      const { emitDashboardAlert } = await import('../services/socketService.js');
      emitDashboardAlert(hospitalId, {
        id: String(row._id), severity: 'critical',
        message: `ESCALATED L${row.escalationLevel}: ${row.message}`,
        entityRef: row.entityRef, ruleKey: '', code: String(row.code || ''),
      });
    } catch { /* noop */ }
    notified += await notifyAlertEscalation(hospitalId, row, row.escalationLevel);
  }
  return { escalated, notified };
}
