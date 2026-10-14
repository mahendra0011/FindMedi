/**
 * Document 25 — Access Control Center Frontend Spec Test Suite
 * Validating:
 * 1. 7-Layer IAM Evaluation Architecture Specification (L0 to L6)
 * 2. 4 Core Segregation of Duties (SoD) Conflict Detection Rules
 * 3. 12 Access Control Center Tabs Specification
 * 4. AccessControl UI Component rendering with all 12 tabs
 * 5. Policy Simulator tab switching and evaluation interface
 * 6. Access Analyzer tab switching and risk findings
 */

import '@testing-library/jest-dom/vitest';
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import {
  IAM_EVALUATION_LAYERS,
  SOD_RULES,
  ACCESS_CENTER_TABS,
} from '@/lib/accessControlSpec';

import AccessControl from './AccessControl';

// Mock the API calls made in AccessControl.tsx
vi.mock('@/lib/api', () => ({
  api: {
    getIamRoles: vi.fn().mockResolvedValue({
      roles: [
        {
          _id: 'role_nurse_1',
          name: 'Ward-3 Nurse',
          type: 'custom',
          version: 1,
          policyIds: [{ _id: 'pol_vitals', name: 'Ward-3 Vitals Policy' }],
        },
      ],
    }),
    getIamTemplates: vi.fn().mockResolvedValue({
      templates: [
        { key: 'nurse', name: 'Nurse (Ward-scoped)', statements: [] },
        { key: 'doctor', name: 'Doctor', statements: [] },
      ],
    }),
    getIamCatalog: vi.fn().mockResolvedValue({
      actions: [
        { action: 'vitals:read', module: 'ipd', sensitivity: 'standard', label: 'View Vitals' },
        { action: 'vitals:write', module: 'ipd', sensitivity: 'standard', label: 'Record Vitals' },
        { action: 'records:clinical:read', module: 'records', sensitivity: 'sensitive', label: 'Read Clinical Notes' },
        { action: 'records:restricted:read', module: 'records', sensitivity: 'restricted', label: 'Read Restricted Records' },
      ],
      sensitivityClasses: ['standard', 'sensitive', 'restricted', 'financial', 'hr_sensitive', 'admin_critical'],
    }),
    getIamPrincipals: vi.fn().mockResolvedValue({
      users: [
        { _id: 'u_ravi', name: 'Ravi Kumar', email: 'ravi@apollo.org', role: 'nurse', mfaEnabled: true },
        { _id: 'u_meena', name: 'Meena Sharma', email: 'meena@apollo.org', role: 'accountant', mfaEnabled: false },
      ],
      groups: [{ _id: 'grp_ward3', name: 'Ward-3 Nursing Team', memberIds: ['u_ravi'] }],
    }),
    getIamAssignments: vi.fn().mockResolvedValue({
      assignments: [
        {
          _id: 'as_1',
          principalType: 'user',
          principalId: 'u_ravi',
          roleId: 'role_nurse_1',
          status: 'active',
          scope: { wardIds: ['ward_3'], deptIds: ['nursing'] },
        },
      ],
    }),
    getIamScopes: vi.fn().mockResolvedValue({
      scopes: [
        { _id: 'sc_ward3', type: 'ward', name: 'Ward-3 ICU Stepdown', key: 'ward_3' },
      ],
    }),
    getIamRequests: vi.fn().mockResolvedValue({ requests: [] }),
    getIamReviews: vi.fn().mockResolvedValue({ reviews: [] }),
    getIamAnalyzer: vi.fn().mockResolvedValue({
      summary: { totalFindings: 2, critical: 1, high: 1, medium: 0, low: 0 },
      findings: [
        {
          id: 'SOD_BILLING_REFUND_u_meena',
          rule: 'SOD_BILLING_REFUND',
          category: 'sod',
          title: 'Financial SoD: Write Invoice & Issue Refund',
          severity: 'critical',
          principalName: 'Meena Sharma (meena@apollo.org)',
          description: 'User has permissions to both create invoices and issue refunds.',
          remediation: 'Separate create and refund permissions.',
        },
      ],
    }),
    getIamGrants: vi.fn().mockResolvedValue({ grants: [] }),
    getIamApiKeys: vi.fn().mockResolvedValue({
      apiKeys: [
        { _id: 'key_pacs_1', name: 'PACS DICOM Gateway', prefix: 'fm_live_7x', ipBinding: ['10.0.0.12'] },
      ],
    }),
    getIamPolicies: vi.fn().mockResolvedValue({
      policies: [
        { _id: 'pol_1', name: 'Ward-3 Vitals Policy', type: 'custom', version: 1 },
      ],
    }),
    getIamGroups: vi.fn().mockResolvedValue({
      groups: [{ _id: 'grp_ward3', name: 'Ward-3 Nursing Team', memberIds: ['u_ravi'] }],
    }),
    getIamAccessLog: vi.fn().mockResolvedValue({ entries: [], total: 0 }),
    getIamAccessMetrics: vi.fn().mockResolvedValue({ totalQueries: 42, deniedQueries: 2 }),
    createIamRole: vi.fn().mockResolvedValue({ id: 'role_new_1' }),
    iamSimulate: vi.fn().mockResolvedValue({
      allow: true,
      reason: 'Allowed by policy statement VitalsInWard3',
      obligations: [],
    }),
  },
}));

