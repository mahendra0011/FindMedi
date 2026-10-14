/**
 * Document 18 — QA & Test Plan (incl. UAT) Test Suite
 * Validating:
 * 1. Test pyramid mix (50% Unit, 25% Integration, 15% Contract, 10% E2E)
 * 2. 14 Critical E2E Journeys with P0/P1 priorities & pass criteria
 * 3. Non-functional performance p95 benchmarks & fail-closed resilience
 * 4. Clinical safety red-flag triage detection & emergency escalation
 * 5. Release readiness evaluator logic (Sev-1/Sev-2 blocking, clinical signoff)
 * 6. ProjectsRoadmap UI integration with QA Release Gates modal & interactive console
 */

import '@testing-library/jest-dom/vitest';
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import {
  TEST_PYRAMID,
  TEST_ENVIRONMENTS,
  CRITICAL_E2E_JOURNEYS,
  FEATURE_TEST_MATRICES,
  NON_FUNCTIONAL_TRACKS,
  CLINICAL_SAFETY_QA,
  DEFECT_SEVERITIES,
  QA_RELEASE_CHECKLIST,
  validateReleaseReadiness,
  getRedFlagEscalation,
  checkPerformanceBenchmark,
  getDefectSla,
} from '@/lib/qaTestPlan';
import ProjectsRoadmap from './superadmin/crm/ProjectsRoadmap';

// Mock apiClient for ProjectsRoadmap
vi.mock('@/lib/api', () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue({
      data: {
        projects: [
          {
            id: 'proj-1',
            title: 'E2E Test Automation Track',
            kind: 'initiative',
            phase: 'R0',
            status: 'in_progress',
            progress: 60,
            targetAt: '2026-11-15',
            externalRef: 'QA-201',
          },
        ],
      },
    }),
    post: vi.fn().mockResolvedValue({ data: { id: 'proj-new', status: 'planned' } }),
    patch: vi.fn().mockResolvedValue({ data: { success: true } }),
    delete: vi.fn().mockResolvedValue({ data: { success: true } }),
  },
}));

