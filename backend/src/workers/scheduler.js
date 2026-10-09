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
  try {
    const { default: Hospital } = await import('../models/Hospital.js');
    const hospitals = await Hospital.find({}).select('_id').limit(500).lean();
    for (const h of hospitals) {
      try {
         
        await fn(h._id);
      } catch (e) {
        logger.warn(`[scheduler:${label}] hospital ${h._id}: ${e.message}`);
      }
    }
  } catch (e) {
    logger.warn(`[scheduler:${label}] ${e.message}`);
  }
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
      await ApprovalRequest.updateMany(
        { hospitalId: hid, status: 'pending', dueAt: { $lte: now } },
        { $set: { status: 'expired' } },
      );
      await Contract.updateMany(
        { hospitalId: hid, status: 'active', endDate: { $lt: now } },
        { $set: { status: 'expired' } },
      );
    }, 'hourly');
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
        for (const gw of ['razorpay', 'cashfree']) {
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
  }));
  logger.info('[scheduler] started (rules/rcm 15m, hourly sweeps, nightly metrics)');
}

export function stopScheduler() {
  for (const t of tasks) {
    try { t.stop(); } catch { /* noop */ }
  }
  tasks = [];
}
