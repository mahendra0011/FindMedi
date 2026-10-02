import mongoose from 'mongoose';

/**
 * PAY-B-03: atomic slot capacity reservations.
 *
 * The booking flow used to be a check-then-write: `Appointment.find(slot)`
 * to count bookings, compare with `maxBookingsPerSlot`, then `Appointment.create`.
 * Two concurrent checkouts on the last seat both read `count = 0`, both passed the
 * check, and both were written — the doctor's `maxBookingsPerSlot` is silently
 * overshot. The existing unique index only prevents the SAME patient booking the
 * same slot twice; it does nothing for two different patients racing for one seat.
 *
 * Mongo's `$expr` on `findOneAndUpdate` gives a genuine compare-and-set:
 * `{ $expr: { $lt: ['$count', capacity] } }` is evaluated and applied atomically by
 * the server, so only one of the racing updates can match. There is no window
 * between the read and the write.
 *
 * A reservation is released when booking fails, and `reconcileSlot()` repairs the
 * counter if a crash leaves it out of step with the real appointment count.
 */
const slotReservationSchema = new mongoose.Schema({
  doctorId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  date: { type: String, required: true },
  time: { type: String, required: true },
  count: { type: Number, default: 0 },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

// One reservation row per slot — the uniqueness is what makes the counter atomic.
slotReservationSchema.index(
  { doctorId: 1, date: 1, time: 1 },
  { unique: true }
);

export const SlotReservation = mongoose.models.SlotReservation
  || mongoose.model('SlotReservation', slotReservationSchema);

const slotKey = (doctorId, date, time) => `${doctorId}|${date}|${time}`;

/**
 * Atomically claim ONE seat in a slot.
 *
 * @returns {Promise<{ ok: true, count: number }
 *                  | { ok: false, reason: 'full', count: number }>}
 */
export async function reserveSlotSeat({ doctorId, date, time, capacity }) {
  if (!doctorId || !date || !time) {
    // Without a slot there is nothing to reserve — fail closed rather than
    // silently skipping the capacity guard.
    return { ok: false, reason: 'invalid-slot' };
  }
  const cap = Number(capacity) > 0 ? Number(capacity) : 1;

  // Attempt to increment only while the stored count is below capacity.
  let updated = await SlotReservation.findOneAndUpdate(
    { doctorId, date, time, $expr: { $lt: ['$count', cap] } },
    { $inc: { count: 1 }, $set: { updatedAt: new Date() } },
    { new: true }
  );

  if (!updated) {
    // Either the row does not exist yet, or it is already at capacity. Distinguish
    // with a single read, then either create the first reservation or report full.
    const existing = await SlotReservation.findOne({ doctorId, date, time }).lean();
    if (!existing) {
      try {
        // Create with count 1. The unique index means a concurrent creator wins
        // and our insert fails — which we treat as "retry the increment".
        const created = await SlotReservation.create({ doctorId, date, time, count: 1 });
        return { ok: true, count: created.count };
      } catch (err) {
        if (err?.code !== 11000) throw err;
        // Lost the race: retry the guarded increment exactly once.
        updated = await SlotReservation.findOneAndUpdate(
          { doctorId, date, time, $expr: { $lt: ['$count', cap] } },
          { $inc: { count: 1 }, $set: { updatedAt: new Date() } },
          { new: true }
        );
        if (updated) return { ok: true, count: updated.count };
        const full = await SlotReservation.findOne({ doctorId, date, time }).lean();
        return { ok: false, reason: 'full', count: full?.count ?? cap };
      }
    }
    return { ok: false, reason: 'full', count: existing.count };
  }

  return { ok: true, count: updated.count };
}

/** Release a previously claimed seat (compensating action on a failed booking). */
export async function releaseSlotSeat({ doctorId, date, time }) {
  if (!doctorId || !date || !time) return false;
  const res = await SlotReservation.findOneAndUpdate(
    { doctorId, date, time, count: { $gt: 0 } },
    { $inc: { count: -1 }, $set: { updatedAt: new Date() } },
    { new: true }
  );
  return Boolean(res);
}

/**
 * Repair a drifted counter: a crash between "reserve" and "create" (or a manual
 * delete) leaves the counter above the real number of live appointments, which
 * would make a slot look permanently full. Safe to run on a schedule.
 */
export async function reconcileSlot({ doctorId, date, time, Appointment }) {
  const live = await Appointment.countDocuments({
    doctorId,
    date,
    time,
    status: { $nin: ['Cancelled', 'Completed', 'Missed'] },
  });
  await SlotReservation.updateOne(
    { doctorId, date, time },
    { $set: { count: live, updatedAt: new Date() } },
    { upsert: true }
  );
  return live;
}

export { slotKey };