describe('Document 18: QA & Test Plan Specification & Helpers', () => {
  it('defines the canonical Test Pyramid with targets totaling 100%', () => {
    expect(TEST_PYRAMID).toHaveProperty('unit');
    expect(TEST_PYRAMID).toHaveProperty('integration');
    expect(TEST_PYRAMID).toHaveProperty('contractAndAuthz');
    expect(TEST_PYRAMID).toHaveProperty('e2e');

    const totalShare = Object.values(TEST_PYRAMID).reduce(
      (acc, curr) => acc + curr.targetSharePct,
      0
    );
    expect(totalShare).toBe(100);
    expect(TEST_PYRAMID.unit.targetSharePct).toBe(50);
    expect(TEST_PYRAMID.integration.targetSharePct).toBe(25);
    expect(TEST_PYRAMID.contractAndAuthz.targetSharePct).toBe(15);
    expect(TEST_PYRAMID.e2e.targetSharePct).toBe(10);
  });

  it('contains all 14 Critical E2E Journeys with valid step workflows and pass criteria', () => {
    expect(CRITICAL_E2E_JOURNEYS).toHaveLength(14);

    const ids = CRITICAL_E2E_JOURNEYS.map((j) => j.id);
    expect(ids).toContain('E2E-01');
    expect(ids).toContain('E2E-02');
    expect(ids).toContain('E2E-03');
    expect(ids).toContain('E2E-04');
    expect(ids).toContain('E2E-05');
    expect(ids).toContain('E2E-06');
    expect(ids).toContain('E2E-07');
    expect(ids).toContain('E2E-08');
    expect(ids).toContain('E2E-09');
    expect(ids).toContain('E2E-10');
    expect(ids).toContain('E2E-11');
    expect(ids).toContain('E2E-12');
    expect(ids).toContain('E2E-13');
    expect(ids).toContain('E2E-14');

    for (const journey of CRITICAL_E2E_JOURNEYS) {
      expect(journey.steps.length).toBeGreaterThanOrEqual(3);
      expect(journey.passCriteria.length).toBeGreaterThan(10);
      expect(['P0', 'P1', 'P2']).toContain(journey.priority);
    }
  });

  it('specifies fail-closed resilience and performance benchmarks', () => {
    const benchmarks = NON_FUNCTIONAL_TRACKS.performance.benchmarks;
    expect(benchmarks.length).toBeGreaterThanOrEqual(4);
    const searchBm = benchmarks.find((b) => b.metric.includes('Search'));
    expect(searchBm?.targetP95Ms).toBe(500);

    const principles = NON_FUNCTIONAL_TRACKS.resilienceAndChaos.principles;
    expect(principles.some((p) => p.includes('Fail-closed') && p.includes('ClamAV'))).toBe(true);
    expect(principles.some((p) => p.includes('emergency directory'))).toBe(true);
  });

  it('specifies Clinical Safety QA with red-flag symptoms and escalation guidance', () => {
    expect(CLINICAL_SAFETY_QA.redFlagKeywords.length).toBeGreaterThanOrEqual(4);
    const symptoms = CLINICAL_SAFETY_QA.redFlagKeywords.map((r) => r.symptom.toLowerCase());
    expect(symptoms.some((s) => s.includes('chest pain'))).toBe(true);
    expect(symptoms.some((s) => s.includes('stroke'))).toBe(true);
    expect(symptoms.some((s) => s.includes('suicid'))).toBe(true);
    expect(symptoms.some((s) => s.includes('bleeding'))).toBe(true);
  });

  it('evaluates release readiness accurately via validateReleaseReadiness', () => {
    // Clean candidate passes
    const clean = validateReleaseReadiness({
      openSev1Count: 0,
      openSev2Count: 0,
      criticalE2ePassing: true,
      clinicalAdvisorSignoff: true,
    });
    expect(clean.canRelease).toBe(true);
    expect(clean.blockers).toHaveLength(0);

    // Sev-1 blocks release
    const blockedSev1 = validateReleaseReadiness({ openSev1Count: 1 });
    expect(blockedSev1.canRelease).toBe(false);
    expect(blockedSev1.blockers.some((b) => b.includes('Sev-1'))).toBe(true);

    // Sev-2 blocks release
    const blockedSev2 = validateReleaseReadiness({ openSev2Count: 2 });
    expect(blockedSev2.canRelease).toBe(false);
    expect(blockedSev2.blockers.some((b) => b.includes('Sev-2'))).toBe(true);

    // Missing Clinical Sign-Off blocks release
    const blockedClinical = validateReleaseReadiness({ clinicalAdvisorSignoff: false });
    expect(blockedClinical.canRelease).toBe(false);
    expect(blockedClinical.blockers.some((b) => b.includes('Clinical Safety Advisor'))).toBe(true);
  });

  it('detects emergency symptoms via getRedFlagEscalation', () => {
    const emergency = getRedFlagEscalation('Patient complains of severe chest pain and left arm numbness');
    expect(emergency.isEmergency).toBe(true);
    expect(emergency.urgency).toBe('CRITICAL');
    expect(emergency.action).toBe('HALT_BOT_AND_ESCALATE_EMERGENCY');

    const normal = getRedFlagEscalation('Want to schedule general physician appointment');
    expect(normal.isEmergency).toBe(false);
    expect(normal.action).toBe('PROCEED_STANDARD_TRIAGE');
  });
});

describe('ProjectsRoadmap UI — QA & Release Gates Integration', () => {
  it('renders the QA & Release Gates button and opens modal with all tabs', async () => {
    render(
      <MemoryRouter>
        <ProjectsRoadmap />
      </MemoryRouter>
    );

    // Verify button rendered
    const qaBtn = await screen.findByTestId('qa-release-gates-btn');
    expect(qaBtn).toBeInTheDocument();
    expect(qaBtn).toHaveTextContent(/QA & Release Gates/i);

    // Click button to open modal
    fireEvent.click(qaBtn);

    // Modal dialog is displayed
    const dialog = await screen.findByTestId('qa-release-dialog');
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText(/QA & Test Plan \(incl\. UAT & Clinical Safety\)/i)).toBeInTheDocument();

    // Verify all 5 specification tabs exist
    expect(screen.getByRole('tab', { name: /E2E Journeys/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Test Pyramid/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Non-Functional/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Clinical Safety/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Release Readiness/i })).toBeInTheDocument();

    // Default tab shows E2E journeys
    expect(screen.getByText(/Patient Discovery to In-Person Booking & Payment/i)).toBeInTheDocument();
    expect(screen.getByText(/Teleconsultation \/ Video Consult & E-Prescription/i)).toBeInTheDocument();
    expect(screen.getByText(/Emergency SOS Broadcast & Fallback Numbers/i)).toBeInTheDocument();
  });
});