describe('Document 25 — Specification & Architecture Constants', () => {
  it('defines 7 layered authorization evaluation levels (L0 to L6)', () => {
    expect(IAM_EVALUATION_LAYERS).toHaveLength(7);
    const layers = IAM_EVALUATION_LAYERS.map((l) => l.layer);
    expect(layers).toEqual(['L0', 'L1', 'L2', 'L3', 'L4', 'L5', 'L6']);
    expect(IAM_EVALUATION_LAYERS[0].name).toContain('Platform Guardrails');
    expect(IAM_EVALUATION_LAYERS[1].name).toContain('Tenant Boundary');
    expect(IAM_EVALUATION_LAYERS[2].name).toContain('Identity Policies');
  });

  it('defines 4 critical Segregation of Duties (SoD) conflict rules', () => {
    expect(SOD_RULES).toHaveLength(4);
    const ids = SOD_RULES.map((r) => r.id);
    expect(ids).toContain('SOD_PO_PROCUREMENT');
    expect(ids).toContain('SOD_LAB_VERIFY');
    expect(ids).toContain('SOD_BILLING_REFUND');
    expect(ids).toContain('SOD_PHARMACY_H1');
  });

  it('defines exactly 12 Access Control Center tabs matching Document 25', () => {
    expect(ACCESS_CENTER_TABS).toHaveLength(12);
    const tabIds = ACCESS_CENTER_TABS.map((t) => t.id);
    expect(tabIds).toContain('roles');
    expect(tabIds).toContain('policies');
    expect(tabIds).toContain('teams');
    expect(tabIds).toContain('assignments');
    expect(tabIds).toContain('scopes');
    expect(tabIds).toContain('requests');
    expect(tabIds).toContain('reviews');
    expect(tabIds).toContain('simulator');
    expect(tabIds).toContain('analyzer');
    expect(tabIds).toContain('grants');
    expect(tabIds).toContain('apikeys');
    expect(tabIds).toContain('activity');
  });
});

describe('Document 25 — AccessControl UI Component', () => {
  it('renders Access Control Center shell and main navigation tabs', async () => {
    render(
      <MemoryRouter>
        <AccessControl />
      </MemoryRouter>
    );

    expect(screen.getByText(/Access Control Center/i)).toBeInTheDocument();
    expect(screen.getByText(/AWS-IAM Equivalent/i)).toBeInTheDocument();
    expect(screen.getByText(/Fine-grained hospital access control/i)).toBeInTheDocument();

    // Verify presence of primary tabs
    expect(screen.getByText('Roles & Templates')).toBeInTheDocument();
    expect(screen.getByText('Policies')).toBeInTheDocument();
    expect(screen.getByText('Policy Simulator')).toBeInTheDocument();
    expect(screen.getByText('Access Analyzer')).toBeInTheDocument();
  });

  it('switches to Policy Simulator tab and renders simulation controls', async () => {
    render(
      <MemoryRouter>
        <AccessControl />
      </MemoryRouter>
    );

    const simTab = screen.getByText('Policy Simulator');
    fireEvent.click(simTab);

    await waitFor(() => {
      expect(screen.getByText(/Policy Simulator: "Can X do Y on Z\?"/i)).toBeInTheDocument();
      expect(screen.getByText(/Run Evaluation Simulation/i)).toBeInTheDocument();
    });
  });

  it('switches to Access Analyzer tab and displays SoD risk findings', async () => {
    render(
      <MemoryRouter>
        <AccessControl />
      </MemoryRouter>
    );

    const analyzerTab = screen.getByText('Access Analyzer');
    fireEvent.click(analyzerTab);

    await waitFor(() => {
      expect(screen.getByText(/Total Findings/i)).toBeInTheDocument();
      expect(screen.getByText(/Critical Violations/i)).toBeInTheDocument();
      expect(screen.getByText(/High \/ SoD Violations/i)).toBeInTheDocument();
    });
  });

  it('switches to Policies tab and displays policy management view', async () => {
    render(
      <MemoryRouter>
        <AccessControl />
      </MemoryRouter>
    );

    const policiesTab = screen.getByText('Policies');
    fireEvent.click(policiesTab);

    await waitFor(() => {
      expect(screen.getByText(/Create Access Policy/i)).toBeInTheDocument();
    });
  });
});
