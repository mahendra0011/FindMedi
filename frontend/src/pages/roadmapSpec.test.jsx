/**
 * Document 14 — Implementation Roadmap (Sprint-wise Plan) Test Suite
 * Validating:
 * 1. Phased schedule (R-1, R0, R1, R2, R3, R4) with exit gates & sprint durations
 * 2. Definition of Done (DoD) criteria compliance
 * 3. Initial scope boundaries ("Kya NAHI banana initially")
 * 4. Risk register & mitigations
 * 5. Category rollout phase mapper & readiness checks
 * 6. ProjectsRoadmap UI integration with Phase Filter and Blueprint modal
 */

import '@testing-library/jest-dom/vitest';
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import {
  ROADMAP_PHASES,
  DEFINITION_OF_DONE,
  INITIALLY_EXCLUDED_FEATURES,
  TOP_RISKS_REGISTER,
  getCategoryPhase,
  isCategoryEligibleForPhase,
} from '@/lib/roadmap';
import ProjectsRoadmap from './superadmin/crm/ProjectsRoadmap';

// Mock apiClient for ProjectsRoadmap
vi.mock('@/lib/api', () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue({
      data: {
        projects: [
          {
            id: 'proj-1',
            title: 'Pilot City Dental & AYUSH Launch',
            kind: 'initiative',
            phase: 'R1',
            status: 'in_progress',
            progress: 50,
            targetAt: '2026-12-01',
            externalRef: 'OPS-101',
            notes: 'Launch in Indore with 20 dental clinics',
            decisionLog: [{ decision: 'Cap initial providers to 20', why: 'Ops quality control' }],
          },
          {
            id: 'proj-2',
            title: 'Zero PHI Telemetry Hardening',
            kind: 'release',
            phase: 'R-1',
            status: 'done',
            progress: 100,
            targetAt: '2026-10-30',
            externalRef: 'SEC-404',
          },
        ],
      },
    }),
    post: vi.fn().mockResolvedValue({ data: { id: 'proj-new', status: 'planned' } }),
    patch: vi.fn().mockResolvedValue({ data: { success: true } }),
    delete: vi.fn().mockResolvedValue({ data: { success: true } }),
  },
}));

