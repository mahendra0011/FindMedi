/**
 * File 22 P0-3: encounter auto-creation. Every care visit (OPD check-in,
 * token start, ER arrival, IPD admission) opens exactly one Encounter;
 * repeat calls are idempotent via the caller's own link field
 * (appointment.encounterId, ticket.encounterId, admission.encounterId,
 * emergency.encounterId) or an open same-source encounter.
 */
export async function ensureEncounter({
  hospitalId, patientId, type = 'OPD', appointmentId, admissionId,
  emergencyId, departmentId, doctorId, uhid, createdBy,
}) {
  const { default: Encounter } = await import('../models/Encounter.js');
  const or = [];
  if (appointmentId) or.push({ appointmentId });
  if (admissionId) or.push({ admissionId });
  if (emergencyId) or.push({ emergencyId });
  if (or.length) {
    const existing = await Encounter.findOne({ hospitalId, status: 'Open', $or: or });
    if (existing) return existing;
  }
  const enc = await Encounter.create({
    hospitalId, patientId: patientId || null, type,
    appointmentId: appointmentId || null, admissionId: admissionId || null,
    emergencyId: emergencyId || null,
    departmentId: departmentId || '', primaryDoctorId: doctorId || null,
    uhid: uhid || '', status: 'Open', createdBy: createdBy || null,
  });
  return enc;
}

export async function backfillAppointmentPrescription(appointmentId, prescriptionId) {
  if (!appointmentId || !prescriptionId) return null;
  const { default: Appointment } = await import('../models/Appointment.js');
  return Appointment.findByIdAndUpdate(appointmentId, { $set: { prescriptionId } });
}
