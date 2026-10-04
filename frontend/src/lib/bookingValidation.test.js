import { describe, expect, it } from 'vitest';
import {
  validateBookingSlot,
  validateOtherPatient,
  validatePayment,
  validateSOSPayload,
  canSubmitWithConsent,
} from './bookingValidation';

describe('booking form validation (TEST-B-02)', () => {
  it('requires date and time before advancing', () => {
    expect(validateBookingSlot({ date: '', time: '' }).ok).toBe(false);
    expect(validateBookingSlot({ date: '', time: '' }).errors.time).toMatch(/slot/i);
  });

  it('rejects past dates', () => {
    const r = validateBookingSlot({ date: '2000-01-01', time: '09:00 AM' });
    expect(r.ok).toBe(false);
    expect(r.errors.date).toMatch(/past/i);
  });

  it('accepts a future date + slot + mode', () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const iso = d.toISOString().slice(0, 10);
    expect(validateBookingSlot({ date: iso, time: '09:00 AM', mode: 'offline' }).ok).toBe(true);
  });

  it('rejects unknown appointment mode', () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const r = validateBookingSlot({ date: d.toISOString().slice(0, 10), time: '09:00 AM', mode: 'teleport' });
    expect(r.ok).toBe(false);
  });

  it('validates other-patient details (phone + age)', () => {
    expect(validateOtherPatient({ name: '', phone: '', age: '' }).ok).toBe(false);
    expect(validateOtherPatient({ name: 'A', phone: '123', age: '' }).errors.phone).toMatch(/mobile/i);
    expect(validateOtherPatient({ name: 'A', phone: '9876543210', age: 200 }).errors.age).toBeTruthy();
    expect(validateOtherPatient({ name: 'Asha', phone: '9876543210', age: 30 }).ok).toBe(true);
  });
});

describe('payment form validation', () => {
  it('requires a known method and positive amount', () => {
    expect(validatePayment({ method: '', amount: 0 }).ok).toBe(false);
    expect(validatePayment({ method: 'bitcoin', amount: 500 }).errors.method).toBeTruthy();
    expect(validatePayment({ method: 'card', amount: 500 }).ok).toBe(true);
  });

  it('requires a valid UPI id for upi method', () => {
    expect(validatePayment({ method: 'upi', amount: 100, upiId: 'not-an-upi' }).ok).toBe(false);
    expect(validatePayment({ method: 'upi', amount: 100, upiId: 'asha@okbank' }).ok).toBe(true);
  });
});

describe('consent gate logic', () => {
  it('blocks submit without consent', () => {
    expect(canSubmitWithConsent({ consentGiven: false }).ok).toBe(false);
  });

  it('blocks confidential submit without an explicit scope', () => {
    expect(canSubmitWithConsent({ consentGiven: true, isConfidential: true }).ok).toBe(false);
    expect(
      canSubmitWithConsent({ consentGiven: true, isConfidential: true, shareWithDoctor: true }).ok,
    ).toBe(true);
  });
});

describe('SOS payload guard (Rule 1: no GPS → no SOS)', () => {
  it('rejects missing GPS', () => {
    expect(validateSOSPayload({}).ok).toBe(false);
  });

  it('accepts self SOS with GPS', () => {
    expect(validateSOSPayload({ lat: 28.6, lng: 77.2, reporterMode: 'self' }).ok).toBe(true);
  });

  it('requires victim name for other-reporter SOS', () => {
    expect(validateSOSPayload({ lat: 28.6, lng: 77.2, reporterMode: 'other', victimName: '' }).ok).toBe(false);
    expect(
      validateSOSPayload({ lat: 28.6, lng: 77.2, reporterMode: 'other', victimName: 'Ravi' }).ok,
    ).toBe(true);
  });
});
