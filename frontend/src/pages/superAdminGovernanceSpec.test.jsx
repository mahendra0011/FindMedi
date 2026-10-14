/**
 * Document 23 — Super Admin Governance & Privacy Architecture Test Suite
 * Validating:
 * 1. 14 Scoped Admin Roles & Least-Privilege IAM Scopes
 * 2. Data Access Matrix (Zero Routine PHI, Dual Approval for Stigma Categories)
 * 3. Break-Glass Policy & Protocol (Time-boxed ≤60 min, Reason Codes, Dual Approval)
 * 4. Dynamic PII Masking & OTP-Gated Support Assist Session
 * 5. Admin Sidebar Audit (Keep, Restrict, Remove, Add)
 * 6. 10 Non-Negotiable Privacy Guarantees
 * 7. ProjectsRoadmap UI Integration (Interactive Dialog, 5 Tabs, Simulator, Masking Tester)
 */

import '@testing-library/jest-dom/vitest';
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import {
  SCOPED_ADMIN_ROLES,
  DATA_ACCESS_MATRIX,
  BREAK_GLASS_POLICY,
  MASKING_CONFIG,
  ADMIN_SIDEBAR_SPEC,
  PRIVACY_GUARANTEES,
  maskPatientPii,
  validateBreakGlassRequest,
} from '@/lib/superAdminGovernance';
import ProjectsRoadmap from './superadmin/crm/ProjectsRoadmap';

// Mock apiClient for ProjectsRoadmap
vi.mock('@/lib/api', () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue({
      data: {
        projects: [
          {
            id: 'proj-gov-1',
            title: 'Super Admin Scoped Roles & Break-Glass Console',
            kind: 'initiative',
            phase: 'F2',
            status: 'in_progress',
            progress: 85,
            targetAt: '2026-12-31',
            externalRef: 'GOV-2026',
          },
        ],
      },
    }),
    post: vi.fn().mockResolvedValue({ data: { id: 'proj-new', status: 'planned' } }),
    patch: vi.fn().mockResolvedValue({ data: { success: true } }),
    delete: vi.fn().mockResolvedValue({ data: { success: true } }),
  },
}));

