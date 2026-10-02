/**
 * APPT-B-05 — rewrite the PUT /:id reschedule/slot ordering.
 *
 * One-off, run once. Kept as a script because the block contains box-drawing and
 * en-dash characters that make exact-match editing unreliable across encodings.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const P = 'D:/projects/Findmedi/backend/src/routes/appointments.js';
const lines = readFileSync(P, 'utf8').split(/\r?\n/);

const find = (re) => lines.findIndex((l) => re.test(l));

const commitIdx = find(/const updated = await Appointment\.findByIdAndUpdate/);
const reserveIdx = find(/const slotChanged = \(updates\.date/);
const statusIdx = find(/if \(status && status !== oldStatus\)/);

if (commitIdx < 0 || reserveIdx < 0 || statusIdx < 0) {
  console.error('anchors not found', { commitIdx, reserveIdx, statusIdx });
  process.exit(1);
}
console.log('commit L' + (commitIdx + 1), 'reserve L' + (reserveIdx + 1), 'status L' + (statusIdx + 1));

const REPLACEMENT = `    // APPT-B-05: the NEW seat is claimed BEFORE the row is committed, and the
    // OLD seat released after.
    //
    // The previous ordering was:
    //   1. findByIdAndUpdate(updates)   <- row committed with the NEW date/time
    //   2. reserveSlotSeat(new slot)    <- may fail
    //   3. on failure -> 409
    // Two defects fell out of that:
    //   * On failure the row had ALREADY moved. The appointment claimed a slot it
    //     did not hold, the old slot stayed marked taken, and capacity for that
    //     doctor became wrong in BOTH directions. A retry then saw
    //     updates.date === appointment.date, skipped the reservation entirely, and
    //     the inconsistency never self-healed.
    //   * On success the OLD seat was never released - it was only released on a
    //     transition to a terminal status - so every reschedule leaked one seat.
    //
    // Correct order: reserve -> commit -> release, rolling the claim back if the
    // commit throws. The slot ledger becomes the source of truth and the row a
    // follower of it.
    const slotChanged = (updates.date && updates.date !== appointment.date)
      || (updates.time && updates.time !== appointment.time);

    let claimedNewSlot = null;
    if (slotChanged && appointment.doctorId) {
      const targetDoctorId = updates.doctorId || appointment.doctorId;
      const doctorDoc = await Doctor.findById(targetDoctorId)
        .select('maxBookingsPerSlot').lean();
      const reservation = await reserveSlotSeat({
        doctorId: targetDoctorId,
        date: updates.date,
        time: updates.time,
        capacity: doctorDoc?.maxBookingsPerSlot || 1,
      });
      if (!reservation.ok) {
        // Nothing has been committed yet, so there is nothing to undo.
        return res.status(409).json({
          message: reservation.reason === 'invalid-slot'
            ? 'Could not verify slot availability.'
            : 'This time slot is full. Please choose a different slot.',
          code: 'SLOT_FULL',
        });
      }
      claimedNewSlot = { doctorId: targetDoctorId, date: updates.date, time: updates.time };
    }

    const leftActiveSlot = ['Pending', 'Confirmed'].includes(oldStatus);
    const willBeTerminal = ['Cancelled', 'Missed', 'Completed'].includes(
      updates.status || oldStatus
    );

    // Commit the row now that the seat is genuinely held. If this throws, the
    // claimed seat is handed back so the ledger is never ahead of the data.
    let updated;
    try {
      updated = await Appointment.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true })
        .populate('patientId', 'name email phone gender address dateOfBirth bloodGroup')
        .populate('doctorId', 'name');
    } catch (commitErr) {
      if (claimedNewSlot) {
        await releaseSlotSeat(claimedNewSlot)
          .catch((relErr) => logger.error(\`APPT-B-05: slot rollback failed: \${relErr.message}\`));
      }
      throw commitErr;
    }

    const isTerminal = ['Cancelled', 'Missed', 'Completed'].includes(updated.status);
    if (leftActiveSlot && isTerminal) {
      await releaseSlotSeat({
        doctorId: appointment.doctorId,
        date: appointment.date,
        time: appointment.time,
      }).catch((relErr) => logger.error(\`slot release failed: \${relErr.message}\`));
    }

    // A successful reschedule frees the seat it came from. This was missing
    // entirely, which is why repeated reschedules slowly exhausted a doctor's
    // daily capacity.
    if (claimedNewSlot && !(leftActiveSlot && willBeTerminal)) {
      await releaseSlotSeat({
        doctorId: appointment.doctorId,
        date: appointment.date,
        time: appointment.time,
      }).catch((relErr) => logger.error(\`APPT-B-05: old slot release failed: \${relErr.message}\`));

      if (updates.doctorId && String(updates.doctorId) !== String(appointment.doctorId)) {
        logger.info(\`APPT-B-05: appointment \${req.params.id} moved between doctors; both seats reconciled\`);
      }
    }
`;

// Replace from the commit line up to (but not including) the status block.
const out = [
  ...lines.slice(0, commitIdx),
  ...REPLACEMENT.split('\n'),
  ...lines.slice(statusIdx),
];
writeFileSync(P, out.join('\n'), 'utf8');
console.log('rewritten');