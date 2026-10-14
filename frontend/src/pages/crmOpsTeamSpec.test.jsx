/**
 * Document 24 — Ops CRM & Team Management Test Suite
 * Validating:
 * 1. 13 Super Admin CRM Navigation Modules
 * 2. Hybrid Build vs Buy Blueprint & External Tool Guardrails
 * 3. 10 Supply Pipeline Stages, SLAs, Exit Criteria & Lost Reasons
 * 4. Institutional Partnerships Pipeline Stages
 * 5. Lead Priority Score (0-100) & Provider Composite Health Score (0-100) Calculations
 * 6. Role-Based Quantity + Quality KPI Scorecards for 8 Operational Roles
 * 7. 12 Event-Driven Platform CRM Automations & Anti-PHI Privacy Guardrails
 * 8. ProjectsRoadmap UI Integration (Interactive Modal, 5 Tabs, Nav Modules & Blueprint)
 */

import '@testing-library/jest-dom/vitest';
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import {
  CRM_NAV_MODULES,
  HYBRID_ARCHITECTURE_DECISION,
  SUPPLY_PIPELINE_STAGES,
  LOST_REASONS,
  PARTNERSHIP_STAGES,
  LEAD_SCORING_WEIGHTS,
  PROVIDER_HEALTH_WEIGHTS,
  ROLE_BASED_KPIS,
  AUTOMATION_WORKFLOW_RULES,
  CRM_ROLE_PERMISSIONS_MATRIX,
  calculateLeadScore,
  calculateProviderHealthScore,
} from '@/lib/crmOpsTeam';
import ProjectsRoadmap from './superadmin/crm/ProjectsRoadmap';

// Mock apiClient for ProjectsRoadmap
vi.mock('@/lib/api', () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue({
      data: {
        projects: [
          {
            id: 'proj-ops-1',
            title: 'Ops CRM & Team Management Cockpit',
            kind: 'initiative',
            phase: 'F2',
            status: 'in_progress',
            progress: 90,
            targetAt: '2026-12-31',
            externalRef: 'CRM-2026',
          },
        ],
      },
    }),
    post: vi.fn().mockResolvedValue({ data: { id: 'proj-new', status: 'planned' } }),
    patch: vi.fn().mockResolvedValue({ data: { success: true } }),
    delete: vi.fn().mockResolvedValue({ data: { success: true } }),
  },
}));

