import TransactionLedger from '../models/TransactionLedger.js';
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
}) {
  try {
    const gross = Number(totalAmount) || 0;
    if (gross <= 0) return null;

    const commissionPercent =
      customCommissionPercent != null
        ? Number(customCommissionPercent)
        : DEFAULT_COMMISSION_PERCENT[source] || 10;

    const commissionAmount = Math.round((gross * commissionPercent) / 100);
    const taxAmount = Math.round((gross * 1) / 100); // 1% Section 194C/J TDS
    const netAmount = Math.max(0, gross - commissionAmount - taxAmount);

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
          await RiderProfile.findOneAndUpdate({ userId: providerId }, updatePayload, opts).catch(() => {});
          break;
        case 'lawyer':
          await LawyerProfile.findOneAndUpdate({ userId: providerId }, updatePayload, opts).catch(() => {});
          break;
        case 'assistant':
          await AssistantProfile.findOneAndUpdate({ userId: providerId }, updatePayload, opts).catch(() => {});
          break;
        case 'emergency_doctor':
          await Doctor.findOneAndUpdate({ $or: [{ userId: providerId }, { _id: providerId }] }, updatePayload, opts).catch(() => {});
          break;
        default:
          break;
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
