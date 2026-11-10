import { describe, expect, it } from 'vitest';
import { isSensitiveNativeRoute } from './sensitiveScreenRoutes';

describe('isSensitiveNativeRoute', () => {
  it.each([
    '/patient',
    '/patient/records',
    '/doctor/patients',
    '/psychiatrist/appointments',
    '/counsellor/sessions',
    '/superadmin/review',
    '/join-platform',
    '/join/new',
    '/register/delivery-partner',
    '/login',
    '/verify-otp',
  ])('protects sensitive route %s', (path) => {
    expect(isSensitiveNativeRoute(path)).toBe(true);
  });

  it.each([
    '/',
    '/home',
    '/doctors/cardiology',
    '/hospital-directory',
    '/clinic-directory',
    '/administrator-info',
  ])('does not protect public route %s by prefix collision', (path) => {
    expect(isSensitiveNativeRoute(path)).toBe(false);
  });
});
