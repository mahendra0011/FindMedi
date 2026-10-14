import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react';
import KycReviewWorkspace, {
  HIGH_RISK_TYPES,
  STANDARD_REJECTION_REASONS,
  isHighRiskType,
  getRegistryPortalsFor,
} from './KycReviewWorkspace';
import { api } from '@/lib/api';

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const MOCK_APP = {
  application: {
    _id: 'app-test-1',
    applicationId: 'APP-1001',
    typeKey: 'ambulance',
    kind: 'service',
    status: 'under_review',
    twoPersonApproval: true,
    approvalState: { firstApprovedBy: null },
    autoChecks: { verdict: 'clear', checks: [] },
  },
  documents: [
    { _id: 'doc-1', key: 'fitness_cert', label: 'Vehicle Fitness Certificate', url: 'https://example.com/doc.pdf' },
  ],
  config: {
    requiredDocs: [{ key: 'fitness_cert', label: 'Vehicle Fitness Certificate' }],
    optionalDocs: [],
  },
  provider: null,
};

describe('KycReviewWorkspace (Spec 08 §2 & §17)', () => {
  it('correctly identifies high risk types requiring 2-person approval', () => {
    expect(isHighRiskType('ambulance')).toBe(true);
    expect(isHighRiskType('ivf_centre')).toBe(true);
    expect(isHighRiskType('de-addiction_clinic')).toBe(true);
    expect(isHighRiskType('peer_mentor')).toBe(true);
    expect(isHighRiskType('dental_clinic')).toBe(false);
  });

  it('provides official regulatory council portals for verification', () => {
    const docPortals = getRegistryPortalsFor('doctor');
    expect(docPortals.some((p) => p.name.includes('NMC'))).toBe(true);

    const dentalPortals = getRegistryPortalsFor('dentist');
    expect(dentalPortals.some((p) => p.name.includes('Dental Council of India'))).toBe(true);

    const ayushPortals = getRegistryPortalsFor('ayush_clinic');
    expect(ayushPortals.some((p) => p.name.includes('NCISM'))).toBe(true);
  });

  it('includes OUT_OF_SCOPE in standard rejection templates', () => {
    const outOfScope = STANDARD_REJECTION_REASONS.find((r) => r.code === 'OUT_OF_SCOPE');
    expect(outOfScope).toBeDefined();
    expect(outOfScope?.text).toContain('outside FindMedi\'s 24 canonical health categories');
  });

  it('renders quick reason template chips and populates the decision notes', async () => {
    api.get.mockResolvedValue(MOCK_APP);

    render(<KycReviewWorkspace applicationId="app-test-1" />);

    expect(await screen.findByText(/High-risk type/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Out of Scope' })).toBeInTheDocument();

    // Click Out of Scope chip
    fireEvent.click(screen.getByRole('button', { name: 'Out of Scope' }));

    const input = screen.getByPlaceholderText(/Decision notes \/ Resubmission reason/i);
    expect(input.value).toContain('OUT_OF_SCOPE: Application is outside');
  });
});