describe('Document 14 — Implementation Roadmap & Phased Rollout Plan', () => {
  describe('1. Canonical Roadmap Phases & Exit Gates', () => {
    it('defines all 6 canonical phases from R-1 to R4 in sequential order', () => {
      const codes = ROADMAP_PHASES.map((p) => p.code);
      expect(codes).toEqual(['R-1', 'R0', 'R1', 'R2', 'R3', 'R4']);
    });

    it('enforces mandatory exit gates on every phase', () => {
      ROADMAP_PHASES.forEach((phase) => {
        expect(phase.exitGate).toBeTruthy();
        expect(phase.duration).toBeTruthy();
        expect(phase.outcome).toBeTruthy();
        expect(phase.tasks.length).toBeGreaterThan(0);
      });
    });

    it('contains R-1 Security and R0 Dummy Provider exit gate criteria', () => {
      const rMinus1 = ROADMAP_PHASES.find((p) => p.code === 'R-1');
      expect(rMinus1.exitGate).toMatch(/Security P0 completed/i);

      const r0 = ROADMAP_PHASES.find((p) => p.code === 'R0');
      expect(r0.exitGate).toMatch(/Dentist/i);
      expect(r0.exitGate).toMatch(/without writing bespoke code/i);
    });

    it('contains R1 Pilot 95% booking success and R4 Pentest exit gates', () => {
      const r1 = ROADMAP_PHASES.find((p) => p.code === 'R1');
      expect(r1.exitGate).toMatch(/95%/);
      expect(r1.exitGate).toMatch(/Sev-1/);

      const r4 = ROADMAP_PHASES.find((p) => p.code === 'R4');
      expect(r4.exitGate).toMatch(/pentest/i);
      expect(r4.exitGate).toMatch(/DPIA/i);
    });
  });

  describe('2. Definition of Done (DoD) & Scope Boundaries', () => {
    it('enforces all 8 statutory and engineering criteria in Definition of Done', () => {
      expect(DEFINITION_OF_DONE).toHaveLength(8);

      const items = DEFINITION_OF_DONE.map((d) => d.item);
      expect(items).toContain('Specification Review & Accessibility');
      expect(items).toContain('Authorization & Data Isolation');
      expect(items).toContain('Input Validation & PHI Shielding');
      expect(items).toContain('Internationalization (i18n)');
      expect(items).toContain('Automated Test Coverage');
      expect(items).toContain('Rollout Safety & Telemetry');
      expect(items).toContain('Documentation & Playbooks');
      expect(items).toContain('Security & Clinical Sign-off');
    });

    it('defines initial scope boundaries to prevent premature bloat', () => {
      expect(INITIALLY_EXCLUDED_FEATURES.length).toBeGreaterThanOrEqual(5);

      const joined = INITIALLY_EXCLUDED_FEATURES.join(' ');
      expect(joined).toMatch(/24 role dashboards/i);
      expect(joined).toMatch(/native mobile apps/i);
      expect(joined).toMatch(/LiveKit/i);
      expect(joined).toMatch(/R4/i);
    });

    it('includes critical risks with explicit mitigations', () => {
      expect(TOP_RISKS_REGISTER.length).toBeGreaterThanOrEqual(4);
      const scopeRisk = TOP_RISKS_REGISTER.find((r) => r.risk.includes('Scope creep'));
      expect(scopeRisk).toBeDefined();
      expect(scopeRisk.mitigation).toMatch(/exit gates/i);
    });
  });

  describe('3. Category Phase Mapping & Rollout Logic', () => {
    it('maps R1 launch categories correctly', () => {
      expect(getCategoryPhase('dental')).toBe('R1');
      expect(getCategoryPhase('dietitian')).toBe('R1');
      expect(getCategoryPhase('ayush')).toBe('R1');
      expect(getCategoryPhase('diagnostics')).toBe('R1');
      expect(getCategoryPhase('equipment_rental')).toBe('R1');
    });

    it('maps R2 engagement and R3 commerce categories correctly', () => {
      expect(getCategoryPhase('gym')).toBe('R2');
      expect(getCategoryPhase('yoga')).toBe('R2');
      expect(getCategoryPhase('elder_care')).toBe('R2');
      expect(getCategoryPhase('supplements')).toBe('R3');
      expect(getCategoryPhase('devices')).toBe('R3');
    });

    it('maps sensitive and regulated categories strictly to R4', () => {
      expect(getCategoryPhase('ivf')).toBe('R4');
      expect(getCategoryPhase('fertility')).toBe('R4');
      expect(getCategoryPhase('deaddiction')).toBe('R4');
      expect(getCategoryPhase('palliative')).toBe('R4');
      expect(getCategoryPhase('organ_pledge')).toBe('R4');
    });

    it('validates phase eligibility rules sequentially', () => {
      // In R1 phase:
      expect(isCategoryEligibleForPhase('dental', 'R1')).toBe(true);
      expect(isCategoryEligibleForPhase('gym', 'R1')).toBe(false);
      expect(isCategoryEligibleForPhase('ivf', 'R1')).toBe(false);

      // In R2 phase:
      expect(isCategoryEligibleForPhase('dental', 'R2')).toBe(true);
      expect(isCategoryEligibleForPhase('gym', 'R2')).toBe(true);
      expect(isCategoryEligibleForPhase('ivf', 'R2')).toBe(false);

      // In R4 phase:
      expect(isCategoryEligibleForPhase('ivf', 'R4')).toBe(true);
      expect(isCategoryEligibleForPhase('dental', 'R4')).toBe(true);
    });
  });

  describe('4. ProjectsRoadmap UI Integration', () => {
    it('renders ProjectsRoadmap with Phase filter and Roadmap Blueprint trigger', async () => {
      render(
        <MemoryRouter>
          <ProjectsRoadmap />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /Projects & Roadmap/i })).toBeInTheDocument();
      });

      expect(screen.getByTestId('roadmap-blueprint-btn')).toBeInTheDocument();
      expect(screen.getByTestId('roadmap-phase-filter')).toBeInTheDocument();
      expect(screen.getByText(/Pilot City Dental & AYUSH Launch/i)).toBeInTheDocument();
    });

    it('opens the Roadmap Blueprint modal when trigger is clicked', async () => {
      render(
        <MemoryRouter>
          <ProjectsRoadmap />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('roadmap-blueprint-btn')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('roadmap-blueprint-btn'));

      expect(screen.getByTestId('roadmap-blueprint-dialog')).toBeInTheDocument();
      expect(screen.getByText(/FindMedi Implementation Roadmap & Governance Blueprint/i)).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /Phases & Gates/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /Definition of Done/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /Scope Boundaries/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /Risk Register/i })).toBeInTheDocument();
    });
  });
});
