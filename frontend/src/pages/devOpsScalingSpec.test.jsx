/**
 * Document 19 — DevOps, Scaling & Cost Plan Test Suite
 * Validating:
 * 1. Stage-wise infrastructure (S0 to S3) with core S0 stack & deferred pieces
 * 2. Environment topology & strict zero-PHI rule
 * 3. Starter SLO targets & interactive compliance evaluator
 * 4. Page vs Ticket alert classifications & 7 SRE runbooks
 * 5. Cost model & Cost per 1,000 Bookings calculator
 * 6. ProjectsRoadmap UI integration with DevOps modal & interactive calculator
 */

import '@testing-library/jest-dom/vitest';
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import {
  INFRA_STAGES,
  ENV_TOPOLOGY,
  CI_CD_PIPELINE,
  SLO_DEFINITIONS,
  ALERTING_RULES,
  COST_BUCKETS,
  DISASTER_RECOVERY_TIERS,
  SRE_RUNBOOKS,
  HARDENING_GUARDRAILS,
  calculateCostPerThousandBookings,
  evaluateSloCompliance,
  getAlertRunbookGuide,
} from '@/lib/devOpsScaling';
import ProjectsRoadmap from './superadmin/crm/ProjectsRoadmap';

// Mock apiClient for ProjectsRoadmap
vi.mock('@/lib/api', () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue({
      data: {
        projects: [
          {
            id: 'proj-1',
            title: 'S0 Production Core Stack Launch',
            kind: 'initiative',
            phase: 'R-1',
            status: 'in_progress',
            progress: 80,
            targetAt: '2026-11-01',
            externalRef: 'DEVOPS-101',
          },
        ],
      },
    }),
    post: vi.fn().mockResolvedValue({ data: { id: 'proj-new', status: 'planned' } }),
    patch: vi.fn().mockResolvedValue({ data: { success: true } }),
    delete: vi.fn().mockResolvedValue({ data: { success: true } }),
  },
}));

