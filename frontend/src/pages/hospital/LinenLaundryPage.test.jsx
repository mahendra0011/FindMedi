import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react';
import LinenLaundryPage from './LinenLaundryPage';
import { api } from '@/lib/api';

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
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

const MOCK_REQUESTS = [
  {
    _id: 'req-1',
    requestId: 'LN-2026-001',
    ward: 'ICU Ward A',
    bedNumber: 'Bed 04',
    items: [{ name: 'Bed Sheet', qty: 5 }, { name: 'Gown', qty: 2 }],
    isolationCase: true,
    status: 'requested',
    createdAt: new Date().toISOString(),
  },
  {
    _id: 'req-2',
    requestId: 'LN-2026-002',
    ward: 'General Ward B',
    bedNumber: 'Bed 12',
    items: [{ name: 'Pillow Cover', qty: 10 }],
    isolationCase: false,
    status: 'collected',
    createdAt: new Date().toISOString(),
  },
];

const MOCK_STATS = {
  byStatus: { requested: 1, collected: 1 },
  isolationPending: 1,
};

describe('LinenLaundryPage component (B3)', () => {
  it('renders linen request table and KPI badges', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/linen/requests') return Promise.resolve({ data: { requests: MOCK_REQUESTS } });
      if (url === '/linen/stats') return Promise.resolve({ data: MOCK_STATS });
      return Promise.resolve({ data: {} });
    });

    render(<LinenLaundryPage />);

    expect(await screen.findByText('LN-2026-001')).toBeInTheDocument();
    expect(screen.getByText('LN-2026-002')).toBeInTheDocument();
    expect(screen.getByText('ICU Ward A')).toBeInTheDocument();
    expect(screen.getByText('Isolation Double-Bag')).toBeInTheDocument();
    expect(screen.getByText('Standard White')).toBeInTheDocument();
  });

  it('advances status from requested to collected via button click', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/linen/requests') return Promise.resolve({ data: { requests: MOCK_REQUESTS } });
      if (url === '/linen/stats') return Promise.resolve({ data: MOCK_STATS });
      return Promise.resolve({ data: {} });
    });
    api.put.mockResolvedValue({ data: { success: true } });

    render(<LinenLaundryPage />);

    const markCollectedBtn = await screen.findByRole('button', { name: /mark collected/i });
    fireEvent.click(markCollectedBtn);

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith('/linen/requests/req-1/status', { status: 'collected' });
    });
  });

  it('advances status from collected to washed (71°C) via button click', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/linen/requests') return Promise.resolve({ data: { requests: MOCK_REQUESTS } });
      if (url === '/linen/stats') return Promise.resolve({ data: MOCK_STATS });
      return Promise.resolve({ data: {} });
    });
    api.put.mockResolvedValue({ data: { success: true } });

    render(<LinenLaundryPage />);

    const washBtn = await screen.findByRole('button', { name: /wash \(71°c\)/i });
    fireEvent.click(washBtn);

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith('/linen/requests/req-2/status', { status: 'washed' });
    });
  });
});
