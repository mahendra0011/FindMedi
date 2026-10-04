import TransactionLedger from '../models/TransactionLedger.js';
import { mirrorLedgerEntry, mirrorPaymentWithLedger } from '../lib/pgDualWrite.js';
import RiderProfile from '../models/RiderProfile.js';
import LawyerProfile from '../models/LawyerProfile.js';
import AssistantProfile from '../models/AssistantProfile.js';
import Doctor from '../models/Doctor.js';
import logger from '../config/logger.js';

const DEFAULT_COMMISSION_PERCENT = {
  ride: 10,
  lawyer: 10,
  assistant: 10,
  emergency_doctor: 10,
  ambulance: 5,
};

/**
 * PAY-B-04: integer-paise money helpers.
 *
 * Floating-point rupees are the root of the ledger drift this module had: a
 * `0.1 + 0.2` in a commission calculation eventually produces a net amount that
 * does not reconcile with gross - commission - tax. Every monetary value in the
 * ledger is computed in integer paise and converted back only at the boundary.
 */
export const toPaise = (rupees) => {
  const n = Number(rupees);
  if (!Number.isFinite(n)) return 0;
  // Math.round absorbs the binary-float representation error (333.33 * 100 is
  // 33332.999999999996 in IEEE-754).
  return Math.round(n * 100);
};

export const fromPaise = (paise) => Math.round(Number(paise) || 0) / 100;

/**
 * Records double-entry financial settlement for completed on-demand services.
 * Calculates platform commission, statutory deductions, and net provider earnings.
 */
export async function recordServiceSettlement({
  source,
  sourceId,
  bookingNumber = '',
  userId,
  providerId,
  patientName = '',
  totalAmount,
  customCommissionPercent,
  session = null,
  payment = null,
}) {
  try {
    // PAY-B-04: all money arithmetic happens in integer paise.
    //
    // The old code rounded commission and TDS to whole rupees but left the gross
    // unrounded, so `net = 333.33 - 30 - 3 = 300.33`: paise entered the ledger
    // while the GST/TDS report showed integers, and every reconciliation drifted.
    //
    // Order matters and is now explicit:
    //   1. convert the gross to paise (exact integer, no float drift)
    //   2. derive commission in paise from the integer gross
    //   3. derive TDS in paise from the integer gross
    //   4. net = gross - commission - tax, still in paise
    // The three values are therefore guaranteed to reconcile exactly, which is
    // what a double-entry ledger requires.
    const grossPaise = toPaise(totalAmount);
    if (grossPaise <= 0) return null;

    const commissionPercent =
      customCommissionPercent != null
        ? Number(customCommissionPercent)
        : DEFAULT_COMMISSION_PERCENT[source] || 10;

    const commissionPaise = Math.round((grossPaise * commissionPercent) / 100);
    const taxPaise = Math.round((grossPaise * 1) / 100); // 1% Section 194C/J TDS
    const netPaise = Math.max(0, grossPaise - commissionPaise - taxPaise);

    const gross = fromPaise(grossPaise);
    const commissionAmount = fromPaise(commissionPaise);
    const taxAmount = fromPaise(taxPaise);
    const netAmount = fromPaise(netPaise);

    // Defence in depth: the invariant the ledger depends on. If a future change
    // reintroduces mixed rounding this throws in tests instead of silently
    // producing a ledger that does not balance.
    if (toPaise(netAmount) + toPaise(commissionAmount) + toPaise(taxAmount) !== grossPaise) {
      throw new Error('ledger does not balance: gross != net + commission + tax (PAY-B-04)');
    }

    // 1. Create Double-Entry Ledger Record
    const ledgerRecord = new TransactionLedger({
      source,
      sourceId: String(sourceId),
      bookingNumber,
      userId: userId ? userId : null,
      providerId: providerId ? providerId : null,
      patientName,
      amount: gross,
      commissionPercent,
      commissionAmount,
      taxAmount,
      netAmount,
      entryType: 'CREDIT',
      status: 'completed',
    });

    if (session) {
      await ledgerRecord.save({ session });
    } else {
      await ledgerRecord.save();
    }

    // PG dual-write (fire-and-forget; never fails the request).
    // When the caller supplies the originating Payment, both rows are mirrored
    // in ONE PG transaction so a COMPLETED payment can never exist without its
    // ledger entry (the drift that silently under-counts facility payouts).
    if (payment) {
      if (!session) void mirrorPaymentWithLedger({ paymentDoc: payment, ledgerDoc: ledgerRecord });
    } else {
      if (!session) void mirrorLedgerEntry(ledgerRecord);
    }

    // 2. Credit Net Earnings to Provider Virtual Payout Wallet
    if (providerId) {
      const updatePayload = {
        $inc: {
          walletBalance: netAmount,
          totalEarnings: gross,
        },
      };

      const opts = session ? { session } : {};

      switch (source) {
        case 'ride':
          if (!await RiderProfile.findOneAndUpdate({ userId: providerId }, updatePayload, opts)) {
            throw new Error(`Rider profile not found for settlement provider ${providerId}`);
          }
          break;
        case 'lawyer':
          if (!await LawyerProfile.findOneAndUpdate({ userId: providerId }, updatePayload, opts)) {
            throw new Error(`Lawyer profile not found for settlement provider ${providerId}`);
          }
          break;
        case 'assistant':
          if (!await AssistantProfile.findOneAndUpdate({ userId: providerId }, updatePayload, opts)) {
            throw new Error(`Assistant profile not found for settlement provider ${providerId}`);
          }
          break;
        case 'emergency_doctor':
          if (!await Doctor.findOneAndUpdate({ $or: [{ user_id: String(providerId) }, { _id: providerId }] }, updatePayload, opts)) {
            throw new Error(`Doctor profile not found for settlement provider ${providerId}`);
          }
          break;
        default:
          throw new Error(`Unsupported settlement source: ${source}`);
      }
    }

    logger.info(
      `[LEDGER_SETTLEMENT] Source: ${source} | ID: ${sourceId} | Gross: ₹${gross} | Net Provider: ₹${netAmount} | Platform Fee: ₹${commissionAmount}`
    );

    return {
      gross,
      commissionAmount,
      taxAmount,
      netAmount,
      ledgerId: ledgerRecord._id,
    };
  } catch (err) {
    logger.error(`recordServiceSettlement error on [${source}:${sourceId}]: ${err.message}`);
    throw err;
  }
}
