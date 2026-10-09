/**
 * File 09 §7.2: FHIR R4 mapping layer (model → FHIR). Read-only export for
 * ABDM HIP/HIU flows and integrations. No PHI beyond what the caller is
 * already authorized to read — routes enforce tenant + auth first.
 */

const iso = (d) => (d ? new Date(d).toISOString() : undefined);

export const toFhirPatient = (user, uhid) => ({
  resourceType: 'Patient',
  id: String(user._id || user.id),
  identifier: [
    ...(uhid ? [{ system: 'https://findmedi.in/uhid', value: uhid }] : []),
    ...(user.abhaAddress ? [{ system: 'https://abdm.gov.in/abha-address', value: user.abhaAddress }] : []),
  ],
  name: [{ text: user.name }],
  gender: (user.gender || '').toLowerCase().startsWith('f') ? 'female'
    : (user.gender || '').toLowerCase().startsWith('m') ? 'male' : 'unknown',
  birthDate: user.dateOfBirth ? iso(user.dateOfBirth).slice(0, 10) : undefined,
  telecom: [
    ...(user.phone ? [{ system: 'phone', value: user.phone }] : []),
    ...(user.email ? [{ system: 'email', value: user.email }] : []),
  ],
});

export const toFhirEncounter = (enc) => ({
  resourceType: 'Encounter',
  id: String(enc._id),
  identifier: [{ system: 'https://findmedi.in/encounter', value: enc.encounterNo }],
  status: enc.status === 'Open' ? 'in-progress' : enc.status === 'Closed' ? 'finished' : 'cancelled',
  class: { code: enc.type || 'OPD' },
  subject: { reference: `Patient/${enc.patientId}` },
  period: { start: iso(enc.openedAt), end: enc.closedAt ? iso(enc.closedAt) : undefined },
});

export const toFhirObservation = (vital, patientRef) => ({
  resourceType: 'Observation',
  id: String(vital._id || vital.id || Date.now()),
  status: 'final',
  code: { text: vital.type || vital.name || 'vitals' },
  subject: { reference: patientRef },
  effectiveDateTime: iso(vital.at || vital.createdAt),
  valueString: String(vital.value ?? vital.reading ?? ''),
});

export const toFhirDiagnosticReport = (order, patientRef) => ({
  resourceType: 'DiagnosticReport',
  id: String(order._id),
  status: ['Verified', 'Report Delivered', 'Completed'].includes(order.status) ? 'final' : 'partial',
  code: { text: (order.tests || []).map((t) => t.testName).join(', ') || 'Lab panel' },
  subject: { reference: patientRef },
  issued: iso(order.updatedAt || order.createdAt),
});

export const toFhirMedicationRequest = (rx, med, patientRef) => ({
  resourceType: 'MedicationRequest',
  id: `${rx._id}-${med.medicineName || 'med'}`,
  status: 'active',
  intent: 'order',
  subject: { reference: patientRef },
  medicationCodeableConcept: { text: med.medicineName },
  dosageInstruction: [{ text: `${med.dosage || ''} ${med.frequency || ''} x ${med.duration || ''}`.trim() }],
});

export const toFhirDocumentReference = (record, patientRef) => ({
  resourceType: 'DocumentReference',
  id: String(record._id),
  status: 'current',
  type: { text: record.type || 'diagnosis' },
  subject: { reference: patientRef },
  date: iso(record.createdAt),
});

// File 22 P2-28: second resource wave. Coding is advisory text unless the
// caller supplies a validated system+code (see lib/clinicalCodes.js);
// mappers never invent codes.
export const toFhirCondition = (diagnosis, patientRef, extra = {}) => ({
  resourceType: 'Condition',
  id: String(extra.id || `${Date.now()}`),
  clinicalStatus: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-clinical', code: extra.resolved ? 'resolved' : 'active' }] },
  code: extra.code && extra.system
    ? { coding: [{ system: extra.system, code: extra.code }], text: diagnosis }
    : { text: diagnosis },
  subject: { reference: patientRef },
  recordedDate: iso(extra.at),
});

export const toFhirAllergyIntolerance = (allergy, patientRef, idx = 0) => ({
  resourceType: 'AllergyIntolerance',
  id: `${patientRef.split('/')[1] || 'x'}-allergy-${idx}`,
  clinicalStatus: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical', code: 'active' }] },
  code: { text: allergy?.allergen || allergy?.name || String(allergy || '') },
  patient: { reference: patientRef },
});

export const toFhirProcedure = (surgery, patientRef) => ({
  resourceType: 'Procedure',
  id: String(surgery._id),
  status: surgery.status === 'Completed' ? 'completed' : 'in-progress',
  code: { text: surgery.surgeryName || surgery.procedure || 'Procedure' },
  subject: { reference: patientRef },
  performedDateTime: iso(surgery.scheduledDate || surgery.createdAt),
  performer: surgery.doctorName ? [{ actor: { display: surgery.doctorName } }] : [],
});

export const toFhirCoverage = (policy, patientRef) => ({
  resourceType: 'Coverage',
  id: String(policy._id),
  status: 'active',
  beneficiary: { reference: patientRef },
  payor: [{ display: policy.insurer || policy.tpa || 'Insurer' }],
  class: policy.memberIds ? [{ value: policy.memberIds }] : [],
  period: { start: iso(policy.validFrom), end: iso(policy.validTo) },
});

export const toFhirClaim = (claim, patientRef) => ({
  resourceType: 'Claim',
  id: String(claim._id),
  status: claim.status === 'Settled' ? 'active' : 'cancelled',
  use: 'claim',
  patient: { reference: patientRef },
  created: iso(claim.createdAt),
  total: { value: Number(claim.settledAmount || 0), currency: 'INR' },
});
