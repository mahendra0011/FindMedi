import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react';
import DialysisPage from './DialysisPage';
import { api } from '@/lib/api';

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

vi.mock('@/components/ui/sonner', () => ({
  toast: {
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  },
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('DialysisPage component (B3)', () => {
  it('renders Dialysis Unit heading, station bays, and UF goal calculator', async () => {
    api.get.mockResolvedValue({ data: { sessions: [] } });

    render(<DialysisPage />);

    expect(screen.getByText('Dialysis Unit & Machine Operations')).toBeInTheDocument();
    expect(screen.getByText('BAY 1')).toBeInTheDocument();
    expect(screen.getByText('Clinical Ultrafiltration (UF) Goal Calculator')).toBeInTheDocument();
    expect(screen.getByText('3.80 Liters')).toBeInTheDocument(); // default (68.5 - 65.0) + 0.3 = 3.80
  });

  it('updates live calculated UF target when pre-weight changes', async () => {
    api.get.mockResolvedValue({ data: { sessions: [] } });

    render(<DialysisPage />);

    const preWeightInput = screen.getByDisplayValue('68.5');
    fireEvent.change(preWeightInput, { target: { value: '70.0' } });

    // (70.0 - 65.0) + 0.3 = 5.30 Liters
    expect(await screen.findByText('5.30 Liters')).toBeInTheDocument();
  });

  it('triggers Kt/V adequacy calculation via primary action button', async () => {
    api.get.mockResolvedValue({ data: { sessions: [] } });
    api.post.mockResolvedValue({
      data: {
        spKtV: 1.45,
        urrPct: 70,
        isAdequate: true,
        clinicalInterpretation: 'Adequate Dialysis Dose Achieved (KDOQI Compliant)',
      },
    });

    render(<DialysisPage />);

    const calculateBtn = screen.getByRole('button', { name: /calculate/i });
    fireEvent.click(calculateBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/dialysis/ktv-calculate', expect.objectContaining({
        preBUN: '40',
        postBUN: '16',
        sessionHours: '4',
      }));
    });

    expect(await screen.findByText(/spkt\/v: 1\.45 — urr: 70%/i)).toBeInTheDocument();
    expect(screen.getByText('Adequate Dialysis Dose Achieved (KDOQI Compliant)')).toBeInTheDocument();
  });
});
