/**
 * File 22 P0-4: single doorway for patient-account charges. Idempotent per
 * (source, sourceRef) so retries, double-clicks and re-verifies never
 * double-bill. Zero-price lines are posted (visible ₹0 on the bill), never
 * invented — price always comes from a master (Test/ServicePrice/Medicine).
 */
export async function postCharge({
  hospitalId, patientId, encounterId, admissionId, source, sourceRef,
  description, qty = 1, unitPrice = 0, serviceCode = '', postedBy = null,
}) {
  const { default: ChargeItem } = await import('../models/ChargeItem.js');
  // Dedupe on source + ref + description so one order can carry many lines
  // (lab panel, per-medicine dispenses) without double-billing retries.
  if (sourceRef?.id) {
    const existing = await ChargeItem.findOne({
      hospitalId, source, 'sourceRef.model': sourceRef.model, 'sourceRef.id': sourceRef.id,
      description: String(description || '').slice(0, 300),
    }).lean();
    if (existing) return { charge: existing, deduped: true };
  }
  const amount = Number(qty || 0) * Number(unitPrice || 0);
  const charge = await ChargeItem.create({
    hospitalId, patientId: patientId || null,
    encounterId: encounterId || null, admissionId: admissionId || null,
    source, sourceRef: sourceRef || { model: '', id: null },
    serviceCode, description: String(description || '').slice(0, 300),
    qty: Number(qty) || 0, unitPrice: Number(unitPrice) || 0, amount,
    status: 'Pending', postedBy,
  });
  return { charge, deduped: false };
}

/** Patient's currently-admitted stay, if any (for order→admission linkage). */
export async function openAdmissionFor(hospitalId, patientId) {
  if (!hospitalId || !patientId) return null;
  const { default: Admission } = await import('../models/Admission.js');
  return Admission.findOne({ hospitalId, patientId, status: 'Admitted' }).select('_id encounterId').lean();
}

/** Update a posted zero-price line once the real price is known (dispense). */
export async function trueUpCharge({ hospitalId, source, sourceRef, unitPrice, qty, description, patientId }) {
  const { default: ChargeItem } = await import('../models/ChargeItem.js');
  const filter = { hospitalId, source, status: 'Pending' };
  if (sourceRef?.id) {
    filter['sourceRef.model'] = sourceRef.model;
    filter['sourceRef.id'] = sourceRef.id;
  }
  if (description) filter.description = String(description).slice(0, 300);
  if (patientId) filter.patientId = patientId;
  const row = await ChargeItem.findOne(filter);
  if (!row) return null;
  if (qty != null) row.qty = Number(qty);
  row.unitPrice = Number(unitPrice) || 0;
  row.amount = Number(row.qty || 0) * Number(unitPrice || 0);
  await row.save();
  return row;
}