describe('Document 24: Ops CRM & Team Management Specification Library', () => {
  it('defines the complete 13 CRM Navigation Modules for Super Admin', () => {
    expect(CRM_NAV_MODULES).toHaveLength(13);

    const ids = CRM_NAV_MODULES.map((m) => m.id);
    expect(ids).toEqual([
      'command_center',
      'supply_pipeline',
      'accounts_360',
      'partnerships',
      'field_ops',
      'tasks_followups',
      'campaigns_camps',
      'team_management',
      'goals_okrs',
      'projects_roadmap',
      'playbooks_knowledge',
      'reports',
      'crm_settings',
    ]);

    for (const m of CRM_NAV_MODULES) {
      expect(m.title).toBeTruthy();
      expect(m.path).toContain('/superadmin/crm/');
      expect(m.coreMetric).toBeTruthy();
    }
  });

  it('defines the Hybrid Build vs Buy architecture and external tool security rules', () => {
    expect(HYBRID_ARCHITECTURE_DECISION.approach).toContain('Hybrid');
    expect(HYBRID_ARCHITECTURE_DECISION.buildInHouse).toHaveLength(6);
    expect(HYBRID_ARCHITECTURE_DECISION.buyOrIntegrate).toHaveLength(4);
    expect(HYBRID_ARCHITECTURE_DECISION.externalToolGuardrails).toHaveLength(5);

    // Strict zero-PHI rule
    expect(HYBRID_ARCHITECTURE_DECISION.externalToolGuardrails[0]).toContain('Zero PHI');
  });

  it('defines the 10 Supply Pipeline stages with exit criteria and SLAs', () => {
    expect(SUPPLY_PIPELINE_STAGES).toHaveLength(10);
    expect(SUPPLY_PIPELINE_STAGES[0].stage).toBe('identified');
    expect(SUPPLY_PIPELINE_STAGES[1].stage).toBe('contacted');
    expect(SUPPLY_PIPELINE_STAGES[1].slaDays).toBe(2);
    expect(SUPPLY_PIPELINE_STAGES[8].stage).toBe('activated');
    expect(SUPPLY_PIPELINE_STAGES[8].slaDays).toBe(14);
    expect(SUPPLY_PIPELINE_STAGES[9].stage).toBe('active');

    // 9 mandatory lost reasons
    expect(LOST_REASONS).toHaveLength(9);
    expect(LOST_REASONS).toContain('NOT_INTERESTED');
    expect(LOST_REASONS).toContain('FEE_COMMISSION_CONCERN');
    expect(LOST_REASONS).toContain('UNVERIFIABLE_DOCUMENTS');
  });

  it('defines the 9 Institutional Partnerships stages', () => {
    expect(PARTNERSHIP_STAGES).toHaveLength(9);
    expect(PARTNERSHIP_STAGES[0].stage).toBe('identified');
    expect(PARTNERSHIP_STAGES[4].stage).toBe('mou_signed');
    expect(PARTNERSHIP_STAGES[6].stage).toBe('active');
  });

  it('pairs Quantity with Quality KPIs across 8 operational roles to prevent gaming', () => {
    expect(ROLE_BASED_KPIS).toHaveLength(8);

    const roles = ROLE_BASED_KPIS.map((r) => r.role);
    expect(roles).toEqual([
      'field_executive',
      'provider_success',
      'kyc_reviewer',
      'support_agent',
      'camps_lead',
      'city_manager',
      'finance_ops',
      'trust_safety',
    ]);

    for (const rk of ROLE_BASED_KPIS) {
      expect(rk.quantityKpis.length).toBeGreaterThan(0);
      expect(rk.qualityKpis.length).toBeGreaterThan(0);
    }
  });

  it('defines 12 Event-Driven Platform Automations with SLA hour targets', () => {
    expect(AUTOMATION_WORKFLOW_RULES).toHaveLength(12);
    expect(AUTOMATION_WORKFLOW_RULES[0].id).toBe('AUTO-01');
    expect(AUTOMATION_WORKFLOW_RULES[0].trigger).toContain('New lead created');
    expect(AUTOMATION_WORKFLOW_RULES[11].id).toBe('AUTO-12');
    expect(AUTOMATION_WORKFLOW_RULES[11].trigger).toContain('churned');
  });

  it('calculates Lead Priority Score (0-100) accurately', () => {
    const perfectScore = calculateLeadScore({
      isPriorityCategory: true,
      estDailyFootfall: 45,
      hasDirectDecisionMakerAccess: true,
      isDigitallyReady: true,
      isCloseToCluster: true,
      hasFastResponse: true,
      hasDocsReady: true,
    });
    expect(perfectScore).toBe(100);

    const partialScore = calculateLeadScore({
      isPriorityCategory: true,
      estDailyFootfall: 20,
      hasDirectDecisionMakerAccess: true,
      isDigitallyReady: false,
    });
    expect(partialScore).toBe(52);

    expect(calculateLeadScore({})).toBe(0);
  });

  it('calculates Provider Composite Health Score (0-100) and bands', () => {
    const healthy = calculateProviderHealthScore({
      monthlyBookings: 80,
      prevMonthlyBookings: 60,
      averageRating: 4.9,
      avgResponseMinutes: 10,
      cancellationRatePercent: 1.0,
      profileCompletenessPercent: 100,
      daysUntilDocExpiry: 150,
      openDisputesCount: 0,
    });
    expect(healthy.score).toBeGreaterThanOrEqual(75);
    expect(healthy.healthBand).toBe('healthy');
    expect(healthy.isHealthy).toBe(true);

    const watch = calculateProviderHealthScore({
      monthlyBookings: 30,
      prevMonthlyBookings: 45,
      averageRating: 4.1,
      avgResponseMinutes: 40,
      cancellationRatePercent: 5,
      profileCompletenessPercent: 80,
      daysUntilDocExpiry: 40,
      openDisputesCount: 1,
    });
    expect(watch.score).toBeGreaterThanOrEqual(50);
    expect(watch.score).toBeLessThan(75);
    expect(watch.healthBand).toBe('watch');

    const atRisk = calculateProviderHealthScore({
      monthlyBookings: 2,
      prevMonthlyBookings: 20,
      averageRating: 3.0,
      avgResponseMinutes: 150,
      cancellationRatePercent: 15,
      profileCompletenessPercent: 60,
      daysUntilDocExpiry: 10,
      openDisputesCount: 2,
    });
    expect(atRisk.score).toBeLessThan(50);
    expect(atRisk.healthBand).toBe('at_risk');
    expect(atRisk.isAtRisk).toBe(true);
  });
});

