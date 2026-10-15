/**
 * File 13 §13.1/§13.5 + File 16 + File 17: in-process cron scheduler.
 * Enabled ONLY with SCHEDULER_ENABLED=1 (default off — safe in dev/test).
 * Every tick iterates hospitals and calls the exported tenant sweep
 * functions; failures are logged, never thrown.
 */
import cron from 'node-cron';
import logger from '../config/logger.js';

let tasks = [];

async function eachHospital(fn, label) {
  const out = [];
  try {
    const { default: Hospital } = await import('../models/Hospital.js');
    const hospitals = await Hospital.find({}).select('_id').limit(500).lean();
    for (const h of hospitals) {
      try {
        out.push(await fn(h._id));
      } catch (e) {
        logger.warn(`[scheduler:${label}] hospital ${h._id}: ${e.message}`);
      }
    }
  } catch (e) {
    logger.warn(`[scheduler:${label}] ${e.message}`);
  }
  return out;
}

export async function escalateUnackedClinicalAlerts(minutes = 15) {
  const results = await eachHospital(async (hid) => {
    const { escalateAlertsTenant } = await import('../lib/alerts.js');
    return escalateAlertsTenant(hid, minutes);
  }, 'escalation');
  return results.reduce(
    (acc, r) => ({
      escalated: acc.escalated + Number(r?.escalated || 0),
      notified: acc.notified + Number(r?.notified || 0),
      hospitals: acc.hospitals + 1,
    }),
    { escalated: 0, notified: 0, hospitals: 0 },
  );
}

