/**
 * PAY-B-04: fail-closed reconciliation report for historical completed rows.
 *
 * Reconciles every `Payment.status === 'completed'` row against the
 * authorized-capture paths (verified provider settlement or a resolvable
 * booking/order reference). Full provider history is not always available —
 * no settlement adapter is connected — so any row that cannot be tied to a
 * booking/order is reported as NEEDS_REVIEW and the script exits non-zero.
 *
 * READ-ONLY: never modifies or deletes financial records. Review every
 * emitted group against the booking/payment/provider source of truth.
 *
 * Usage:
 *   MONGO_URI=mongodb://... node scripts/check-completed-payments-reconciliation.mjs [--days 30] [--limit 1000]
 */
import mongoose from 'mongoose';
import { classifyCompletedPayment } from '../src/services/paymentReconciliation.js';

const mongoUri = process.env.MONGO_URI;
if (!mongoUri) {
  console.error('MONGO_URI is required; refusing to use a local/default database.');
  process.exit(2);
}

const args = process.argv.slice(2);
const daysIdx = args.indexOf('--days');
const limitIdx = args.indexOf('--limit');
const days = daysIdx >= 0 ? Number(args[daysIdx + 1]) : 30;
const limit = limitIdx >= 0 ? Number(args[limitIdx + 1]) : 5000;

try {
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 15000 });
  const payments = mongoose.connection.collection('payments');
  const match = { status: 'completed' };
  if (Number.isFinite(days) && days > 0) {
    match.createdAt = { $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) };
  }
  const rows = await payments
    .find(match, { projection: { _id: 1, transaction_id: 1, serviceType: 1, referenceId: 1, amount: 1, provider: 1, createdAt: 1, status: 1 } })
    .limit(limit)
    .toArray();

  const collectionsByService = {
    appointment: 'appointments',
    test: 'labbookings',
    medicine: 'pharmacyorders',
  };

  let ok = 0;
  const needsReview = [];
  for (const row of rows) {
    let bookingExists = null;
    if (row.referenceId && row.serviceType && collectionsByService[String(row.serviceType).toLowerCase()]) {
      try {
        const coll = mongoose.connection.collection(collectionsByService[String(row.serviceType).toLowerCase()]);
        let lookupId = row.referenceId;
        try {
          if (typeof row.referenceId === 'string' && /^[0-9a-fA-F]{24}$/.test(row.referenceId)) {
            lookupId = new mongoose.Types.ObjectId(row.referenceId);
          }
        } catch { /* keep raw string */ }
        const found = await coll.findOne({ _id: lookupId }, { projection: { _id: 1 } });
        bookingExists = Boolean(found);
      } catch {
        bookingExists = null;
      }
    } else if (row.referenceId) {
      bookingExists = null;
    }
    const { verdict, reasons } = classifyCompletedPayment(row, { bookingExists });
    if (verdict === 'OK') ok += 1;
    else needsReview.push({ _id: String(row._id), transaction_id: row.transaction_id, serviceType: row.serviceType, referenceId: row.referenceId ? String(row.referenceId) : null, amount: row.amount, reasons });
  }

  console.log(`Checked ${rows.length} completed payment(s): ${ok} reconciled, ${needsReview.length} need review.`);
  if (needsReview.length) {
    console.error(`${needsReview.length} completed row(s) could not be reconciled to an authorized capture path; fail-closed review required.`);
    for (const item of needsReview.slice(0, 100)) console.error(JSON.stringify(item));
    process.exitCode = 1;
  }
} catch (error) {
  console.error(`Completed-payments reconciliation failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
