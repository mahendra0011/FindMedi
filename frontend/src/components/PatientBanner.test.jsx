import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import PatientBanner from './clinical/PatientBanner';
import { api } from '@/lib/api';

vi.mock('@/lib/api', () => ({
  api: { patientFlags: vi.fn() },
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const FLAGS = [
  { _id: 'flag-1', kind: 'allergy', severity: 'critical', note: 'Penicillin' },
  { _id: 'flag-2', kind: 'isolation', severity: 'high', note: 'Contact' },
  { _id: 'flag-3', kind: 'mlc', severity: 'high', note: 'Road accident' },
  { _id: 'flag-4', kind: 'blacklisted', severity: 'critical', note: 'Payment default' },
  { _id: 'flag-5', kind: 'deceased', severity: 'critical' },
];

const PATIENT_ID = '65f0abc12345678901234567';

describe('PatientBanner flag chips (P0-2)', () => {
  it('renders allergy, isolation, MLC, blacklist and deceased chips for the patient', async () => {
    api.patientFlags.mockResolvedValue({ flags: FLAGS });
    render(<PatientBanner patientId={PATIENT_ID} />);

    const banner = await screen.findByRole('alert');
    expect(api.patientFlags).toHaveBeenCalledWith(PATIENT_ID);
    for (const kind of ['allergy', 'isolation', 'mlc', 'blacklisted', 'deceased']) {
      expect(banner).toHaveTextContent(kind);
    }
    expect(banner).toHaveTextContent('Penicillin');
    expect(banner).toHaveTextContent('Road accident');
  });

  it('renders nothing when no flags are returned', async () => {
    api.patientFlags.mockResolvedValue({ flags: [] });
    const { container } = render(<PatientBanner patientId={PATIENT_ID} />);
    await vi.waitFor(() => expect(api.patientFlags).toHaveBeenCalledWith(PATIENT_ID));
    expect(container).toBeEmptyDOMElement();
  });

  it('skips the fetch for a missing or too-short patient id', () => {
    api.patientFlags.mockResolvedValue({ flags: FLAGS });
    const { container } = render(<PatientBanner patientId="" />);
    expect(api.patientFlags).not.toHaveBeenCalled();
    expect(container).toBeEmptyDOMElement();
  });
});
