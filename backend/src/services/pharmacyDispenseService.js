import Medicine from '../models/Medicine.js';
import Prescription from '../models/Prescription.js';
import { executeWithOutbox } from '../lib/transactionalOutbox.js';
import { KAFKA_TOPICS } from '../config/kafka.js';

const problem = (status, message, code) => Object.assign(new Error(message), { status, code });

/** Atomically debit inventory, mark one prescription line dispensed, and queue reorder evaluation. */
export async function dispensePrescriptionMedicine({
  prescriptionId,
  medicineLineId,
  medicineId,
  quantity,
  dispensedBy,
  pharmacyId,
  now = new Date(),
}) {
  if (!Number.isFinite(Number(quantity)) || Number(quantity) <= 0) {
    throw problem(400, 'Prescription quantity must be positive', 'INVALID_QUANTITY');
  }

  return executeWithOutbox(async (session) => {
    const medicine = await Medicine.findOneAndUpdate(
      { _id: medicineId, currentStock: { $gte: Number(quantity) }, expiryDate: { $gt: now } },
      [{
        $set: {
          currentStock: { $subtract: ['$currentStock', Number(quantity)] },
          // findOneAndUpdate bypasses Medicine's save hook; preserve its
          // zero-stock availability invariant explicitly in the same write.
          isActive: { $gt: [{ $subtract: ['$currentStock', Number(quantity)] }, 0] },
        },
      }],
      { new: true, session }
    );
    if (!medicine) {
      const existingMedicine = await Medicine.findById(medicineId).select('currentStock expiryDate').session(session).lean();
      if (!existingMedicine) throw problem(404, 'Medicine not found in inventory', 'MEDICINE_NOT_FOUND');
      if (existingMedicine.expiryDate && new Date(existingMedicine.expiryDate) <= now) {
        throw problem(409, 'Medicine has expired and cannot be dispensed', 'MEDICINE_EXPIRED');
      }
      throw problem(400, `Insufficient stock. Available: ${existingMedicine.currentStock}`, 'INSUFFICIENT_STOCK');
    }

    const allOtherLinesDispensed = await Prescription.findOneAndUpdate(
      {
        _id: prescriptionId,
        verificationStatus: 'verified',
        status: { $nin: ['Cancelled', 'Dispensed'] },
        medicines: { $elemMatch: { _id: medicineLineId, isDispensed: { $ne: true } } },
      },
      {
        $set: {
          'medicines.$[line].isDispensed': true,
          'medicines.$[line].dispensedAt': now,
          'medicines.$[line].dispensedBy': dispensedBy,
        },
      },
      {
        new: true,
        session,
        arrayFilters: [{ 'line._id': medicineLineId, 'line.isDispensed': { $ne: true } }],
      }
    );
    if (!allOtherLinesDispensed) {
      throw problem(409, 'Prescription line was already dispensed or prescription is no longer active', 'PRESCRIPTION_LINE_UNAVAILABLE');
    }

    const remainingLines = allOtherLinesDispensed.medicines.some(
      (line) => String(line._id) !== String(medicineLineId) && !line.isDispensed
    );
    await Prescription.updateOne(
      { _id: prescriptionId },
      { $set: { status: remainingLines ? 'Partially Dispensed' : 'Dispensed' } },
      { session }
    );

    return { medicine, prescriptionId: String(prescriptionId), status: remainingLines ? 'Partially Dispensed' : 'Dispensed' };
  }, [
    {
      aggregateType: 'Prescription',
      aggregateId: String(prescriptionId),
      eventType: 'medicine.dispensed',
      destinationTopic: KAFKA_TOPICS.PHARMACY_INVENTORY,
      payload: {
        pharmacyId: String(pharmacyId || 'default'),
        medicineId: String(medicineId),
        quantity: Number(quantity),
        createdBy: String(dispensedBy),
      },
    },
  ]);
}
