import { mountApp } from '../helpers/appHarness.js';
import {
  SCOPED_ADMIN_ROLES,
  DATA_ACCESS_MATRIX,
  BREAK_GLASS_POLICY,
  MASKING_CONFIG,
  ADMIN_SIDEBAR_SPEC,
  PRIVACY_GUARANTEES,
  maskPatientPii,
  validateBreakGlassRequest,
} from '../../src/config/superAdminGovernance.js';

const { as } = await mountApp('crm', {}, { enforceAuthorize: true });

const superadmin = { _id: '507f1f77bcf86cd799439011', role: 'superadmin' };
const cityManager = { _id: '507f1f77bcf86cd799439013', role: 'city_manager' };
const patient = { _id: '507f1f77bcf86cd799439099', role: 'patient' };

describe('Document 23: Super Admin Governance & Privacy Architecture Spec API', () => {
  test('Patients cannot access superadmin-governance-spec (403)', async () => {
    await as(patient).get('/superadmin-governance-spec').expect(403);
  });

  test('Superadmin receives full governance specification (200)', async () => {
    const res = await as(superadmin).get('/superadmin-governance-spec').expect(200);

    expect(res.body).toHaveProperty('scopedAdminRoles');
    expect(res.body).toHaveProperty('dataAccessMatrix');
    expect(res.body).toHaveProperty('breakGlassPolicy');
    expect(res.body).toHaveProperty('maskingConfig');
    expect(res.body).toHaveProperty('adminSidebarSpec');
    expect(res.body).toHaveProperty('privacyGuarantees');

    // Exactly 14 scoped admin roles
    expect(res.body.scopedAdminRoles).toHaveLength(14);
    const roleCodes = res.body.scopedAdminRoles.map((r) => r.code);
    expect(roleCodes).toContain('superadmin');
    expect(roleCodes).toContain('platform_admin');
    expect(roleCodes).toContain('kyc_reviewer');
    expect(roleCodes).toContain('catalog_manager');
    expect(roleCodes).toContain('moderator');
    expect(roleCodes).toContain('support_l1');
    expect(roleCodes).toContain('support_l2');
    expect(roleCodes).toContain('finance_admin');
    expect(roleCodes).toContain('city_manager');
    expect(roleCodes).toContain('medical_reviewer');
    expect(roleCodes).toContain('clinical_safety');
    expect(roleCodes).toContain('dpo');
    expect(roleCodes).toContain('security_admin');
    expect(roleCodes).toContain('auditor');

    // Break-glass policy validation
    expect(res.body.breakGlassPolicy.maxDurationMinutes).toBe(60);
    expect(res.body.breakGlassPolicy.minJustificationLength).toBe(20);
    expect(res.body.breakGlassPolicy.reasons).toHaveLength(5);
    expect(res.body.breakGlassPolicy.sensitiveCategoriesRequiringDualApproval).toContain('mental_health');
    expect(res.body.breakGlassPolicy.sensitiveCategoriesRequiringDualApproval).toContain('sexual_reproductive_health');

    // Masking config
    expect(res.body.maskingConfig.assistSessionTtlMinutes).toBe(15);

    // Exactly 10 privacy guarantees
    expect(res.body.privacyGuarantees).toHaveLength(10);
    expect(res.body.privacyGuarantees[0].num).toBe(1);
    expect(res.body.privacyGuarantees[0].title).toContain('Zero Clinical Browsing');

    // Sidebar audit actions
    const sidebarActions = res.body.adminSidebarSpec.map((s) => s.action);
    expect(sidebarActions).toContain('KEEP_AS_IS');
    expect(sidebarActions).toContain('RESTRICT_ACCESS');
    expect(sidebarActions).toContain('REMOVE_OR_REPLACE');
    expect(sidebarActions).toContain('ADD_NEW');
  });

  test('City manager can also read governance specification (200)', async () => {
    const res = await as(cityManager).get('/superadmin-governance-spec').expect(200);
    expect(res.body.scopedAdminRoles).toHaveLength(14);
  });

  test('maskPatientPii masks name, phone, email, and address properly', () => {
    const rawPatient = {
      name: 'Rahul Kumar Sharma',
      phone: '+91 98765 43210',
      email: 'rahul.kumar@gmail.com',
      address: 'Flat 402, Green Valley, Jabalpur 482001',
    };

    const masked = maskPatientPii(rawPatient);
    expect(masked.isMasked).toBe(true);
    expect(masked.name).toBe('Rahul K*** S***');
    expect(masked.phone).toContain('*****210');
    expect(masked.email).toBe('r***r@gmail.com');
    expect(masked.address).toBe('***, Jabalpur 482001');
  });

  test('validateBreakGlassRequest rejects self-approval and short justifications', () => {
    // Too short justification
    const shortJustification = validateBreakGlassRequest({
      requesterId: 'admin-1',
      reasonCode: 'CLINICAL_EMERGENCY',
      justification: 'Need access', // < 20 chars
      caseOrTicketId: 'TICK-101',
      durationMinutes: 30,
      approverIds: ['dpo-1'],
    });
    expect(shortJustification.valid).toBe(false);
    expect(shortJustification.errors[0]).toContain('at least 20 characters');

    // Self-approval attempt
    const selfApproval = validateBreakGlassRequest({
      requesterId: 'admin-1',
      reasonCode: 'LEGAL_COURT_ORDER',
      justification: 'Court production order HC-JBP-2026-9901 for inspection.',
      caseOrTicketId: 'HC-JBP-2026-9901',
      durationMinutes: 45,
      approverIds: ['admin-1'], // Self!
    });
    expect(selfApproval.valid).toBe(false);
    expect(selfApproval.errors.some((e) => e.includes('Self-approval prohibited'))).toBe(true);

    // Duration exceeding 60 minutes
    const excessDuration = validateBreakGlassRequest({
      requesterId: 'admin-1',
      reasonCode: 'LEGAL_COURT_ORDER',
      justification: 'Court production order HC-JBP-2026-9901 for inspection.',
      caseOrTicketId: 'HC-JBP-2026-9901',
      durationMinutes: 90, // > 60
      approverIds: ['dpo-1'],
    });
    expect(excessDuration.valid).toBe(false);
    expect(excessDuration.errors.some((e) => e.includes('between 1 and 60 minutes'))).toBe(true);
  });

  test('validateBreakGlassRequest enforces dual-approval for sensitive mental health records', () => {
    // Single approver for sensitive category should fail
    const singleForSensitive = validateBreakGlassRequest({
      requesterId: 'admin-1',
      reasonCode: 'CLINICAL_EMERGENCY',
      justification: 'Emergency Room triage requires mental health prescription history.',
      caseOrTicketId: 'ER-TRIAGE-2026-44',
      durationMinutes: 30,
      isSensitiveCategory: true,
      approverIds: ['dpo-1'], // Only 1 approver!
    });
    expect(singleForSensitive.valid).toBe(false);
    expect(singleForSensitive.requiresDualApproval).toBe(true);
    expect(singleForSensitive.errors.some((e) => e.includes('Dual approval required'))).toBe(true);

    // Two independent approvers for sensitive category should pass
    const dualForSensitive = validateBreakGlassRequest({
      requesterId: 'admin-1',
      reasonCode: 'CLINICAL_EMERGENCY',
      justification: 'Emergency Room triage requires mental health prescription history.',
      caseOrTicketId: 'ER-TRIAGE-2026-44',
      durationMinutes: 30,
      isSensitiveCategory: true,
      approverIds: ['dpo-1', 'security-1'], // 2 distinct approvers
    });
    expect(dualForSensitive.valid).toBe(true);
    expect(dualForSensitive.requiresDualApproval).toBe(true);
  });
});
