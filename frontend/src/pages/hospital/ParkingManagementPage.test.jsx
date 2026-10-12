import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react';
import ParkingManagementPage from './ParkingManagementPage';
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

const MOCK_TRANSACTIONS = [
  {
    _id: 'tx-1',
    ticketNumber: 'PRK-2026-001',
    vehicleNumber: 'MH02AB1234',
    vehicleType: 'FOUR_WHEELER',
    entryGate: 'GATE-1-MAIN',
    entryTime: new Date().toISOString(),
    slotCode: 'B1-BAY-05',
    isAmbulanceExempt: false,
    calculatedFee: 0,
    paymentStatus: 'ACTIVE_PARKED',
  },
  {
    _id: 'tx-2',
    ticketNumber: 'PRK-2026-002',
    vehicleNumber: 'DL01XY9876',
    vehicleType: 'FOUR_WHEELER',
    entryGate: 'GATE-1-MAIN',
    entryTime: new Date().toISOString(),
    slotCode: 'B1-BAY-08',
    isAmbulanceExempt: false,
    calculatedFee: 120,
    paymentStatus: 'PAID_EXITED',
  },
];

describe('ParkingManagementPage component (B3)', () => {
  it('renders parking vehicle registry and collections KPI', async () => {
    api.get.mockResolvedValue({
      data: {
        total: 2,
        activeParked: 1,
        totalCollected: 120,
        transactions: MOCK_TRANSACTIONS,
      },
    });

    render(<ParkingManagementPage />);

    expect(await screen.findByText('MH02AB1234')).toBeInTheDocument();
    expect(screen.getByText('DL01XY9876')).toBeInTheDocument();
    expect(screen.getByText('₹120')).toBeInTheDocument();
    expect(screen.getByText('₹120 Paid')).toBeInTheDocument();
    expect(screen.getByText('PARKED')).toBeInTheDocument();
  });

  it('filters vehicles by plate number in search box', async () => {
    api.get.mockResolvedValue({
      data: {
        total: 2,
        activeParked: 1,
        totalCollected: 120,
        transactions: MOCK_TRANSACTIONS,
      },
    });

    render(<ParkingManagementPage />);

    expect(await screen.findByText('MH02AB1234')).toBeInTheDocument();

    const searchInput = screen.getByPlaceholderText(/search plate or ticket/i);
    fireEvent.change(searchInput, { target: { value: 'DL01' } });

    expect(screen.queryByText('MH02AB1234')).not.toBeInTheDocument();
    expect(screen.getByText('DL01XY9876')).toBeInTheDocument();
  });

  it('triggers checkout exit for active vehicle', async () => {
    api.get.mockResolvedValue({
      data: {
        total: 2,
        activeParked: 1,
        totalCollected: 120,
        transactions: MOCK_TRANSACTIONS,
      },
    });
    api.post.mockResolvedValue({ data: { calculatedFee: 80 } });

    render(<ParkingManagementPage />);

    const checkoutBtn = await screen.findByRole('button', { name: /checkout & exit/i });
    fireEvent.click(checkoutBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/parking/exit/tx-1', expect.objectContaining({
        exitGate: 'GATE-2-NORTH',
        paymentMode: 'UPI_QR',
      }));
    });
  });
});
