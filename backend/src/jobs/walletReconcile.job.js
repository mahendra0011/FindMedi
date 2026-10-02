/**
 * MISS-PAY-003: wallet ledger reconciliation job (daily).
 * Compares wallet balances vs TransactionLedger sums, logs drift.
 * Designed to run daily via scheduleJob (bullmq) or cron.
 */
// node-cron v4 renamed `scheduleJob` -> `schedule` (and this package was
// missing from package.json entirely, so this job silently never started —
// index.js swallowed the import failure with a non-fatal warning).
import { schedule } from 'node-cron';
import TransactionLedger from '../models/TransactionLedger.js';
import logger from '../config/logger.js';

const DRIFT_THRESHOLD = Number(process.env.WALLET_DRIFT_THRESHOLD || 1);

function formatCurrency(n) {
  return `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

export async function reconcileWallletsOnce() {
  logger.info('Starting wallet ledger reconciliation...');
  let checked = 0;
  let drifts = 0;
  const issues = [];

  const providers = ['rider', 'assistant', 'lawyer', 'doctor'];
  const providerMap = {
    rider: 'walletBalance',
    assistant: 'walletBalance',
    lawyer: 'walletBalance',
    doctor: 'walletBalance',
  };

  for (const provider of providers) {
    try {
      const Model = provider === 'doctor'
        ? (await import('../models/Doctor.js')).default
        : (await import(`../models/${provider[0].toUpperCase() + provider.slice(1)}Profile.js`)).default;

      const docs = await Model.find({ [`${providerMap[provider]}`]: { $exists: true, $ne: null }})
        .select('_id walletBalance')
        .lean();

      for (const doc of docs) {
        checked += 1;
        const userId = doc._id;
        const walletBalance = Number(doc.walletBalance) || 0;

        const ledgerSum = await TransactionLedger.aggregate([
          { $match: { providerId: userId, status: 'completed' } },
          { $group: { _id: null, sum: { $sum: '$netAmount' } } },
        ]).then(r => r[0]?.sum || 0);

        const expectedBalance = Math.max(0, ledgerSum);
        const drift = Math.abs(walletBalance - expectedBalance);

        if (drift > DRIFT_THRESHOLD) {
          drifts += 1;
          const issue = {
            userId: String(userId),
            provider,
            walletBalance: formatCurrency(walletBalance),
            ledgerBalance: formatCurrency(expectedBalance),
            drift: formatCurrency(drift),
          };
          issues.push(issue);
        }
      }
    } catch (err) {
      logger.warn(`reconcileWalllets ${provider} skipped: ${err.message}`);
    }
  }

  if (drifts > 0) {
    logger.warn(`Wallet ledger drift detected: ${drifts}/${checked} accounts`, { issues: issues.slice(0, 10) });
  } else {
    logger.info(`Wallet ledger reconciliation passed: ${checked} accounts, 0 drifts`);
  }

  return { checked, drifts, issues: issues.slice(0, 100) };
}

export function startWalletReconcile(cronExpression = '0 2 * * *') {
  logger.info(`Scheduling wallet reconciliation: ${cronExpression}`);
  let timer;
  try {
    timer = schedule(cronExpression, () => reconcileWallletsOnce().catch(() => {}));
  } catch {
    timer = setInterval(() => {
      reconcileWallletsOnce().catch(() => {});
    }, 24 * 60 * 60 * 1000);
  }
  return timer;
}