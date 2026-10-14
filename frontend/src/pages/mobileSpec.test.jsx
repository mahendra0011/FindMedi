/**
 * Document 15 — Mobile App Strategy Test Suite
 * Validating:
 * 1. PWA to Capacitor Architecture Decision
 * 2. 2-App Portfolio (Patient + Partner) with Field Mode and Driver
 * 3. Zero-PHI Service Worker caching rules & offline emergency fallback
 * 4. Native capability matrix (PWA vs Capacitor vs Native)
 * 5. Mobile security controls (FLAG_SECURE, Keystore, Play Integrity)
 * 6. Mobile performance thresholds & benchmark validation
 */

import { describe, it, expect } from 'vitest';
import {
  MOBILE_ARCHITECTURE_DECISION,
  APP_PORTFOLIO,
  PWA_SPECIFICATIONS,
  NATIVE_CAPABILITY_MATRIX,
  MOBILE_SECURITY_CONTROLS,
  MOBILE_PERFORMANCE_TARGETS,
  MOBILE_ROLLOUT_PLAN,
  checkMobilePerformanceMetric,
} from '@/lib/mobileStrategy';

describe('Document 15: Mobile App Strategy Specification & Verification', () => {
  it('defines the phased PWA to Capacitor architectural path', () => {
    expect(MOBILE_ARCHITECTURE_DECISION.selectedPath).toBe('PWA_TO_CAPACITOR');
    expect(MOBILE_ARCHITECTURE_DECISION.tiers).toHaveLength(3);

    const [pwa, capacitor, native] = MOBILE_ARCHITECTURE_DECISION.tiers;
    expect(pwa.phase).toBe('R1');
    expect(capacitor.phase).toBe('R2');
    expect(native.phase).toContain('R2');
  });

  it('structures the App Portfolio around Patient, Partner, Field Mode, and Driver', () => {
    expect(APP_PORTFOLIO.length).toBeGreaterThanOrEqual(4);
    const codes = APP_PORTFOLIO.map((a) => a.code);
    expect(codes).toContain('findmedi_patient');
    expect(codes).toContain('findmedi_partner');
    expect(codes).toContain('findmedi_field');
    expect(codes).toContain('findmedi_driver');
  });

  it('mandates Zero-PHI caching in Service Worker rules', () => {
    const caching = PWA_SPECIFICATIONS.cachingRules;
    expect(caching.personalPhiApi).toMatch(/NETWORK-ONLY/i);
    expect(caching.offlineFallback).toContain('/offline.html');
    expect(caching.offlineFallback).toContain('112');
  });

  it('provides full Native Capability comparison across 8 dimensions', () => {
    expect(NATIVE_CAPABILITY_MATRIX.length).toBeGreaterThanOrEqual(8);
    const capabilities = NATIVE_CAPABILITY_MATRIX.map((c) => c.capability.toLowerCase());
    expect(capabilities.some((c) => c.includes('push'))).toBe(true);
    expect(capabilities.some((c) => c.includes('location'))).toBe(true);
    expect(capabilities.some((c) => c.includes('camera'))).toBe(true);
    expect(capabilities.some((c) => c.includes('biometric'))).toBe(true);
    expect(capabilities.some((c) => c.includes('offline storage'))).toBe(true);
  });

  it('enforces FLAG_SECURE and Play Integrity in security controls', () => {
    expect(MOBILE_SECURITY_CONTROLS.screenShielding).toContain('FLAG_SECURE');
    expect(MOBILE_SECURITY_CONTROLS.integrityChecking).toContain('Play Integrity');
    expect(MOBILE_SECURITY_CONTROLS.authentication).toContain('Keystore');
  });

  it('validates mobile performance metrics with checkMobilePerformanceMetric', () => {
    // Within budget
    const goodColdStart = checkMobilePerformanceMetric('coldStart', 2.4);
    expect(goodColdStart.passed).toBe(true);

    const goodBundle = checkMobilePerformanceMetric('bundleSize', 165);
    expect(goodBundle.passed).toBe(true);

    // Over budget
    const badColdStart = checkMobilePerformanceMetric('coldStart', 4.1);
    expect(badColdStart.passed).toBe(false);

    const badApk = checkMobilePerformanceMetric('apkSize', 58);
    expect(badApk.passed).toBe(false);
  });
});
