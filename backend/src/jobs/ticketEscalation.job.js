/**
 * 20.md §2-§3: SLA-breach auto-escalation for support tickets.
 *
 * A breached ticket (slaDueAt passed, still open) is escalated once: priority
 * forced to Urgent (unless already), escalated.{at,reason,level} stamped, and
 * an audit row written. Re-running is a no-op (escalated.at set). Pure runner
 * with injectable clock — the hourly scheduler calls it; tests call it.
 */
import SupportTicket from '../models/SupportTicket.js';
import { auditLog } from '../middleware/audit.js';
import logger from '../config/logger.js';

export async function runTicketEscalationsOnce(now = new Date()) {
  const stats = { scanned: 0, escalated: 0 };
  const breached = await SupportTicket.find({
    status: { $in: ['Open', 'In Progress'] },
    slaDueAt: { $ne: null, $lt: now },
    $or: [{ 'escalated.at': null }, { 'escalated.at': { $exists: false } }],
  })
    .select('_id priority slaDueAt')
    .limit(200)
    .lean();

  for (const t of breached) {
    stats.scanned += 1;
    const claimed = await SupportTicket.findOneAndUpdate(
      {
        _id: t._id,
        status: { $in: ['Open', 'In Progress'] },
        $or: [{ 'escalated.at': null }, { 'escalated.at': { $exists: false } }],
      },
      {
        $set: {
          priority: 'Urgent',
          escalated: { at: now, reason: 'sla-breach', level: t.priority === 'Urgent' ? 'L2' : 'L1' },
        },
      },
      { new: true },
    );
    if (!claimed) continue; // resolved or escalated concurrently
    stats.escalated += 1;
    await auditLog('ticket_escalated', null, {
      ticketId: String(claimed._id),
      reason: 'sla-breach',
      level: claimed.escalated.level,
    }).catch(() => {});
  }

  if (stats.escalated > 0) logger.info('ticketEscalation run', stats);
  return stats;
}
