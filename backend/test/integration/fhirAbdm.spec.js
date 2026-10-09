/**
 * File 22 P2-28: code validation, FHIR bundles, ABDM consent gating.
 */
import { jest as jestApi } from '@jest/globals';
import { mountApp, query } from '../helpers/appHarness.js';
import { validateCode, codeStats } from '../../src/lib/clinicalCodes.js';
import {
  toFhirCondition, toFhirAllergyIntolerance, toFhirProcedure,
  toFhirCoverage, toFhirClaim,
} from '../../src/lib/fhirMapper.js';

describe('validateCode', () => {
  test('known codes pass, unknown fail, systems checked', () => {
    expect(validateCode('http://loinc.org', '718-7')).toEqual({ known: true });
    expect(validateCode('LOINC', '0000-0')).toEqual({ known: false, reason: 'unknown-code' });
    expect(validateCode('http://snomed.info/sct', '38341003')).toEqual({ known: true });
    expect(validateCode('http://hl7.org/fhir/sid/icd-10', 'I10')).toEqual({ known: true });
    expect(validateCode('bogus', 'x')).toEqual({ known: false, reason: 'unsupported-system' });
    expect(codeStats().loinc).toBeGreaterThan(10);
  });
});

describe('mappers never invent codes', () => {
  test('condition without code is text-only', () => {
    const c = toFhirCondition('Hypertension', 'Patient/p1', { id: 'c1' });
    expect(c.resourceType).toBe('Condition');
    expect(c.code.text).toBe('Hypertension');
    expect(c.code.coding).toBeUndefined();
  });

  test('allergy/procedure/coverage/claim shapes', () => {
    expect(toFhirAllergyIntolerance({ allergen: 'Penicillin' }, 'Patient/p1', 0).resourceType).toBe('AllergyIntolerance');
    expect(toFhirProcedure({ _id: 's1', surgeryName: 'Cataract', status: 'Completed' }, 'Patient/p1').status).toBe('completed');
    expect(toFhirCoverage({ _id: 'c1', insurer: 'Star' }, 'Patient/p1').resourceType).toBe('Coverage');
    expect(toFhirClaim({ _id: 'cl1', settledAmount: 5000 }, 'Patient/p1').total.value).toBe(5000);
  });
});

const { as } = await mountApp('fhir', {
  '../../src/models/User.js': () => ({ default: { findById: () => query(null) } }),
  '../../src/models/Encounter.js': () => ({ default: { findById: () => query(null) } }),
  '../../src/models/Record.js': () => ({ default: { find: () => query([]) } }),
  '../../src/models/LabOrder.js': () => ({ default: { find: () => query([]) } }),
  '../../src/models/Prescription.js': () => ({ default: { find: () => query([]) } }),
  '../../src/models/OperationTheatre.js': () => ({ default: { find: () => query([]) } }),
  '../../src/models/Admission.js': () => ({ default: { find: () => query([]) } }),
  '../../src/models/Claim.js': () => ({ default: { find: () => query([]) } }),
  '../../src/models/InsurancePolicy.js': () => ({ default: { find: () => query([]) } }),
});

const { as: asHealth } = await mountApp('healthId', {
  '../../src/models/User.js': () => ({ default: { findById: () => query(null) } }),
  '../../src/models/AbdmConsent.js': () => ({
    default: {
      find: () => query([]),
      findById: (id) => query(id === 'granted1'
        ? { _id: 'granted1', status: 'Granted', patientId: 'p1', dateFrom: new Date('2020-01-01'), dateTo: new Date('2030-01-01'), purpose: 'CAREMGT' }
        : id === 'req1'
          ? { _id: 'req1', status: 'Requested', patientId: 'p1', save: async function s() { return this; } }
          : null),
      create: async (d) => ({ _id: 'nc1', status: 'Requested', ...d }),
    },
  }),
  '../../src/models/Record.js': () => ({ default: { find: () => query([]) } }),
  '../../src/models/LabOrder.js': () => ({ default: { find: () => query([]) } }),
  '../../src/models/AuditLog.js': () => ({ default: { create: async () => ({}) } }),
  '../../src/models/AuditLog.js': () => ({ default: { create: async () => ({}) } }),
});

const admin = { _id: 'a1', id: 'a1', role: 'hospital_admin', hospitalId: 'h1' };

describe('FHIR second wave', () => {
  test('empty bundles (not 500s) for unknown patients', async () => {
    for (const path of ['/Condition?patient=p9', '/AllergyIntolerance?patient=p9', '/Procedure?patient=p9', '/Coverage?patient=p9', '/Claim?patient=p9', '/DocumentReference?patient=p9']) {
      // eslint-disable-next-line no-await-in-loop
      const r = await as(admin).get(path);
      expect([200, 404]).toContain(r.status);
    }
  });

  test('code validation endpoint', async () => {
    const r = await as(admin).get('/CodeSystem/validate?system=LOINC&code=718-7');
    expect(r.status).toBe(200);
    expect(r.body.known).toBe(true);
  });

  test('metadata lists the new resources', async () => {
    const r = await as(admin).get('/metadata');
    expect(r.status).toBe(200);
    const types = r.body.rest[0].resource.map((x) => x.type);
    expect(types).toEqual(expect.arrayContaining(['Condition', 'AllergyIntolerance', 'Procedure', 'Coverage', 'Claim', 'DocumentReference']));
  });
});

describe('ABDM consent lifecycle', () => {
  test('request validates the window', async () => {
    const bad = await asHealth(admin).post('/consents').send({ patientId: 'p1', dateFrom: '2026-02-01', dateTo: '2026-01-01' });
    expect(bad.status).toBe(400);
    const ok = await asHealth(admin).post('/consents').send({ patientId: 'p1', dateFrom: '2026-01-01', dateTo: '2026-12-31' });
    expect(ok.status).toBe(201);
  });

  test('grant then fetch honors the window', async () => {
    const g = await asHealth({ _id: 'p1', id: 'p1', role: 'patient' }).post('/consents/req1/decision').send({ decision: 'Granted' });
    expect(g.status).toBe(200);
    const f = await asHealth({ _id: 'p1', id: 'p1', role: 'patient' }).get('/consents/granted1/fetch');
    expect(f.status).toBe(200);
    expect(f.body.purpose).toBe('CAREMGT');
  });
});
