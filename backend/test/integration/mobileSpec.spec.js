import { jest as jestApi } from '@jest/globals';
import { mountApp } from '../helpers/appHarness.js';
import {
  MOBILE_ARCHITECTURE_DECISION,
  APP_PORTFOLIO,
  PWA_SPECIFICATIONS,
  NATIVE_CAPABILITY_MATRIX,
  MOBILE_SECURITY_CONTROLS,
  MOBILE_PERFORMANCE_TARGETS,
  MOBILE_ROLLOUT_PLAN,
  checkMobilePerformanceMetric,
} from '../../src/config/mobileStrategy.js';

const { as } = await mountApp('crm', {}, { enforceAuthorize: true });

const superadmin = { _id: '507f1f77bcf86cd799439011', role: 'superadmin' };
const cityManager = { _id: '507f1f77bcf86cd799439013', role: 'city_manager' };
const patient = { _id: '507f1f77bcf86cd799439099', role: 'patient' };

describe('Document 15: Mobile App Strategy Spec API', () => {
  test('Patients cannot access mobile-spec (403)', async () => {
    await as(patient).get('/mobile-spec').expect(403);
  });

  test('Superadmin receives full mobile app strategy specification (200)', async () => {
    const res = await as(superadmin).get('/mobile-spec').expect(200);

    expect(res.body).toHaveProperty('architectureDecision');
    expect(res.body).toHaveProperty('appPortfolio');
    expect(res.body).toHaveProperty('pwaSpecifications');
    expect(res.body).toHaveProperty('nativeCapabilities');
    expect(res.body).toHaveProperty('securityControls');
    expect(res.body).toHaveProperty('performanceTargets');
    expect(res.body).toHaveProperty('rolloutPlan');

    // Architecture decision: PWA R1 -> Capacitor R2 -> Native Android
    expect(res.body.architectureDecision.selectedPath).toBe('PWA_TO_CAPACITOR');
    expect(res.body.architectureDecision.tiers).toHaveLength(3);
    const pwaTier = res.body.architectureDecision.tiers.find((t) => t.tier.includes('PWA'));
    expect(pwaTier.phase).toBe('R1');

    // App portfolio has Patient, Partner, Field Mode, Driver
    expect(res.body.appPortfolio.length).toBeGreaterThanOrEqual(4);
    const codes = res.body.appPortfolio.map((a) => a.code);
    expect(codes).toContain('findmedi_patient');
    expect(codes).toContain('findmedi_partner');
    expect(codes).toContain('findmedi_field');
    expect(codes).toContain('findmedi_driver');

    // Zero-PHI Caching policy
    expect(res.body.pwaSpecifications.cachingRules.personalPhiApi).toMatch(/NETWORK-ONLY/i);
    expect(res.body.pwaSpecifications.manifest.shortcuts.length).toBeGreaterThanOrEqual(3);

    // Native capability matrix
    expect(res.body.nativeCapabilities.length).toBeGreaterThanOrEqual(6);
    const pushCap = res.body.nativeCapabilities.find((c) => c.capability.includes('Push'));
    expect(pushCap).toBeDefined();

    // Security controls
    expect(res.body.securityControls.screenShielding).toContain('FLAG_SECURE');
    expect(res.body.securityControls.integrityChecking).toContain('Play Integrity');

    // Performance targets
    expect(res.body.performanceTargets.coldStartSeconds).toBeLessThanOrEqual(3.0);
    expect(res.body.performanceTargets.timeToInteractiveSeconds).toBeLessThanOrEqual(4.0);
    expect(res.body.performanceTargets.maxMemoryMb).toBeLessThanOrEqual(250);
    expect(res.body.performanceTargets.maxApkSizeMb).toBeLessThanOrEqual(40);
  });

  test('City manager has crm:read and can access mobile-spec (200)', async () => {
    const res = await as(cityManager).get('/mobile-spec').expect(200);
    expect(res.body.appPortfolio.length).toBeGreaterThanOrEqual(4);
  });

  describe('Mobile Performance Checker Helper', () => {
    test('passes metrics within Document 15 thresholds', () => {
      const coldStart = checkMobilePerformanceMetric('coldStart', 2.1);
      expect(coldStart.passed).toBe(true);

      const memory = checkMobilePerformanceMetric('memory', 180);
      expect(memory.passed).toBe(true);
    });

    test('flags metrics exceeding thresholds', () => {
      const slowColdStart = checkMobilePerformanceMetric('coldStart', 4.5);
      expect(slowColdStart.passed).toBe(false);

      const bloatedApk = checkMobilePerformanceMetric('apkSize', 55);
      expect(bloatedApk.passed).toBe(false);
    });
  });
});