export function startScheduler() {
  if (process.env.SCHEDULER_ENABLED !== '1') {
    logger.info('[scheduler] disabled (set SCHEDULER_ENABLED=1 to enable)');
    return;
  }
  // Every 15 min: rules sweep + RCM detectors.
  tasks.push(cron.schedule('*/15 * * * *', async () => {
    const { sweepRulesTenant } = await import('../routes/rules.js');
    const { detectRcmTenant } = await import('../routes/rcm.js');
    await eachHospital((hid) => sweepRulesTenant(hid), 'rules');
    await eachHospital((hid) => detectRcmTenant(hid), 'rcm');
    await escalateUnackedClinicalAlerts();
  }));
  // Hourly: workflow SLA sweep + approval expiry + contract expiry + webhook retries.
  tasks.push(cron.schedule('0 * * * *', async () => {
    const { default: WorkflowInstance } = await import('../models/WorkflowInstance.js');
    const { default: ApprovalRequest } = await import('../models/ApprovalRequest.js');
    const { default: Contract } = await import('../models/Contract.js');
    const { retryDueWebhooks } = await import('../routes/hub.js');
    const now = new Date();
    await eachHospital(async (hid) => {
      const due = await WorkflowInstance.find({
        hospitalId: hid, status: 'Active',
        timers: { $elemMatch: { dueAt: { $lte: now }, escalatedAt: null } },
      }).limit(200);
      for (const inst of due) {
        const timer = inst.timers.find((t) => t.dueAt <= now && !t.escalatedAt);
        if (timer) {
          timer.escalatedAt = now;
           
          await inst.save();
        }
      }
      const escalationThreshold = new Date(now.getTime() - 0.75 * 48 * 3600 * 1000);
      await ApprovalRequest.updateMany(
        {
          hospitalId: hid, status: 'pending', escalatedAt: null,
          createdAt: { $lte: escalationThreshold }, dueAt: { $gt: now },
        },
        {
          $set: { escalatedAt: now, escalationLevel: 1 },
          $push: { requiredRoles: 'hospital_admin' },
        },
      );
      await ApprovalRequest.updateMany(
        { hospitalId: hid, status: 'pending', dueAt: { $lte: now } },
        { $set: { status: 'expired' } },
      );
      await Contract.updateMany(
        { hospitalId: hid, status: 'active', endDate: { $lt: now } },
        { $set: { status: 'expired' } },
      );
    }, 'hourly');
    await escalateUnackedClinicalAlerts();
    // 20.md §2-§3: SLA-breached support tickets auto-escalate (hourly).
    try {
      const { runTicketEscalationsOnce } = await import('../jobs/ticketEscalation.job.js');
      const out = await runTicketEscalationsOnce();
      if (out?.escalated) logger.info(`[scheduler:tickets] escalated ${out.escalated} breached ticket(s)`);
    } catch (e) {
      logger.warn(`[scheduler:tickets] ${e.message}`);
    }
    try {
      await retryDueWebhooks();
    } catch (e) {
      logger.warn(`[scheduler:webhooks] ${e.message}`);
    }
    // File 22 P0-9: gateway settlement reconcile (no-op without credentials).
    try {
      const { reconcileGatewayTenant } = await import('../routes/checkout.js');
      const { default: Hospital } = await import('../models/Hospital.js');
      const hospitals = await Hospital.find({}).select('_id').limit(500).lean();
      for (const h of hospitals) {
        for (const gw of ['razorpay', 'cashfree', 'payu', 'phonepe']) {
          try {
            // eslint-disable-next-line no-await-in-loop
            await reconcileGatewayTenant(h._id, gw);
          } catch (e) {
            logger.warn(`[scheduler:reconcile] ${h._id}/${gw}: ${e.message}`);
          }
        }
      }
    } catch (e) {
      logger.warn(`[scheduler:reconcile] ${e.message}`);
    }
    // File 22 P1-27: call-recording retention purge.
    try {
      const { purgeOldRecordings } = await import('../routes/contactCenter.js');
      await purgeOldRecordings();
    } catch (e) {
      logger.warn(`[scheduler:recordings] ${e.message}`);
    }
    // File 22 P2-31: breach 72h clock watch.
    try {
      const { breachDeadlineSweep } = await import('../routes/breach.js');
      await breachDeadlineSweep();
    } catch (e) {
      logger.warn(`[scheduler:breach] ${e.message}`);
    }
    // File 24 §5: CRM automation rules sweep (platform-scoped, never throws).
    try {
      const { runCrmAutomation } = await import('../lib/crmAutomation.js');
      await runCrmAutomation({});
    } catch (e) {
      logger.warn(`[scheduler:crmAutomation] ${e.message}`);
    }
  }));
  // Nightly 01:30: daily metrics + report schedules due.
  tasks.push(cron.schedule('30 1 * * *', async () => {
    const { computeDailyMetricsTenant } = await import('../routes/insights.js');
    const { runScheduleOnce } = await import('../routes/reportStudio.js').catch(() => ({}));
    const { default: ReportSchedule } = await import('../models/ReportSchedule.js').catch(() => ({}));
    const day = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    await eachHospital((hid) => computeDailyMetricsTenant(hid, day), 'metrics');
    if (ReportSchedule && runScheduleOnce) {
      try {
        const { default: cronLib } = await import('node-cron');
        void cronLib;
        const due = await ReportSchedule.find({ active: true }).limit(100);
        for (const s of due) {
          try {
             
            await runScheduleOnce(s);
          } catch (e) {
            logger.warn(`[scheduler:reports] ${s._id}: ${e.message}`);
          }
        }
      } catch (e) {
        logger.warn(`[scheduler:reports] ${e.message}`);
      }
    }
    // File 24 §4.12: due CRM report schedule emails (aggregates only).
    try {
      const { runCrmReportSchedules } = await import('../routes/crm.js');
      const out = await runCrmReportSchedules();
      if (out?.sent) logger.info(`[scheduler:crmReports] sent ${out.sent} report email(s)`);
    } catch (e) {
      logger.warn(`[scheduler:crmReports] ${e.message}`);
    }
    // File 25 §10: quarterly IAM access-certification campaigns.
    // Idempotent (one per tenant per calendar quarter) — a daily check is safe.
    try {
      const { runIamReviewCampaigns } = await import('../lib/iamReviewSweep.js');
      const out = await runIamReviewCampaigns();
      if (out?.created) logger.info(`[scheduler:iamReviews] created ${out.created} campaign(s) for ${out.cycle}`);
    } catch (e) {
      logger.warn(`[scheduler:iamReviews] ${e.message}`);
    }
  }));
  logger.info('[scheduler] started (rules/rcm 15m, hourly sweeps, nightly metrics)');
}

export function stopScheduler() {
  for (const t of tasks) {
    try { t.stop(); } catch { /* noop */ }
  }
  tasks = [];
}