describe('Document 23: Super Admin Governance & Privacy Architecture Spec', () => {
  it('defines exactly 14 scoped admin roles replacing monolithic god-mode superadmin', () => {
    expect(SCOPED_ADMIN_ROLES).toHaveLength(14);

    const codes = SCOPED_ADMIN_ROLES.map((r) => r.code);
    expect(codes).toEqual([
      'superadmin',
      'platform_admin',
      'kyc_reviewer',
      'catalog_manager',
      'moderator',
      'support_l1',
      'support_l2',
      'finance_admin',
      'city_manager',
      'medical_reviewer',
      'clinical_safety',
      'dpo',
      'security_admin',
      'auditor',
    ]);

    // DPO, Security Admin, Medical Reviewer, and Clinical Safety are authorized approvers/requesters
    const dpo = SCOPED_ADMIN_ROLES.find((r) => r.code === 'dpo');
    expect(dpo.canApproveBreakGlass).toBe(true);
    expect(dpo.requiresMfa).toBe(true);

    const l1 = SCOPED_ADMIN_ROLES.find((r) => r.code === 'support_l1');
    expect(l1.canApproveBreakGlass).toBe(false);
    expect(l1.allowedScopes).toContain('tickets:l1');
  });

  it('enforces zero routine clinical PHI browsing across all roles in Data Access Matrix', () => {
    const generalPhiRow = DATA_ACCESS_MATRIX.find((r) => r.category.includes('General Clinical Records'));
    expect(generalPhiRow.superadmin).toBe('Break-Glass Only');
    expect(generalPhiRow.kyc_reviewer).toBe('None');
    expect(generalPhiRow.support_l1).toBe('None');
    expect(generalPhiRow.support_l2).toBe('None');
    expect(generalPhiRow.finance_admin).toBe('None');

    const sensitivePhiRow = DATA_ACCESS_MATRIX.find((r) => r.category.includes('Mental & Sexual Health'));
    expect(sensitivePhiRow.superadmin).toBe('Dual-Approval Break-Glass');
    expect(sensitivePhiRow.dpo).toBe('Dual-Approval Break-Glass');
    expect(sensitivePhiRow.clinical_safety).toBe('Dual-Approval Break-Glass');
  });

  it('defines Break-Glass policy with maximum 60 minutes lease and 5 emergency reasons', () => {
    expect(BREAK_GLASS_POLICY.maxDurationMinutes).toBe(60);
    expect(BREAK_GLASS_POLICY.minJustificationLength).toBe(20);
    expect(BREAK_GLASS_POLICY.reasons).toHaveLength(5);

    const reasonCodes = BREAK_GLASS_POLICY.reasons.map((r) => r.code);
    expect(reasonCodes).toContain('LEGAL_COURT_ORDER');
    expect(reasonCodes).toContain('CLINICAL_EMERGENCY');
    expect(reasonCodes).toContain('FATAL_ADVERSE_EVENT');
    expect(reasonCodes).toContain('MALICIOUS_TAMPERING_AUDIT');
    expect(reasonCodes).toContain('DPDP_RIGHT_TO_CORRECTION_DISPUTE');

    // Dual approval required for fatal adverse events and cyber tampering
    const fatal = BREAK_GLASS_POLICY.reasons.find((r) => r.code === 'FATAL_ADVERSE_EVENT');
    expect(fatal.requiresDualApproval).toBe(true);
  });

  it('masks patient PII fields reliably via maskPatientPii', () => {
    const raw = {
      name: 'Pooja Agarwal',
      phone: '+91 99887 76655',
      email: 'pooja.agarwal@outlook.com',
      address: 'Plot 88, Napier Town, Jabalpur 482001',
    };

    const masked = maskPatientPii(raw);
    expect(masked.name).toBe('Pooja A***');
    expect(masked.phone).toContain('*****655');
    expect(masked.email).toBe('p***l@outlook.com');
    expect(masked.address).toBe('***, Jabalpur 482001');
    expect(masked.isMasked).toBe(true);
  });

  it('validates Break-Glass requests and blocks invalid inputs, self-approvals, and missing dual-approvals', () => {
    // 1. Missing fields
    const res1 = validateBreakGlassRequest({});
    expect(res1.valid).toBe(false);
    expect(res1.errors.length).toBeGreaterThan(0);

    // 2. Self-approval blocked
    const res2 = validateBreakGlassRequest({
      requesterId: 'admin-alpha',
      reasonCode: 'LEGAL_COURT_ORDER',
      justification: 'Warrant from Bhopal High Court bench requiring prescription audit.',
      caseOrTicketId: 'HC-BPL-2026-102',
      durationMinutes: 30,
      approverIds: ['admin-alpha'], // Self!
    });
    expect(res2.valid).toBe(false);
    expect(res2.errors.some((e) => e.includes('Self-approval prohibited'))).toBe(true);

    // 3. Sensitive category dual approval enforced
    const res3 = validateBreakGlassRequest({
      requesterId: 'admin-alpha',
      reasonCode: 'CLINICAL_EMERGENCY',
      justification: 'Unconscious patient in Jabalpur Medical College ER needing psych history.',
      caseOrTicketId: 'ER-JMC-2026-78',
      durationMinutes: 30,
      isSensitiveCategory: true,
      approverIds: ['dpo-lead'], // only 1 approver!
    });
    expect(res3.valid).toBe(false);
    expect(res3.requiresDualApproval).toBe(true);

    // 4. Valid dual-approved request
    const res4 = validateBreakGlassRequest({
      requesterId: 'admin-alpha',
      reasonCode: 'CLINICAL_EMERGENCY',
      justification: 'Unconscious patient in Jabalpur Medical College ER needing psych history.',
      caseOrTicketId: 'ER-JMC-2026-78',
      durationMinutes: 30,
      isSensitiveCategory: true,
      approverIds: ['dpo-lead', 'sec-officer'], // 2 distinct approvers!
    });
    expect(res4.valid).toBe(true);
  });

  it('audits superadmin sidebar pages into Keep, Restrict, Remove, and Add New', () => {
    expect(ADMIN_SIDEBAR_SPEC.length).toBeGreaterThanOrEqual(9);

    const rawViewer = ADMIN_SIDEBAR_SPEC.find((s) => s.id === 'raw_clinical_browser');
    expect(rawViewer.action).toBe('REMOVE_OR_REPLACE');
    expect(rawViewer.allowedRoles).toHaveLength(0);

    const bgConsole = ADMIN_SIDEBAR_SPEC.find((s) => s.id === 'break_glass_console');
    expect(bgConsole.action).toBe('ADD_NEW');
    expect(bgConsole.allowedRoles).toContain('dpo');

    const dpoHub = ADMIN_SIDEBAR_SPEC.find((s) => s.id === 'dpo_privacy_hub');
    expect(dpoHub.action).toBe('ADD_NEW');
  });

  it('lists the 10 Non-Negotiable Privacy Guarantees', () => {
    expect(PRIVACY_GUARANTEES).toHaveLength(10);
    expect(PRIVACY_GUARANTEES[0].title).toBe('Zero Clinical Browsing by Default');
    expect(PRIVACY_GUARANTEES[1].title).toBe('Dual-Approval for Sensitive Specialties');
    expect(PRIVACY_GUARANTEES[2].title).toBe('Time-Boxed Emergency Leases (≤ 60 Min)');
  });
});