describe('Document 24: Ops CRM & Team Management UI Integration in ProjectsRoadmap', () => {
  it('renders the Ops CRM & Team Spec button and opens modal with all 5 tabs and default modules view', async () => {
    render(
      <MemoryRouter>
        <ProjectsRoadmap />
      </MemoryRouter>
    );

    // Wait for initial page load
    await waitFor(() => {
      expect(screen.getByText('Projects & Roadmap')).toBeInTheDocument();
    });

    const crmBtn = screen.getByTestId('ops-team-spec-btn');
    expect(crmBtn).toBeInTheDocument();
    fireEvent.click(crmBtn);

    // Verify modal dialog is opened
    await waitFor(() => {
      expect(screen.getByTestId('ops-team-spec-modal')).toBeInTheDocument();
      expect(screen.getByText(/Ops CRM & Team Management Specification/i)).toBeInTheDocument();
    });

    // Verify all 5 tabs exist in modal header
    expect(screen.getByTestId('crm-tab-modules')).toBeInTheDocument();
    expect(screen.getByTestId('crm-tab-pipeline')).toBeInTheDocument();
    expect(screen.getByTestId('crm-tab-scoring')).toBeInTheDocument();
    expect(screen.getByTestId('crm-tab-team')).toBeInTheDocument();
    expect(screen.getByTestId('crm-tab-automation')).toBeInTheDocument();

    // Verify summary metric cards in default tab
    expect(screen.getByText('13 Dedicated')).toBeInTheDocument();
    expect(screen.getByText('Hybrid')).toBeInTheDocument();
    expect(screen.getByText('Zero (Banned)')).toBeInTheDocument();
    expect(screen.getByText('TeamMember')).toBeInTheDocument();

    // Verify 13 navigation module cards in default tab
    expect(screen.getByTestId('crm-nav-card-command_center')).toBeInTheDocument();
    expect(screen.getByTestId('crm-nav-card-supply_pipeline')).toBeInTheDocument();
    expect(screen.getByTestId('crm-nav-card-accounts_360')).toBeInTheDocument();
    expect(screen.getByTestId('crm-nav-card-field_ops')).toBeInTheDocument();
    expect(screen.getByTestId('crm-nav-card-crm_settings')).toBeInTheDocument();

    // Verify Hybrid Build vs Buy Blueprint section
    expect(screen.getByText(/Hybrid Build vs Buy Blueprint/i)).toBeInTheDocument();
    expect(screen.getByText(/Build In-House/i)).toBeInTheDocument();
    expect(screen.getByText(/Buy \/ Use Existing Tools/i)).toBeInTheDocument();
  });
});