describe('Document 19: DevOps, Scaling & Cost Plan Spec & Helpers', () => {
  it('defines 4 infrastructure stages from S0 Pilot to S3 Enterprise', () => {
    expect(INFRA_STAGES.S0_PILOT).toBeDefined();
    expect(INFRA_STAGES.S1_GROWTH).toBeDefined();
    expect(INFRA_STAGES.S2_SCALE).toBeDefined();
    expect(INFRA_STAGES.S3_ENTERPRISE).toBeDefined();

    // S0 skips heavy streaming/clustering
    expect(INFRA_STAGES.S0_PILOT.skipForNow).toContain('Full Kubernetes k8s cluster (avoid unnecessary ops complexity until multi-city scale)');
    expect(INFRA_STAGES.S0_PILOT.skipForNow).toContain('Self-hosted Apache Kafka (use BullMQ over Redis instead)');

    // S0 recommends Mongo Atlas, Redis, Cloudinary, LiveKit, Cloudflare
    const stackStr = INFRA_STAGES.S0_PILOT.recommendedStack.join(' ');
    expect(stackStr).toContain('MongoDB Atlas');
    expect(stackStr).toContain('Redis');
    expect(stackStr).toContain('Cloudflare');
    expect(stackStr).toContain('LiveKit Cloud');
  });

  it('enforces zero-PHI staging and lower environment data safety', () => {
    expect(ENV_TOPOLOGY.staging.data).toContain('Strictly synthetic/anonymized');
    expect(ENV_TOPOLOGY.staging.data).toContain('never real production PHI');
    expect(ENV_TOPOLOGY.dataSafetyPrinciple).toContain('STRICT: Under no circumstances should real production PHI or PII ever be transferred');
  });

  it('configures 6 Starter SLOs with availability, success, and latency targets', () => {
    expect(SLO_DEFINITIONS.apiAvailability.targetPct).toBe(99.9);
    expect(SLO_DEFINITIONS.bookingSuccess.targetPct).toBe(98.0);
    expect(SLO_DEFINITIONS.paymentSuccess.targetPct).toBe(97.0);
    expect(SLO_DEFINITIONS.searchLatency.targetP95Ms).toBe(500);
    expect(SLO_DEFINITIONS.notificationDelivery.targetPct).toBe(99.0);
    expect(SLO_DEFINITIONS.sosAvailability.targetPct).toBe(99.95);
  });

  it('evaluates SLO compliance accurately for percentage and latency metrics', () => {
    // API availability target: >= 99.9%
    expect(evaluateSloCompliance('apiAvailability', 99.95).compliant).toBe(true);
    expect(evaluateSloCompliance('apiAvailability', 99.8).compliant).toBe(false);

    // Search latency target: <= 500ms
    expect(evaluateSloCompliance('searchLatency', 350).compliant).toBe(true);
    expect(evaluateSloCompliance('searchLatency', 550).compliant).toBe(false);
  });

  it('classifies Page vs Ticket alerts and links to executable SRE runbooks', () => {
    expect(ALERTING_RULES.pageAlerts.length).toBeGreaterThanOrEqual(8);
    expect(ALERTING_RULES.ticketAlerts.length).toBeGreaterThanOrEqual(6);

    const guidePage = getAlertRunbookGuide('PAGE-01');
    expect(guidePage.found).toBe(true);
    expect(guidePage.type).toBe('PAGE');

    const guideTicket = getAlertRunbookGuide('TCK-01');
    expect(guideTicket.found).toBe(true);
    expect(guideTicket.type).toBe('TICKET');
    expect(guideTicket.runbook.id).toBe('RB-02');
  });

  it('calculates Cost per 1,000 Bookings accurately and avoids divide-by-zero', () => {
    const costs = {
      compute: 20000,
      database: 10000,
      search: 5000,
      cacheAndQueue: 5000,
      objectStorage: 5000,
      messaging: 10000,
      video: 5000,
      maps: 2000,
      payments: 3000,
      verification: 5000,
      observability: 5000,
      operations: 25000,
    };

    const res = calculateCostPerThousandBookings(costs, 2000);
    expect(res.totalMonthlyCost).toBe(100000);
    expect(res.costPerBooking).toBe(50.0);
    expect(res.costPerThousandBookings).toBe(50000.0);

    const zeroRes = calculateCostPerThousandBookings(costs, 0);
    expect(zeroRes.costPerBooking).toBe(0);
    expect(zeroRes.costPerThousandBookings).toBe(0);
  });

  it('defines 7 executable SRE Runbooks covering credentials, failover, queues, webhooks, breaches, and restore drills', () => {
    expect(SRE_RUNBOOKS).toHaveLength(7);
    const ids = SRE_RUNBOOKS.map((r) => r.id);
    expect(ids).toEqual(['RB-01', 'RB-02', 'RB-03', 'RB-04', 'RB-05', 'RB-06', 'RB-07']);

    const certIn = SRE_RUNBOOKS.find((r) => r.id === 'RB-06');
    expect(certIn.title).toContain('CERT-In 6-Hour');
    expect(certIn.severity).toBe('Sev-1');

    const restoreDrill = SRE_RUNBOOKS.find((r) => r.id === 'RB-07');
    expect(restoreDrill.title).toContain('restore-drill.sh');
  });
});

describe('ProjectsRoadmap UI — DevOps, Scaling & Cost Console Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the DevOps & Cost Plan button and opens modal with all tabs', async () => {
    render(
      <MemoryRouter>
        <ProjectsRoadmap />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('devops-scaling-btn')).toBeInTheDocument();
    });

    // Open DevOps console modal
    fireEvent.click(screen.getByTestId('devops-scaling-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('devops-scaling-modal')).toBeInTheDocument();
    });

    // Verify tabs exist
    expect(screen.getByTestId('tab-stages')).toBeInTheDocument();
    expect(screen.getByTestId('tab-pipeline')).toBeInTheDocument();
    expect(screen.getByTestId('tab-slos')).toBeInTheDocument();
    expect(screen.getByTestId('tab-alerts')).toBeInTheDocument();
    expect(screen.getByTestId('tab-costs')).toBeInTheDocument();
    expect(screen.getByTestId('tab-runbooks')).toBeInTheDocument();

    // Verify S0 Pilot stage content on first tab
    expect(screen.getByText('S0 — Pilot (R-1 / R1)')).toBeInTheDocument();
    expect(screen.getByText(/Keep advanced streaming and analytics behind feature flags/i)).toBeInTheDocument();
    expect(screen.getByText('S1 — Growth')).toBeInTheDocument();
    expect(screen.getByText('S2 — Scale')).toBeInTheDocument();
    expect(screen.getByText('S3 — Enterprise')).toBeInTheDocument();
  });
});
