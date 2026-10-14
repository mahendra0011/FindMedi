import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react';
import OnboardingMetrics from './OnboardingMetrics';
import { api } from '@/lib/api';

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
  },
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const STEP_0 = { index: 0, key: 'basics', label: 'Basics', reached: 110, dropOff: 50, pctReached: 1, pctDropped: 0.4545 };
const STEP_1 = { index: 1, key: 'documents', label: 'Documents', reached: 60, dropOff: 60, pctReached: 0.5455, pctDropped: 1 };

const FIXTURE = {
  generatedAt: '2026-10-13T10:00:00.000Z',
  sample: { applicationsAnalyzed: 120, truncated: false, maxRows: 20000 },
  funnel: {
    visit: 500,
    start: 120,
    submit: 60,
    approved: 30,
    rates: { startPerVisit: 0.24, submitPerStart: 0.5, approvedPerSubmit: 0.5 },
    meta: {
      visitSource: 'http counter source',
      submittedDefinition: 'submittedAt set, or status past draft',
    },
  },
  dropOff: {
    byType: [
      {
        typeKey: 'diagnostics_lab',
        label: 'Diagnostics Lab',
        group: 'diagnostics',
        tier: 'basic',
        total: 120,
        neverStarted: 10,
        steps: [STEP_0, STEP_1],
      },
    ],
    pooled: { stepCount: 2, mapped: 120, started: 110, neverStarted: 10, steps: [STEP_0, STEP_1] },
    unmappedApplications: 3,
  },
  reviewTime: { count: 40, avgMs: 7_200_000, avgHours: 2, p50Ms: 3_600_000 },
  rejections: {
    total: 2,
    histogram: [{ reason: 'PAN mismatch', count: 2, pct: 1 }],
  },
  docResubmission: {
    rate: 0.25,
    resubmittedDocuments: 4,
    totalDocuments: 16,
    applicationRate: 0.3333,
    resubmittedApplications: 10,
    submittedApplications: 30,
  },
  profileCompleteness: {
    threshold: 0.8,
    measured: 100,
    complete: 70,
    pctComplete: 0.7,
    avgCompleteness: 0.62,
    definition: 'share of the provider type wizard steps with saved data, per application',
  },
};

describe('OnboardingMetrics page (2.md 13 funnel dashboard)', () => {
  it('fetches /onboarding-metrics and renders funnel, drop-off and rejection numbers', async () => {
    api.get.mockResolvedValue(FIXTURE);

    render(<OnboardingMetrics />);

    expect(api.get).toHaveBeenCalledWith('/onboarding-metrics');

    expect(await screen.findByText('Onboarding Funnel')).toBeInTheDocument();
    expect(await screen.findByText('Approved')).toBeInTheDocument();
    expect(screen.getByText('30')).toBeInTheDocument();
    // approvedPerSubmit 0.5 -> "50.0% of submissions"
    expect(screen.getByText(/50\.0% of submissions/)).toBeInTheDocument();
    // avg review time 7_200_000 ms -> "2.00 h"
    expect(screen.getByText('2.00 h')).toBeInTheDocument();
    // pooled step row carries label + reached/drop-off counts
    expect(screen.getByText('Documents')).toBeInTheDocument();
    expect(screen.getByText(/110 reached/)).toBeInTheDocument();
    // per-type + rejection histogram
    expect(screen.getByText('Diagnostics Lab')).toBeInTheDocument();
    expect(screen.getByText('PAN mismatch')).toBeInTheDocument();
    expect(screen.getByText('No type config:')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('shows an em dash for an unavailable visit counter instead of a fake zero', async () => {
    const noVisit = {
      ...FIXTURE,
      funnel: {
        ...FIXTURE.funnel,
        visit: null,
        rates: { ...FIXTURE.funnel.rates, startPerVisit: null },
      },
    };
    api.get.mockResolvedValue(noVisit);

    render(<OnboardingMetrics />);

    expect(await screen.findByText('HTTP counter unavailable')).toBeInTheDocument();
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('surfaces fetch failures and retries on the Retry button', async () => {
    api.get.mockRejectedValueOnce(new Error('boom'));
    api.get.mockResolvedValueOnce(FIXTURE);

    render(<OnboardingMetrics />);

    expect(await screen.findByText('boom')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /retry/i }));

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledTimes(2);
    });
    expect(await screen.findByText('Approved')).toBeInTheDocument();
  });
});
