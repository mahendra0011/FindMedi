/**
 * NMC telemedicine gate (doc 04/05): identity verification, an active GRANTED
 * telemedicine consent, and a practitioner-supported consult mode. Offline
 * bookings bypass the gate entirely.
 */
/* eslint-disable no-redeclare -- @jest/globals names shadow the configured test globals */
import { jest } from '@jest/globals';

const state = {
  user: { _id: 'p1', isVerified: true },
  doctor: { _id: '6aee46db6c17c8754c60242a', user_id: 'du1', appointmentModes: ['video', 'audio', 'chat'] },
  consent: { purposeOfCare: 'Telemedicine consultation', status: 'GRANTED', expiresAt: new Date(Date.now() + 3600000) },
};

jest.unstable_mockModule('../../src/middleware/audit.js', () => ({ auditLog: async () => {} }));
jest.unstable_mockModule('../../src/models/User.js', () => ({
  default: { findById: () => ({ select: () => ({ lean: async () => state.user } ) }) },
}));
jest.unstable_mockModule('../../src/models/Doctor.js', () => ({
  default: { findById: () => ({ select: () => ({ lean: async () => state.doctor } ) }) },
}));
jest.unstable_mockModule('../../src/models/PractitionerProfile.js', () => ({
  default: { findOne: () => ({ select: () => ({ lean: async () => null } ) }) },
}));
jest.unstable_mockModule('../../src/models/ConsentRecord.js', () => ({
  default: { findOne: () => ({ lean: async () => state.consent } ) },
}));

const { telemedicineGate } = await import('../../src/middleware/telemedicineGate.js');

const run = (body, user = { _id: 'p1' }) => {
  const req = { body, user, ip: '127.0.0.1' };
  const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, body: null, json(b) { this.body = b; return this; } };
  let nextCalled = false;
  return telemedicineGate(req, res, () => { nextCalled = true; }).then(() => ({ res, nextCalled }));
};

describe('telemedicineGate', () => {
  beforeEach(() => {
    state.user = { _id: 'p1', isVerified: true };
    state.consent = { purposeOfCare: 'Telemedicine consultation', status: 'GRANTED', expiresAt: new Date(Date.now() + 3600000) };
  });

  it('lets offline bookings through without touching consent', async () => {
    const { res, nextCalled } = await run({ appointment: { doctorId: '6aee46db6c17c8754c60242a', appointmentMode: 'offline' } });
    expect(nextCalled).toBe(true);
    expect(res.statusCode).toBe(200);
  });

  it('blocks an unverified patient', async () => {
    state.user = { _id: 'p1', isVerified: false };
    const { res, nextCalled } = await run({ appointment: { doctorId: '6aee46db6c17c8754c60242a', appointmentMode: 'video' } });
    expect(nextCalled).toBe(false);
    expect(res.statusCode).toBe(403);
    expect(res.body.code).toBe('TELEMED_UNVERIFIED');
  });

  it('blocks a video consult without granted consent', async () => {
    state.consent = null;
    const { res, nextCalled } = await run({ appointment: { doctorId: '6aee46db6c17c8754c60242a', appointmentMode: 'video' } });
    expect(nextCalled).toBe(false);
    expect(res.statusCode).toBe(403);
    expect(res.body.code).toBe('TELEMED_CONSENT_REQUIRED');
  });

  it('infers tele mode from the legacy appointment type and normalizes call -> audio', async () => {
    const { res, nextCalled } = await run({ appointment: { doctorId: '6aee46db6c17c8754c60242a', appointmentMode: 'call' } });
    expect(nextCalled).toBe(true);
    expect(res.statusCode).toBe(200);
  });

  it('blocks a mode the practitioner does not offer', async () => {
    state.doctor = { _id: '6aee46db6c17c8754c60242a', user_id: 'du1', appointmentModes: ['video'] };
    const { res, nextCalled } = await run({ appointment: { doctorId: '6aee46db6c17c8754c60242a', appointmentMode: 'chat' } });
    expect(nextCalled).toBe(false);
    expect(res.statusCode).toBe(403);
    expect(res.body.code).toBe('TELEMED_MODE_UNSUPPORTED');
    state.doctor = { _id: '6aee46db6c17c8754c60242a', user_id: 'du1', appointmentModes: ['video', 'audio', 'chat'] };
  });
});
