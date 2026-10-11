import Feedback from '../../src/models/Feedback.js';
import LinenRequest from '../../src/models/LinenRequest.js';
import { GatePass, SecurityRound } from '../../src/models/GatePass.js';
import { BilirubinReading, PhototherapySession } from '../../src/models/BilirubinReading.js';
import { AmbulanceTrip, AmbulanceVehicleLog } from '../../src/models/AmbulanceTrip.js';
import DialysisSession from '../../src/models/DialysisSession.js';
import H1RegisterEntry, { REGISTER_SCHEDULES } from '../../src/models/H1RegisterEntry.js';

/**
 * Checklist §2 modules — schema contract tests. `validateSync()` runs the
 * same validators the DB path runs, without needing a connection, so bounds
 * and enum mistakes fail here rather than at first write in production.
 */
const oid = '64b000000000000000000000';
const errs = (doc) => {
  const e = doc.validateSync();
  return e ? Object.keys(e.errors) : [];
};

describe('Feedback (NPS survey) schema', () => {
  it('accepts a minimal NPS submission', () => {
    const doc = new Feedback({ npsScore: 9, patientId: oid, createdBy: oid });
    expect(errs(doc)).toEqual([]);
  });
  it('rejects out-of-range npsScore and rating', () => {
    expect(errs(new Feedback({ npsScore: 11 }))).toContain('npsScore');
    expect(errs(new Feedback({ npsScore: -1 }))).toContain('npsScore');
    expect(errs(new Feedback({ rating: 6 }))).toContain('rating');
  });
  it('rejects an unknown context', () => {
    expect(errs(new Feedback({ npsScore: 5, context: 'callcentre' }))).toContain('context');
  });
});

describe('LinenRequest schema', () => {
  it('accepts a two-item request', () => {
    const doc = new LinenRequest({ requestId: 'LIN1', items: [{ name: 'bedsheet', qty: 4 }], requestedBy: oid });
    expect(errs(doc)).toEqual([]);
  });
  it('rejects qty < 1 and unknown status', () => {
    expect(errs(new LinenRequest({ requestId: 'LIN2', items: [{ name: 'towel', qty: 0 }], requestedBy: oid }))).toContain('items.0.qty');
    expect(errs(new LinenRequest({ requestId: 'LIN3', status: 'lost', items: [], requestedBy: oid }))).toContain('status');
  });
});

describe('GatePass + SecurityRound schema', () => {
  it('a pass needs passNo + type + description', () => {
    const ok = new GatePass({ passNo: 'GP1', type: 'equipment_out', description: 'Monitor out for service', requestedBy: oid });
    expect(errs(ok)).toEqual([]);
    expect(errs(new GatePass({ passNo: 'GP2', type: 'nope', description: 'x' }))).toContain('type');
    expect(errs(new GatePass({ passNo: 'GP3', type: 'other' }))).toContain('description');
  });
  it('a round needs guardId and carries open status by default', () => {
    const round = new SecurityRound({ roundNo: 'SR1', guardId: oid });
    expect(errs(round)).toEqual([]);
    expect(round.status).toBe('open');
  });
});

describe('BilirubinReading + PhototherapySession schema', () => {
  it('accepts a reading within physiologic bounds', () => {
    const doc = new BilirubinReading({ patientId: oid, ageHours: 36, totalMgDl: 14.2, recordedBy: oid });
    expect(errs(doc)).toEqual([]);
  });
  it('rejects implausible totals and age', () => {
    expect(errs(new BilirubinReading({ patientId: oid, ageHours: 36, totalMgDl: 41, recordedBy: oid }))).toContain('totalMgDl');
    expect(errs(new BilirubinReading({ patientId: oid, ageHours: 800, totalMgDl: 5, recordedBy: oid }))).toContain('ageHours');
  });
  it('a phototherapy session defaults eyeProtection on (safety default)', () => {
    const s = new PhototherapySession({ patientId: oid, recordedBy: oid });
    expect(errs(s)).toEqual([]);
    expect(s.eyeProtection).toBe(true);
    expect(s.endedAt).toBeUndefined();
  });
});

describe('AmbulanceTrip + vehicle log schema', () => {
  it('a trip needs ambulance, driver and both endpoints', () => {
    const ok = new AmbulanceTrip({ ambulanceId: oid, driverId: oid, fromLocation: 'Gate 1', toLocation: 'AIIMS' });
    expect(errs(ok)).toEqual([]);
    expect(errs(new AmbulanceTrip({ ambulanceId: oid, driverId: oid }))).toContain('fromLocation');
  });
  it('a fuel log line carries litres + odometer without forcing cost', () => {
    const doc = new AmbulanceVehicleLog({ ambulanceId: oid, type: 'fuel', litres: 40, odometerKm: 120000, recordedBy: oid });
    expect(errs(doc)).toEqual([]);
    expect(errs(new AmbulanceVehicleLog({ ambulanceId: oid, type: 'petrol', recordedBy: oid }))).toContain('type');
  });
});

describe('DialysisSession extension (checklist §2)', () => {
  it('accepts dialyser reuse count + serology segregation', () => {
    const doc = new DialysisSession({
      patientId: oid, providerId: oid, recordedBy: oid, date: '2026-10-10',
      preWeightKg: 60, postWeightKg: 58,
      dialyserReuseCount: 3,
      serology: { hbsag: 'positive', hcv: 'negative', hiv: 'negative' },
      isolation: 'hbv',
    });
    expect(errs(doc)).toEqual([]);
  });
  it('rejects reuse beyond the manufacturer cap and unknown serology values', () => {
    const over = new DialysisSession({
      patientId: oid, providerId: oid, recordedBy: oid, date: '2026-10-10',
      preWeightKg: 60, postWeightKg: 58, dialyserReuseCount: 13,
    });
    expect(errs(over)).toContain('dialyserReuseCount');
    const bad = new DialysisSession({
      patientId: oid, providerId: oid, recordedBy: oid, date: '2026-10-10',
      preWeightKg: 60, postWeightKg: 58, serology: { hbsag: 'maybe' },
    });
    expect(errs(bad)).toContain('serology.hbsag');
  });
});

describe('H1RegisterEntry schedules (checklist item 7)', () => {
  it('locks the controlled-schedule set to h1/x/narcotic_ndps', () => {
    expect([...REGISTER_SCHEDULES].sort()).toEqual(['h1', 'narcotic_ndps', 'x']);
  });
  it('an entry without a schedule token is invalid', () => {
    const doc = new H1RegisterEntry({ patientName: 'Ravi', medicineName: 'Fentanyl 50mcg', quantity: 1 });
    expect(errs(doc)).toContain('rxSchedule');
  });
});
