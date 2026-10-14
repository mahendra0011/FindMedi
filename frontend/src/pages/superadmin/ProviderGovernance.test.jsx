import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import AllFacilities, { isSensitiveProvider, isInfoOnlyProvider } from './AllFacilities';
import { api } from '@/lib/api';

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    getHospitals: vi.fn(),
    getPendingFacilities: vi.fn(),
  },
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('Provider Governance & Catalogue Alignment (Spec 08 §3 & §17)', () => {
  it('correctly classifies sensitive categories (Spec 08 §17)', () => {
    expect(isSensitiveProvider({ type: 'ivf_clinic' })).toBe(true);
    expect(isSensitiveProvider({ category: 'de-addiction centre' })).toBe(true);
    expect(isSensitiveProvider({ name: 'Sexual Health & Wellness' })).toBe(true);
    expect(isSensitiveProvider({ isSensitive: true })).toBe(true);
    expect(isSensitiveProvider({ type: 'dental_clinic' })).toBe(false);
  });

  it('correctly classifies info-only listings without booking CTAs', () => {
    expect(isInfoOnlyProvider({ isInfoOnly: true })).toBe(true);
    expect(isInfoOnlyProvider({ kind: 'info' })).toBe(true);
    expect(isInfoOnlyProvider({ type: 'helpline' })).toBe(true);
    expect(isInfoOnlyProvider({ type: 'govt_facility' })).toBe(true);
    expect(isInfoOnlyProvider({ type: 'hospital' })).toBe(false);
  });

  it('renders provider management console with governance badges and controls', async () => {
    api.get.mockResolvedValue({
      providers: [
        {
          _id: 'prov-1',
          name: 'City Tele-MANAS Helpline',
          type: 'helpline',
          kind: 'info',
          tier: 'T2',
          status: 'live',
          isInfoOnly: true,
          sourceVerifiedDate: '2026-09-15',
          probation: { active: true, bookingCap: 0, payoutHold: true },
          address: { city: 'Bengaluru' },
        },
        {
          _id: 'prov-2',
          name: 'Hope Fertility & IVF Center',
          type: 'ivf',
          tier: 'T1',
          status: 'live',
          isSensitive: true,
          probation: { active: false },
          address: { city: 'Mumbai' },
        },
      ],
      total: 2,
    });

    render(<AllFacilities />);

    expect(await screen.findByText('Provider & Facility Management Console')).toBeInTheDocument();
    expect(screen.getByText('City Tele-MANAS Helpline')).toBeInTheDocument();
    expect(screen.getByText('Info-Only · No Booking CTA')).toBeInTheDocument();
    expect(screen.getByText('Payout Hold')).toBeInTheDocument();

    expect(screen.getByText('Hope Fertility & IVF Center')).toBeInTheDocument();
    expect(screen.getByText(/Sensitive 🔒/i)).toBeInTheDocument();
  });
});
