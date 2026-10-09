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
