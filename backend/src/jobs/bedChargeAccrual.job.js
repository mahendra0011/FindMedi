/**
 * File 09 Phase 1.3: daily bed/nursing charge accrual. For every Admitted
 * admission, posts ONE Pending ChargeItem per day from the matching
 * RoomTariff (roomType ← Bed, payerClass cash default). Idempotent per
 * (admission, IST date): re-runs and overlapping replicas post nothing twice.
 */
import Admission from '../models/Admission.js';
import Bed from '../models/Bed.js';
import RoomTariff from '../models/RoomTariff.js';
import ChargeItem from '../models/ChargeItem.js';
import logger from '../config/logger.js';

const dayStr = (d = new Date()) => d.toISOString().slice(0, 10);

const roomTypeOf = (bed) => {
  const raw = String(bed?.bedType || bed?.ward || 'General');
  const known = ['General', 'SemiPrivate', 'Private', 'Deluxe', 'ICU', 'NICU', 'HDU', 'Isolation', 'Emergency'];
  const hit = known.find((k) => raw.toLowerCase().includes(k.toLowerCase()));
  return hit || 'General';
};

export async function runBedChargeAccrualOnce({ date = new Date(), postedBy = null } = {}) {
  const day = dayStr(date);
  const desc = (room) => `Bed charges (${room}) — ${day}`;
  let posted = 0;
  let skipped = 0;
  const admissions = await Admission.find({ status: 'Admitted' }).select('_id patientId hospitalId bedId').lean();
  for (const adm of admissions) {
    try {
      const exists = await ChargeItem.exists({ admissionId: adm._id, description: { $regex: `${day}$` } });
      if (exists) { skipped += 1; continue; }
      const bed = adm.bedId ? await Bed.findById(adm.bedId).select('bedType ward').lean() : null;
      const room = roomTypeOf(bed);
      const tariff = await RoomTariff.findOne({
        hospitalId: adm.hospitalId, roomType: room, payerClass: 'cash',
        effectiveFrom: { $lte: date }, $or: [{ effectiveTo: null }, { effectiveTo: { $gte: date } }],
      }).lean();
      const perDay = tariff
        ? (tariff.bedPerDay + tariff.nursingPerDay + tariff.rmoPerDay + tariff.doctorVisitPerDay)
        : 0;
      if (!(perDay > 0)) { skipped += 1; continue; }
      await ChargeItem.create({
        admissionId: adm._id, patientId: adm.patientId, hospitalId: adm.hospitalId,
        source: 'bed', sourceRef: { model: 'RoomTariff', id: tariff._id },
        serviceCode: `BED-${room.toUpperCase()}`, description: desc(room),
        qty: 1, unitPrice: perDay, amount: perDay, postedBy,
      });
      posted += 1;
    } catch (e) {
      logger.error(`Bed accrual failed for admission ${adm._id}: ${e.message}`);
      skipped += 1;
    }
  }
  return { day, posted, skipped };
}

export default { runBedChargeAccrualOnce };
