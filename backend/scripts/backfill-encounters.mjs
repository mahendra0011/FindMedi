/**
 * File 09 §9.1: backfills Encounter + encounterId links. Idempotent and
 * safe to re-run. Usage:
 *   node scripts/backfill-encounters.mjs --dry-run
 *   node scripts/backfill-encounters.mjs --apply
 *
 * Strategy (conservative): only rows carrying appointmentId get linked —
 * one Encounter per appointment, shared by its orders. Everything else is
 * reported, not guessed.
 */
import mongoose from 'mongoose';

const DRY = process.argv.includes('--dry-run') || !process.argv.includes('--apply');
const uri = process.env.MONGODB_URI || process.env.MONGO_URL;
if (!uri) {
  console.error('Set MONGODB_URI first');
  process.exit(1);
}

await mongoose.connect(uri);
const { default: Encounter } = await import('../src/models/Encounter.js');
const { default: LabOrder } = await import('../src/models/LabOrder.js');
const { default: PharmacyOrder } = await import('../src/models/PharmacyOrder.js');
const { default: Appointment } = await import('../src/models/Appointment.js');

const report = { encountersCreated: 0, labLinked: 0, pharmLinked: 0, skippedNoAppointment: 0 };
const encounterByAppt = new Map();

async function encounterFor(apptId) {
  if (encounterByAppt.has(String(apptId))) return encounterByAppt.get(String(apptId));
  let enc = await Encounter.findOne({ appointmentId: apptId });
  if (!enc) {
    const appt = await Appointment.findById(apptId).lean();
    if (!appt) return null;
    if (DRY) {
      report.encountersCreated += 1;
      const stub = { _id: `dry:${apptId}` };
      encounterByAppt.set(String(apptId), stub);
      return stub;
    }
    enc = await Encounter.create({
      type: 'OPD',
      patientId: appt.patientId,
      appointmentId: appt._id,
      hospitalId: appt.hospitalId,
      facilityId: appt.facilityId,
      primaryDoctorId: appt.doctorId,
      status: 'Open',
    });
    report.encountersCreated += 1;
  }
  encounterByAppt.set(String(apptId), enc);
  return enc;
}

for (const [Model, key] of [[LabOrder, 'labLinked'], [PharmacyOrder, 'pharmLinked']]) {
  const rows = await Model.find({ encounterId: null, appointmentId: { $ne: null } }).select('_id appointmentId').lean();
  for (const row of rows) {
    const enc = await encounterFor(row.appointmentId);
    if (!enc) { report.skippedNoAppointment += 1; continue; }
    if (!DRY) await Model.updateOne({ _id: row._id }, { $set: { encounterId: enc._id } });
    report[key] += 1;
  }
  const skipped = await Model.countDocuments({ encounterId: null, appointmentId: null });
  report.skippedNoAppointment += skipped;
}

console.log(DRY ? '[dry-run] no writes' : '[apply] done', JSON.stringify(report, null, 2));
await mongoose.disconnect();