describe('Document 23: Super Admin Governance UI Integration in ProjectsRoadmap', () => {
  it('renders the Super Admin Governance button and launches the modal dialog with all 5 tabs and default roles view', async () => {
    render(
      <MemoryRouter>
        <ProjectsRoadmap />
      </MemoryRouter>
    );

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('Projects & Roadmap')).toBeInTheDocument();
    });

    const govBtn = screen.getByTestId('superadmin-governance-btn');
    expect(govBtn).toBeInTheDocument();
    fireEvent.click(govBtn);

    // Verify modal is displayed
    await waitFor(() => {
      expect(screen.getByTestId('governance-modal')).toBeInTheDocument();
      expect(screen.getByText(/Super Admin Governance, Scoped Roles & Break-Glass Console/i)).toBeInTheDocument();
    });

    // Verify all 5 tabs exist in the modal header
    expect(screen.getByTestId('gov-tab-roles')).toBeInTheDocument();
    expect(screen.getByTestId('gov-tab-breakglass')).toBeInTheDocument();
    expect(screen.getByTestId('gov-tab-support')).toBeInTheDocument();
    expect(screen.getByTestId('gov-tab-sidebar')).toBeInTheDocument();
    expect(screen.getByTestId('gov-tab-checklist')).toBeInTheDocument();

    // Verify summary metric cards in default Roles view
    expect(screen.getByText('14 Scoped')).toBeInTheDocument();
    expect(screen.getByText('0 (Zero)')).toBeInTheDocument();
    expect(screen.getByText('Break-Glass')).toBeInTheDocument();
    expect(screen.getByText('Dual Approval')).toBeInTheDocument();

    // Verify roles cards in Tab 1
    expect(screen.getByTestId('role-card-superadmin')).toBeInTheDocument();
    expect(screen.getByTestId('role-card-dpo')).toBeInTheDocument();
    expect(screen.getByTestId('role-card-support_l1')).toBeInTheDocument();
    expect(screen.getByTestId('role-card-clinical_safety')).toBeInTheDocument();
    expect(screen.getByTestId('role-card-security_admin')).toBeInTheDocument();

    // Verify Data Access Matrix table headers in default view
    expect(screen.getByText('Data Access Control Matrix')).toBeInTheDocument();
    expect(screen.getByText('Provider KYC & Credentials')).toBeInTheDocument();
    expect(screen.getByText('General Clinical Records & Prescriptions')).toBeInTheDocument();
    expect(screen.getByText('Mental & Sexual Health Sensitive Clinical Data')).toBeInTheDocument();
  });
});

