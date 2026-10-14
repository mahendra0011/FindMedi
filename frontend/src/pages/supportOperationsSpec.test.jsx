/**
 * Document 20 — Support & Operations Playbooks Test Suite
 * Validating:
 * 1. Tiered Operating Model (Tier 0 Self-serve to Tier 3 Leadership)
 * 2. 17 Core SOPs spanning booking issues, wrong drug, safety SOS, crisis, DSR, outage
 * 3. Channel SLAs & Immediate (≤ 5 mins) Emergency SOS priority
 * 4. Sev-1 to Sev-4 Escalation Matrix & SLA cadences
 * 5. Pilot City S0 Staffing Model & Growth Triggers
 * 6. Pre-approved Communication Templates (incl. Tele-MANAS crisis script)
 * 7. ProjectsRoadmap UI Integration with Support & Ops console modal
 */

import '@testing-library/jest-dom/vitest';
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import {
  OPERATING_MODEL,
  SUPPORT_CHANNELS_SLAS,
  TICKET_TAXONOMY,
  CORE_SOPS,
  ESCALATION_MATRIX,
  STAFFING_MODEL,
  COMMUNICATION_TEMPLATES,
  OPS_LAUNCH_CHECKLIST,
  getSopDetails,
  routeSupportTicket,
  renderCommunicationTemplate,
} from '@/lib/supportOperations';
import ProjectsRoadmap from './superadmin/crm/ProjectsRoadmap';

// Mock apiClient for ProjectsRoadmap
vi.mock('@/lib/api', () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue({
      data: {
        projects: [
          {
            id: 'proj-1',
            title: 'Support Desk 24x7 Coverage Initiative',
            kind: 'initiative',
            phase: 'R0',
            status: 'in_progress',
            progress: 75,
            targetAt: '2026-11-20',
            externalRef: 'OPS-301',
          },
        ],
      },
    }),
    post: vi.fn().mockResolvedValue({ data: { id: 'proj-new', status: 'planned' } }),
    patch: vi.fn().mockResolvedValue({ data: { success: true } }),
    delete: vi.fn().mockResolvedValue({ data: { success: true } }),
  },
}));

describe('Document 20: Support & Operations Playbooks Spec & Helpers', () => {
  it('defines the 4-tiered Operating Model and 9 functional teams', () => {
    expect(OPERATING_MODEL.tiers).toHaveLength(4);
    expect(OPERATING_MODEL.tiers[0].tier).toContain('Tier 0');
    expect(OPERATING_MODEL.tiers[3].tier).toContain('Tier 3');

    expect(OPERATING_MODEL.teams).toHaveLength(9);
    const teamNames = OPERATING_MODEL.teams.map((t) => t.name);
    expect(teamNames).toContain('Patient Support');
    expect(teamNames).toContain('Trust & Safety / Moderation');
    expect(teamNames).toContain('Clinical Advisor');
  });

  it('defines 17 Core SOPs with triggers and resolution steps', () => {
    expect(CORE_SOPS).toHaveLength(17);
    const ids = CORE_SOPS.map((s) => s.id);
    expect(ids).toContain('SOP-01'); // Provider No-Show
    expect(ids).toContain('SOP-04'); // Pharmacy wrong drug
    expect(ids).toContain('SOP-05'); // Home visit safety
    expect(ids).toContain('SOP-06'); // Mental health crisis
    expect(ids).toContain('SOP-12'); // DPDP DSR
    expect(ids).toContain('SOP-15'); // Payouts & reconciliation
    expect(ids).toContain('SOP-17'); // Outage & degraded mode
  });

  it('enforces immediate (≤ 5 mins) SLA for emergency and life-safety issues', () => {
    expect(SUPPORT_CHANNELS_SLAS.safetyAndSos.firstResponseSla).toContain('Immediate');
    expect(SUPPORT_CHANNELS_SLAS.priorityQueueOrder[0]).toContain('Safety / SOS');
  });

  it('classifies Sev-1 to Sev-4 severity levels with response cadences', () => {
    expect(ESCALATION_MATRIX.SEV_1).toBeDefined();
    expect(ESCALATION_MATRIX.SEV_1.responseCadence).toContain('Immediate response');
    expect(ESCALATION_MATRIX.SEV_2.responseCadence).toContain('≤ 1 hour');
    expect(ESCALATION_MATRIX.SEV_3.responseCadence).toContain('≤ 1 business day');
  });

  it('provides a Pilot S0 Staffing Model and expansion triggers', () => {
    expect(STAFFING_MODEL.pilotCityS0.teamAllocation.length).toBeGreaterThanOrEqual(8);
    expect(STAFFING_MODEL.growthTriggers.length).toBeGreaterThanOrEqual(4);
  });

  it('routes tickets and renders communication templates accurately', () => {
    const emergencyRoute = routeSupportTicket('Any query', true);
    expect(emergencyRoute.severity).toBe('Sev-1');
    expect(emergencyRoute.isEmergency).toBe(true);

    const normalRoute = routeSupportTicket('Pharmacy & Medicine Orders', false);
    expect(normalRoute.severity).toBe('Sev-2');
    expect(normalRoute.routingQueue).toContain('Pharmacy Partner');

    const rendered = renderCommunicationTemplate('crisisOutreach', {
      userName: 'Amit',
      agentName: 'Neha',
    });
    expect(rendered.success).toBe(true);
    expect(rendered.renderedText).toContain('Tele-MANAS');
    expect(rendered.renderedText).toContain('14416');
  });
});

describe('ProjectsRoadmap UI — Support & Operations Console Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the Support & Ops Playbooks button and opens modal with all tabs', async () => {
    render(
      <MemoryRouter>
        <ProjectsRoadmap />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('support-ops-btn')).toBeInTheDocument();
    });

    // Open Support Ops console modal
    fireEvent.click(screen.getByTestId('support-ops-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('support-ops-modal')).toBeInTheDocument();
    });

    // Verify all 6 tabs exist
    expect(screen.getByTestId('tab-sops')).toBeInTheDocument();
    expect(screen.getByTestId('tab-model')).toBeInTheDocument();
    expect(screen.getByTestId('tab-slas')).toBeInTheDocument();
    expect(screen.getByTestId('tab-matrix')).toBeInTheDocument();
    expect(screen.getByTestId('tab-staffing')).toBeInTheDocument();
    expect(screen.getByTestId('tab-templates')).toBeInTheDocument();

    // Verify SOP cards rendered on first tab
    expect(screen.getByTestId('sop-card-SOP-01')).toBeInTheDocument();
    expect(screen.getByTestId('sop-card-SOP-06')).toBeInTheDocument();
    expect(screen.getByText(/Provider No-Show, Late Arrival or Sudden Cancellation/i)).toBeInTheDocument();
    expect(screen.getByText(/Mental Health Crisis & Self-Harm Keyword Escalation/i)).toBeInTheDocument();
  });
});
